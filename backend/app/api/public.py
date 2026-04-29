from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import SignCategory, Subject
from app.schemas.api import SignCategoryRead, SubjectRead

router = APIRouter(tags=["public"])


@router.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "LibrasLive Edu API"}


@router.get("/subjects", response_model=list[SubjectRead])
def list_subjects(db: Session = Depends(get_db)):
    return list(db.scalars(select(Subject).order_by(Subject.name.asc())))


@router.get("/categories", response_model=list[SignCategoryRead])
def list_categories(db: Session = Depends(get_db)):
    return list(db.scalars(select(SignCategory).order_by(SignCategory.name.asc())))
