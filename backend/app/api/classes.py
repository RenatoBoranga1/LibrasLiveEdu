from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import generate_unique_access_code, get_or_create_demo_teacher
from app.core.database import get_db
from app.models import ClassSession, ClassStatus, KeywordDetected, LessonSummary, TranscriptSegment
from app.schemas.api import ClassSessionCreate, ClassSessionRead, TranscriptInput
from app.services.lesson_summary import LessonSummaryService
from app.services.pdf_export import PdfExportService
from app.services.sign_dictionary import SignDictionaryService
from app.services.speech_to_text import DemoSpeechToTextService
from app.services.transcript import TranscriptService
from app.websocket.manager import websocket_manager

router = APIRouter(prefix="/classes", tags=["classes"])


@router.post("", response_model=ClassSessionRead)
async def create_class(payload: ClassSessionCreate, db: Session = Depends(get_db)):
    teacher = get_or_create_demo_teacher(db, payload.teacher_name, payload.teacher_email)
    access_code = generate_unique_access_code(db)
    class_session = ClassSession(
        teacher_id=teacher.id,
        title=payload.title,
        subject_id=payload.subject_id,
        access_code=access_code,
        status=ClassStatus.active.value,
    )
    db.add(class_session)
    db.commit()
    db.refresh(class_session)
    await websocket_manager.broadcast(access_code, "class.started", {"accessCode": access_code, "title": payload.title})
    return class_session


@router.get("/access/{access_code}", response_model=ClassSessionRead)
def get_class_by_access_code(access_code: str, db: Session = Depends(get_db)):
    class_session = db.scalar(select(ClassSession).where(ClassSession.access_code == access_code.upper()))
    if not class_session:
        raise HTTPException(status_code=404, detail="Aula nao encontrada.")
    return class_session


@router.post("/access/{access_code}/join")
async def join_class_by_access_code(access_code: str, db: Session = Depends(get_db)):
    class_session = db.scalar(select(ClassSession).where(ClassSession.access_code == access_code.upper()))
    if not class_session:
        raise HTTPException(status_code=404, detail="Aula nao encontrada.")
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
):
    class_session = db.get(ClassSession, class_session_id)
    if not class_session:
        raise HTTPException(status_code=404, detail="Aula nao encontrada.")
    service = TranscriptService(db)
    return await service.process_text(
        class_session,
        payload.text,
        payload.confidence,
        payload.start_time,
        payload.end_time,
    )


@router.post("/{class_session_id}/demo-tick")
async def demo_tick(class_session_id: int, step: int = 0, db: Session = Depends(get_db)):
    class_session = db.get(ClassSession, class_session_id)
    if not class_session:
        raise HTTPException(status_code=404, detail="Aula nao encontrada.")
    lines = DemoSpeechToTextService.demo_lines
    line = lines[step % len(lines)]
    service = TranscriptService(db)
    events = await service.process_text(class_session, line)
    return {"line": line, "events": events}


@router.post("/{class_session_id}/pause")
async def pause_class(class_session_id: int, db: Session = Depends(get_db)):
    class_session = db.get(ClassSession, class_session_id)
    if not class_session:
        raise HTTPException(status_code=404, detail="Aula nao encontrada.")
    class_session.status = ClassStatus.paused.value
    db.commit()
    await websocket_manager.broadcast(class_session.access_code, "class.paused", {"id": class_session.id})
    return {"status": class_session.status}


@router.post("/{class_session_id}/finish")
async def finish_class(class_session_id: int, db: Session = Depends(get_db)):
    class_session = db.get(ClassSession, class_session_id)
    if not class_session:
        raise HTTPException(status_code=404, detail="Aula nao encontrada.")
    class_session.status = ClassStatus.finished.value
    class_session.finished_at = datetime.now(timezone.utc)
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
        "classSession": ClassSessionRead.model_validate(class_session).model_dump(mode="json"),
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
async def create_summary(class_session_id: int, db: Session = Depends(get_db)):
    class_session = db.get(ClassSession, class_session_id)
    if not class_session:
        raise HTTPException(status_code=404, detail="Aula nao encontrada.")
    summary = LessonSummaryService(db).create_summary(class_session_id)
    db.commit()
    await websocket_manager.broadcast(
        class_session.access_code,
        "summary.created",
        {"id": summary.id, "summaryText": summary.summary_text, "keywords": summary.keywords},
    )
    return {"id": summary.id, "summary": summary.summary_text, "keywords": summary.keywords}


@router.get("/{class_session_id}/summary")
def get_latest_summary(class_session_id: int, db: Session = Depends(get_db)):
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


@router.get("/{class_session_id}/export.pdf")
def export_pdf(class_session_id: int, db: Session = Depends(get_db)):
    pdf_bytes = PdfExportService(db).export_class_session(class_session_id)
    return Response(
        pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="aula-{class_session_id}.pdf"'},
    )
