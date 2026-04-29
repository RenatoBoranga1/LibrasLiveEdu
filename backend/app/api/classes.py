from datetime import timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import generate_unique_access_code, get_optional_user, require_role
from app.core.config import get_settings
from app.core.database import get_db
from app.core.security import create_join_token, utc_now
from app.models import ClassSession, ClassStatus, KeywordDetected, LessonSummary, TranscriptSegment, User
from app.schemas.api import ClassSessionCreate, ClassSessionPublicRead, ClassSessionRead, TranscriptInput
from app.services.lesson_summary import LessonSummaryService
from app.services.pdf_export import PdfExportService
from app.services.sign_dictionary import SignDictionaryService
from app.services.speech_to_text import DemoSpeechToTextService
from app.services.transcript import TranscriptService
from app.websocket.manager import websocket_manager

router = APIRouter(prefix="/classes", tags=["classes"])
JOIN_ATTEMPTS: dict[str, list[float]] = {}


@router.post("", response_model=ClassSessionRead)
async def create_class(
    payload: ClassSessionCreate,
    db: Session = Depends(get_db),
    teacher: User = Depends(require_role(["professor", "admin"])),
):
    access_code = generate_unique_access_code(db)
    join_token = create_join_token()
    class_session = ClassSession(
        teacher_id=teacher.id,
        title=payload.title,
        subject_id=payload.subject_id,
        access_code=access_code,
        join_token=join_token,
        join_token_expires_at=utc_now() + timedelta(hours=get_settings().class_join_token_expire_hours),
        max_participants=payload.max_participants,
        allow_anonymous_students=payload.allow_anonymous_students,
        require_teacher_approval=payload.require_teacher_approval,
        status=ClassStatus.active.value,
    )
    db.add(class_session)
    db.commit()
    db.refresh(class_session)
    await websocket_manager.broadcast(access_code, "class.started", {"accessCode": access_code, "title": payload.title})
    return class_session


@router.get("/access/{access_code}", response_model=ClassSessionPublicRead)
def get_class_by_access_code(access_code: str, db: Session = Depends(get_db)):
    class_session = db.scalar(select(ClassSession).where(ClassSession.access_code == access_code.upper()))
    if not class_session:
        raise HTTPException(status_code=404, detail="Aula nao encontrada.")
    if class_session.status == ClassStatus.finished.value:
        raise HTTPException(status_code=410, detail="Esta aula foi encerrada.")
    return class_session


@router.post("/access/{access_code}/join")
async def join_class_by_access_code(
    access_code: str,
    request: Request,
    token: str | None = None,
    db: Session = Depends(get_db),
):
    if _too_many_join_attempts(access_code, request):
        raise HTTPException(status_code=429, detail="Muitas tentativas. Aguarde um pouco e tente novamente.")
    class_session = db.scalar(select(ClassSession).where(ClassSession.access_code == access_code.upper()))
    if not class_session:
        raise HTTPException(status_code=404, detail="Aula nao encontrada.")
    if class_session.status == ClassStatus.finished.value:
        raise HTTPException(status_code=410, detail="Esta aula foi encerrada.")
    if _join_token_expired(class_session):
        raise HTTPException(status_code=403, detail="O acesso a esta aula expirou.")
    if token and token != class_session.join_token:
        raise HTTPException(status_code=403, detail="Token da aula invalido.")
    if not token and (not class_session.allow_anonymous_students or class_session.require_teacher_approval):
        raise HTTPException(status_code=403, detail="Esta aula exige token ou aprovacao do professor.")
    await websocket_manager.broadcast(
        class_session.access_code,
        "class.started",
        {"accessCode": class_session.access_code, "title": class_session.title, "status": class_session.status},
    )
    return ClassSessionRead.model_validate(class_session).model_dump(mode="json")


@router.post("/{class_session_id}/transcript")
async def add_transcript_segment(
    class_session_id: int,
    payload: TranscriptInput,
    db: Session = Depends(get_db),
    user: User = Depends(require_role(["professor", "admin"])),
):
    class_session = db.get(ClassSession, class_session_id)
    if not class_session:
        raise HTTPException(status_code=404, detail="Aula nao encontrada.")
    _ensure_teacher_owner_or_admin(class_session, user)
    if class_session.status == ClassStatus.finished.value:
        raise HTTPException(status_code=410, detail="Esta aula foi encerrada.")
    service = TranscriptService(db)
    return await service.process_text(
        class_session,
        payload.text,
        payload.confidence,
        payload.start_time,
        payload.end_time,
    )


