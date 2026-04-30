import csv
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.parse import urljoin, urlparse

import httpx
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models import ImportJob, ImportStatus, Sign, SignAuditLog, SignStatus, User
from app.services.text_normalizer import TextNormalizerService


class InesAuthorizedMediaImporter:
    """Imports INES media only when an explicit authorization flag is present.

    The importer intentionally expects an authorized manifest/export with words
    and media URLs. It does not blindly crawl the public site.
    """

    default_source_name = "Dicionário da Língua Brasileira de Sinais - INES"
    default_license = "Fonte pública para consulta; uso de mídia autorizado conforme referência registrada."
    default_license_notes = "Mídia baixada apenas quando houver autorização formal do INES/governo registrada no ambiente."

    def __init__(self, db: Session):
        self.db = db
        self.settings = get_settings()
        self.normalizer = TextNormalizerService()

    def import_manifest(
        self,
        source: str | Path,
        source_type: str = "json",
        *,
        download_media: bool = True,
        overwrite_files: bool = False,
        authorized: bool = False,
        authorization_reference: str | None = None,
        user: User | None = None,
    ) -> ImportJob:
        job = self._create_job(source_type, f"INES authorized media: {source}")
        try:
            self._ensure_authorized(authorized, authorization_reference)
            records = self._load_records(source, source_type)
            return self._process_records(job, records, download_media, overwrite_files, authorization_reference, user)
        except Exception as exc:  # noqa: BLE001
            return self._fail_job(job, f"Falha ao importar mídia autorizada INES: {exc}")

    def _ensure_authorized(self, authorized: bool, authorization_reference: str | None) -> None:
        if not (authorized or self.settings.ines_media_import_authorized):
            raise PermissionError("Importação bloqueada. Defina INES_MEDIA_IMPORT_AUTHORIZED=true ou use --authorized.")
        reference = authorization_reference or self.settings.ines_media_authorization_reference
        if not reference:
            raise PermissionError("Informe a referência da autorização em INES_MEDIA_AUTHORIZATION_REFERENCE.")

    def _load_records(self, source: str | Path, source_type: str) -> list[dict[str, Any]]:
        source_path = Path(source)
        if source_type == "csv":
            with source_path.open("r", encoding="utf-8-sig", newline="") as file:
                return list(csv.DictReader(file))
        with source_path.open("r", encoding="utf-8") as file:
            payload = json.load(file)
        records = payload["items"] if isinstance(payload, dict) and "items" in payload else payload
        if not isinstance(records, list):
            raise ValueError("Manifesto deve conter uma lista ou um objeto com a chave 'items'.")
        return records

    def _process_records(
        self,
        job: ImportJob,
        records: list[dict[str, Any]],
        download_media: bool,
        overwrite_files: bool,
        authorization_reference: str | None,
        user: User | None,
    ) -> ImportJob:
        job.status = ImportStatus.running.value
        job.total_records = len(records)
        self.db.commit()

        for index, record in enumerate(records, start=1):
            try:
                sign = self._create_or_update_pending_sign(record, download_media, overwrite_files, authorization_reference, user)
                if sign:
                    job.imported_records += 1
                    self._log(job, "success", index, f"mídia INES registrada como pending: {sign.word}")
                else:
                    job.failed_records += 1
                    self._log(job, "error", index, "registro sem palavra")
                self.db.flush()
            except Exception as exc:  # noqa: BLE001
                job.failed_records += 1
                self._log(job, "error", index, str(exc))

        job.status = ImportStatus.completed.value if job.failed_records == 0 else ImportStatus.failed.value
        job.finished_at = datetime.now(timezone.utc)
        self.db.commit()
        self.db.refresh(job)
        return job

    def _create_or_update_pending_sign(
        self,
        record: dict[str, Any],
        download_media: bool,
        overwrite_files: bool,
        authorization_reference: str | None,
        user: User | None,
    ) -> Sign | None:
        word = self._clean(record.get("word") or record.get("palavra"))
        if not word:
            return None

        normalized_word = self.normalizer.normalize_word(word)
        gloss = self._clean(record.get("gloss") or record.get("glosa"))
        statement = select(Sign).where(Sign.normalized_word == normalized_word)
        if gloss:
            statement = statement.where(Sign.gloss == gloss)
        sign = self.db.scalar(statement.order_by(Sign.updated_at.desc()).limit(1))
        old_value = self._snapshot(sign)
        if not sign:
            sign = Sign(word=word, normalized_word=normalized_word)
            self.db.add(sign)

        image_url = self._clean(record.get("image_url") or record.get("imagem") or record.get("image"))
        video_url = self._clean(record.get("video_url") or record.get("video") or record.get("avatar_video_url"))
        animation_url = self._clean(record.get("animation_payload_url") or record.get("avatar_animation_url"))

        if download_media:
            image_url = self._download_media(image_url, normalized_word, "image", overwrite_files) if image_url else None
            video_url = self._download_media(video_url, normalized_word, "video", overwrite_files) if video_url else None
            animation_url = self._download_media(animation_url, normalized_word, "animation", overwrite_files) if animation_url else None

        sign.word = word
        sign.normalized_word = normalized_word
        sign.gloss = gloss or sign.gloss
        sign.example_sentence = self._clean(record.get("example_sentence") or record.get("exemplo")) or sign.example_sentence
        sign.description = self._description(record) or sign.description
        sign.image_url = image_url or sign.image_url
        sign.video_url = video_url or sign.video_url
        sign.avatar_animation_url = animation_url or sign.avatar_animation_url
        sign.source_name = self._clean(record.get("source_name")) or self.default_source_name
        sign.source_url = self._clean(record.get("source_url") or record.get("source_reference_url")) or self.settings.ines_media_base_url
        sign.license = self._clean(record.get("license")) or self.default_license
        sign.status = SignStatus.pending.value
        sign.curator_notes = self._clean(record.get("curator_notes")) or "Mídia INES importada com autorização; aguardando curadoria por especialista em Libras."
        sign.educational_notes = self._educational_notes(record, authorization_reference)
        sign.version = (sign.version or 1) + 1
        self.db.flush()
        self.db.add(
            SignAuditLog(
                sign_id=sign.id,
                user_id=user.id if user else None,
                action="ines_authorized_media_import",
                old_value=old_value,
                new_value={
                    "status": sign.status,
                    "image_url": sign.image_url,
                    "video_url": sign.video_url,
                    "source_name": sign.source_name,
                    "authorization_reference": authorization_reference or self.settings.ines_media_authorization_reference,
                },
            )
        )
        return sign

    def _download_media(self, media_url: str, normalized_word: str, media_kind: str, overwrite_files: bool) -> str:
        absolute_url = urljoin(self.settings.ines_media_base_url, media_url)
        parsed = urlparse(absolute_url)
        if parsed.scheme not in {"http", "https"}:
            raise ValueError(f"URL de mídia inválida: {media_url}")
        if parsed.hostname and parsed.hostname.lower() not in self.settings.ines_allowed_host_list:
            raise ValueError(f"Host de mídia não permitido: {parsed.hostname}")

        media_hash = hashlib.sha256(absolute_url.encode("utf-8")).hexdigest()[:12]
        extension = self._extension_from_url(parsed.path) or ".bin"
        target_dir = Path(self.settings.media_storage_dir) / "ines" / normalized_word
        target_dir.mkdir(parents=True, exist_ok=True)
        target_path = target_dir / f"{media_kind}_{media_hash}{extension}"

        if not target_path.exists() or overwrite_files:
            with httpx.stream("GET", absolute_url, timeout=60, follow_redirects=True) as response:
                response.raise_for_status()
                with target_path.open("wb") as file:
                    for chunk in response.iter_bytes():
                        if chunk:
                            file.write(chunk)

        return f"{self.settings.public_media_base_url.rstrip('/')}/ines/{normalized_word}/{target_path.name}"

    def _extension_from_url(self, path: str) -> str | None:
        suffix = Path(path).suffix.lower()
        if suffix in {".jpg", ".jpeg", ".png", ".webp", ".gif", ".mp4", ".webm", ".mov", ".json"}:
            return suffix
        return None

    def _description(self, record: dict[str, Any]) -> str | None:
        pieces = []
        for label, key in [
            ("Acepção/significado", "meaning"),
            ("Classe gramatical", "grammatical_class"),
            ("Configuração de mão", "handshape"),
            ("Movimento", "movement"),
            ("Localização", "location"),
            ("Orientação", "orientation"),
            ("Expressão facial", "facial_expression"),
        ]:
            value = self._clean(record.get(key))
            if value:
                pieces.append(f"{label}: {value}")
        return "\n".join(pieces) if pieces else None

    def _educational_notes(self, record: dict[str, Any], authorization_reference: str | None) -> str:
        notes = [
            "Mídia importada do Dicionário INES por fluxo autorizado.",
            "Sinal permanece pending até curadoria por admin/curador.",
            f"Autorização: {authorization_reference or self.settings.ines_media_authorization_reference}",
        ]
        license_notes = self._clean(record.get("license_notes")) or self.default_license_notes
        notes.append(f"Observações de licença: {license_notes}")
        reference_url = self._clean(record.get("source_reference_url"))
        if reference_url:
            notes.append(f"URL consultada: {reference_url}")
        return "\n".join(notes)

    def _create_job(self, source_type: str, source_name: str) -> ImportJob:
        job = ImportJob(source_type=source_type, source_name=source_name, status=ImportStatus.pending.value)
        self.db.add(job)
        self.db.commit()
        self.db.refresh(job)
        return job

    def _fail_job(self, job: ImportJob, message: str) -> ImportJob:
        job.status = ImportStatus.failed.value
        job.failed_records = max(job.failed_records, 1)
        job.finished_at = datetime.now(timezone.utc)
        self._log(job, "error", None, message)
        self.db.commit()
        self.db.refresh(job)
        return job

    def _log(self, job: ImportJob, level: str, row: int | None, message: str) -> None:
        logs = list(job.logs or [])
        logs.append({"level": level, "row": row, "message": message})
        job.logs = logs

    def _snapshot(self, sign: Sign | None) -> dict[str, Any] | None:
        if not sign:
            return None
        return {
            "status": sign.status,
            "image_url": sign.image_url,
            "video_url": sign.video_url,
            "source_name": sign.source_name,
            "license": sign.license,
        }

    def _clean(self, value: Any) -> str | None:
        if value is None:
            return None
        value = str(value).strip()
        return value or None
