from fastapi import APIRouter, Depends
from sqlalchemy import select, text
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.database import get_db
from app.models import SignCategory, Subject
from app.schemas.api import SignCategoryRead, SubjectRead

router = APIRouter(tags=["public"])


@router.get("/health")
def health(db: Session = Depends(get_db)) -> dict[str, str | bool]:
    settings = get_settings()
    database_status = "connected"
    try:
        db.execute(text("select 1"))
    except Exception:  # noqa: BLE001
        database_status = "unavailable"
    return {
        "status": "ok" if database_status == "connected" else "degraded",
        "app": "LibrasLive Edu",
        "environment": settings.environment,
        "database": database_status,
        "demo_mode": settings.demo_mode,
        "avatar_provider_configured": bool(settings.vlibras_api_url),
    }


@router.get("/subjects", response_model=list[SubjectRead])
def list_subjects(db: Session = Depends(get_db)):
    return list(db.scalars(select(Subject).order_by(Subject.name.asc())))


@router.get("/categories", response_model=list[SignCategoryRead])
def list_categories(db: Session = Depends(get_db)):
    return list(db.scalars(select(SignCategory).order_by(SignCategory.name.asc())))
