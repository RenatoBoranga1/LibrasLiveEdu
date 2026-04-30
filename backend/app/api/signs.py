from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import get_optional_user, require_role
from app.core.config import get_settings
from app.core.database import get_db
from app.core.security import hash_password, utc_now
from app.importers.ines_authorized_media_importer import InesAuthorizedMediaImporter
from app.importers.libras_dictionary_importer import LibrasDictionaryImporter
from app.models import ClassSession, ImportJob, SavedWord, Sign, SignAuditLog, User, UserRole
from app.repositories.sign_repository import SignRepository
from app.schemas.api import (
    AdminStats,
    InesMediaImportRequest,
    ImportJobRead,
    ImportRequest,
    ManualSignCreate,
    RejectSignRequest,
    SavedWordCreate,
    SignCurationRequest,
    SignRead,
    SignUpdate,
)
from app.services.text_normalizer import TextNormalizerService

router = APIRouter(tags=["signs"])


@router.get("/signs", response_model=list[SignRead])
def list_signs(
    word: str | None = None,
    category_id: int | None = None,
    subject_id: int | None = None,
    status: str | None = None,
    source_name: str | None = None,
    db: Session = Depends(get_db),
):
    normalized_word = TextNormalizerService().normalize_word(word) if word else None
    return SignRepository(db).search(normalized_word, category_id, subject_id, status, source_name=source_name)


@router.get("/signs/lookup")
def lookup_sign(word: str, db: Session = Depends(get_db)):
    normalized_word = TextNormalizerService().normalize_word(word)
    sign = SignRepository(db).find_best_by_normalized_word(normalized_word)
    if not sign:
        return {"status": "unavailable", "word": word, "message": "Sinal ainda não cadastrado."}
    if sign.status in {"pending", "review", "needs_specialist_review"}:
        return {
            "status": "pending",
            "word": sign.word,
            "message": "Sinal cadastrado, mas ainda aguardando curadoria.",
            "sourceName": sign.source_name,
            "license": sign.license,
        }
    if sign.status != "approved":
        return {"status": "unavailable", "word": word, "message": "Sinal ainda não cadastrado."}
    payload = _approved_sign_payload(sign)
    return {"status": "approved", **payload, "sign": payload}


@router.post("/signs/manual", response_model=SignRead)
def create_manual_sign(
    payload: ManualSignCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_role(["admin", "curator"])),
):
    normalizer = TextNormalizerService()
    normalized_word = normalizer.normalize_word(payload.word)
    statement = select(Sign).where(Sign.normalized_word == normalized_word)
    if payload.gloss:
        statement = statement.where(Sign.gloss == payload.gloss)
    sign = db.scalar(statement.order_by(Sign.updated_at.desc()).limit(1))
    is_new_sign = sign is None
    old_value = _sign_snapshot(sign) if sign else None

    if not sign:
        sign = Sign(word=payload.word, normalized_word=normalized_word, status="pending")
        db.add(sign)

    sign.word = payload.word or sign.word
    sign.normalized_word = normalized_word
    sign.status = "pending"
    _set_if_present(sign, "gloss", payload.gloss)
    _set_if_present(sign, "example_sentence", payload.example_sentence)
    _set_if_present(sign, "hand_configuration", payload.handshape)
    _set_if_present(sign, "movement_description", payload.movement)
    _set_if_present(sign, "facial_expression", payload.facial_expression)
    _set_if_present(sign, "source_name", payload.source_name)
    _set_if_present(sign, "source_url", payload.source_url)
    _set_if_present(sign, "license", payload.license)
    _set_if_present(sign, "image_url", payload.image_url)
    _set_if_present(sign, "video_url", payload.avatar_video_url or payload.video_url)
    _set_if_present(sign, "avatar_animation_url", payload.animation_payload_url)
    description = _manual_description(payload)
    if description:
        sign.description = description
    sign.educational_notes = _manual_educational_notes(payload)
    sign.curator_notes = payload.curator_notes or sign.curator_notes
    sign.version = 1 if is_new_sign else (sign.version or 1) + 1
    db.flush()
    db.add(
        SignAuditLog(
            sign_id=sign.id,
            user_id=user.id,
            action="manual_create" if is_new_sign else "manual_update",
            old_value=old_value,
            new_value={
                "status": sign.status,
                "word": sign.word,
                "source_name": sign.source_name,
                "source_reference_url": _source_reference_url(sign),
            },
        )
    )
    db.commit()
    db.refresh(sign)
    return sign


