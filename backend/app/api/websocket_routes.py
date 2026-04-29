from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from sqlalchemy import select

from app.core.database import SessionLocal
from app.models import ClassSession
from app.services.transcript import TranscriptService
from app.websocket.manager import websocket_manager

router = APIRouter(tags=["websocket"])


@router.websocket("/ws/classes/{access_code}")
async def class_websocket(access_code: str, websocket: WebSocket):
    await websocket_manager.connect(access_code, websocket)
    try:
        await websocket.send_json({"event": "class.started", "payload": {"accessCode": access_code}})
        while True:
            message = await websocket.receive_json()
            if message.get("type") == "teacher.transcript":
                with SessionLocal() as db:
                    class_session = db.scalar(select(ClassSession).where(ClassSession.access_code == access_code))
                    if class_session:
                        await TranscriptService(db).process_text(class_session, message.get("text", ""))
    except WebSocketDisconnect:
        websocket_manager.disconnect(access_code, websocket)
