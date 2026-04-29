import csv
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import httpx
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models import ImportJob, ImportStatus, Sign, SignCategory, SignStatus, Subject
from app.services.text_normalizer import TextNormalizerService


class LibrasDictionaryImporter:
    required_fields = {"word", "source_name", "license"}

    def __init__(self, db: Session):
        self.db = db
        self.settings = get_settings()
        self.normalizer = TextNormalizerService()

    def import_from_csv(self, file_path: str | Path) -> ImportJob:
        job = self._create_job("csv", str(file_path))
        try:
            with Path(file_path).open("r", encoding="utf-8-sig", newline="") as file:
                records = list(csv.DictReader(file))
            return self._process_records(job, records)
        except Exception as exc:  # noqa: BLE001
            return self._fail_job(job, f"Falha ao importar CSV: {exc}")

    def import_from_json(self, file_path: str | Path) -> ImportJob:
        job = self._create_job("json", str(file_path))
        try:
            with Path(file_path).open("r", encoding="utf-8") as file:
                payload = json.load(file)
            records = payload["items"] if isinstance(payload, dict) and "items" in payload else payload
            if not isinstance(records, list):
                raise ValueError("JSON deve conter uma lista ou um objeto com a chave 'items'.")
            return self._process_records(job, records)
        except Exception as exc:  # noqa: BLE001
            return self._fail_job(job, f"Falha ao importar JSON: {exc}")

    def import_from_api(self, provider_name: str) -> ImportJob:
        if provider_name.lower() == "vlibras":
            return self.import_from_vlibras_api()

        job = self._create_job("api", provider_name)
        return self._fail_job(
            job,
            "Provider API nao configurado. Use JSON/CSV autorizado ou implemente um provider em app/providers.",
        )

    def import_from_vlibras_api(self) -> ImportJob:
        job = self._create_job("api", "VLibras")
        if not self.settings.vlibras_api_url:
            return self._fail_job(job, "VLibras API nao configurada em VLIBRAS_API_URL.")

        try:
            headers = {}
            if self.settings.vlibras_api_key:
                headers["Authorization"] = f"Bearer {self.settings.vlibras_api_key}"
            response = httpx.get(self.settings.vlibras_api_url, headers=headers, timeout=30)
            response.raise_for_status()
            payload = response.json()
            records = payload["items"] if isinstance(payload, dict) and "items" in payload else payload
            if not isinstance(records, list):
                raise ValueError("Resposta da API deve ser uma lista de sinais.")
            return self._process_records(job, records)
        except Exception as exc:  # noqa: BLE001
            return self._fail_job(job, f"Falha ao importar API VLibras: {exc}")

    def validate_required_fields(self, record: dict[str, Any]) -> tuple[bool, str | None]:
        missing = sorted(field for field in self.required_fields if not str(record.get(field, "")).strip())
        if missing:
            return False, f"Campos obrigatorios ausentes: {', '.join(missing)}"
        return True, None

    def validate_license(self, record: dict[str, Any]) -> tuple[bool, str | None]:
        license_name = str(record.get("license", "")).strip().lower()
        if not license_name or license_name in {"desconhecida", "unknown", "sem licenca"}:
            return False, "Licenca ausente ou invalida para uso autorizado."
        return True, None

    def normalize_word(self, word: str) -> str:
        return self.normalizer.normalize_word(word)

    def detect_duplicate(self, word: str, gloss: str | None = None, regionalism: str | None = None) -> Sign | None:
        normalized_word = self.normalize_word(word)
        statement = select(Sign).where(Sign.normalized_word == normalized_word)
        if gloss:
            statement = statement.where(Sign.gloss == gloss)
        if regionalism:
            statement = statement.where(Sign.regionalism == regionalism)
        return self.db.scalar(statement.limit(1))

    def create_or_update_sign(self, record: dict[str, Any]) -> tuple[str, Sign | None]:
        valid, error = self.validate_required_fields(record)
        if not valid:
            return error or "Registro invalido.", None
        valid_license, error = self.validate_license(record)
        if not valid_license:
            return error or "Licenca invalida.", None

        word = str(record["word"]).strip()
        gloss = self._clean(record.get("gloss"))
        regionalism = self._clean(record.get("regionalism"))
        existing = self.detect_duplicate(word, gloss, regionalism)
        source_name = str(record.get("source_name", "")).strip()
        trusted = source_name.lower() in self.settings.trusted_sources and bool(record.get("trusted"))
        desired_status = SignStatus.approved.value if trusted else SignStatus.pending.value

        if existing and existing.status == SignStatus.approved.value and not record.get("overwrite_approved"):
            return "Sinal aprovado existente preservado sem sobrescrita.", existing

        category = self._find_category(record.get("category"))
        subject = self._find_subject(record.get("subject"))

        target = existing or Sign(word=word, normalized_word=self.normalize_word(word))
        target.word = word
        target.normalized_word = self.normalize_word(word)
        target.gloss = gloss
        target.description = self._clean(record.get("description"))
        target.category_id = category.id if category else None
        target.subject_id = subject.id if subject else None
        target.image_url = self._clean(record.get("image_url"))
        target.video_url = self._clean(record.get("video_url"))
        target.avatar_animation_url = self._clean(record.get("avatar_animation_url"))
        target.hand_configuration = self._clean(record.get("hand_configuration"))
        target.movement_description = self._clean(record.get("movement_description"))
        target.facial_expression = self._clean(record.get("facial_expression"))
        target.example_sentence = self._clean(record.get("example_sentence"))
        target.source_name = source_name
        target.source_url = self._clean(record.get("source_url"))
        target.license = str(record.get("license", "")).strip()
        target.regionalism = regionalism
        target.status = desired_status
        target.difficulty_level = self._clean(record.get("difficulty_level"))
        target.curator_notes = self._clean(record.get("curator_notes")) or (
            "Importado como pendente para revisao por especialista em Libras."
        )

        if not existing:
            self.db.add(target)
            return "created", target
        return "updated", target

    def mark_as_pending_review(self, record: dict[str, Any]) -> dict[str, Any]:
        record = dict(record)
        record["status"] = SignStatus.pending.value
        record["curator_notes"] = record.get("curator_notes") or "Pendente de curadoria por especialista em Libras."
        return record

    def generate_import_report(self, import_job_id: int) -> dict[str, Any]:
        job = self.db.get(ImportJob, import_job_id)
        if not job:
            raise ValueError("ImportJob nao encontrado.")
        return {
            "id": job.id,
            "source_type": job.source_type,
            "source_name": job.source_name,
            "status": job.status,
            "total_records": job.total_records,
            "imported_records": job.imported_records,
            "updated_records": job.updated_records,
            "failed_records": job.failed_records,
            "logs": job.logs,
        }

    def _process_records(self, job: ImportJob, records: list[dict[str, Any]]) -> ImportJob:
        job.status = ImportStatus.running.value
        job.total_records = len(records)
        self.db.commit()

        for index, record in enumerate(records, start=1):
            try:
                safe_record = self.mark_as_pending_review(record)
                result, sign = self.create_or_update_sign(safe_record)
                if result == "created":
                    job.imported_records += 1
                elif result == "updated":
                    job.updated_records += 1
                elif result.startswith("Sinal aprovado"):
                    self._log(job, "info", index, result)
                else:
                    job.failed_records += 1
                    self._log(job, "error", index, result)
                if sign:
                    self._log(job, "success", index, f"{result}: {sign.word}")
                self.db.flush()
            except Exception as exc:  # noqa: BLE001
                job.failed_records += 1
                self._log(job, "error", index, str(exc))

        job.status = ImportStatus.completed.value if job.failed_records == 0 else ImportStatus.failed.value
        job.finished_at = datetime.now(timezone.utc)
        self.db.commit()
        self.db.refresh(job)
        return job

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

    def _find_category(self, category_name: Any) -> SignCategory | None:
        if not category_name:
            return None
        return self.db.scalar(select(SignCategory).where(SignCategory.name == str(category_name).strip()))

    def _find_subject(self, subject_name: Any) -> Subject | None:
        if not subject_name:
            return None
        return self.db.scalar(select(Subject).where(Subject.name == str(subject_name).strip()))

    def _clean(self, value: Any) -> str | None:
        if value is None:
            return None
        value = str(value).strip()
        return value or None