@router.patch("/signs/{sign_id}/curation", response_model=SignRead)
def curate_sign(
    sign_id: int,
    payload: SignCurationRequest,
    db: Session = Depends(get_db),
    user: User = Depends(require_role(["admin", "curator"])),
):
    sign = db.get(Sign, sign_id)
    if not sign:
        raise HTTPException(status_code=404, detail="Sinal nao encontrado.")
    if payload.status == "approved":
        if not sign.source_name or not sign.source_url or not sign.license:
            raise HTTPException(status_code=422, detail="Nao e permitido aprovar sinal sem fonte, URL e licenca.")
        if sign.video_url and not _license_notes(sign):
            raise HTTPException(status_code=422, detail="Nao e permitido aprovar video sem observacao de autorizacao/licenca.")
        if not sign.gloss and not sign.video_url and not sign.avatar_animation_url and not sign.description:
            raise HTTPException(status_code=422, detail="Nao e permitido aprovar sinal sem glosa, midia ou descricao adequada.")
    old_value = _sign_snapshot(sign)
    sign.status = payload.status
    sign.curator_notes = payload.curator_notes or sign.curator_notes
    sign.last_reviewed_at = utc_now()
    if payload.status == "approved":
        sign.approved_by_user_id = user.id
        sign.approved_at = utc_now()
    if payload.status == "rejected":
        sign.rejected_by_user_id = user.id
        sign.rejected_at = utc_now()
    sign.version += 1
    db.add(
        SignAuditLog(
            sign_id=sign.id,
            user_id=user.id,
            action="curation",
            old_value=old_value,
            new_value={"status": sign.status, "curator_notes": sign.curator_notes},
        )
    )
    db.commit()
    db.refresh(sign)
    return sign


@router.patch("/signs/{sign_id}", response_model=SignRead)
def update_sign(
    sign_id: int,
    payload: SignUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_role(["admin", "curator"])),
):
    sign = db.get(Sign, sign_id)
    if not sign:
        raise HTTPException(status_code=404, detail="Sinal nao encontrado.")
    old_value = {field: getattr(sign, field) for field in payload.model_dump(exclude_unset=True)}
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(sign, field, value)
    sign.version += 1
    db.add(SignAuditLog(sign_id=sign.id, user_id=user.id, action="update", old_value=old_value, new_value=payload.model_dump(exclude_unset=True)))
    db.commit()
    db.refresh(sign)
    return sign


@router.post("/signs/{sign_id}/approve", response_model=SignRead)
def approve_sign(
    sign_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_role(["admin", "curator"])),
):
    sign = db.get(Sign, sign_id)
    if not sign:
        raise HTTPException(status_code=404, detail="Sinal nao encontrado.")
    if not sign.source_name or not sign.source_url or not sign.license or sign.license.strip().lower() == "aguardando curadoria":
        raise HTTPException(status_code=422, detail="Nao e permitido aprovar sinal sem fonte, URL e licenca validas.")
    if sign.video_url and not _license_notes(sign):
        raise HTTPException(status_code=422, detail="Nao e permitido aprovar video sem observacao de autorizacao/licenca.")
    if not sign.gloss and not sign.video_url and not sign.avatar_animation_url and not sign.description:
        raise HTTPException(status_code=422, detail="Nao e permitido aprovar sinal sem glosa, midia ou descricao adequada.")
    old_value = {"status": sign.status}
    sign.status = "approved"
    sign.curator_notes = sign.curator_notes or "Aprovado por administrador/curador."
    sign.approved_by_user_id = user.id
    sign.approved_at = utc_now()
    sign.last_reviewed_at = utc_now()
    sign.version += 1
    db.add(SignAuditLog(sign_id=sign.id, user_id=user.id, action="approve", old_value=old_value, new_value={"status": sign.status}))
    db.commit()
    db.refresh(sign)
    return sign