@router.post("/{class_session_id}/demo-tick")
async def demo_tick(
    class_session_id: int,
    step: int = 0,
    db: Session = Depends(get_db),
    user: User | None = Depends(get_optional_user),
):
    if not get_settings().demo_mode:
        raise HTTPException(status_code=403, detail="Modo demo desativado.")
    class_session = db.get(ClassSession, class_session_id)
    if not class_session:
        raise HTTPException(status_code=404, detail="Aula nao encontrada.")
    lines = DemoSpeechToTextService.demo_lines
    line = lines[step % len(lines)]
    service = TranscriptService(db)
    events = await service.process_text(class_session, line)
    return {"line": line, "events": events}


@router.post("/{class_session_id}/pause")
async def pause_class(
    class_session_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_role(["professor", "admin"])),
):
    class_session = db.get(ClassSession, class_session_id)
    if not class_session:
        raise HTTPException(status_code=404, detail="Aula nao encontrada.")
    _ensure_teacher_owner_or_admin(class_session, user)
    class_session.status = ClassStatus.paused.value
    db.commit()
    await websocket_manager.broadcast(class_session.access_code, "class.paused", {"id": class_session.id})
    return {"status": class_session.status}


@router.post("/{class_session_id}/finish")
async def finish_class(
    class_session_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_role(["professor", "admin"])),
):
    class_session = db.get(ClassSession, class_session_id)
    if not class_session:
        raise HTTPException(status_code=404, detail="Aula nao encontrada.")
    _ensure_teacher_owner_or_admin(class_session, user)
    class_session.status = ClassStatus.finished.value
    class_session.finished_at = utc_now()
    class_session.join_token_expires_at = utc_now()
    summary = LessonSummaryService(db).create_summary(class_session_id)
    db.commit()
    await websocket_manager.broadcast(
        class_session.access_code,
        "summary.created",
        {"id": summary.id, "summaryText": summary.summary_text, "keywords": summary.keywords},
    )
    await websocket_manager.broadcast(class_session.access_code, "class.finished", {"id": class_session.id})
    return {"status": class_session.status, "summary": summary.summary_text, "keywords": summary.keywords}


@router.get("/{class_session_id}/review")
def review_class(class_session_id: int, db: Session = Depends(get_db)):
    class_session = db.get(ClassSession, class_session_id)
    if not class_session:
        raise HTTPException(status_code=404, detail="Aula nao encontrada.")

    segments = list(
        db.scalars(
            select(TranscriptSegment)
            .where(TranscriptSegment.class_session_id == class_session_id)
            .order_by(TranscriptSegment.created_at.asc())
        )
    )
    keywords = list(
        db.scalars(
            select(KeywordDetected.normalized_word)
            .where(KeywordDetected.class_session_id == class_session_id)
            .distinct()
        )
    )
    dictionary = SignDictionaryService(db)
    return {
        "classSession": ClassSessionPublicRead.model_validate(class_session).model_dump(mode="json"),
        "transcript": [
            {"id": segment.id, "text": segment.original_text, "confidence": segment.confidence}
            for segment in segments
        ],
        "keywords": keywords,
        "cards": [dictionary.build_card_payload(keyword) for keyword in keywords],
    }


@router.get("/access/{access_code}/review")
def review_class_by_access_code(access_code: str, db: Session = Depends(get_db)):
    class_session = db.scalar(select(ClassSession).where(ClassSession.access_code == access_code.upper()))
    if not class_session:
        raise HTTPException(status_code=404, detail="Aula nao encontrada.")
    return review_class(class_session.id, db)


@router.post("/{class_session_id}/summary")
async def create_summary(
    class_session_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_role(["professor", "admin"])),
):
    class_session = db.get(ClassSession, class_session_id)
    if not class_session:
        raise HTTPException(status_code=404, detail="Aula nao encontrada.")
    _ensure_teacher_owner_or_admin(class_session, user)
    summary = LessonSummaryService(db).create_summary(class_session_id)
    db.commit()
    await websocket_manager.broadcast(
        class_session.access_code,
        "summary.created",
        {"id": summary.id, "summaryText": summary.summary_text, "keywords": summary.keywords},
    )
    return {"id": summary.id, "summary": summary.summary_text, "keywords": summary.keywords}


