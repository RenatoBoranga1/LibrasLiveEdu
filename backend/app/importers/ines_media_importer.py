import csv
import re
import time
from datetime import datetime, timezone
from io import StringIO
from typing import Any
from urllib.parse import quote_plus, urljoin, urlparse

import httpx
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.security import utc_now
from app.models import ImportJob, ImportStatus, Sign, SignAuditLog, SignStatus, User
from app.schemas.api import InesMediaImportStartRequest
from app.services.text_normalizer import TextNormalizerService


class InesMediaImporter:
    """Admin-triggered INES media importer.

    This service never runs during startup, migrations, seed, frontend build or
    deploy. It is intentionally synchronous and rate-limited so an admin can run
    small, auditable batches on demand.
    """

    source_name = "Dicionário da Língua Brasileira de Sinais - INES"

    def __init__(self, db: Session):
        self.db = db
        self.settings = get_settings()
        self.normalizer = TextNormalizerService()

    def validate(self, payload: InesMediaImportStartRequest) -> dict[str, Any]:
        items = self._items_for_payload(payload, validate_only=True)
        limit = self._effective_limit(payload.max_items)
        report = self._empty_report(total_items=min(len(items), limit))
        seen: set[str] = set()

        if len(items) > limit:
            report["warnings"].append(
                {
                    "word": None,
                    "message": f"Total enviado ({len(items)}) excede o limite desta execução ({limit}). O excedente será ignorado.",
                }
            )

        if payload.mode in {"pending_words", "selected_words"} and not self.settings.ines_import_enabled:
            report["warnings"].append({"word": None, "message": "Importação INES desativada neste ambiente."})

        for item in items[:limit]:
            word = self._clean(item.get("word"))
            normalized = self.normalizer.normalize_word(word or "")
            if not word:
                self._report_error(report, word, "Item sem palavra.")
                continue
            if normalized in seen:
                report["skipped_count"] += 1
                report["warnings"].append({"word": word, "message": "Palavra duplicada no lote."})
                continue
            seen.add(normalized)
            for key in ("video_url", "avatar_video_url", "image_url", "source_reference_url"):
                value = self._clean(item.get(key))
                if value and not self._is_http_url(value):
                    self._report_error(report, word, f"{key} deve começar com http:// ou https://.")
            if payload.mode in {"json_items", "csv_items"} and not (item.get("video_url") or item.get("avatar_video_url")):
                report["warnings"].append({"word": word, "message": "Item sem vídeo; será mantido como pending."})

        return report

    def run(self, payload: InesMediaImportStartRequest, user: User) -> tuple[ImportJob, dict[str, Any]]:
        if not self.settings.ines_import_enabled:
            raise RuntimeError("Importação INES desativada neste ambiente.")
        if payload.download_media or self.settings.ines_import_download_media:
            raise RuntimeError("Download de mídia exige storage externo configurado. Use vínculo por URL remota neste ambiente.")
        if not (payload.store_remote_url and self.settings.ines_import_store_remote_url):
            raise RuntimeError("A rotina atual exige INES_IMPORT_STORE_REMOTE_URL=true para não salvar vídeos no repositório.")

        items = self._items_for_payload(payload, validate_only=False)
        limit = self._effective_limit(payload.max_items)
        limited_items = items[:limit]
        report = self._empty_report(total_items=len(limited_items))
        if len(items) > limit:
            report["warnings"].append(
                {
                    "word": None,
                    "message": f"Total enviado ({len(items)}) excede o limite desta execução ({limit}). O excedente foi ignorado.",
                }
            )

        job = ImportJob(
            source_type="api",
            source_name=f"INES media import: {payload.mode}",
            status=ImportStatus.running.value,
            total_records=len(limited_items),
            logs=[
                {
                    "level": "settings",
                    "row": None,
                    "message": "Importação administrativa sob demanda iniciada.",
                    "settings": self._job_settings(payload, limit),
                }
            ],
        )
        self.db.add(job)
        self.db.commit()
        self.db.refresh(job)

        seen: set[str] = set()
        for index, item in enumerate(limited_items, start=1):
            word = self._clean(item.get("word"))
            normalized = self.normalizer.normalize_word(word or "")
            if not word:
                self._record_error(job, report, index, None, "Item sem palavra.")
                continue
            if normalized in seen:
                report["skipped_count"] += 1
                self._log(job, "warning", index, f"{word}: duplicado no lote.")
                continue
            seen.add(normalized)

            try:
                enriched = dict(item)
                if payload.mode in {"pending_words", "selected_words"}:
                    lookup = self.find_ines_entry_for_word(word)
                    if not lookup.get("found"):
                        if lookup.get("source_reference_url"):
                            enriched["source_reference_url"] = lookup.get("source_reference_url")
                        self._record_error(job, report, index, word, str(lookup.get("error") or "Vídeo não encontrado automaticamente no INES."))
                        self._delay()
                        continue
                    enriched.update({key: value for key, value in lookup.items() if value is not None})
                    self._delay()

                sign, created, approved = self._create_or_update_sign(enriched, payload, user)
                report["processed_items"] += 1
                if created:
                    report["created_count"] += 1
                    job.imported_records += 1
                else:
                    report["updated_count"] += 1
                    job.updated_records += 1
                if approved:
                    report["approved_count"] += 1
                else:
                    report["pending_count"] += 1
                self._log(job, "success", index, f"{sign.word}: mídia INES registrada com status {sign.status}.")
                self.db.commit()
            except Exception as exc:  # noqa: BLE001
                self.db.rollback()
                self._record_error(job, report, index, word, str(exc))

        job.status = ImportStatus.completed.value if report["error_count"] == 0 else ImportStatus.failed.value
        job.failed_records = report["error_count"]
        job.finished_at = datetime.now(timezone.utc)
        self._log(job, "report", None, "Relatório final da importação INES.", report=report)
        self.db.commit()
        self.db.refresh(job)
        return job, report

    def find_ines_entry_for_word(self, word: str) -> dict[str, Any]:
        """Best-effort controlled lookup.

        If the public HTML does not expose a reliable media URL, the importer
        returns found=false and leaves the sign pending for manual curation.
        """

        base_url = self.settings.ines_base_url.rstrip("/") + "/"
        search_url = f"{base_url}?q={quote_plus(word)}"
        try:
            with httpx.Client(timeout=self.settings.ines_import_timeout_seconds, follow_redirects=True) as client:
                response = client.get(search_url, headers={"User-Agent": "LibrasLiveEdu-admin-import/1.0"})
                response.raise_for_status()
        except Exception as exc:  # noqa: BLE001
            return {"found": False, "word": word, "error": f"Falha ao consultar INES: {exc}"}

        html = response.text
        if self.normalizer.normalize_word(word) not in self.normalizer.normalize_word(html):
            return {
                "found": False,
                "word": word,
                "source_reference_url": str(response.url),
                "error": "Entrada da palavra não encontrada automaticamente no INES.",
            }

        video_url = self._first_media_url(html, str(response.url), {".mp4", ".webm", ".mov"})
        image_url = self._first_media_url(html, str(response.url), {".jpg", ".jpeg", ".png", ".webp", ".gif"})
        if not video_url:
            return {
                "found": False,
                "word": word,
                "source_reference_url": str(response.url),
                "image_url": image_url,
                "error": "Vídeo não encontrado automaticamente no INES.",
            }

        return {
            "found": True,
            "word": word,
            "gloss": word.upper(),
            "source_reference_url": str(response.url),
            "video_url": video_url,
            "avatar_video_url": video_url,
            "image_url": image_url,
        }

    def _items_for_payload(self, payload: InesMediaImportStartRequest, *, validate_only: bool) -> list[dict[str, Any]]:
        if payload.mode == "json_items":
            return [item.model_dump(exclude_none=True) for item in payload.items]
        if payload.mode == "csv_items":
            return self._parse_csv(payload.csv)
        if payload.mode == "selected_words":
            return [{"word": word} for word in payload.words if self._clean(word)]
        if payload.mode == "pending_words":
            max_items = self._effective_limit(payload.max_items)
            rows = self.db.scalars(
                select(Sign)
                .where(Sign.status == SignStatus.pending.value, Sign.video_url.is_(None))
                .order_by(Sign.updated_at.desc())
                .limit(max_items)
            )
            return [{"word": sign.word, "gloss": sign.gloss} for sign in rows]
        return []

    def _parse_csv(self, content: str) -> list[dict[str, Any]]:
        if not content.strip():
            return []
        return [dict(row) for row in csv.DictReader(StringIO(content))]

    def _create_or_update_sign(
        self,
        item: dict[str, Any],
        payload: InesMediaImportStartRequest,
        user: User,
    ) -> tuple[Sign, bool, bool]:
        word = self._clean(item.get("word"))
        if not word:
            raise ValueError("Item sem palavra.")

        self._validate_urls(item)
        normalized_word = self.normalizer.normalize_word(word)
        sign = self.db.scalar(select(Sign).where(Sign.normalized_word == normalized_word).order_by(Sign.updated_at.desc()).limit(1))
        created = sign is None
        old_value = self._snapshot(sign)

        if sign and sign.status == SignStatus.approved.value and not payload.overwrite:
            raise ValueError("Sinal aprovado existente não foi sobrescrito. Use overwrite=true após revisão.")
        if not sign:
            sign = Sign(word=word, normalized_word=normalized_word)
            self.db.add(sign)

        source_url = self._clean(item.get("source_url")) or self.settings.ines_base_url
        source_reference_url = self._clean(item.get("source_reference_url")) or source_url
        license_text = self._clean(item.get("license")) or self.settings.ines_import_authorization_text
        license_notes = self._clean(item.get("license_notes")) or "Vídeo autorizado para uso educacional no aplicativo LibrasLive Edu."
        avatar_video = self._clean(item.get("avatar_video_url"))
        video = avatar_video or self._clean(item.get("video_url"))
        image_url = self._clean(item.get("image_url"))

        sign.word = word
        sign.normalized_word = normalized_word
        sign.gloss = self._clean(item.get("gloss")) or sign.gloss
        sign.example_sentence = self._clean(item.get("example_sentence")) or sign.example_sentence
        sign.description = self._description(item) or sign.description
        sign.source_name = self.source_name
        sign.source_url = source_url
        sign.license = license_text
        if image_url:
            sign.image_url = image_url
        if video:
            sign.video_url = video
        sign.educational_notes = self._educational_notes(item, source_reference_url, license_notes)
        sign.curator_notes = self._clean(item.get("curator_notes")) or "Mídia INES registrada por rotina administrativa; aguardando curadoria."

        can_approve = self._can_approve(item, payload.approve_authorized, sign, license_notes)
        sign.status = SignStatus.approved.value if can_approve else SignStatus.pending.value
        if can_approve:
            sign.approved_by_user_id = user.id
            sign.approved_at = utc_now()
            sign.last_reviewed_at = utc_now()
        sign.version = (sign.version or 1) + 1
        self.db.flush()
        self.db.add(
            SignAuditLog(
                sign_id=sign.id,
                user_id=user.id,
                action="ines_media_import",
                old_value=old_value,
                new_value=self._snapshot(sign),
            )
        )
        return sign, created, can_approve

    def _can_approve(self, item: dict[str, Any], approve_authorized: bool, sign: Sign, license_notes: str | None) -> bool:
        authorized = item.get("authorized") is True or str(item.get("authorized")).strip().lower() in {"true", "1", "sim", "yes"}
        return bool(
            approve_authorized
            and self.settings.ines_import_approve_authorized
            and authorized
            and sign.video_url
            and sign.source_name
            and sign.source_url
            and sign.license
            and license_notes
        )

    def _validate_urls(self, item: dict[str, Any]) -> None:
        for key in ("source_reference_url", "video_url", "avatar_video_url", "image_url"):
            value = self._clean(item.get(key))
            if value and not self._is_http_url(value):
                raise ValueError(f"{key} deve começar com http:// ou https://.")

    def _description(self, item: dict[str, Any]) -> str | None:
        pieces = []
        for label, key in [("Acepção/significado", "meaning"), ("Classe gramatical", "grammatical_class")]:
            value = self._clean(item.get(key))
            if value:
                pieces.append(f"{label}: {value}")
        return "\n".join(pieces) if pieces else None

    def _educational_notes(self, item: dict[str, Any], source_reference_url: str, license_notes: str) -> str:
        notes = [
            "Mídia registrada por rotina administrativa autorizada do INES.",
            "A importação não roda em build, deploy, startup, migrations ou seed.",
            f"Observações de licença: {license_notes}",
            f"URL consultada: {source_reference_url}",
        ]
        if self._clean(item.get("meaning")):
            notes.append(f"Acepção/significado: {self._clean(item.get('meaning'))}")
        if self._clean(item.get("grammatical_class")):
            notes.append(f"Classe gramatical: {self._clean(item.get('grammatical_class'))}")
        return "\n".join(notes)

    def _first_media_url(self, html: str, base_url: str, extensions: set[str]) -> str | None:
        candidates = re.findall(r"""(?:src|href)=["']([^"']+)["']""", html, flags=re.IGNORECASE)
        for candidate in candidates:
            parsed_path = urlparse(candidate).path.lower()
            if not any(parsed_path.endswith(extension) for extension in extensions):
                continue
            absolute = urljoin(base_url, candidate)
            if self._is_allowed_media_url(absolute):
                return absolute
        return None

    def _is_allowed_media_url(self, value: str) -> bool:
        if not self._is_http_url(value):
            return False
        host = urlparse(value).hostname
        allowed = {urlparse(self.settings.ines_base_url).hostname, "dicionario.ines.gov.br", "ines.gov.br"}
        return bool(host and host.lower() in {item for item in allowed if item})

    def _is_http_url(self, value: str) -> bool:
        return value.startswith("http://") or value.startswith("https://")

    def _effective_limit(self, requested: int | None) -> int:
        configured = max(1, self.settings.ines_import_max_items)
        if requested is None:
            return configured
        return max(1, min(requested, configured))

    def _delay(self) -> None:
        delay = max(0, self.settings.ines_import_delay_ms) / 1000
        if delay:
            time.sleep(delay)

    def _empty_report(self, *, total_items: int = 0) -> dict[str, Any]:
        return {
            "total_items": total_items,
            "processed_items": 0,
            "created_count": 0,
            "updated_count": 0,
            "approved_count": 0,
            "pending_count": 0,
            "skipped_count": 0,
            "error_count": 0,
            "errors": [],
            "warnings": [],
        }

    def _record_error(self, job: ImportJob, report: dict[str, Any], row: int | None, word: str | None, message: str) -> None:
        self._report_error(report, word, message)
        job.failed_records = report["error_count"]
        self._log(job, "error", row, f"{word or 'registro'}: {message}")
        self.db.commit()

    def _report_error(self, report: dict[str, Any], word: str | None, message: str) -> None:
        report["error_count"] += 1
        report["errors"].append({"word": word, "message": message})

    def _log(self, job: ImportJob, level: str, row: int | None, message: str, **extra: Any) -> None:
        logs = list(job.logs or [])
        entry = {"level": level, "row": row, "message": message}
        entry.update(extra)
        logs.append(entry)
        job.logs = logs

    def _job_settings(self, payload: InesMediaImportStartRequest, limit: int) -> dict[str, Any]:
        return {
            "mode": payload.mode,
            "max_items": limit,
            "approve_authorized": payload.approve_authorized,
            "download_media": payload.download_media,
            "store_remote_url": payload.store_remote_url,
            "overwrite": payload.overwrite,
            "delay_ms": self.settings.ines_import_delay_ms,
            "timeout_seconds": self.settings.ines_import_timeout_seconds,
        }

    def _snapshot(self, sign: Sign | None) -> dict[str, Any] | None:
        if not sign:
            return None
        return {
            "id": sign.id,
            "word": sign.word,
            "gloss": sign.gloss,
            "status": sign.status,
            "source_name": sign.source_name,
            "source_url": sign.source_url,
            "source_reference_url": sign.source_reference_url,
            "license": sign.license,
            "license_notes": sign.license_notes,
            "image_url": sign.image_url,
            "video_url": sign.video_url,
        }

    def _clean(self, value: Any) -> str | None:
        if value is None:
            return None
        value = str(value).strip()
        return value or None
