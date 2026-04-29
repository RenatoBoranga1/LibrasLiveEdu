from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import get_optional_user, require_role
from app.core.config import get_settings
from app.core.database import get_db
from app.core.security import hash_password, utc_now
from app.importers.libras_dictionary_importer import LibrasDictionaryImporter
from app.models import ClassSession, ImportJob, SavedWord, Sign, SignAuditLog, User, UserRole
from app.repositories.sign_repository import SignRepository
from app.schemas.api import AdminStats, ImportJobRead, ImportRequest, RejectSignRequest, SavedWordCreate, SignRead, SignUpdate
from app.services.text_normalizer import TextNormalizerService

router = APIRouter(tags=["signs"])


@router.get("/signs", response_model=list[SignRead])
def list_signs(
    word: str | None = None,
    category_id: int | None = None,
    subject_id: int | None = None,
    status: str | None = None,
    db: Session = Depends(get_db),
):
    normalized_word = TextNormalizerService().normalize_word(word) if word else None
    return SignRepository(db).search(normalized_word, category_id, subject_id, status)


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
    if not sign.source_name or not sign.license or sign.license.strip().lower() == "aguardando curadoria":
        raise HTTPException(status_code=422, detail="Nao e permitido aprovar sinal sem fonte e licenca validas.")
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
