import csv
import re
import time
import unicodedata
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
from app.services.media_validation import validate_remote_media_url
from app.services.text_normalizer import TextNormalizerService


class InesMediaImporter:
    """Admin-triggered INES media importer.

    This service never runs during startup, migrations, seed, frontend build or
    deploy. It is intentionally synchronous and rate-limited so an admin can run
    small, auditable batches on demand.
    """

    source_name = "Dicionário da Língua Brasileira de Sinais - INES"
    ines_sign_video_path = "/public/media/palavras/videos/"
    ines_handshape_image_path = "/public/media/mao/"
    video_extensions = {".mp4", ".webm", ".mov"}
    gif_extensions = {".gif"}
    image_extensions = {".jpg", ".jpeg", ".png", ".webp"}
    max_probe_candidates = 40

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
            for key in ("video_url", "avatar_video_url", "avatar_gif_url", "gif_url", "image_url", "source_url", "source_reference_url"):
                value = self._clean(item.get(key))
                if value and not self._is_http_url(value):
                    self._report_error(report, word, f"{key} deve começar com http:// ou https://.")
            if payload.mode in {"json_items", "csv_items"} and not (item.get("video_url") or item.get("avatar_video_url") or item.get("avatar_gif_url") or item.get("gif_url")):
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

    def auto_import_pending_words(
        self,
        max_items: int | None = None,
        approve_authorized: bool = False,
        overwrite: bool = False,
        user: User | None = None,
    ) -> tuple[ImportJob, dict[str, Any]]:
        if user is None:
            raise RuntimeError("Usuário admin é obrigatório para registrar auditoria da automação INES.")
        items = self._pending_word_items(max_items)
        payload = InesMediaImportStartRequest(
            mode="pending_words",
            max_items=max_items,
            approve_authorized=approve_authorized,
            overwrite=overwrite,
        )
        return self._run_auto_items(
            items,
            payload=payload,
            user=user,
            source_name="INES assisted auto import: pending_words",
            create_missing=False,
        )

    def auto_import_selected_words(
        self,
        words: list[str],
        max_items: int | None = None,
        approve_authorized: bool = False,
        overwrite: bool = False,
        user: User | None = None,
    ) -> tuple[ImportJob, dict[str, Any]]:
        if user is None:
            raise RuntimeError("Usuário admin é obrigatório para registrar auditoria da automação INES.")
        limit = self._effective_limit(max_items)
        items = [{"word": word.strip()} for word in words if self._clean(word)][:limit]
        payload = InesMediaImportStartRequest(
            mode="selected_words",
            words=[item["word"] for item in items],
            max_items=max_items,
            approve_authorized=approve_authorized,
            overwrite=overwrite,
        )
        return self._run_auto_items(
            items,
            payload=payload,
            user=user,
            source_name="INES assisted auto import: selected_words",
            create_missing=True,
        )

    def find_ines_entry_for_word(self, word: str) -> dict[str, Any]:
        """Best-effort controlled lookup.

        If the public HTML does not expose a reliable media URL, the importer
        returns found=false and leaves the sign pending for manual curation.
        """

        diagnosis = self._diagnose_one_word(word)
        if not diagnosis.get("can_import"):
            return {
                "found": False,
                "word": word,
                "normalized_word": diagnosis.get("normalized_word"),
                "search_url": diagnosis.get("search_url"),
                "http_status": diagnosis.get("http_status"),
                "page_loaded": diagnosis.get("page_loaded"),
                "word_found_in_page": diagnosis.get("word_found_in_page"),
                "source_reference_url": diagnosis.get("source_reference_url"),
                "image_url": diagnosis.get("image_url"),
                "image_found": diagnosis.get("image_found"),
                "gif_url": diagnosis.get("gif_url"),
                "gif_found": diagnosis.get("gif_found"),
                "media_type": diagnosis.get("media_type"),
                "detection_method": diagnosis.get("detection_method"),
                "video_found": diagnosis.get("video_found"),
                "video_url": diagnosis.get("video_url"),
                "candidate_video_url": diagnosis.get("candidate_video_url"),
                "video_host_allowed": diagnosis.get("video_host_allowed"),
                "can_use_avatar": diagnosis.get("can_use_avatar"),
                "validated": diagnosis.get("validated"),
                "validation_status_code": diagnosis.get("validation_status_code"),
                "validation_content_type": diagnosis.get("validation_content_type"),
                "validation_final_url": diagnosis.get("validation_final_url"),
                "validation_content_length": diagnosis.get("validation_content_length"),
                "validation_reason": diagnosis.get("validation_reason"),
                "reason": diagnosis.get("reason"),
                "warnings": diagnosis.get("warnings", []),
                "errors": diagnosis.get("errors", []),
                "error": diagnosis.get("reason") or "Vídeo não encontrado automaticamente no INES.",
            }
        return {
            "found": True,
            "word": word,
            "normalized_word": diagnosis.get("normalized_word"),
            "search_url": diagnosis.get("search_url"),
            "http_status": diagnosis.get("http_status"),
            "page_loaded": diagnosis.get("page_loaded"),
            "word_found_in_page": diagnosis.get("word_found_in_page"),
            "gloss": word.upper(),
            "source_reference_url": diagnosis.get("source_reference_url"),
            "video_url": diagnosis.get("video_url"),
            "avatar_video_url": diagnosis.get("video_url"),
            "image_url": diagnosis.get("image_url"),
            "image_found": diagnosis.get("image_found"),
            "gif_url": diagnosis.get("gif_url"),
            "avatar_gif_url": diagnosis.get("gif_url"),
            "gif_found": diagnosis.get("gif_found"),
            "media_type": diagnosis.get("media_type"),
            "detection_method": diagnosis.get("detection_method"),
            "video_found": diagnosis.get("video_found"),
            "video_host_allowed": diagnosis.get("video_host_allowed"),
            "can_use_avatar": diagnosis.get("can_use_avatar"),
            "validated": diagnosis.get("validated"),
            "validation_status_code": diagnosis.get("validation_status_code"),
            "validation_content_type": diagnosis.get("validation_content_type"),
            "validation_final_url": diagnosis.get("validation_final_url"),
            "validation_content_length": diagnosis.get("validation_content_length"),
            "validation_reason": diagnosis.get("validation_reason"),
            "meaning": diagnosis.get("meaning"),
            "grammatical_class": diagnosis.get("grammatical_class"),
            "reason": diagnosis.get("reason") or "Vídeo encontrado.",
            "warnings": diagnosis.get("warnings", []),
            "errors": diagnosis.get("errors", []),
        }

    def diagnose_words(self, words: list[str], max_items: int | None = None) -> dict[str, Any]:
        """Inspect INES responses without writing to the database.

        This diagnostic is intentionally read-only. It is used by admins to see
        whether the current importer can detect the page, word, image and video
        before running an import job.
        """

        limit = self._effective_limit(max_items)
        limited_words = [word.strip() for word in words if self._clean(word)][:limit]
        results: list[dict[str, Any]] = []

        for index, word in enumerate(limited_words):
            results.append(self._diagnose_one_word(word))
            if index < len(limited_words) - 1:
                self._delay()

        return {"status": "completed", "total_items": len(limited_words), "results": results}

    def _diagnose_one_word(self, word: str) -> dict[str, Any]:
        display_normalized = self.normalizer.normalize(word)
        match_normalized = self.normalizer.normalize_word(word)
        search_url = self._search_url(word)
        result: dict[str, Any] = {
            "word": word,
            "normalized_word": display_normalized,
            "search_url": search_url,
            "http_status": None,
            "page_loaded": False,
            "word_found_in_page": False,
            "source_reference_url": None,
            "image_found": False,
            "image_url": None,
            "video_found": False,
            "video_url": None,
            "candidate_video_url": None,
            "gif_found": False,
            "gif_url": None,
            "media_type": "none",
            "detection_method": "none",
            "video_host_allowed": False,
            "can_import": False,
            "can_use_avatar": False,
            "validated": False,
            "validation_status_code": None,
            "validation_content_type": None,
            "validation_final_url": None,
            "validation_content_length": None,
            "validation_reason": None,
            "reason": "Diagnóstico não executado.",
            "warnings": [],
            "errors": [],
        }

        try:
            with httpx.Client(timeout=self.settings.ines_import_timeout_seconds, follow_redirects=True) as client:
                response = client.get(search_url, headers={"User-Agent": "LibrasLiveEdu-admin-diagnose/1.0"})
        except httpx.TimeoutException:
            result["reason"] = "Falha ao consultar INES."
            result["errors"].append("Timeout ao consultar a página.")
            return result
        except httpx.RequestError as exc:
            result["reason"] = "Falha ao consultar INES."
            result["errors"].append(f"Erro de rede ao consultar a página: {exc}")
            return result
        except Exception as exc:  # noqa: BLE001
            result["reason"] = "Falha ao consultar INES."
            result["errors"].append(f"Erro inesperado ao consultar a página: {exc}")
            return result

        result["http_status"] = response.status_code
        result["source_reference_url"] = str(response.url)

        if response.status_code >= 400:
            result["reason"] = "Falha ao consultar INES."
            result["errors"].append(f"INES retornou HTTP {response.status_code}.")
            return result

        html = response.text
        result["page_loaded"] = True
        result["word_found_in_page"] = bool(match_normalized and match_normalized in self.normalizer.normalize_word(html))

        video_url = self._first_sign_video_url(html, str(response.url))
        detection_method = "html_video" if video_url else "none"
        if not video_url:
            video_url = self._probe_ines_video_candidates(word, html, str(response.url))
            if video_url:
                detection_method = "probed_video_url"
        candidate_video_url = video_url
        validation: dict[str, Any] | None = None
        if video_url:
            validation = validate_remote_media_url(
                video_url,
                "video",
                timeout_seconds=self.settings.ines_import_timeout_seconds,
                user_agent="LibrasLiveEdu-admin-ines-validator/1.0",
            )
            result["validated"] = bool(validation.get("valid"))
            result["validation_status_code"] = validation.get("status_code")
            result["validation_content_type"] = validation.get("content_type")
            result["validation_final_url"] = validation.get("final_url")
            result["validation_content_length"] = validation.get("content_length")
            result["validation_reason"] = validation.get("reason")
            if validation.get("valid"):
                video_url = str(validation.get("final_url") or video_url)
            else:
                result["warnings"].append(str(validation.get("reason") or "Vídeo detectado, mas a URL não passou na validação."))
                video_url = None
        gif_url = self._first_media_url(html, str(response.url), self.gif_extensions, require_allowed=False)
        if not video_url and gif_url:
            detection_method = "gif_lookup"
            validation = validate_remote_media_url(
                gif_url,
                "gif",
                timeout_seconds=self.settings.ines_import_timeout_seconds,
                user_agent="LibrasLiveEdu-admin-ines-validator/1.0",
            )
            result["validated"] = bool(validation.get("valid"))
            result["validation_status_code"] = validation.get("status_code")
            result["validation_content_type"] = validation.get("content_type")
            result["validation_final_url"] = validation.get("final_url")
            result["validation_content_length"] = validation.get("content_length")
            result["validation_reason"] = validation.get("reason")
            if validation.get("valid"):
                gif_url = str(validation.get("final_url") or gif_url)
            else:
                result["warnings"].append(str(validation.get("reason") or "GIF detectado, mas a URL não passou na validação."))
                gif_url = None
        image_url = self._first_support_image_url(html, str(response.url))
        if not video_url and not gif_url and image_url:
            detection_method = "support_image_only"
            result["validation_reason"] = "Imagem estática é apenas apoio visual e não serve para Avatar Libras."
        result["image_url"] = image_url
        result["image_found"] = bool(image_url)
        result["gif_url"] = gif_url
        result["gif_found"] = bool(gif_url)
        result["video_url"] = video_url
        result["candidate_video_url"] = candidate_video_url
        result["video_found"] = bool(video_url)
        result["media_type"] = "video" if result["video_found"] else "gif" if result["gif_found"] else "image" if result["image_found"] else "none"
        result["detection_method"] = detection_method
        result["video_host_allowed"] = bool(video_url and self._is_allowed_media_url(video_url))
        has_valid_video = bool(result["video_found"] and result["video_host_allowed"] and self._is_http_url(video_url or "") and result["validated"])
        result["can_import"] = bool(result["page_loaded"] and result["word_found_in_page"] and has_valid_video)
        result["can_use_avatar"] = bool(has_valid_video or (result["gif_found"] and self._is_http_url(gif_url or "") and result["validated"]))
        result["meaning"] = self._extract_labeled_text(html, ["Acepção", "Significado"])
        result["grammatical_class"] = self._extract_labeled_text(html, ["Classe Gramatical"])

        if result["can_import"]:
            if detection_method == "probed_video_url":
                result["reason"] = "Video real do sinal encontrado por probing no diretorio /public/media/palavras/videos/."
            elif self._is_ines_sign_video(video_url or ""):
                result["reason"] = "Video real do sinal encontrado no diretorio /public/media/palavras/videos/."
            else:
                result["reason"] = "Vídeo encontrado e host permitido."
        elif not result["word_found_in_page"]:
            result["reason"] = "Página carregada, mas a palavra não foi encontrada no conteúdo retornado."
            result["warnings"].append("A busca automática pode não localizar palavras carregadas por JavaScript/API.")
        elif not result["video_found"]:
            if image_url and self._is_ines_handshape_image(image_url):
                result["reason"] = "Apenas imagem estatica de configuracao de mao foi encontrada. Essa imagem nao representa o movimento do sinal em Libras."
                result["warnings"].append("A URL em /public/media/mao/ foi registrada apenas como apoio visual.")
            else:
                result["reason"] = "Página carregada, mas nenhuma URL de vídeo .mp4, .webm ou .mov foi encontrada no HTML."
                result["warnings"].append("Pode ser que o vídeo seja carregado por JavaScript/API e não esteja disponível no HTML inicial.")
            if self.settings.ines_import_use_browser:
                result["warnings"].append("INES_IMPORT_USE_BROWSER=true está configurado, mas este importador ainda não usa navegador renderizado para evitar dependência pesada no deploy.")
        elif not result["video_host_allowed"]:
            result["reason"] = "Vídeo encontrado, mas o host não está permitido para importação automática."
            result["warnings"].append("Use importação manual JSON/CSV se a URL tiver autorização registrada e for validada por curadoria.")
        else:
            result["reason"] = "A página foi analisada, mas o item não atende aos critérios seguros de importação automática."

        return result

    def _run_auto_items(
        self,
        items: list[dict[str, Any]],
        *,
        payload: InesMediaImportStartRequest,
        user: User,
        source_name: str,
        create_missing: bool,
    ) -> tuple[ImportJob, dict[str, Any]]:
        if not self.settings.ines_import_enabled:
            raise RuntimeError("Importação INES desativada neste ambiente.")
        if self.settings.ines_import_download_media:
            raise RuntimeError("Download de mídia exige storage externo configurado. Use vínculo por URL remota neste ambiente.")
        if not self.settings.ines_import_store_remote_url:
            raise RuntimeError("A rotina atual exige INES_IMPORT_STORE_REMOTE_URL=true para não salvar vídeos no repositório.")

        limit = self._effective_limit(payload.max_items)
        limited_items = items[:limit]
        report = self._empty_report(total_items=len(limited_items))
        job = ImportJob(
            source_type="api",
            source_name=source_name,
            status=ImportStatus.running.value,
            total_records=len(limited_items),
            logs=[
                {
                    "level": "settings",
                    "row": None,
                    "message": "Automação assistida INES iniciada sob demanda por admin.",
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
                self._record_auto_error(job, report, index, None, "Item sem palavra.", action="Erro de consulta")
                continue
            if normalized in seen:
                report["skipped_count"] += 1
                self._append_report_item(
                    report,
                    word=word,
                    status="skipped",
                    reason="Palavra duplicada no lote.",
                    recommended_action="Ignorar duplicado",
                )
                self._log(job, "warning", index, f"{word}: duplicado no lote.")
                continue
            seen.add(normalized)

            try:
                lookup = self.find_ines_entry_for_word(word)
                if not lookup.get("found"):
                    report["video_missing_count"] += 1
                    reason = str(lookup.get("reason") or lookup.get("error") or "Vídeo não detectado.")
                    self._report_error(report, word, reason)
                    if create_missing:
                        _, created, changed = self._create_pending_lookup_sign(word, lookup, user, overwrite=payload.overwrite)
                        if created:
                            report["created_count"] += 1
                            job.imported_records += 1
                        elif changed:
                            report["updated_count"] += 1
                            job.updated_records += 1
                        if created or changed:
                            report["pending_count"] += 1
                            self.db.commit()
                    report["manual_required"].append(
                        {
                            "word": word,
                            "source_reference_url": lookup.get("source_reference_url") or lookup.get("search_url"),
                            "reason": reason,
                        }
                    )
                    self._append_report_item(
                        report,
                        word=word,
                        status="not_found",
                        page_loaded=bool(lookup.get("page_loaded")),
                        word_found=bool(lookup.get("word_found_in_page")),
                        video_found=False,
                        gif_found=bool(lookup.get("gif_found")),
                        image_found=bool(lookup.get("image_found")),
                        media_type=str(lookup.get("media_type") or ("image" if lookup.get("image_url") else "none")),
                        can_use_avatar=bool(lookup.get("can_use_avatar")),
                        detection_method=str(lookup.get("detection_method") or "none"),
                        source_reference_url=lookup.get("source_reference_url"),
                        image_url=lookup.get("image_url"),
                        reason=reason,
                        recommended_action="Precisa de video/GIF/animacao" if lookup.get("image_url") else "Precisa de importação manual",
                        warnings=lookup.get("warnings", []),
                        errors=lookup.get("errors", []),
                    )
                    self._log(job, "warning", index, f"{word}: {reason}", lookup=lookup)
                    self._delay()
                    continue

                enriched = {**item, **{key: value for key, value in lookup.items() if value is not None}}
                sign, created, approved = self._create_or_update_sign(enriched, payload, user)
                report["processed_items"] += 1
                report["video_found_count"] += 1
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
                self._append_report_item(
                    report,
                    word=sign.word,
                    status=sign.status,
                    page_loaded=True,
                    word_found=True,
                    video_found=True,
                    gif_found=False,
                    image_found=bool(sign.image_url),
                    media_type=str(lookup.get("media_type") or "video"),
                    can_use_avatar=True,
                    detection_method=str(lookup.get("detection_method") or "html_video"),
                    video_url=sign.video_url,
                    source_reference_url=lookup.get("source_reference_url"),
                    image_url=sign.image_url,
                    reason=str(lookup.get("reason") or "Vídeo encontrado."),
                    recommended_action="Pronto para revisar" if not approved else "Aprovado automaticamente por configuração explícita",
                    warnings=lookup.get("warnings", []),
                    errors=lookup.get("errors", []),
                )
                self._log(job, "success", index, f"{sign.word}: vídeo INES vinculado com status {sign.status}.", lookup=lookup)
                self.db.commit()
                self._delay()
            except Exception as exc:  # noqa: BLE001
                self.db.rollback()
                self._record_auto_error(job, report, index, word, str(exc), action="Erro de consulta")

        job.status = ImportStatus.completed.value
        job.failed_records = report["error_count"]
        job.finished_at = datetime.now(timezone.utc)
        self._log(job, "report", None, "Relatório final da automação assistida INES.", report=report)
        self.db.commit()
        self.db.refresh(job)
        return job, report

    def _pending_word_items(self, max_items: int | None) -> list[dict[str, Any]]:
        limit = self._effective_limit(max_items)
        rows = self.db.scalars(
            select(Sign)
            .where(
                Sign.status == SignStatus.pending.value,
                Sign.video_url.is_(None),
                Sign.avatar_gif_url.is_(None),
                Sign.avatar_animation_url.is_(None),
            )
            .order_by(Sign.updated_at.desc())
            .limit(limit)
        )
        return [{"word": sign.word, "gloss": sign.gloss} for sign in rows]

    def _create_pending_lookup_sign(self, word: str, lookup: dict[str, Any], user: User, *, overwrite: bool) -> tuple[Sign, bool, bool]:
        normalized_word = self.normalizer.normalize_word(word)
        sign = self.db.scalar(select(Sign).where(Sign.normalized_word == normalized_word).order_by(Sign.updated_at.desc()).limit(1))
        created = sign is None
        if sign and sign.status == SignStatus.approved.value and not overwrite:
            return sign, False, False
        old_value = self._snapshot(sign)
        if not sign:
            sign = Sign(word=word, normalized_word=normalized_word, status=SignStatus.pending.value)
            self.db.add(sign)
            self.db.flush()
        sign.source_name = sign.source_name or self.source_name
        sign.source_url = sign.source_url or self.settings.ines_base_url
        sign.license = sign.license or self.settings.ines_import_authorization_text
        image_url = self._clean(lookup.get("image_url"))
        if image_url and self._is_http_url(image_url) and not sign.image_url:
            sign.image_url = image_url
        sign.curator_notes = sign.curator_notes or "Consulta automática INES executada; vídeo não detectado no HTML inicial."
        sign.educational_notes = self._educational_notes(
            {
                "meaning": lookup.get("meaning"),
                "grammatical_class": lookup.get("grammatical_class"),
            },
            str(lookup.get("source_reference_url") or lookup.get("search_url") or self.settings.ines_base_url),
            "Vídeo ainda não vinculado; requer importação manual autorizada se a mídia não for detectável automaticamente.",
        )
        sign.version = (sign.version or 1) + 1
        self.db.flush()
        self.db.add(
            SignAuditLog(
                sign_id=sign.id,
                user_id=user.id,
                action="auto_lookup",
                old_value=old_value,
                new_value=self._snapshot(sign),
            )
        )
        return sign, created, True

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
                .where(
                    Sign.status == SignStatus.pending.value,
                    Sign.video_url.is_(None),
                    Sign.avatar_gif_url.is_(None),
                    Sign.avatar_animation_url.is_(None),
                )
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
        avatar_gif = self._clean(item.get("avatar_gif_url")) or self._clean(item.get("gif_url"))
        image_url = self._clean(item.get("image_url"))
        if video:
            validation = validate_remote_media_url(
                video,
                "video",
                timeout_seconds=self.settings.ines_import_timeout_seconds,
                user_agent="LibrasLiveEdu-admin-ines-validator/1.0",
            )
            if not validation.get("valid"):
                raise ValueError(f"URL de vídeo inválida ou inacessível. A mídia não foi salva. {validation.get('reason')}")
            video = str(validation.get("final_url") or video)
        if avatar_gif:
            validation = validate_remote_media_url(
                avatar_gif,
                "gif",
                timeout_seconds=self.settings.ines_import_timeout_seconds,
                user_agent="LibrasLiveEdu-admin-ines-validator/1.0",
            )
            if not validation.get("valid"):
                raise ValueError(f"URL de GIF inválida ou inacessível. A mídia não foi salva. {validation.get('reason')}")
            avatar_gif = str(validation.get("final_url") or avatar_gif)

        sign.word = word
        sign.normalized_word = normalized_word
        sign.gloss = self._clean(item.get("gloss")) or sign.gloss
        sign.example_sentence = self._clean(item.get("example_sentence")) or sign.example_sentence
        sign.description = self._description(item) or sign.description
        sign.source_name = self._clean(item.get("source_name")) or self.source_name
        sign.source_url = source_url
        sign.license = license_text
        if image_url:
            sign.image_url = image_url
        if video:
            sign.video_url = video
        if avatar_gif:
            sign.avatar_gif_url = avatar_gif
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
        for key in ("source_url", "source_reference_url", "video_url", "avatar_video_url", "avatar_gif_url", "gif_url", "image_url"):
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

    def _probe_ines_video_candidates(self, word: str, html: str, base_url: str) -> str | None:
        del html
        del base_url
        videos_base_url = urljoin(self.settings.ines_base_url.rstrip("/") + "/", "public/media/palavras/videos/")
        for filename in self._ines_video_probe_filenames(word):
            candidate_url = urljoin(videos_base_url, filename)
            if not self._is_ines_sign_video(candidate_url) or not self._is_allowed_media_url(candidate_url):
                continue
            if self._probe_video_url_exists(candidate_url):
                return candidate_url
        return None

    def _ines_video_probe_filenames(self, word: str) -> list[str]:
        suffixes = [
            "Sm_Prog001.mp4",
            "Sm_Prog002.mp4",
            "Sm_Prog003.mp4",
            "Prog001.mp4",
            "_Prog001.mp4",
            ".mp4",
        ]
        filenames: list[str] = []
        for stem in self._ines_word_stem_variants(word):
            for suffix in suffixes:
                filename = f"{stem}{suffix}"
                if filename not in filenames:
                    filenames.append(filename)
                if len(filenames) >= self.max_probe_candidates:
                    return filenames
        return filenames

    def _ines_word_stem_variants(self, word: str) -> list[str]:
        ascii_word = unicodedata.normalize("NFKD", word)
        ascii_word = "".join(char for char in ascii_word if not unicodedata.combining(char))
        tokens = re.findall(r"[a-zA-Z0-9]+", ascii_word)
        if not tokens:
            return []
        lower_tokens = [token.lower() for token in tokens]
        joined = "".join(lower_tokens)
        underscore = "_".join(lower_tokens)
        hyphen = "-".join(lower_tokens)
        camel = "".join(token.capitalize() for token in lower_tokens)
        variants = [joined, underscore, hyphen, camel, joined.capitalize(), joined.upper()]
        unique: list[str] = []
        for variant in variants:
            if variant and variant not in unique:
                unique.append(variant)
        return unique

    def _probe_video_url_exists(self, url: str) -> bool:
        headers = {"User-Agent": "LibrasLiveEdu-admin-probe/1.0"}
        try:
            with httpx.Client(timeout=self.settings.ines_import_timeout_seconds, follow_redirects=True) as client:
                try:
                    response = client.head(url, headers=headers)
                    if self._is_valid_video_probe_response(response, url):
                        return True
                    if getattr(response, "status_code", None) not in {403, 405, 501}:
                        return False
                except AttributeError:
                    return False
                except Exception:  # noqa: BLE001
                    pass
                try:
                    response = client.get(url, headers={**headers, "Range": "bytes=0-0"})
                    return self._is_valid_video_probe_response(response, url)
                except Exception:  # noqa: BLE001
                    return False
        except Exception:  # noqa: BLE001
            return False

    def _is_valid_video_probe_response(self, response: Any, url: str) -> bool:
        if getattr(response, "status_code", None) not in {200, 206}:
            return False
        headers = getattr(response, "headers", {}) or {}
        content_type = str(headers.get("content-type", "")).split(";")[0].strip().lower()
        allowed_types = {"video/mp4", "video/webm", "video/quicktime", "application/octet-stream"}
        path = urlparse(url).path.lower()
        if content_type in allowed_types:
            return True
        return not content_type and path.endswith((".mp4", ".webm", ".mov"))

    def _first_sign_video_url(self, html: str, base_url: str) -> str | None:
        video_candidates = self._media_urls(html, base_url, self.video_extensions)
        for candidate in video_candidates:
            if self._is_ines_sign_video(candidate) and self._is_allowed_media_url(candidate):
                return candidate
        for candidate in video_candidates:
            if self._is_allowed_media_url(candidate):
                return candidate
        return None

    def _first_support_image_url(self, html: str, base_url: str) -> str | None:
        image_candidates = self._media_urls(html, base_url, self.image_extensions)
        for candidate in image_candidates:
            if self._is_ines_handshape_image(candidate):
                return candidate
        return image_candidates[0] if image_candidates else None

    def _first_media_url(self, html: str, base_url: str, extensions: set[str], *, require_allowed: bool = True) -> str | None:
        for absolute in self._media_urls(html, base_url, extensions):
            if not require_allowed or self._is_allowed_media_url(absolute):
                return absolute
        return None

    def _media_urls(self, html: str, base_url: str, extensions: set[str]) -> list[str]:
        urls: list[str] = []
        for candidate in self._media_candidates(html):
            absolute = self._absolute_media_url(candidate, base_url)
            parsed_path = urlparse(absolute).path.lower()
            if not any(parsed_path.endswith(extension) for extension in extensions):
                continue
            if absolute not in urls:
                urls.append(absolute)
        return urls

    def _media_candidates(self, html: str) -> list[str]:
        candidates: list[str] = []
        patterns = [
            r"""(?:src|href|data-src|data-video|data-url|data-mp4|data-file|data-media|poster)=["']([^"']+)["']""",
            r"""((?:https?:\\?/\\?/[^"'\s<>]+)?/?(?:public/)?media/palavras/videos/[^"'\s<>]+\.(?:mp4|webm|mov)(?:\?[^"'\s<>]*)?)""",
            r"""((?:https?:\\?/\\?/[^"'\s<>]+)?/?public/media/mao/[^"'\s<>]+\.(?:jpg|jpeg|png|webp)(?:\?[^"'\s<>]*)?)""",
            r"""["']([^"']+\.(?:mp4|webm|mov|jpg|jpeg|png|webp|gif)(?:\?[^"']*)?)["']""",
            r"""(https?:\\?/\\?/[^"'\s<>]+\.(?:mp4|webm|mov|jpg|jpeg|png|webp|gif)(?:\?[^"'\s<>]*)?)""",
        ]
        for pattern in patterns:
            for raw in re.findall(pattern, html, flags=re.IGNORECASE):
                value = (raw[0] if isinstance(raw, tuple) else raw).replace("\\/", "/").strip()
                if value and value not in candidates:
                    candidates.append(value)
        return candidates

    def _absolute_media_url(self, value: str, base_url: str) -> str:
        cleaned = value.replace("\\/", "/").strip()
        if cleaned.startswith("//"):
            return f"https:{cleaned}"
        if cleaned.startswith("public/media/"):
            cleaned = f"/{cleaned}"
        return urljoin(base_url, cleaned)

    def _is_ines_handshape_image(self, value: str) -> bool:
        return self.ines_handshape_image_path in urlparse(value).path.lower()

    def _is_ines_sign_video(self, value: str) -> bool:
        path = urlparse(value).path.lower()
        return self.ines_sign_video_path in path and any(path.endswith(extension) for extension in self.video_extensions)


    def _extract_labeled_text(self, html: str, labels: list[str]) -> str | None:
        text = re.sub(r"<[^>]+>", " ", html)
        text = re.sub(r"\s+", " ", text)
        for label in labels:
            pattern = rf"{re.escape(label)}\s*:?\s*(.{{1,180}}?)(?:\s+(?:Palavra|Vídeo|Video|Acepção|Exemplo|Classe Gramatical|Exemplo Libras|Origem|Imagem)\s*:|\s{{2,}}|$)"
            match = re.search(pattern, text, flags=re.IGNORECASE)
            if match:
                value = match.group(1).strip(" :-")
                if value:
                    return value[:180]
        return None

    def _is_allowed_media_url(self, value: str) -> bool:
        if not self._is_http_url(value):
            return False
        host = urlparse(value).hostname
        allowed = {
            urlparse(self.settings.ines_base_url).hostname,
            *self.settings.ines_allowed_host_list,
            "dicionario.ines.gov.br",
            "ines.gov.br",
        }
        return bool(host and host.lower() in {item for item in allowed if item})

    def _is_http_url(self, value: str) -> bool:
        normalized = value.lower()
        return normalized.startswith("http://") or normalized.startswith("https://")

    def _effective_limit(self, requested: int | None) -> int:
        configured = max(1, self.settings.ines_import_max_items)
        if requested is None:
            return configured
        return max(1, min(requested, configured))

    def _search_url(self, word: str) -> str:
        base_url = self.settings.ines_base_url.rstrip("/") + "/"
        return f"{base_url}?q={quote_plus(word)}"

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
            "video_found_count": 0,
            "video_missing_count": 0,
            "errors": [],
            "warnings": [],
            "items": [],
            "manual_required": [],
        }

    def _record_error(self, job: ImportJob, report: dict[str, Any], row: int | None, word: str | None, message: str) -> None:
        self._report_error(report, word, message)
        job.failed_records = report["error_count"]
        self._log(job, "error", row, f"{word or 'registro'}: {message}")
        self.db.commit()

    def _record_auto_error(
        self,
        job: ImportJob,
        report: dict[str, Any],
        row: int | None,
        word: str | None,
        message: str,
        *,
        action: str,
    ) -> None:
        self._report_error(report, word, message)
        report["video_missing_count"] += 1
        self._append_report_item(
            report,
            word=word or "registro",
            status="error",
            reason=message,
            recommended_action=action,
            errors=[message],
        )
        job.failed_records = report["error_count"]
        self._log(job, "error", row, f"{word or 'registro'}: {message}")
        self.db.commit()

    def _report_error(self, report: dict[str, Any], word: str | None, message: str) -> None:
        report["error_count"] += 1
        report["errors"].append({"word": word, "message": message})

    def _append_report_item(
        self,
        report: dict[str, Any],
        *,
        word: str,
        status: str,
        reason: str,
        recommended_action: str,
        page_loaded: bool = False,
        word_found: bool = False,
        video_found: bool = False,
        gif_found: bool = False,
        image_found: bool = False,
        media_type: str = "none",
        can_use_avatar: bool = False,
        detection_method: str = "none",
        video_url: str | None = None,
        source_reference_url: str | None = None,
        image_url: str | None = None,
        warnings: list[str] | None = None,
        errors: list[str] | None = None,
    ) -> None:
        report["items"].append(
            {
                "word": word,
                "page_loaded": page_loaded,
                "word_found": word_found,
                "video_found": video_found,
                "gif_found": gif_found,
                "image_found": image_found,
                "media_type": media_type,
                "detection_method": detection_method,
                "can_use_avatar": can_use_avatar,
                "video_url": video_url,
                "source_reference_url": source_reference_url,
                "image_url": image_url,
                "status": status,
                "reason": reason,
                "recommended_action": recommended_action,
                "warnings": warnings or [],
                "errors": errors or [],
            }
        )

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
            "use_browser": self.settings.ines_import_use_browser,
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
            "avatar_gif_url": sign.avatar_gif_url,
            "avatar_animation_url": sign.avatar_animation_url,
        }

    def _clean(self, value: Any) -> str | None:
        if value is None:
            return None
        value = str(value).strip()
        return value or None
