import json
from pathlib import Path
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.security import utc_now
from app.importers.ines_bulk_video_url_filler import (
    INES_LICENSE,
    INES_LICENSE_NOTES,
    INES_SOURCE_NAME,
    INES_SOURCE_URL,
    build_ines_video_url_from_word,
)
from app.importers.ines_site_crawler import InesSiteCrawler
from app.importers.site_crawler_utils import is_handshape_image, utc_iso
from app.models import ImportJob, ImportStatus, Sign, SignAuditLog, SignStatus, User
from app.services.media_validation import validate_remote_image_url, validate_remote_media_url
from app.services.text_normalizer import TextNormalizerService


MANIFEST_FILENAME = "ines_full_catalog.generated.json"


class InesFullCatalogImporter:
    """Controlled admin-only INES catalog scanner and importer.

    This class never runs on startup/build/deploy. Callers must invoke it from
    protected admin endpoints or local scripts.
    """

    def __init__(self, db: Session | None = None):
        self.db = db
        self.settings = get_settings()
        self.normalizer = TextNormalizerService()

    def scan_catalog(
        self,
        *,
        letters: list[str] | None = None,
        max_items: int | None = None,
        delay_ms: int | None = None,
        dry_run: bool = True,
        use_browser: bool = False,
        overwrite_manifest: bool = False,
        user: User | None = None,
    ) -> tuple[ImportJob | None, dict[str, Any], dict[str, Any]]:
        selected_letters = self._letters(letters)
        limit = self._effective_limit(max_items)
        output = None if dry_run else self._manifest_path(overwrite_manifest=overwrite_manifest)
        warnings: list[dict[str, Any]] = []
        if use_browser and not self.settings.ines_full_catalog_use_browser:
            warnings.append(
                {
                    "word": None,
                    "message": "Modo navegador solicitado, mas INES_FULL_CATALOG_USE_BROWSER=false; usando requests/HTML controlado.",
                }
            )

        crawler = InesSiteCrawler(max_pages=limit, delay_ms=delay_ms if delay_ms is not None else self.settings.ines_full_catalog_delay_ms)
        crawler.source_url = self.settings.ines_full_catalog_base_url.rstrip("/") + "/"
        previous_user_agent = crawler.settings.crawler_user_agent
        crawler.settings.crawler_user_agent = self.settings.ines_full_catalog_user_agent
        try:
            raw_manifest = crawler.crawl(letters=selected_letters, dry_run=True)
        finally:
            crawler.settings.crawler_user_agent = previous_user_agent
        manifest = self._catalog_manifest(raw_manifest, selected_letters)
        manifest["stats"]["errors"] += len(warnings)
        manifest["errors"].extend(warnings)
        report = self._scan_report(manifest, manifest_path=None if dry_run else str(output))
        manifest["report"] = report

        if output is not None:
            output.parent.mkdir(parents=True, exist_ok=True)
            output.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")

        job = self._create_job(
            source_name="INES full catalog scan",
            source_type="crawler",
            total_records=report["entries_found"],
            report=report,
            manifest=manifest,
            user=user,
        )
        return job, report, manifest

    def validate_manifest(self, manifest: dict[str, Any], *, max_items: int | None = None) -> dict[str, Any]:
        entries = self._entries(manifest)[: self._effective_limit(max_items)]
        report = self._empty_import_report(total_items=len(entries))
        report["status"] = "validated"
        for entry in entries:
            item = self._validated_entry(entry, manifest)
            report["processed_items"] += 1
            self._append_import_item(report, item, imported=False, skipped=False)
        return report

    def load_manifest(self, manifest_path: str | None = None) -> dict[str, Any]:
        return self._read_manifest(manifest_path)

    def import_catalog_manifest(
        self,
        *,
        manifest: dict[str, Any] | None = None,
        manifest_path: str | None = None,
        overwrite: bool = False,
        max_items: int | None = None,
        status: str = SignStatus.pending.value,
        user: User,
    ) -> tuple[ImportJob, dict[str, Any]]:
        if self.db is None:
            raise RuntimeError("Sessão de banco obrigatória para importar catálogo INES.")
        loaded_manifest = manifest or self._read_manifest(manifest_path)
        entries = self._entries(loaded_manifest)[: self._effective_limit(max_items)]
        report = self._empty_import_report(total_items=len(entries))
        job = ImportJob(
            source_type="json",
            source_name="INES full catalog import",
            status=ImportStatus.running.value,
            total_records=len(entries),
            logs=[
                {
                    "level": "settings",
                    "row": None,
                    "message": "Importação do catálogo completo INES iniciada sob demanda por admin.",
                    "settings": {
                        "overwrite": overwrite,
                        "status": status,
                        "max_items": len(entries),
                        "manifest_path": manifest_path,
                    },
                }
            ],
        )
        self.db.add(job)
        self.db.commit()
        self.db.refresh(job)

        for index, raw_entry in enumerate(entries, start=1):
            try:
                item = self._validated_entry(raw_entry, loaded_manifest)
                word = str(item.get("word") or "").strip()
                normalized_word = str(item.get("normalized_word") or self.normalizer.normalize_word(word))
                if not word or not normalized_word:
                    self._record_error(job, report, index, word or None, "Entrada sem palavra.")
                    continue

                sign = self.db.scalar(select(Sign).where(Sign.normalized_word == normalized_word).order_by(Sign.updated_at.desc()).limit(1))
                if sign and sign.status == SignStatus.approved.value and not overwrite:
                    item["status"] = sign.status
                    item["reason"] = "Sinal aprovado existente não foi alterado automaticamente."
                    item["recommended_action"] = "Revisar manualmente se precisar trocar mídia."
                    self._append_import_item(report, item, imported=False, skipped=True)
                    self._log(job, "warning", index, f"{word}: sinal aprovado não sobrescrito.", item=item)
                    self.db.commit()
                    continue

                created = sign is None
                old_value = self._snapshot(sign)
                if sign is None:
                    sign = Sign(word=word, normalized_word=normalized_word, status=status)
                    self.db.add(sign)
                    self.db.flush()

                self._apply_entry(sign, item, overwrite=overwrite, status=status)
                self.db.flush()
                self.db.add(
                    SignAuditLog(
                        sign_id=sign.id,
                        user_id=user.id,
                        action="ines_full_catalog_import",
                        old_value=old_value,
                        new_value=self._snapshot(sign),
                    )
                )
                report["processed_items"] += 1
                report["pending_count"] += 1 if sign.status == SignStatus.pending.value else 0
                report["created_count" if created else "updated_count"] += 1
                if created:
                    job.imported_records += 1
                else:
                    job.updated_records += 1
                item["status"] = sign.status
                item["reason"] = "Catálogo INES importado para curadoria."
                item["recommended_action"] = "Revisar fonte/licença e aprovar manualmente."
                self._append_import_item(report, item, imported=True, skipped=False)
                self._log(job, "success", index, f"{word}: catálogo INES importado como pending.", item=item)
                self.db.commit()
            except Exception as exc:  # noqa: BLE001
                self.db.rollback()
                self._record_error(job, report, index, str(raw_entry.get("word") or ""), str(exc))

        job.status = ImportStatus.completed.value
        job.failed_records = report["error_count"]
        job.finished_at = utc_now()
        self._log(job, "report", None, "Relatório final da importação do catálogo INES.", report=report)
        self.db.commit()
        self.db.refresh(job)
        return job, report

    def _catalog_manifest(self, raw_manifest: dict[str, Any], letters: list[str]) -> dict[str, Any]:
        entries = [self._manifest_entry(entry) for entry in self._entries(raw_manifest)]
        entries = [entry for entry in entries if entry.get("word")]
        return {
            "source": {
                "name": INES_SOURCE_NAME,
                "base_url": self.settings.ines_full_catalog_base_url.rstrip("/") + "/",
                "authorization": self.settings.ines_full_catalog_authorization_note,
                "generated_at": utc_iso(),
                "generated_by": "ines_full_catalog_importer",
            },
            "stats": {
                "letters_scanned": len(letters),
                "entries_found": len(entries),
                "videos_valid": sum(1 for entry in entries if entry.get("video_validated")),
                "images_valid": sum(1 for entry in entries if entry.get("image_validated")),
                "without_video": sum(1 for entry in entries if not entry.get("video_validated")),
                "errors": len(raw_manifest.get("errors", []) or []),
            },
            "entries": entries,
            "errors": list(raw_manifest.get("errors", []) or []),
            "pages_without_video": list(raw_manifest.get("pages_without_video", []) or []),
            "duplicates": list(raw_manifest.get("duplicates", []) or []),
        }

    def _manifest_entry(self, entry: dict[str, Any]) -> dict[str, Any]:
        word = str(entry.get("word") or "").strip()
        normalized_word = self.normalizer.normalize_word(str(entry.get("normalized_word") or word))
        video_url = self._clean(entry.get("avatar_video_url")) or self._clean(entry.get("video_url"))
        image_url = self._clean(entry.get("image_url"))
        handshape_image_url = image_url if image_url and is_handshape_image(image_url) else self._clean(entry.get("handshape_image_url"))
        image_validation = self._validate_image(image_url)
        video_valid = bool(video_url and entry.get("validated"))
        detection_method = entry.get("detection_method")
        candidate_video_url = None
        if video_url and not video_valid:
            validation = validate_remote_media_url(
                video_url,
                "video",
                timeout_seconds=self.settings.ines_import_timeout_seconds,
                user_agent=self.settings.ines_full_catalog_user_agent,
            )
            video_valid = bool(validation.get("valid"))
            video_url = str(validation.get("final_url") or video_url) if video_valid else None
            video_status = validation.get("status_code")
            content_type = validation.get("content_type")
            validation_reason = validation.get("reason")
            content_length = validation.get("content_length")
            detection_method = "site_crawl" if video_valid else "site_crawl_failed"
        elif not video_url and word:
            candidate_video_url = build_ines_video_url_from_word(word)
            validation = validate_remote_media_url(
                candidate_video_url,
                "video",
                timeout_seconds=self.settings.ines_import_timeout_seconds,
                user_agent=self.settings.ines_full_catalog_user_agent,
            )
            video_valid = bool(validation.get("valid"))
            video_url = str(validation.get("final_url") or candidate_video_url) if video_valid else None
            video_status = validation.get("status_code")
            content_type = validation.get("content_type")
            validation_reason = validation.get("reason")
            content_length = validation.get("content_length")
            detection_method = "ines_standard_pattern" if video_valid else "ines_standard_pattern_failed"
        else:
            video_status = entry.get("validation_status_code") or entry.get("http_status")
            content_type = entry.get("validation_content_type") or entry.get("content_type")
            validation_reason = entry.get("validation_reason")
            content_length = entry.get("validation_content_length")

        return {
            "word": word,
            "normalized_word": normalized_word,
            "gloss": self._clean(entry.get("gloss")) or word.upper(),
            "meaning": self._clean(entry.get("meaning")) or "",
            "grammatical_class": self._clean(entry.get("grammatical_class")) or "",
            "example": self._clean(entry.get("example")) or "",
            "libras_example": self._clean(entry.get("libras_example")) or "",
            "origin": self._clean(entry.get("origin")) or "",
            "source_name": INES_SOURCE_NAME,
            "source_url": self.settings.ines_full_catalog_base_url.rstrip("/") + "/",
            "source_reference_url": self._clean(entry.get("source_reference_url")) or f"{INES_SOURCE_URL}?q={word}",
            "video_url": video_url if video_valid else None,
            "avatar_video_url": video_url if video_valid else None,
            "candidate_video_url": candidate_video_url,
            "image_url": image_url if image_validation.get("valid") else None,
            "handshape_image_url": handshape_image_url if image_validation.get("valid") else None,
            "media_type": "video" if video_valid else "image" if image_validation.get("valid") else "none",
            "can_use_avatar": video_valid,
            "video_validated": video_valid,
            "image_validated": bool(image_validation.get("valid")),
            "http_status": video_status,
            "content_type": content_type,
            "validation_content_length": content_length,
            "validation_reason": validation_reason
            or ("Vídeo validado pelo crawler INES." if video_valid else "Sem vídeo validado no catálogo INES."),
            "license_text": self.settings.ines_full_catalog_authorization_note or INES_LICENSE,
            "license_notes": INES_LICENSE_NOTES,
            "status": SignStatus.pending.value,
            "import_notes": "Imagem é apoio visual; Avatar Libras exige vídeo/GIF/animação aprovada.",
            "detection_method": detection_method or ("site_crawl" if video_valid else "support_image_only"),
        }

    def _validated_entry(self, entry: dict[str, Any], manifest: dict[str, Any]) -> dict[str, Any]:
        source = manifest.get("source", {}) if isinstance(manifest.get("source"), dict) else {}
        word = str(entry.get("word") or "").strip()
        normalized_word = self.normalizer.normalize_word(str(entry.get("normalized_word") or word))
        video_url = self._clean(entry.get("avatar_video_url")) or self._clean(entry.get("video_url"))
        image_url = self._clean(entry.get("image_url")) or self._clean(entry.get("handshape_image_url"))
        validation = None
        if video_url:
            validation = validate_remote_media_url(
                video_url,
                "video",
                timeout_seconds=self.settings.ines_import_timeout_seconds,
                user_agent=self.settings.ines_full_catalog_user_agent,
            )
            if validation.get("valid"):
                video_url = str(validation.get("final_url") or video_url)
            else:
                video_url = None
        image_validation = self._validate_image(image_url)
        image_url = image_url if image_validation.get("valid") else None
        video_valid = bool(video_url and validation and validation.get("valid"))
        return {
            **entry,
            "word": word,
            "normalized_word": normalized_word,
            "source_name": entry.get("source_name") or source.get("name") or INES_SOURCE_NAME,
            "source_url": entry.get("source_url") or source.get("base_url") or INES_SOURCE_URL,
            "source_reference_url": entry.get("source_reference_url") or f"{INES_SOURCE_URL}?q={word}",
            "license_text": entry.get("license_text") or source.get("authorization") or INES_LICENSE,
            "license_notes": entry.get("license_notes") or INES_LICENSE_NOTES,
            "video_url": video_url if video_valid else None,
            "avatar_video_url": video_url if video_valid else None,
            "image_url": image_url,
            "handshape_image_url": image_url if image_url and is_handshape_image(image_url) else entry.get("handshape_image_url"),
            "media_type": "video" if video_valid else "image" if image_url else "none",
            "can_use_avatar": video_valid,
            "video_validated": video_valid,
            "image_validated": bool(image_url),
            "validated": video_valid,
            "http_status": validation.get("status_code") if validation else None,
            "content_type": validation.get("content_type") if validation else None,
            "validation_status_code": validation.get("status_code") if validation else None,
            "validation_content_type": validation.get("content_type") if validation else None,
            "validation_final_url": validation.get("final_url") if validation else None,
            "validation_content_length": validation.get("content_length") if validation else None,
            "validation_reason": validation.get("reason") if validation else "Imagem estática é apoio visual; sem vídeo validado.",
            "detection_method": entry.get("detection_method") or ("manifest" if video_valid else "support_image_only" if image_url else "none"),
        }

    def _apply_entry(self, sign: Sign, item: dict[str, Any], *, overwrite: bool, status: str) -> None:
        sign.word = str(item["word"])
        sign.normalized_word = str(item["normalized_word"])
        self._set_if_empty(sign, "gloss", self._clean(item.get("gloss")), overwrite)
        self._set_if_empty(sign, "description", self._description(item), overwrite)
        self._set_if_empty(sign, "example_sentence", self._clean(item.get("example")), overwrite)
        if item.get("video_validated") and item.get("video_url"):
            if overwrite or not sign.video_url:
                sign.video_url = str(item["video_url"])
                sign.avatar_video_url = str(item.get("avatar_video_url") or item["video_url"])
        if item.get("image_validated") and item.get("image_url"):
            self._set_if_empty(sign, "image_url", self._clean(item.get("image_url")), overwrite)
        self._set_if_empty(sign, "source_name", self._clean(item.get("source_name")), overwrite)
        self._set_if_empty(sign, "source_url", self._clean(item.get("source_url")), overwrite)
        self._set_if_empty(sign, "license", self._clean(item.get("license_text")) or self._clean(item.get("license")), overwrite)
        sign.educational_notes = self._merge_notes(sign.educational_notes, item, overwrite=overwrite)
        sign.curator_notes = self._clean(item.get("curator_notes")) or "Catálogo INES importado automaticamente; revisar fonte/licença e validar por especialista em Libras."
        sign.status = status if status in {SignStatus.pending.value, SignStatus.review.value, SignStatus.needs_specialist_review.value} else SignStatus.pending.value
        sign.version = (sign.version or 1) + 1

    def _description(self, item: dict[str, Any]) -> str | None:
        lines = []
        if item.get("meaning"):
            lines.append(f"Acepção: {item['meaning']}")
        if item.get("grammatical_class"):
            lines.append(f"Classe gramatical: {item['grammatical_class']}")
        if item.get("origin"):
            lines.append(f"Origem: {item['origin']}")
        return "\n".join(lines) or None

    def _merge_notes(self, existing: str | None, item: dict[str, Any], *, overwrite: bool) -> str:
        prefixes = (
            "URL consultada:",
            "Observações de licença:",
            "Método de detecção:",
            "Imagem/configuração de mão:",
            "Exemplo em Libras:",
            "Notas da importação INES:",
        )
        lines = [] if overwrite else [line for line in (existing or "").splitlines() if not line.startswith(prefixes)]
        if not lines:
            lines.append("Catálogo INES importado por rotina administrativa controlada; não roda em build/deploy/startup.")
        if item.get("license_notes"):
            lines.append(f"Observações de licença: {item['license_notes']}")
        if item.get("source_reference_url"):
            lines.append(f"URL consultada: {item['source_reference_url']}")
        if item.get("detection_method"):
            lines.append(f"Método de detecção: {item['detection_method']}")
        if item.get("handshape_image_url"):
            lines.append(f"Imagem/configuração de mão: {item['handshape_image_url']}")
        if item.get("libras_example"):
            lines.append(f"Exemplo em Libras: {item['libras_example']}")
        if item.get("import_notes"):
            lines.append(f"Notas da importação INES: {item['import_notes']}")
        return "\n".join(lines)

    def _append_import_item(self, report: dict[str, Any], item: dict[str, Any], *, imported: bool, skipped: bool) -> None:
        if item.get("video_validated"):
            report["video_found_count"] += 1
        if item.get("image_validated"):
            report["image_found_count"] += 1
        if not item.get("video_validated"):
            report["video_missing_count"] += 1
        if imported:
            report["imported_count"] += 1
        if skipped:
            report["skipped_count"] += 1
        report["items"].append(
            {
                "word": item.get("word"),
                "letter": str(item.get("normalized_word") or "")[:1].upper(),
                "media_type": item.get("media_type"),
                "video_url": item.get("video_url"),
                "avatar_video_url": item.get("avatar_video_url"),
                "image_url": item.get("image_url"),
                "handshape_image_url": item.get("handshape_image_url"),
                "http_status": item.get("http_status") or item.get("validation_status_code"),
                "content_type": item.get("content_type") or item.get("validation_content_type"),
                "can_use_avatar": bool(item.get("can_use_avatar")),
                "validated": bool(item.get("video_validated")),
                "image_validated": bool(item.get("image_validated")),
                "status": item.get("status") or "pending",
                "detection_method": item.get("detection_method"),
                "reason": item.get("reason") or item.get("validation_reason"),
                "recommended_action": item.get("recommended_action")
                or ("Revisar e aprovar manualmente" if item.get("can_use_avatar") else "Precisa de vídeo/GIF/animação validada."),
            }
        )

    def _scan_report(self, manifest: dict[str, Any], *, manifest_path: str | None) -> dict[str, Any]:
        stats = manifest.get("stats", {})
        return {
            "status": "completed",
            "source": "ines_full_catalog",
            "letters_scanned": stats.get("letters_scanned", 0),
            "entries_found": stats.get("entries_found", 0),
            "videos_found": stats.get("videos_valid", 0),
            "images_found": stats.get("images_valid", 0),
            "without_video": stats.get("without_video", 0),
            "imported_count": 0,
            "skipped_count": 0,
            "errors_count": stats.get("errors", 0),
            "manifest_path": manifest_path,
            "items": [
                {
                    "word": entry.get("word"),
                    "letter": str(entry.get("normalized_word") or "")[:1].upper(),
                    "media_type": entry.get("media_type"),
                    "video_url": entry.get("video_url"),
                    "image_url": entry.get("image_url"),
                    "http_status": entry.get("http_status"),
                    "content_type": entry.get("content_type"),
                    "can_use_avatar": entry.get("can_use_avatar"),
                    "validated": entry.get("video_validated"),
                    "status": "manifest",
                    "detection_method": entry.get("detection_method"),
                    "reason": entry.get("validation_reason"),
                }
                for entry in manifest.get("entries", [])[:100]
            ],
            "errors": manifest.get("errors", []),
        }

    def _empty_import_report(self, *, total_items: int) -> dict[str, Any]:
        return {
            "status": "completed",
            "total_items": total_items,
            "processed_items": 0,
            "imported_count": 0,
            "created_count": 0,
            "updated_count": 0,
            "pending_count": 0,
            "skipped_count": 0,
            "error_count": 0,
            "video_found_count": 0,
            "image_found_count": 0,
            "video_missing_count": 0,
            "items": [],
            "warnings": [],
            "errors": [],
        }

    def _entries(self, manifest: dict[str, Any]) -> list[dict[str, Any]]:
        raw = manifest.get("entries", [])
        if isinstance(raw, dict):
            return [entry for entry in raw.values() if isinstance(entry, dict)]
        if isinstance(raw, list):
            return [entry for entry in raw if isinstance(entry, dict)]
        return []

    def _validate_image(self, url: str | None) -> dict[str, Any]:
        if not url:
            return {"valid": False, "reason": "Sem imagem de apoio."}
        return validate_remote_image_url(
            url,
            timeout_seconds=self.settings.ines_import_timeout_seconds,
            user_agent=self.settings.ines_full_catalog_user_agent,
        )

    def _read_manifest(self, manifest_path: str | None) -> dict[str, Any]:
        path = self._safe_manifest_path(manifest_path)
        if not path.exists():
            raise RuntimeError("Manifesto INES não encontrado.")
        return json.loads(path.read_text(encoding="utf-8"))

    def _safe_manifest_path(self, manifest_path: str | None) -> Path:
        if manifest_path:
            path = Path(manifest_path)
            if not path.is_absolute():
                path = self._repo_root() / path
        else:
            path = self._default_manifest_path()
        resolved = path.resolve()
        allowed_roots = [self._default_manifest_path().parent.resolve(), (self._repo_root() / "backend" / "data" / "generated").resolve()]
        if not any(resolved == root or root in resolved.parents for root in allowed_roots):
            raise RuntimeError("Caminho de manifesto não permitido para importação administrativa.")
        return resolved

    def _manifest_path(self, *, overwrite_manifest: bool) -> Path:
        path = self._default_manifest_path()
        if overwrite_manifest or not path.exists():
            return path
        timestamp = utc_iso().replace(":", "").replace("-", "").replace(".", "")
        return path.with_name(f"ines_full_catalog.{timestamp}.generated.json")

    def _default_manifest_path(self) -> Path:
        return self._repo_root() / "backend" / "app" / "importers" / "manifests" / MANIFEST_FILENAME

    def _repo_root(self) -> Path:
        return Path(__file__).resolve().parents[3]

    def _effective_limit(self, requested: int | None) -> int:
        configured = max(1, self.settings.ines_full_catalog_max_items)
        if requested is None:
            return configured
        return max(1, min(int(requested), configured))

    def _letters(self, letters: list[str] | None) -> list[str]:
        values = letters or list("ABCDEFGHIJKLMNOPQRSTUVWXYZ")
        normalized = []
        for letter in values:
            value = str(letter or "").strip().upper()[:1]
            if value and value.isalpha() and value not in normalized:
                normalized.append(value)
        return normalized or list("ABCDEFGHIJKLMNOPQRSTUVWXYZ")

    def _create_job(
        self,
        *,
        source_name: str,
        source_type: str,
        total_records: int,
        report: dict[str, Any],
        manifest: dict[str, Any],
        user: User | None,
    ) -> ImportJob | None:
        if self.db is None:
            return None
        job = ImportJob(
            source_type=source_type,
            source_name=source_name,
            status=ImportStatus.completed.value,
            total_records=total_records,
            imported_records=int(report.get("entries_found") or report.get("imported_count") or 0),
            updated_records=0,
            failed_records=int(report.get("errors_count") or report.get("error_count") or 0),
            logs=[
                {
                    "level": "report",
                    "row": None,
                    "message": "Catálogo completo INES executado sob demanda por admin.",
                    "report": report,
                    "generated_at": manifest.get("source", {}).get("generated_at") if isinstance(manifest.get("source"), dict) else None,
                    "user_id": user.id if user else None,
                }
            ],
            finished_at=utc_now(),
        )
        self.db.add(job)
        self.db.commit()
        self.db.refresh(job)
        return job

    def _record_error(self, job: ImportJob, report: dict[str, Any], row: int, word: str | None, message: str) -> None:
        report["error_count"] += 1
        report["errors"].append({"word": word, "message": message})
        self._log(job, "error", row, f"{word or 'entrada'}: {message}")
        if self.db is not None:
            self.db.commit()

    def _log(self, job: ImportJob, level: str, row: int | None, message: str, **extra: Any) -> None:
        logs = list(job.logs or [])
        entry = {"level": level, "row": row, "message": message}
        entry.update(extra)
        logs.append(entry)
        job.logs = logs

    def _set_if_empty(self, sign: Sign, field: str, value: str | None, overwrite: bool) -> None:
        if value and (overwrite or not getattr(sign, field)):
            setattr(sign, field, value)

    def _snapshot(self, sign: Sign | None) -> dict[str, Any] | None:
        if sign is None:
            return None
        return {
            "id": sign.id,
            "word": sign.word,
            "normalized_word": sign.normalized_word,
            "gloss": sign.gloss,
            "status": sign.status,
            "source_name": sign.source_name,
            "source_url": sign.source_url,
            "source_reference_url": sign.source_reference_url,
            "license": sign.license,
            "license_notes": sign.license_notes,
            "video_url": sign.video_url,
            "avatar_video_url": sign.avatar_video_url,
            "avatar_gif_url": sign.avatar_gif_url,
            "avatar_animation_url": sign.avatar_animation_url,
            "image_url": sign.image_url,
            "curator_notes": sign.curator_notes,
        }

    def _clean(self, value: Any) -> str | None:
        if value is None:
            return None
        value = str(value).strip()
        return value or None
