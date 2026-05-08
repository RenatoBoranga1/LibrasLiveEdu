import json
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models import ImportJob, ImportStatus, Sign, SignAuditLog, SignStatus, User
from app.importers.ifpr_gif_importer import IfprGifImporter
from app.importers.ines_media_importer import InesMediaImporter
from app.services.text_normalizer import TextNormalizerService


class MediaAutoFillImporter:
    """Admin-triggered media URL autofill across authorized sources.

    This service is intentionally synchronous, rate-limited and explicit. It
    never runs during app startup, build, deploy, migrations or seeds.
    """

    allowed_sources = {"ines", "ifpr"}

    def __init__(self, db: Session):
        self.db = db
        self.settings = get_settings()
        self.normalizer = TextNormalizerService()
        self.ines = InesMediaImporter(db)
        self.ifpr = IfprGifImporter()

    def auto_fill_pending_media(
        self,
        max_items: int | None = None,
        source_priority: list[str] | None = None,
        *,
        user: User | None = None,
        overwrite: bool = False,
    ) -> tuple[ImportJob, dict[str, Any]]:
        if user is None:
            raise RuntimeError("Usuário admin é obrigatório para registrar auditoria.")
        limit = self._effective_limit(max_items)
        signs = list(
            self.db.scalars(
                select(Sign)
                .where(
                    Sign.status.in_([SignStatus.pending.value, SignStatus.review.value, SignStatus.needs_specialist_review.value]),
                    Sign.video_url.is_(None),
                    Sign.avatar_gif_url.is_(None),
                    Sign.avatar_animation_url.is_(None),
                )
                .order_by(Sign.updated_at.desc())
                .limit(limit)
            )
        )
        words = [{"word": sign.word, "sign": sign} for sign in signs]
        return self._run(words, user=user, source_priority=source_priority, overwrite=overwrite, create_missing=False, source_name="Media auto fill: pending")

    def auto_fill_selected_words(
        self,
        words: list[str],
        max_items: int | None = None,
        source_priority: list[str] | None = None,
        *,
        user: User | None = None,
        overwrite: bool = False,
    ) -> tuple[ImportJob, dict[str, Any]]:
        if user is None:
            raise RuntimeError("Usuário admin é obrigatório para registrar auditoria.")
        limit = self._effective_limit(max_items)
        normalized_seen: set[str] = set()
        items: list[dict[str, Any]] = []
        for raw_word in words:
            word = self._clean(raw_word)
            normalized = self.normalizer.normalize_word(word or "")
            if not word or not normalized or normalized in normalized_seen:
                continue
            normalized_seen.add(normalized)
            items.append({"word": word})
            if len(items) >= limit:
                break
        return self._run(items, user=user, source_priority=source_priority, overwrite=overwrite, create_missing=True, source_name="Media auto fill: selected")

    def diagnose_media_sources(self, words: list[str], max_items: int | None = None, source_priority: list[str] | None = None) -> dict[str, Any]:
        limit = self._effective_limit(max_items)
        normalized_seen: set[str] = set()
        limited_words: list[str] = []
        for raw_word in words:
            word = self._clean(raw_word)
            normalized = self.normalizer.normalize_word(word or "")
            if not word or not normalized or normalized in normalized_seen:
                continue
            normalized_seen.add(normalized)
            limited_words.append(word)
            if len(limited_words) >= limit:
                break

        report = self._empty_report(total_items=len(limited_words))
        priority = self._source_priority(source_priority)
        for index, word in enumerate(limited_words):
            result = self._find_media(word, priority)
            report["processed_items"] += 1
            self._append_item_from_result(report, word=word, sign_status="diagnostic", result=result, changed=False)
            if index < len(limited_words) - 1:
                self._delay()
        return report

    def _run(
        self,
        items: list[dict[str, Any]],
        *,
        user: User,
        source_priority: list[str] | None,
        overwrite: bool,
        create_missing: bool,
        source_name: str,
    ) -> tuple[ImportJob, dict[str, Any]]:
        priority = self._source_priority(source_priority)
        report = self._empty_report(total_items=len(items))
        job = ImportJob(
            source_type="api",
            source_name=source_name,
            status=ImportStatus.running.value,
            total_records=len(items),
            logs=[
                {
                    "level": "settings",
                    "row": None,
                    "message": "Preenchimento automático de URLs de mídia iniciado sob demanda por admin.",
                    "settings": {
                        "source_priority": priority,
                        "max_items": len(items),
                        "overwrite": overwrite,
                        "delay_ms": self.settings.media_auto_fill_delay_ms,
                        "timeout_seconds": self.settings.media_auto_fill_timeout_seconds,
                        "download_media": False,
                    },
                }
            ],
        )
        self.db.add(job)
        self.db.commit()
        self.db.refresh(job)

        for index, item in enumerate(items, start=1):
            word = self._clean(item.get("word"))
            if not word:
                self._record_error(job, report, index, None, "Item sem palavra.")
                continue
            try:
                sign = item.get("sign") if isinstance(item.get("sign"), Sign) else self._find_sign(word)
                if sign and sign.status == SignStatus.approved.value and not overwrite:
                    report["skipped_count"] += 1
                    self._append_item(
                        report,
                        word=word,
                        normalized_word=self.normalizer.normalize_word(word),
                        source_used=None,
                        media_type=self._sign_media_type(sign),
                        media_found=self._sign_media_found(sign),
                        video_found=bool(sign.video_url),
                        gif_found=bool(sign.avatar_gif_url),
                        image_found=bool(sign.image_url),
                        can_use_avatar=self._has_primary_media(sign),
                        detection_method="manual",
                        status=sign.status,
                        reason="Sinal aprovado existente não foi alterado automaticamente.",
                        recommended_action="Revisar manualmente se precisar trocar mídia",
                    )
                    self._log(job, "warning", index, f"{word}: sinal aprovado não foi alterado automaticamente.")
                    self.db.commit()
                    continue
                if sign and self._has_primary_media(sign) and not overwrite:
                    report["skipped_count"] += 1
                    self._append_item(
                        report,
                        word=word,
                        normalized_word=self.normalizer.normalize_word(word),
                        source_used=None,
                        media_type=self._sign_media_type(sign),
                        media_found=self._sign_media_found(sign),
                        video_found=bool(sign.video_url),
                        gif_found=bool(sign.avatar_gif_url),
                        image_found=bool(sign.image_url),
                        can_use_avatar=self._has_primary_media(sign),
                        detection_method="manual",
                        status=sign.status,
                        reason="Sinal já possui vídeo ou GIF; nada foi sobrescrito.",
                        recommended_action="Revisar mídia existente",
                    )
                    self._log(job, "warning", index, f"{word}: sinal já possui mídia e overwrite=false.")
                    self.db.commit()
                    continue

                result = self._find_media(word, priority)
                if result.get("media_found"):
                    sign, created, changed = self._apply_media(sign, word, result, user, overwrite=overwrite, create_missing=create_missing)
                    if created:
                        report["created_count"] += 1
                        job.imported_records += 1
                    if changed and not created:
                        report["updated_count"] += 1
                        job.updated_records += 1
                    if changed:
                        report["pending_count"] += 1
                    report["processed_items"] += 1
                    self._append_item_from_result(report, word=word, sign_status=sign.status if sign else "pending", result=result, changed=changed)
                    self._log(job, "success", index, f"{word}: mídia encontrada via {result.get('source_used')} e sinal mantido pending.", result=result)
                    self.db.commit()
                else:
                    report["processed_items"] += 1
                    report["media_missing_count"] += 1
                    if create_missing:
                        sign, created, changed = self._create_missing_placeholder(sign, word, result, user)
                        if created:
                            report["created_count"] += 1
                            job.imported_records += 1
                        elif changed:
                            report["updated_count"] += 1
                            job.updated_records += 1
                        if created or changed:
                            report["pending_count"] += 1
                    self._append_item_from_result(report, word=word, sign_status=sign.status if sign else "pending", result=result, changed=False)
                    self._log(job, "warning", index, f"{word}: mídia não encontrada automaticamente.", result=result)
                    self.db.commit()
                self._delay()
            except Exception as exc:  # noqa: BLE001
                self.db.rollback()
                self._record_error(job, report, index, word, str(exc))

        job.status = ImportStatus.completed.value
        job.failed_records = report["error_count"]
        job.finished_at = datetime.now(timezone.utc)
        self._log(job, "report", None, "Relatório final do preenchimento automático de mídia.", report=report)
        self.db.commit()
        self.db.refresh(job)
        return job, report

    def _find_media(self, word: str, source_priority: list[str]) -> dict[str, Any]:
        diagnostics: list[dict[str, Any]] = []
        fallback_image: dict[str, Any] | None = None

        if "ines" in source_priority:
            manifest_lookup = self._find_manifest_media(word, "ines")
            if manifest_lookup:
                manifest_result = self._normalize_media_result(word, "ines", str(manifest_lookup.get("media_type") or "video"), manifest_lookup)
                if manifest_result.get("can_use_avatar"):
                    return manifest_result
                if manifest_result.get("image_url"):
                    fallback_image = manifest_result

        manual_lookup = self._find_manual_manifest_media(word)
        if manual_lookup:
            manual_result = self._normalize_media_result(word, str(manual_lookup.get("source_used") or "manual"), str(manual_lookup.get("media_type") or "video"), manual_lookup)
            if manual_result.get("can_use_avatar"):
                return manual_result
            if manual_result.get("image_url") and not fallback_image:
                fallback_image = manual_result

        for source in source_priority:
            if source == "ines":
                if not self.settings.ines_import_enabled:
                    diagnostics.append(
                        {
                            "source": "ines",
                            "found": False,
                            "reason": "INES_IMPORT_ENABLED=false; fonte INES desativada.",
                            "warnings": ["Ative INES_IMPORT_ENABLED=true somente no ambiente administrativo."],
                            "errors": [],
                        }
                    )
                    continue
                lookup = self.ines.find_ines_entry_for_word(word)
                diagnostics.append(lookup)
                if lookup.get("found") and lookup.get("video_url"):
                    return self._normalize_media_result(word, "ines", "video", lookup)
                if lookup.get("image_url") and not fallback_image:
                    fallback_image = self._normalize_media_result(word, "ines", "image", lookup)
            if source == "ifpr":
                manifest_lookup = self._find_manifest_media(word, "ifpr")
                if manifest_lookup:
                    manifest_result = self._normalize_media_result(word, "ifpr", str(manifest_lookup.get("media_type") or "gif"), manifest_lookup)
                    if manifest_result.get("can_use_avatar"):
                        return manifest_result
                    if manifest_result.get("image_url") and not fallback_image:
                        fallback_image = manifest_result
                lookup = self.ifpr.find_gif_for_word(word)
                diagnostics.append(lookup)
                if lookup.get("found") and lookup.get("avatar_gif_url"):
                    return self._normalize_media_result(word, "ifpr", "gif", lookup)

        if fallback_image:
            image_url = str(fallback_image.get("image_url") or "")
            if "/public/media/mao/" in image_url:
                fallback_image["reason"] = "Imagem estatica de configuracao de mao; nao representa movimento do sinal em Libras."
            else:
                fallback_image["reason"] = "Imagem encontrada como apoio visual; vídeo/GIF não foram detectados."
            fallback_image["recommended_action"] = "Precisa de video/GIF/animacao"
            fallback_image["detection_method"] = "support_image_only"
            return fallback_image

        reasons = [str(item.get("reason")) for item in diagnostics if item.get("reason")]
        warnings = self._flatten_messages(diagnostics, "warnings")
        errors = self._flatten_messages(diagnostics, "errors")
        return {
            "word": word,
            "normalized_word": self.normalizer.normalize_word(word),
            "source_used": None,
            "media_type": "none",
            "media_found": False,
            "video_found": False,
            "gif_found": False,
            "image_found": False,
            "can_use_avatar": False,
            "video_url": None,
            "avatar_video_url": None,
            "avatar_gif_url": None,
            "image_url": None,
            "source_name": None,
            "source_url": None,
            "source_reference_url": None,
            "license": None,
            "license_notes": None,
            "reason": "Nenhuma mídia foi localizada automaticamente." if not reasons else " | ".join(reasons[:3]),
            "recommended_action": "Importar manualmente por JSON/CSV autorizado",
            "detection_method": "none",
            "warnings": warnings,
            "errors": errors,
            "diagnostics": diagnostics,
        }

    def _normalize_media_result(self, word: str, source: str, media_type: str, lookup: dict[str, Any]) -> dict[str, Any]:
        if source == "ines":
            source_name = self.ines.source_name
            source_url = self.settings.ines_base_url
            license_text = self.settings.ines_import_authorization_text
            license_notes = "Vídeo autorizado para uso educacional no aplicativo LibrasLive Edu."
        else:
            source_name = self.settings.ifpr_gif_source_name
            source_url = self.settings.ifpr_gif_base_url
            license_text = self.settings.ifpr_gif_license_text
            license_notes = self.settings.ifpr_gif_license_notes

        video_url = self._clean(lookup.get("avatar_video_url")) or self._clean(lookup.get("video_url"))
        avatar_gif_url = self._clean(lookup.get("avatar_gif_url")) or self._clean(lookup.get("gif_url"))
        explicit_image_url = self._clean(lookup.get("image_url"))
        image_url = explicit_image_url
        if media_type == "gif" and not image_url:
            image_url = avatar_gif_url
        video_found = bool(video_url)
        gif_found = bool(avatar_gif_url)
        image_found = bool(explicit_image_url)
        can_use_avatar = video_found or gif_found or media_type == "animation"
        detection_method = self._clean(lookup.get("detection_method"))
        if not detection_method:
            detection_method = "gif_lookup" if media_type == "gif" else "support_image_only" if media_type == "image" else "html_video" if media_type == "video" else "none"

        return {
            "word": word,
            "normalized_word": self.normalizer.normalize_word(word),
            "source_used": source,
            "media_type": media_type,
            "detection_method": detection_method,
            "media_found": True,
            "video_found": video_found,
            "gif_found": gif_found,
            "image_found": image_found,
            "can_use_avatar": can_use_avatar,
            "validated": bool(lookup.get("validated")),
            "http_status": lookup.get("http_status"),
            "content_type": lookup.get("content_type"),
            "video_url": video_url,
            "avatar_video_url": video_url,
            "avatar_gif_url": avatar_gif_url,
            "image_url": image_url,
            "source_name": self._clean(lookup.get("source_name")) or source_name,
            "source_url": self._clean(lookup.get("source_url")) or source_url,
            "source_reference_url": self._clean(lookup.get("source_reference_url")) or self._clean(lookup.get("search_url")) or source_url,
            "license": self._clean(lookup.get("license")) or license_text,
            "license_notes": self._clean(lookup.get("license_notes")) or license_notes,
            "gloss": self._clean(lookup.get("gloss")),
            "reason": self._clean(lookup.get("reason")) or ("Vídeo encontrado." if media_type == "video" else "Apenas imagem de apoio encontrada." if media_type == "image" else "Mídia encontrada."),
            "recommended_action": self._clean(lookup.get("recommended_action")) or ("Precisa de vídeo/GIF/animação" if media_type == "image" else "Revisar e aprovar manualmente"),
            "warnings": lookup.get("warnings", []),
            "errors": lookup.get("errors", []),
            "diagnostics": [lookup],
        }

    def _apply_media(
        self,
        sign: Sign | None,
        word: str,
        result: dict[str, Any],
        user: User,
        *,
        overwrite: bool,
        create_missing: bool,
    ) -> tuple[Sign | None, bool, bool]:
        if sign and sign.status == SignStatus.approved.value and not overwrite:
            return sign, False, False
        if sign is None and not create_missing:
            return None, False, False

        created = sign is None
        old_value = self._snapshot(sign)
        if sign is None:
            sign = Sign(word=word, normalized_word=self.normalizer.normalize_word(word), status=SignStatus.pending.value)
            self.db.add(sign)
            self.db.flush()

        for key in ("video_url", "avatar_video_url", "avatar_gif_url", "image_url", "source_url", "source_reference_url"):
            value = self._clean(result.get(key))
            if value and not self._is_http_url(value):
                raise ValueError(f"{key} deve começar com http:// ou https://.")
        if result.get("media_type") in {"video", "gif"} and not (result.get("source_name") and result.get("source_url") and result.get("license") and result.get("license_notes")):
            raise ValueError("Mídia autorizada exige fonte, URL da fonte, licença e observações de licença.")

        sign.word = word
        sign.normalized_word = self.normalizer.normalize_word(word)
        sign.gloss = self._clean(result.get("gloss")) or sign.gloss
        if overwrite or not sign.video_url:
            sign.video_url = self._clean(result.get("avatar_video_url")) or self._clean(result.get("video_url")) or sign.video_url
        if overwrite or not sign.avatar_gif_url:
            sign.avatar_gif_url = self._clean(result.get("avatar_gif_url")) or sign.avatar_gif_url
        if overwrite or not sign.image_url:
            sign.image_url = self._clean(result.get("image_url")) or sign.image_url
        sign.source_name = self._clean(result.get("source_name")) or sign.source_name
        sign.source_url = self._clean(result.get("source_url")) or sign.source_url
        sign.license = self._clean(result.get("license")) or sign.license
        sign.educational_notes = self._merge_educational_metadata(
            sign.educational_notes,
            source_reference_url=self._clean(result.get("source_reference_url")),
            license_notes=self._clean(result.get("license_notes")),
            source_used=self._clean(result.get("source_used")),
            reason=self._clean(result.get("reason")),
        )
        sign.curator_notes = "Mídia encontrada automaticamente; revisar fonte/licença e aprovar manualmente."
        sign.status = SignStatus.pending.value
        sign.version = (sign.version or 1) + 1
        self.db.flush()
        self.db.add(
            SignAuditLog(
                sign_id=sign.id,
                user_id=user.id,
                action="media_auto_fill",
                old_value=old_value,
                new_value=self._snapshot(sign),
            )
        )
        return sign, created, True

    def _create_missing_placeholder(self, sign: Sign | None, word: str, result: dict[str, Any], user: User) -> tuple[Sign | None, bool, bool]:
        if sign is not None:
            return sign, False, False
        old_value = None
        sign = Sign(word=word, normalized_word=self.normalizer.normalize_word(word), status=SignStatus.pending.value)
        sign.curator_notes = "Preenchimento automático executado; mídia não localizada nas fontes configuradas."
        sign.educational_notes = self._merge_educational_metadata(
            None,
            source_reference_url=None,
            license_notes=None,
            source_used="media_auto_fill",
            reason=self._clean(result.get("reason")),
        )
        self.db.add(sign)
        self.db.flush()
        self.db.add(
            SignAuditLog(
                sign_id=sign.id,
                user_id=user.id,
                action="media_auto_fill_lookup",
                old_value=old_value,
                new_value=self._snapshot(sign),
            )
        )
        return sign, True, True

    def _find_sign(self, word: str) -> Sign | None:
        normalized = self.normalizer.normalize_word(word)
        return self.db.scalar(select(Sign).where(Sign.normalized_word == normalized).order_by(Sign.updated_at.desc()).limit(1))

    def _has_primary_media(self, sign: Sign) -> bool:
        return bool(sign.video_url or sign.avatar_gif_url or sign.avatar_animation_url)

    def _sign_media_found(self, sign: Sign) -> bool:
        return bool(sign.video_url or sign.avatar_gif_url or sign.avatar_animation_url or sign.image_url)

    def _sign_media_type(self, sign: Sign) -> str:
        if sign.video_url:
            return "video"
        if sign.avatar_gif_url:
            return "gif"
        if sign.avatar_animation_url:
            return "animation"
        if sign.image_url:
            return "image"
        return "none"

    def _source_priority(self, value: list[str] | None) -> list[str]:
        priority = [item.strip().lower() for item in value or [] if item and item.strip().lower() in self.allowed_sources]
        return priority or ["ines", "ifpr"]

    def _effective_limit(self, requested: int | None) -> int:
        configured = max(1, self.settings.media_auto_fill_max_items)
        if requested is None:
            return configured
        return max(1, min(requested, configured))

    def _delay(self) -> None:
        delay = max(0, self.settings.media_auto_fill_delay_ms) / 1000
        if delay:
            time.sleep(delay)

    def _empty_report(self, *, total_items: int) -> dict[str, Any]:
        return {
            "status": "completed",
            "total_items": total_items,
            "processed_items": 0,
            "media_found_count": 0,
            "video_found_count": 0,
            "gif_found_count": 0,
            "image_found_count": 0,
            "media_missing_count": 0,
            "created_count": 0,
            "updated_count": 0,
            "pending_count": 0,
            "skipped_count": 0,
            "error_count": 0,
            "items": [],
            "warnings": [],
            "errors": [],
        }

    def _append_item_from_result(self, report: dict[str, Any], *, word: str, sign_status: str, result: dict[str, Any], changed: bool) -> None:
        media_type = result.get("media_type") or "none"
        media_found = bool(result.get("media_found"))
        video_found = bool(result.get("video_found") or result.get("video_url") or result.get("avatar_video_url"))
        gif_found = bool(result.get("gif_found") or result.get("avatar_gif_url"))
        image_found = bool(result.get("image_found") or (media_type == "image" and result.get("image_url")))
        can_use_avatar = bool(
            result.get("can_use_avatar")
            or (media_type == "video" and video_found)
            or (media_type == "gif" and gif_found)
            or (media_type == "animation" and result.get("avatar_animation_url"))
        )
        if media_found:
            report["media_found_count"] += 1
            if video_found:
                report["video_found_count"] += 1
            if gif_found:
                report["gif_found_count"] += 1
            if image_found:
                report["image_found_count"] += 1
        elif sign_status == "diagnostic":
            report["media_missing_count"] += 1

        recommended_action = result.get("recommended_action") or ("Revisar e aprovar manualmente" if changed else "Precisa de importação manual")
        self._append_item(
            report,
            word=word,
            normalized_word=str(result.get("normalized_word") or self.normalizer.normalize_word(word)),
            source_used=result.get("source_used"),
            media_type=media_type,
            detection_method=str(result.get("detection_method") or "none"),
            media_found=media_found,
            video_found=video_found,
            gif_found=gif_found,
            image_found=image_found,
            can_use_avatar=can_use_avatar,
            validated=result.get("validated"),
            http_status=result.get("http_status"),
            content_type=result.get("content_type"),
            video_url=result.get("video_url") or result.get("avatar_video_url"),
            avatar_gif_url=result.get("avatar_gif_url"),
            avatar_animation_url=result.get("avatar_animation_url"),
            image_url=result.get("image_url"),
            source_reference_url=result.get("source_reference_url"),
            status=sign_status,
            reason=str(result.get("reason") or ""),
            recommended_action=str(recommended_action),
            warnings=result.get("warnings", []),
            errors=result.get("errors", []),
        )

    def _append_item(
        self,
        report: dict[str, Any],
        *,
        word: str,
        normalized_word: str,
        source_used: str | None,
        media_type: str,
        media_found: bool,
        status: str,
        reason: str,
        recommended_action: str,
        detection_method: str = "none",
        video_found: bool = False,
        gif_found: bool = False,
        image_found: bool = False,
        can_use_avatar: bool = False,
        validated: bool | None = None,
        http_status: int | None = None,
        content_type: str | None = None,
        video_url: str | None = None,
        avatar_gif_url: str | None = None,
        avatar_animation_url: str | None = None,
        image_url: str | None = None,
        source_reference_url: str | None = None,
        warnings: list[str] | None = None,
        errors: list[str] | None = None,
    ) -> None:
        report["items"].append(
            {
                "word": word,
                "normalized_word": normalized_word,
                "source_used": source_used,
                "media_type": media_type,
                "detection_method": detection_method,
                "media_found": media_found,
                "video_found": video_found,
                "gif_found": gif_found,
                "image_found": image_found,
                "can_use_avatar": can_use_avatar,
                "validated": validated,
                "http_status": http_status,
                "content_type": content_type,
                "video_url": video_url,
                "avatar_gif_url": avatar_gif_url,
                "avatar_animation_url": avatar_animation_url,
                "image_url": image_url,
                "source_reference_url": source_reference_url,
                "status": status,
                "reason": reason,
                "recommended_action": recommended_action,
                "warnings": warnings or [],
                "errors": errors or [],
            }
        )

    def _record_error(self, job: ImportJob, report: dict[str, Any], row: int | None, word: str | None, message: str) -> None:
        report["error_count"] += 1
        report["errors"].append({"word": word, "message": message})
        self._append_item(
            report,
            word=word or "registro",
            normalized_word=self.normalizer.normalize_word(word or ""),
            source_used=None,
            media_type="none",
            media_found=False,
            status="error",
            reason=message,
            recommended_action="Revisar erro e tentar novamente",
            errors=[message],
        )
        job.failed_records = report["error_count"]
        self._log(job, "error", row, f"{word or 'registro'}: {message}")
        self.db.commit()

    def _log(self, job: ImportJob, level: str, row: int | None, message: str, **extra: Any) -> None:
        logs = list(job.logs or [])
        entry = {"level": level, "row": row, "message": message}
        entry.update(extra)
        logs.append(entry)
        job.logs = logs

    def _merge_educational_metadata(
        self,
        notes: str | None,
        *,
        source_reference_url: str | None,
        license_notes: str | None,
        source_used: str | None,
        reason: str | None,
    ) -> str:
        existing = []
        for line in (notes or "").splitlines():
            if not line.startswith("URL consultada:") and not line.startswith("Observações de licença:") and not line.startswith("Fonte automática:") and not line.startswith("Resultado da busca automática:"):
                existing.append(line)
        if not existing:
            existing.append("Mídia vinculada por rotina administrativa de preenchimento automático.")
            existing.append("A rotina não roda em build, deploy, startup, migrations ou seed.")
        if license_notes:
            existing.append(f"Observações de licença: {license_notes}")
        if source_reference_url:
            existing.append(f"URL consultada: {source_reference_url}")
        if source_used:
            existing.append(f"Fonte automática: {source_used}")
        if reason:
            existing.append(f"Resultado da busca automática: {reason}")
        return "\n".join(existing)

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
            "avatar_gif_url": sign.avatar_gif_url,
            "avatar_animation_url": sign.avatar_animation_url,
            "image_url": sign.image_url,
            "curator_notes": sign.curator_notes,
        }

    def _flatten_messages(self, diagnostics: list[dict[str, Any]], key: str) -> list[str]:
        messages: list[str] = []
        for item in diagnostics:
            for value in item.get(key, []) or []:
                text = str(value)
                if text and text not in messages:
                    messages.append(text)
        return messages

    def _find_manifest_media(self, word: str, source: str) -> dict[str, Any] | None:
        manifest = self._load_manifest(source)
        if not manifest:
            return None
        return self._find_entry_in_manifest(word, manifest, default_detection_method="manifest")

    def _find_manual_manifest_media(self, word: str) -> dict[str, Any] | None:
        for manifest in self._load_manual_manifests():
            entry = self._find_entry_in_manifest(word, manifest, default_detection_method="manifest")
            if entry:
                return {**entry, "source_used": entry.get("source_used") or "manual"}
        return None

    def _find_entry_in_manifest(self, word: str, manifest: dict[str, Any], *, default_detection_method: str) -> dict[str, Any] | None:
        normalized_word = self.normalizer.normalize_word(word)
        entries = manifest.get("entries", {})
        candidates: list[dict[str, Any]] = []
        if isinstance(entries, dict):
            direct = entries.get(normalized_word)
            if isinstance(direct, dict):
                candidates.append(direct)
            candidates.extend(entry for key, entry in entries.items() if isinstance(entry, dict) and str(key).startswith(f"{normalized_word}#"))
            candidates.extend(
                entry
                for entry in entries.values()
                if isinstance(entry, dict)
                and entry not in candidates
                and self.normalizer.normalize_word(str(entry.get("normalized_word") or entry.get("word") or "")) == normalized_word
            )
        elif isinstance(entries, list):
            candidates.extend(entry for entry in entries if isinstance(entry, dict) and self.normalizer.normalize_word(str(entry.get("word") or "")) == normalized_word)
        for entry in candidates:
            media_type = str(entry.get("media_type") or self._manifest_media_type(entry))
            if media_type == "video" and (entry.get("video_url") or entry.get("avatar_video_url")):
                return {**entry, "found": True, "source_name": entry.get("source_name") or manifest.get("source_name"), "source_url": entry.get("source_url") or manifest.get("source_url"), "license": entry.get("license") or manifest.get("license"), "license_notes": entry.get("license_notes") or manifest.get("license_notes"), "detection_method": entry.get("detection_method") or default_detection_method}
            if media_type == "gif" and (entry.get("avatar_gif_url") or entry.get("gif_url")):
                return {**entry, "found": True, "source_name": entry.get("source_name") or manifest.get("source_name"), "source_url": entry.get("source_url") or manifest.get("source_url"), "license": entry.get("license") or manifest.get("license"), "license_notes": entry.get("license_notes") or manifest.get("license_notes"), "detection_method": entry.get("detection_method") or default_detection_method}
            if media_type == "image" and entry.get("image_url"):
                return {**entry, "found": False, "media_found": True, "source_name": entry.get("source_name") or manifest.get("source_name"), "source_url": entry.get("source_url") or manifest.get("source_url"), "license": entry.get("license") or manifest.get("license"), "license_notes": entry.get("license_notes") or manifest.get("license_notes"), "detection_method": entry.get("detection_method") or "manifest_support_image"}
        return None

    def _manifest_media_type(self, entry: dict[str, Any]) -> str:
        if entry.get("video_url") or entry.get("avatar_video_url"):
            return "video"
        if entry.get("avatar_gif_url") or entry.get("gif_url"):
            return "gif"
        if entry.get("image_url"):
            return "image"
        return "none"

    def _load_manifest(self, source: str) -> dict[str, Any] | None:
        output_dir = Path(self.settings.crawler_output_dir)
        filename = "ines_video_manifest.generated.json" if source == "ines" else "libras_gif_manifest.generated.json"
        path = output_dir / filename
        if not path.exists() and not output_dir.is_absolute():
            cwd = Path.cwd()
            path = (cwd / Path(*output_dir.parts[1:]) / filename) if cwd.name == "backend" and output_dir.parts and output_dir.parts[0] == "backend" else cwd / path
        if not path.exists():
            return None
        try:
            return json.loads(path.read_text(encoding="utf-8"))
        except Exception:  # noqa: BLE001
            return None

    def _load_manual_manifests(self) -> list[dict[str, Any]]:
        output_dir = Path(self.settings.crawler_output_dir)
        filenames = [
            "media_manifest.generated.json",
            "manual_media_manifest.generated.json",
            "authorized_media_manifest.json",
        ]
        manifests: list[dict[str, Any]] = []
        for filename in filenames:
            path = output_dir / filename
            if not path.exists() and not output_dir.is_absolute():
                cwd = Path.cwd()
                path = (cwd / Path(*output_dir.parts[1:]) / filename) if cwd.name == "backend" and output_dir.parts and output_dir.parts[0] == "backend" else cwd / path
            if not path.exists():
                continue
            try:
                loaded = json.loads(path.read_text(encoding="utf-8"))
            except Exception:  # noqa: BLE001
                continue
            if isinstance(loaded, dict):
                manifests.append(loaded)
        return manifests

    def _is_http_url(self, value: str) -> bool:
        normalized = value.lower()
        return normalized.startswith("http://") or normalized.startswith("https://")

    def _clean(self, value: Any) -> str | None:
        if value is None:
            return None
        value = str(value).strip()
        return value or None
