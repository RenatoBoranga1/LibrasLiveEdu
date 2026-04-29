from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.importers.libras_dictionary_importer import LibrasDictionaryImporter
from app.models import ClassSession, ImportJob, SavedWord, Sign, User, UserRole
from app.repositories.sign_repository import SignRepository
from app.schemas.api import AdminStats, ImportJobRead, ImportRequest, SavedWordCreate, SignRead, SignUpdate
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
def update_sign(sign_id: int, payload: SignUpdate, db: Session = Depends(get_db)):
    sign = db.get(Sign, sign_id)
    if not sign:
        raise HTTPException(status_code=404, detail="Sinal nao encontrado.")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(sign, field, value)
    db.commit()
    db.refresh(sign)
    return sign


@router.post("/signs/{sign_id}/approve", response_model=SignRead)
def approve_sign(sign_id: int, db: Session = Depends(get_db)):
    sign = db.get(Sign, sign_id)
    if not sign:
        raise HTTPException(status_code=404, detail="Sinal nao encontrado.")
    sign.status = "approved"
    sign.curator_notes = sign.curator_notes or "Aprovado por administrador/curador."
    db.commit()
    db.refresh(sign)
    return sign


@router.get("/admin/stats", response_model=AdminStats)
def admin_stats(db: Session = Depends(get_db)):
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
def import_dictionary(payload: ImportRequest, db: Session = Depends(get_db)):
    importer = LibrasDictionaryImporter(db)
    if payload.source_type == "csv":
        return importer.import_from_csv(payload.source)
    if payload.source_type == "json":
        return importer.import_from_json(payload.source)
    return importer.import_from_api(payload.provider_name or payload.source)


@router.get("/admin/import-jobs", response_model=list[ImportJobRead])
def list_import_jobs(db: Session = Depends(get_db)):
    return list(db.scalars(select(ImportJob).order_by(ImportJob.created_at.desc()).limit(50)))


@router.post("/saved-words")
def save_word(payload: SavedWordCreate, db: Session = Depends(get_db)):
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
    user = db.scalar(select(User).where(User.email == payload.user_email))
    if not user:
        user = User(
            name=payload.user_name,
            email=payload.user_email,
            password_hash="demo-not-for-production",
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
