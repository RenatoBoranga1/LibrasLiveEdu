from fastapi import APIRouter, Depends, Response, status
from sqlalchemy import select, text
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.database import get_db
from app.core.redis import get_redis_client
from app.models import SignCategory, Subject
from app.schemas.api import SignCategoryRead, SubjectRead

router = APIRouter(tags=["public"])
health_router = APIRouter(tags=["health"])


@health_router.get("/health")
def health() -> dict[str, str]:
    return {
        "status": "ok",
        "service": "libraslive-edu-api",
    }


@health_router.get("/ready")
def ready(response: Response, db: Session = Depends(get_db)) -> dict[str, str | dict[str, str]]:
    checks = {"database": "ready"}
    try:
        db.execute(text("select 1"))
    except Exception:  # noqa: BLE001
        checks["database"] = "unavailable"

    settings = get_settings()
    if settings.redis_url:
        redis_client = None
        try:
            redis_client = get_redis_client()
            redis_client.ping()
            checks["redis"] = "ready"
        except Exception:  # noqa: BLE001
            checks["redis"] = "unavailable"
        finally:
            if redis_client is not None:
                redis_client.close()

    is_ready = all(value == "ready" for value in checks.values())
    if not is_ready:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    return {
        "status": "ready" if is_ready else "not_ready",
        "checks": checks,
    }


@router.get("/subjects", response_model=list[SubjectRead])
def list_subjects(db: Session = Depends(get_db)):
    return list(db.scalars(select(Subject).order_by(Subject.name.asc())))


@router.get("/categories", response_model=list[SignCategoryRead])
def list_categories(db: Session = Depends(get_db)):
    return list(db.scalars(select(SignCategory).order_by(SignCategory.name.asc())))