@router.post("/signs/{sign_id}/reject", response_model=SignRead)
def reject_sign(
    sign_id: int,
    payload: RejectSignRequest,
    db: Session = Depends(get_db),
    user: User = Depends(require_role(["admin", "curator"])),
):
    sign = db.get(Sign, sign_id)
    if not sign:
        raise HTTPException(status_code=404, detail="Sinal nao encontrado.")
    old_value = {"status": sign.status}
    sign.status = "rejected"
    sign.rejected_by_user_id = user.id
    sign.rejected_at = utc_now()
    sign.curator_notes = payload.reason
    sign.version += 1
    db.add(SignAuditLog(sign_id=sign.id, user_id=user.id, action="reject", old_value=old_value, new_value={"status": sign.status, "reason": payload.reason}))
    db.commit()
    db.refresh(sign)
    return sign


@router.get("/signs/{sign_id}/audit")
def sign_audit_log(
    sign_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_role(["admin", "curator"])),
):
    sign = db.get(Sign, sign_id)
    if not sign:
        raise HTTPException(status_code=404, detail="Sinal nao encontrado.")
    logs = list(db.scalars(select(SignAuditLog).where(SignAuditLog.sign_id == sign_id).order_by(SignAuditLog.created_at.desc())))
    return [
        {
            "id": item.id,
            "user_id": item.user_id,
            "action": item.action,
            "old_value": item.old_value,
            "new_value": item.new_value,
            "created_at": item.created_at,
        }
        for item in logs
    ]


@router.get("/admin/stats", response_model=AdminStats)
def admin_stats(db: Session = Depends(get_db), _: User = Depends(require_role(["admin"]))):
    stats = SignRepository(db).stats_by_status()
    total_signs = db.scalar(select(func.count(Sign.id))) or 0
    import_jobs = db.scalar(select(func.count(ImportJob.id))) or 0
    return AdminStats(
        total_signs=total_signs,
        approved_signs=stats.get("approved", 0),
        pending_signs=stats.get("pending", 0),
        rejected_signs=stats.get("rejected", 0),
        review_signs=stats.get("review", 0),
        import_jobs=import_jobs,
    )


@router.post("/admin/import", response_model=ImportJobRead)
def import_dictionary(
    payload: ImportRequest,
    db: Session = Depends(get_db),
    _: User = Depends(require_role(["admin"])),
):
    importer = LibrasDictionaryImporter(db)
    if payload.source_type == "csv":
        return importer.import_from_csv(payload.source)
    if payload.source_type == "json":
        return importer.import_from_json(payload.source)
    return importer.import_from_api(payload.provider_name or payload.source)


@router.post("/admin/import/ines-media", response_model=ImportJobRead)
def import_ines_authorized_media(
    payload: InesMediaImportRequest,
    db: Session = Depends(get_db),
    user: User = Depends(require_role(["admin"])),
):
    importer = InesAuthorizedMediaImporter(db)
    return importer.import_manifest(
        payload.source,
        payload.source_type,
        download_media=payload.download_media,
        overwrite_files=payload.overwrite_files,
        authorized=payload.authorized,
        authorization_reference=payload.authorization_reference,
        user=user,
    )


@router.get("/admin/import-jobs", response_model=list[ImportJobRead])
def list_import_jobs(db: Session = Depends(get_db), _: User = Depends(require_role(["admin"]))):
    return list(db.scalars(select(ImportJob).order_by(ImportJob.created_at.desc()).limit(50)))