@router.get("/{class_session_id}/summary")
def get_latest_summary(
    class_session_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_role(["professor", "admin"])),
):
    class_session = db.get(ClassSession, class_session_id)
    if not class_session:
        raise HTTPException(status_code=404, detail="Aula nao encontrada.")
    _ensure_teacher_owner_or_admin(class_session, user)
    summary = db.scalar(
        select(LessonSummary)
        .where(LessonSummary.class_session_id == class_session_id)
        .order_by(LessonSummary.created_at.desc())
        .limit(1)
    )
    if not summary:
        summary = LessonSummaryService(db).create_summary(class_session_id)
        db.commit()
    return {"id": summary.id, "summary": summary.summary_text, "keywords": summary.keywords}


@router.post("/{class_session_id}/rotate-access-code", response_model=ClassSessionRead)
async def rotate_access_code(
    class_session_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_role(["professor", "admin"])),
):
    class_session = db.get(ClassSession, class_session_id)
    if not class_session:
        raise HTTPException(status_code=404, detail="Aula nao encontrada.")
    _ensure_teacher_owner_or_admin(class_session, user)
    if class_session.status == ClassStatus.finished.value:
        raise HTTPException(status_code=410, detail="Esta aula foi encerrada.")
    class_session.access_code = generate_unique_access_code(db)
    class_session.join_token = create_join_token()
    class_session.join_token_expires_at = utc_now() + timedelta(hours=get_settings().class_join_token_expire_hours)
    db.commit()
    db.refresh(class_session)
    await websocket_manager.broadcast(class_session.access_code, "connection.warning", {"message": "Codigo de acesso renovado."})
    return class_session


@router.delete("/{class_session_id}/transcript")
def delete_class_transcript(
    class_session_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_role(["professor", "admin"])),
):
    class_session = db.get(ClassSession, class_session_id)
    if not class_session:
        raise HTTPException(status_code=404, detail="Aula nao encontrada.")
    _ensure_teacher_owner_or_admin(class_session, user)
    db.query(TranscriptSegment).filter(TranscriptSegment.class_session_id == class_session_id).delete()
    db.commit()
    return {"status": "deleted"}


@router.post("/{class_session_id}/anonymize")
def anonymize_class(
    class_session_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_role(["professor", "admin"])),
):
    class_session = db.get(ClassSession, class_session_id)
    if not class_session:
        raise HTTPException(status_code=404, detail="Aula nao encontrada.")
    _ensure_teacher_owner_or_admin(class_session, user)
    class_session.title = f"Aula anonimizada {class_session.id}"
    for segment in class_session.transcript_segments:
        segment.original_text = "[transcricao anonimizada]"
        segment.normalized_text = "[transcricao anonimizada]"
    db.commit()
    return {"status": "anonymized"}


@router.get("/{class_session_id}/export.pdf")
def export_pdf(
    class_session_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_role(["professor", "admin"])),
):
    class_session = db.get(ClassSession, class_session_id)
    if not class_session:
        raise HTTPException(status_code=404, detail="Aula nao encontrada.")
    _ensure_teacher_owner_or_admin(class_session, user)
    pdf_bytes = PdfExportService(db).export_class_session(class_session_id)
    return Response(
        pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="aula-{class_session_id}.pdf"'},
    )


def _ensure_teacher_owner_or_admin(class_session: ClassSession, user: User) -> None:
    if user.role == "admin":
        return
    if class_session.teacher_id != user.id:
        raise HTTPException(status_code=403, detail="Somente o professor dono da aula ou admin pode executar esta acao.")


def _join_token_expired(class_session: ClassSession) -> bool:
    expires_at = class_session.join_token_expires_at
    if not expires_at:
        return False
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    return expires_at < utc_now()


def _too_many_join_attempts(access_code: str, request: Request) -> bool:
    key = f"{request.client.host if request.client else 'unknown'}:{access_code.upper()}"
    now = utc_now().timestamp()
    recent = [item for item in JOIN_ATTEMPTS.get(key, []) if now - item < 60]
    recent.append(now)
    JOIN_ATTEMPTS[key] = recent
    return len(recent) > 20
