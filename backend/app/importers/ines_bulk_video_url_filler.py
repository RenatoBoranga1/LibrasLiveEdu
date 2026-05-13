import re
import unicodedata
from datetime import datetime, timezone
from typing import Any
from urllib.parse import quote_plus, urljoin

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models import ImportJob, ImportStatus, Sign, SignAuditLog, SignStatus, User
from app.services.media_validation import validate_remote_media_url
from app.services.text_normalizer import TextNormalizerService


INES_SOURCE_NAME = "Dicionário da Língua Brasileira de Sinais - INES"
INES_SOURCE_URL = "https://dicionario.ines.gov.br/"
INES_LICENSE = "Uso autorizado pelo INES/Governo para o projeto LibrasLive Edu"
INES_LICENSE_NOTES = "Vídeo autorizado para uso educacional no aplicativo LibrasLive Edu."


def build_ines_video_url_from_word(word: str) -> str:
    settings = get_settings()
    normalized = normalize_ines_video_slug(word)
    return urljoin(settings.ines_standard_video_base_url, f"{normalized}{settings.ines_standard_video_suffix}")


def normalize_ines_video_slug(word: str) -> str:
    ascii_text = unicodedata.normalize("NFKD", word or "").encode("ascii", "ignore").decode("ascii")
    return re.sub(r"[^a-z0-9]", "", ascii_text.lower())


