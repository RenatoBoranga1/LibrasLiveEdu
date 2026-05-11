from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import utc_now
from app.models import ImportJob, Sign, SignAuditLog, User
from app.services.media_validation import validate_remote_media_url
from app.services.text_normalizer import TextNormalizerService


class MediaManifestImporter:
    """Imports reviewed crawler manifests without approving signs automatically."""

    def __init__(self, db: Session):
        self.db = db
        self.normalizer = TextNormalizerService()

    def import_manifest(
        self,
        *,
        manifest: dict[str, Any],
        source: str,
        user: User,
        approve_authorized: bool = False,
        overwrite: bool = False,
    ) -> tuple[ImportJob, dict[str, Any]]:
        entries = self._entries(manifest)
        report = self._empty_report(total_items=len(entries))
        if approve_authorized:
            report["warnings"].append({"word": None, "message": "Manifestos importados permanecem pending; aprove manualmente apos curadoria."})

        job = ImportJob(
            source_type="json",
            source_name=f"Media manifest import: {source}",
            status="running",
            total_records=len(entries),
            logs=[
                {
                    "level": "settings",
                    "row": None,
                    "message": "Importacao de manifesto de midias iniciada sob demanda por admin.",
                    "settings": {"source": source, "overwrite": overwrite, "approve_authorized": approve_authorized},
                }
            ],
        )
        self.db.add(job)
        self.db.commit()
        self.db.refresh(job)

        for index, entry in enumerate(entries, start=1):
            try:
                word = self._clean(entry.get("word"))
                normalized_word = self.normalizer.normalize_word(word or "")
                if not word or not normalized_word:
                    self._record_error(job, report, index, None, "Entrada sem palavra.")
                    continue
                media_type = self._clean(entry.get("media_type")) or self._infer_media_type(entry)
                video_url = self._clean(entry.get("avatar_video_url")) or self._clean(entry.get("video_url"))
                gif_url = self._clean(entry.get("avatar_gif_url")) or self._clean(entry.get("gif_url"))
                animation_url = self._clean(entry.get("avatar_animation_url"))
                image_url = self._clean(entry.get("image_url"))
                validations: list[dict[str, Any]] = []
                if video_url:
                    validation = validate_remote_media_url(video_url, "video")
                    validations.append(validation)
                    if validation.get("valid"):
                        video_url = self._clean(validation.get("final_url")) or video_url
                    else:
                        report["warnings"].append({"word": word, "message": str(validation.get("reason") or "Vídeo inválido; salvo apenas apoio visual se houver image_url.")})
                        video_url = None
                if gif_url:
                    validation = validate_remote_media_url(gif_url, "gif")
                    validations.append(validation)
                    if validation.get("valid"):
                        gif_url = self._clean(validation.get("final_url")) or gif_url
                    else:
                        report["warnings"].append({"word": word, "message": str(validation.get("reason") or "GIF inválido; salvo apenas apoio visual se houver image_url.")})
                        gif_url = None
                if animation_url:
                    validation = validate_remote_media_url(animation_url, "animation")
                    validations.append(validation)
                    if validation.get("valid"):
                        animation_url = self._clean(validation.get("final_url")) or animation_url
                    else:
                        report["warnings"].append({"word": word, "message": str(validation.get("reason") or "Animação inválida; salvo apenas apoio visual se houver image_url.")})
                        animation_url = None
                validation = next((item for item in validations if item.get("valid")), None) or (validations[0] if validations else self._support_image_validation())
                can_use_avatar = bool(video_url or gif_url or animation_url)
                media_type = "video" if video_url else "gif" if gif_url else "animation" if animation_url else "image" if image_url else "none"
                if not (video_url or gif_url or animation_url or image_url):
                    self._record_error(job, report, index, word, str(validation.get("reason") or "Entrada sem URL de midia validada."))
                    continue

                sign = self.db.scalar(select(Sign).where(Sign.normalized_word == normalized_word).order_by(Sign.updated_at.desc()).limit(1))
                if sign and sign.status == "approved" and not overwrite:
                    report["skipped_count"] += 1
                    report["warnings"].append({"word": word, "message": "Sinal aprovado existente nao foi sobrescrito."})
                    self._log(job, "warning", index, f"{word}: sinal aprovado nao sobrescrito.")
                    self.db.commit()
                    continue

                created = sign is None
                old_value = self._snapshot(sign)
                if sign is None:
                    sign = Sign(word=word, normalized_word=normalized_word, status="pending")
                    self.db.add(sign)
                    self.db.flush()

                sign.word = word
                sign.normalized_word = normalized_word
                sign.gloss = self._clean(entry.get("gloss")) or sign.gloss
                if overwrite or not sign.video_url:
                    sign.video_url = video_url or sign.video_url
                if overwrite or not sign.avatar_gif_url:
                    sign.avatar_gif_url = gif_url or sign.avatar_gif_url
                if overwrite or not sign.avatar_animation_url:
                    sign.avatar_animation_url = animation_url or sign.avatar_animation_url
                if overwrite or not sign.image_url:
                    sign.image_url = image_url or sign.image_url
                sign.source_name = self._clean(entry.get("source_name")) or self._clean(manifest.get("source_name")) or sign.source_name
                sign.source_url = self._clean(entry.get("source_url")) or self._clean(manifest.get("source_url")) or sign.source_url
                sign.license = self._clean(entry.get("license")) or self._clean(manifest.get("license")) or sign.license
                sign.educational_notes = self._merge_notes(
                    sign.educational_notes,
                    source_reference_url=self._clean(entry.get("source_reference_url")),
                    license_notes=self._clean(entry.get("license_notes")) or self._clean(manifest.get("license_notes")),
                    detection_method=self._clean(entry.get("detection_method")),
                )
                sign.curator_notes = self._clean(entry.get("curator_notes")) or "Midia importada de manifesto gerado por crawler autorizado; aguardando curadoria."
                sign.status = "pending"
                sign.version = (sign.version or 1) + 1
                self.db.flush()
                self.db.add(SignAuditLog(sign_id=sign.id, user_id=user.id, action="media_manifest_import", old_value=old_value, new_value=self._snapshot(sign)))

                report["processed_items"] += 1
                report["pending_count"] += 1
                report["created_count" if created else "updated_count"] += 1
                if created:
                    job.imported_records += 1
                else:
                    job.updated_records += 1
                if video_url:
                    report["video_found_count"] += 1
                if gif_url:
                    report["gif_found_count"] += 1
                if image_url:
                    report["image_found_count"] += 1
                report["items"].append(
                    {
                        "word": word,
                        "status": "pending",
                        "media_type": media_type,
                        "can_use_avatar": can_use_avatar,
                        "validated": bool(validation.get("valid")),
                        "validation_status_code": validation.get("status_code"),
                        "validation_content_type": validation.get("content_type"),
                        "validation_final_url": validation.get("final_url"),
                        "validation_content_length": validation.get("content_length"),
                        "validation_reason": validation.get("reason") or ("Imagem estática é apenas apoio visual e não serve para Avatar Libras." if media_type == "image" else None),
                        "video_url": video_url,
                        "avatar_gif_url": gif_url,
                        "avatar_animation_url": animation_url,
                        "image_url": image_url,
                        "source_reference_url": entry.get("source_reference_url"),
                        "detection_method": entry.get("detection_method"),
                        "reason": "Manifesto importado; revisar e aprovar manualmente.",
                        "recommended_action": "Revisar e aprovar manualmente",
                    }
                )
                self._log(job, "success", index, f"{word}: manifesto importado como pending.")
                self.db.commit()
            except Exception as exc:  # noqa: BLE001
                self.db.rollback()
                self._record_error(job, report, index, str(entry.get("word") or ""), str(exc))

        job.status = "completed"
        job.failed_records = report["error_count"]
        job.finished_at = utc_now()
        self._log(job, "report", None, "Relatorio final da importacao de manifesto.", report=report)
        self.db.commit()
        self.db.refresh(job)
        return job, report

    def _entries(self, manifest: dict[str, Any]) -> list[dict[str, Any]]:
        raw_entries = manifest.get("entries", {})
        if isinstance(raw_entries, dict):
            return [entry for entry in raw_entries.values() if isinstance(entry, dict)]
        if isinstance(raw_entries, list):
            return [entry for entry in raw_entries if isinstance(entry, dict)]
        return []

    def _infer_media_type(self, entry: dict[str, Any]) -> str:
        if entry.get("video_url") or entry.get("avatar_video_url"):
            return "video"
        if entry.get("avatar_gif_url") or entry.get("gif_url"):
            return "gif"
        if entry.get("avatar_animation_url"):
            return "animation"
        if entry.get("image_url"):
            return "image"
        return "none"

    def _support_image_validation(self) -> dict[str, Any]:
        return {
            "valid": False,
            "url": None,
            "final_url": None,
            "status_code": None,
            "content_type": None,
            "content_length": None,
            "media_type": "none",
            "reason": "Imagem estática é apenas apoio visual e não serve para Avatar Libras.",
        }

    def _empty_report(self, *, total_items: int) -> dict[str, Any]:
        return {
            "total_items": total_items,
            "processed_items": 0,
            "created_count": 0,
            "updated_count": 0,
            "approved_count": 0,
            "pending_count": 0,
            "skipped_count": 0,
            "error_count": 0,
            "video_found_count": 0,
            "gif_found_count": 0,
            "image_found_count": 0,
            "video_missing_count": 0,
            "errors": [],
            "warnings": [],
            "items": [],
            "manual_required": [],
        }

    def _record_error(self, job: ImportJob, report: dict[str, Any], row: int, word: str | None, message: str) -> None:
        report["error_count"] += 1
        report["errors"].append({"word": word, "message": message})
        self._log(job, "error", row, f"{word or 'entrada'}: {message}")
        self.db.commit()

    def _log(self, job: ImportJob, level: str, row: int | None, message: str, **extra: Any) -> None:
        logs = list(job.logs or [])
        entry = {"level": level, "row": row, "message": message}
        entry.update(extra)
        logs.append(entry)
        job.logs = logs

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
            "license": sign.license,
            "video_url": sign.video_url,
            "avatar_gif_url": sign.avatar_gif_url,
            "avatar_animation_url": sign.avatar_animation_url,
            "image_url": sign.image_url,
            "curator_notes": sign.curator_notes,
        }

    def _merge_notes(self, existing: str | None, *, source_reference_url: str | None, license_notes: str | None, detection_method: str | None) -> str:
        lines = [line for line in (existing or "").splitlines() if not line.startswith(("URL consultada:", "Observações de licença:", "Método de detecção:"))]
        if not lines:
            lines.append("Midia vinculada por manifesto administrativo autorizado.")
        if license_notes:
            lines.append(f"Observações de licença: {license_notes}")
        if source_reference_url:
            lines.append(f"URL consultada: {source_reference_url}")
        if detection_method:
            lines.append(f"Método de detecção: {detection_method}")
        return "\n".join(lines)

    def _clean(self, value: Any) -> str | None:
        if value is None:
            return None
        value = str(value).strip()
        return value or None