@router.post("/saved-words")
def save_word(
    payload: SavedWordCreate,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_optional_user),
):
    sign = db.get(Sign, payload.sign_id) if payload.sign_id else None
    if not sign and payload.word:
        normalized_word = TextNormalizerService().normalize_word(payload.word)
        sign = db.scalar(select(Sign).where(Sign.normalized_word == normalized_word).limit(1))
    if not sign:
        raise HTTPException(status_code=404, detail="Sinal nao encontrado.")
    class_session_id = payload.class_session_id
    if not class_session_id and payload.access_code:
        class_session = db.scalar(select(ClassSession).where(ClassSession.access_code == payload.access_code.upper()))
        class_session_id = class_session.id if class_session else None
    user = current_user
    # Anonymous students should keep saved words on the device in production.
    if not user and not get_settings().demo_mode:
        return {"id": 0, "word": sign.word, "status": "local-only"}
    if not user:
        user = db.scalar(select(User).where(User.email == payload.user_email))
    if not user:
        user = User(
            name=payload.user_name,
            email=payload.user_email,
            password_hash=hash_password("demo-student-password"),
            role=UserRole.student.value,
        )
        db.add(user)
        db.flush()
    saved = SavedWord(
        user_id=user.id,
        sign_id=sign.id,
        class_session_id=class_session_id,
        notes=payload.notes,
    )
    db.add(saved)
    db.commit()
    return {"id": saved.id, "word": sign.word, "status": "saved"}


def _set_if_present(sign: Sign, field: str, value: str | None) -> None:
    if value is not None and str(value).strip():
        setattr(sign, field, value)


def _manual_description(payload: ManualSignCreate) -> str:
    lines = []
    if payload.meaning:
        lines.append(f"Acepção/significado: {payload.meaning}")
    if payload.grammatical_class:
        lines.append(f"Classe gramatical: {payload.grammatical_class}")
    if payload.location:
        lines.append(f"Localização: {payload.location}")
    if payload.orientation:
        lines.append(f"Orientação: {payload.orientation}")
    return "\n".join(lines)


def _manual_educational_notes(payload: ManualSignCreate) -> str:
    lines = [
        "Cadastro manual baseado em consulta ao Dicionário INES.",
        "Uso de vídeo autorizado para o projeto LibrasLive Edu quando URL de mídia for informada.",
    ]
    if payload.license_notes:
        lines.append(f"Observações de licença: {payload.license_notes}")
    if payload.source_reference_url:
        lines.append(f"URL consultada: {payload.source_reference_url}")
    if payload.avatar_video_url:
        lines.append("URL de avatar/vídeo próprio informada manualmente.")
    if payload.animation_payload_url:
        lines.append("Payload de animação informado manualmente.")
    return "\n".join(lines)


def _sign_snapshot(sign: Sign | None) -> dict | None:
    if not sign:
        return None
    return {
        "word": sign.word,
        "gloss": sign.gloss,
        "status": sign.status,
        "source_name": sign.source_name,
        "source_url": sign.source_url,
        "source_reference_url": _source_reference_url(sign),
        "license": sign.license,
        "license_notes": _license_notes(sign),
        "video_url": sign.video_url,
    }


def _metadata_value(sign: Sign, label: str) -> str | None:
    notes = sign.educational_notes or ""
    prefix = f"{label}:"
    for line in notes.splitlines():
        if line.strip().startswith(prefix):
            value = line.split(":", 1)[1].strip()
            return value or None
    return None


def _source_reference_url(sign: Sign) -> str | None:
    return _metadata_value(sign, "URL consultada") or sign.source_url


def _license_notes(sign: Sign) -> str | None:
    return _metadata_value(sign, "Observações de licença")


def _approved_sign_payload(sign: Sign) -> dict:
    return {
        "id": sign.id,
        "word": sign.word,
        "normalizedWord": sign.normalized_word,
        "gloss": sign.gloss,
        "description": sign.description,
        "exampleSentence": sign.example_sentence,
        "imageUrl": sign.image_url,
        "videoUrl": sign.video_url,
        "avatarVideoUrl": sign.video_url,
        "animationPayloadUrl": sign.avatar_animation_url,
        "sourceName": sign.source_name,
        "sourceUrl": sign.source_url,
        "sourceReferenceUrl": _source_reference_url(sign),
        "license": sign.license,
        "licenseNotes": _license_notes(sign),
        "status": sign.status,
    }