class InesBulkVideoUrlFiller:
    """Admin-only routine for validated INES standard-pattern video URLs."""

    def __init__(self, db: Session | None):
        self.db = db
        self.settings = get_settings()
        self.normalizer = TextNormalizerService()

    def diagnose_selected_words(self, words: list[str], max_items: int = 20) -> dict[str, Any]:
        limited_words = self._limited_words(words, max_items)
        report = self._empty_report(len(limited_words))
        for word in limited_words:
            item = self.diagnose_word(word)
            report["processed_items"] += 1
            self._append_result(report, item, changed=False)
        return report

    def fill_selected_words(
        self,
        words: list[str],
        max_items: int = 20,
        overwrite: bool = False,
        *,
        user: User | None = None,
    ) -> dict[str, Any]:
        if self.db is None:
            raise RuntimeError("Sessão de banco obrigatória para preencher vídeos.")
        limited_words = self._limited_words(words, max_items)
        job = self._create_job("INES standard video fill: selected", max_items=len(limited_words), overwrite=overwrite)
        report = self._empty_report(len(limited_words))
        for word in limited_words:
            self._process_word(job, report, word, overwrite=overwrite, user=user, create_missing=True)
        return self._finish_job(job, report)

    def fill_pending_words(
        self,
        max_items: int = 20,
        overwrite: bool = False,
        *,
        user: User | None = None,
    ) -> dict[str, Any]:
        if self.db is None:
            raise RuntimeError("Sessão de banco obrigatória para preencher vídeos.")
        limit = self._effective_limit(max_items)
        signs = list(
            self.db.scalars(
                select(Sign)
                .where(
                    Sign.status.in_([SignStatus.pending.value, SignStatus.review.value, SignStatus.needs_specialist_review.value]),
                    Sign.video_url.is_(None),
                )
                .order_by(Sign.updated_at.desc())
                .limit(limit)
            )
        )
        job = self._create_job("INES standard video fill: pending", max_items=len(signs), overwrite=overwrite)
        report = self._empty_report(len(signs))
        for sign in signs:
            self._process_word(job, report, sign.word, overwrite=overwrite, user=user, sign=sign, create_missing=False)
        return self._finish_job(job, report)

    def diagnose_word(self, word: str) -> dict[str, Any]:
        normalized_word = self.normalizer.normalize_word(word or "")
        generated_url = build_ines_video_url_from_word(word)
        validation = validate_remote_media_url(
            generated_url,
            "video",
            timeout_seconds=self.settings.ines_standard_video_timeout_seconds,
            user_agent="LibrasLiveEdu-ines-standard-video/1.0",
        )
        valid = bool(validation.get("valid"))
        final_url = str(validation.get("final_url") or generated_url)
        return {
            "word": word,
            "normalized_word": normalized_word,
            "generated_url": generated_url,
            "video_url": final_url if valid else None,
            "avatar_video_url": final_url if valid else None,
            "source_name": INES_SOURCE_NAME,
            "source_url": INES_SOURCE_URL,
            "source_reference_url": f"{INES_SOURCE_URL}?q={quote_plus(word)}",
            "license": INES_LICENSE,
            "license_notes": INES_LICENSE_NOTES,
            "media_type": "video" if valid else "none",
            "video_found": valid,
            "gif_found": False,
            "image_found": False,
            "media_found": valid,
            "validated": valid,
            "http_status": validation.get("status_code"),
            "content_type": validation.get("content_type"),
            "validation_status_code": validation.get("status_code"),
            "validation_content_type": validation.get("content_type"),
            "validation_final_url": validation.get("final_url"),
            "validation_content_length": validation.get("content_length"),
            "validation_reason": validation.get("reason"),
            "can_use_avatar": valid,
            "detection_method": "ines_standard_pattern" if valid else "ines_standard_pattern_failed",
            "status": "diagnostic",
            "reason": "Vídeo validado no padrão INES." if valid else "URL padrão não retornou vídeo válido.",
            "recommended_action": "Revisar fonte/licença e aprovar manualmente."
            if valid
            else "URL padrão não encontrada. Verificar manualmente ou usar manifesto.",
            "warnings": [],
            "errors": [] if valid else [str(validation.get("reason") or "URL padrão inválida.")],
        }

    def _process_word(
        self,
        job: ImportJob,
        report: dict[str, Any],
        word: str,
        *,
        overwrite: bool,
        user: User | None,
        sign: Sign | None = None,
        create_missing: bool,
    ) -> None:
        assert self.db is not None
        item = self.diagnose_word(word)
        report["processed_items"] += 1
        if not item["validated"]:
            report["skipped_count"] += 1
            self._append_result(report, item, changed=False)
            self._log(job, "warning", f"{word}: URL padrão inválida.", item=item)
            self.db.commit()
            return

        sign = sign or self._find_sign(word)
        if sign and sign.status == SignStatus.approved.value and not overwrite:
            item["status"] = sign.status
            item["reason"] = "Sinal aprovado existente não foi alterado automaticamente."
            item["recommended_action"] = "Revisar manualmente se precisar trocar mídia."
            report["skipped_count"] += 1
            self._append_result(report, item, changed=False)
            self._log(job, "warning", f"{word}: sinal aprovado não alterado.", item=item)
            self.db.commit()
            return
        if sign and sign.video_url and not overwrite:
            item["status"] = sign.status
            item["reason"] = "Sinal já possui vídeo; overwrite=false."
            item["recommended_action"] = "Revisar mídia existente."
            report["skipped_count"] += 1
            self._append_result(report, item, changed=False)
            self._log(job, "warning", f"{word}: vídeo existente não sobrescrito.", item=item)
            self.db.commit()
            return
        if sign is None and not create_missing:
            item["status"] = "pending"
            item["reason"] = "Vídeo validado, mas sinal não foi encontrado para atualização."
            item["recommended_action"] = "Criar sinal ou usar preenchimento de selecionadas."
            report["skipped_count"] += 1
            self._append_result(report, item, changed=False)
            self._log(job, "warning", f"{word}: sinal não encontrado.", item=item)
            self.db.commit()
            return

        created = sign is None
        old_value = self._snapshot(sign)
        if sign is None:
            sign = Sign(word=word, normalized_word=item["normalized_word"], status=SignStatus.pending.value)
            self.db.add(sign)
            self.db.flush()

        sign.word = word
        sign.normalized_word = item["normalized_word"]
        sign.video_url = item["video_url"]
        sign.avatar_video_url = item.get("avatar_video_url") or item["video_url"]
        sign.source_name = item["source_name"]
        sign.source_url = item["source_url"]
        sign.license = item["license"]
        sign.educational_notes = self._merge_notes(
            sign.educational_notes,
            source_reference_url=item["source_reference_url"],
            license_notes=item["license_notes"],
            generated_url=item["generated_url"],
        )
        sign.curator_notes = "Vídeo INES validado por padrão de URL; revisar fonte/licença e aprovar manualmente."
        sign.status = SignStatus.pending.value
        sign.version = (sign.version or 1) + 1
        self.db.flush()
        self.db.add(
            SignAuditLog(
                sign_id=sign.id,
                user_id=user.id if user else None,
                action="ines_standard_video_fill",
                old_value=old_value,
                new_value=self._snapshot(sign),
            )
        )
        item["status"] = sign.status
        item["reason"] = "Vídeo validado e vinculado ao sinal."
        report["valid_videos"] += 1
        report["updated_count" if not created else "created_count"] += 1
        report["pending_count"] += 1
        job.imported_records += 1 if created else 0
        job.updated_records += 0 if created else 1
        self._append_result(report, item, changed=True)
        self._log(job, "success", f"{word}: vídeo padrão INES validado e vinculado.", item=item)
        self.db.commit()

    def _limited_words(self, words: list[str], max_items: int | None) -> list[str]:
        limit = self._effective_limit(max_items)
        seen: set[str] = set()
        limited: list[str] = []
        for raw in words:
            word = str(raw or "").strip()
            normalized = self.normalizer.normalize_word(word)
            if not word or not normalized or normalized in seen:
                continue
            seen.add(normalized)
            limited.append(word)
            if len(limited) >= limit:
                break
        return limited

    def _effective_limit(self, requested: int | None) -> int:
        configured = max(1, self.settings.ines_standard_video_max_items)
        if requested is None:
            return configured
        return max(1, min(requested, configured))

    def _empty_report(self, total_items: int) -> dict[str, Any]:
        return {
            "status": "completed",
            "total_items": total_items,
            "processed_items": 0,
            "valid_videos": 0,
            "invalid_videos": 0,
            "updated_count": 0,
            "created_count": 0,
            "pending_count": 0,
            "skipped_count": 0,
            "error_count": 0,
            "items": [],
            "warnings": [],
            "errors": [],
        }

    def _append_result(self, report: dict[str, Any], item: dict[str, Any], *, changed: bool) -> None:
        if item["validated"] and not changed:
            report["valid_videos"] += 1
        if not item["validated"] and not changed:
            report["invalid_videos"] += 1
        report["items"].append(item)

    def _create_job(self, source_name: str, *, max_items: int, overwrite: bool) -> ImportJob:
        assert self.db is not None
        job = ImportJob(
            source_type="api",
            source_name=source_name,
            status=ImportStatus.running.value,
            total_records=max_items,
            logs=[
                {
                    "level": "settings",
                    "message": "Preenchimento por padrão de vídeo INES iniciado sob demanda por admin.",
                    "settings": {
                        "max_items": max_items,
                        "overwrite": overwrite,
                        "base_url": self.settings.ines_standard_video_base_url,
                        "suffix": self.settings.ines_standard_video_suffix,
                    },
                }
            ],
        )
        self.db.add(job)
        self.db.commit()
        self.db.refresh(job)
        return job

    def _finish_job(self, job: ImportJob, report: dict[str, Any]) -> dict[str, Any]:
        assert self.db is not None
        job.status = ImportStatus.completed.value
        job.failed_records = report["error_count"]
        job.finished_at = datetime.now(timezone.utc)
        self._log(job, "report", "Relatório final do preenchimento por padrão INES.", report=report)
        self.db.commit()
        report["job_id"] = job.id
        return report

    def _log(self, job: ImportJob, level: str, message: str, **extra: Any) -> None:
        logs = list(job.logs or [])
        entry = {"level": level, "message": message}
        entry.update(extra)
        logs.append(entry)
        job.logs = logs

    def _find_sign(self, word: str) -> Sign | None:
        assert self.db is not None
        normalized = self.normalizer.normalize_word(word)
        return self.db.scalar(select(Sign).where(Sign.normalized_word == normalized).order_by(Sign.updated_at.desc()).limit(1))

    def _merge_notes(self, notes: str | None, *, source_reference_url: str, license_notes: str, generated_url: str) -> str:
        existing = [
            line
            for line in (notes or "").splitlines()
            if not line.startswith("URL consultada:")
            and not line.startswith("Observações de licença:")
            and not line.startswith("URL padrão INES:")
            and not line.startswith("Método de detecção:")
        ]
        if not existing:
            existing.append("Mídia vinculada por rotina administrativa; não roda em build/deploy/startup.")
        existing.append(f"Observações de licença: {license_notes}")
        existing.append(f"URL consultada: {source_reference_url}")
        existing.append(f"URL padrão INES: {generated_url}")
        existing.append("Método de detecção: ines_standard_pattern")
        return "\n".join(existing)

    def _snapshot(self, sign: Sign | None) -> dict[str, Any] | None:
        if sign is None:
            return None
        return {
            "id": sign.id,
            "word": sign.word,
            "normalized_word": sign.normalized_word,
            "status": sign.status,
            "source_name": sign.source_name,
            "source_url": sign.source_url,
            "source_reference_url": sign.source_reference_url,
            "license": sign.license,
            "license_notes": sign.license_notes,
            "video_url": sign.video_url,
            "avatar_video_url": sign.avatar_video_url,
            "image_url": sign.image_url,
            "curator_notes": sign.curator_notes,
        }
