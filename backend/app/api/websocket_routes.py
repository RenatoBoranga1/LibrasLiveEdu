import asyncio
from datetime import datetime, timezone

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from sqlalchemy import select

from app.core.database import SessionLocal
from app.core.security import decode_token, utc_now
from app.models import ClassSession, ClassStatus, User
from app.services.transcript import TranscriptService
from app.websocket.manager import websocket_manager

router = APIRouter(tags=["websocket"])


@router.websocket("/ws/classes/{access_code}")
async def class_websocket(access_code: str, websocket: WebSocket):
    await websocket.accept()
    await websocket.send_json(
        {
            "event": "error",
            "payload": {
                "message": "Use /ws/classes/{codigo}/student?token=... ou /ws/classes/{codigo}/teacher?token=...",
            },
        }
    )
    await websocket.close(code=1008)


@router.websocket("/ws/classes/{access_code}/student")
async def student_websocket(access_code: str, websocket: WebSocket):
    token = websocket.query_params.get("token")
    with SessionLocal() as db:
        class_session = _load_class_for_socket(db, access_code)
        if not class_session:
            await _reject(websocket, "Aula nao encontrada.")
            return
        if not _class_accepts_join(class_session, token):
            await _reject(websocket, "Token invalido, expirado ou aula encerrada.")
            return

    await websocket_manager.connect(access_code.upper(), websocket, role="student")
    await websocket_manager.broadcast(access_code.upper(), "student.joined", {"accessCode": access_code.upper()}, ["teacher", "admin"])
    try:
        await websocket.send_json({"event": "class.started", "payload": {"accessCode": access_code.upper()}})
        await websocket.send_json({"event": "connection.restored", "payload": {"message": "Conectado a aula em tempo real."}})
        while True:
            try:
                message = await asyncio.wait_for(websocket.receive_json(), timeout=30)
            except asyncio.TimeoutError:
                await websocket.send_json({"event": "connection.restored", "payload": {"message": "Conexao ativa."}})
                continue
            if message.get("type") not in {"student.ping", "client.ping"}:
                await websocket.send_json(
                    {"event": "error", "payload": {"message": "Aluno recebe eventos, mas nao envia transcricao."}}
                )
    except WebSocketDisconnect:
        websocket_manager.disconnect(access_code.upper(), websocket, role="student")
        await websocket_manager.broadcast(access_code.upper(), "student.left", {"accessCode": access_code.upper()}, ["teacher", "admin"])


@router.websocket("/ws/classes/{access_code}/teacher")
async def teacher_websocket(access_code: str, websocket: WebSocket):
    token = websocket.query_params.get("token")
    with SessionLocal() as db:
        class_session = _load_class_for_socket(db, access_code)
        user = _user_from_access_token(db, token)
        if not class_session:
            await _reject(websocket, "Aula nao encontrada.")
            return
        if not user or user.role not in {"professor", "admin"}:
            await _reject(websocket, "Login de professor necessario.")
            return
        if user.role != "admin" and class_session.teacher_id != user.id:
            await _reject(websocket, "Somente o professor dono da aula pode transmitir.")
            return
        if not _class_active(class_session):
            await _reject(websocket, "Esta aula foi encerrada.")
            return

    await websocket_manager.connect(access_code.upper(), websocket, role="teacher")
    message_count = 0
    window_started_at = asyncio.get_running_loop().time()
    try:
        await websocket.send_json({"event": "class.started", "payload": {"accessCode": access_code.upper()}})
        while True:
            try:
                message = await asyncio.wait_for(websocket.receive_json(), timeout=30)
            except asyncio.TimeoutError:
                await websocket.send_json({"event": "connection.restored", "payload": {"message": "Conexao ativa."}})
                continue

            now = asyncio.get_running_loop().time()
            if now - window_started_at > 60:
                message_count = 0
                window_started_at = now
            message_count += 1
            if message_count > 60:
                await websocket.send_json(
                    {"event": "connection.warning", "payload": {"message": "Muitas mensagens em pouco tempo."}}
                )
                continue

            if message.get("type") != "teacher.transcript":
                await websocket.send_json({"event": "error", "payload": {"message": "Evento nao permitido neste canal."}})
                continue
            text = str(message.get("text", "")).strip()
            if not text or len(text) > 2000:
                await websocket.send_json({"event": "error", "payload": {"message": "Transcricao vazia ou muito longa."}})
                continue

            with SessionLocal() as db:
                class_session = _load_class_for_socket(db, access_code)
                if not class_session or not _class_active(class_session):
                    await websocket.send_json({"event": "class.finished", "payload": {"message": "Esta aula foi encerrada."}})
                    await websocket.close(code=1008)
                    return
                if class_session.status == ClassStatus.paused.value:
                    await websocket.send_json({"event": "connection.warning", "payload": {"message": "A aula esta pausada."}})
                    continue
                await TranscriptService(db).process_text(class_session, text)
    except WebSocketDisconnect:
        websocket_manager.disconnect(access_code.upper(), websocket, role="teacher")


def _load_class_for_socket(db, access_code: str) -> ClassSession | None:
    return db.scalar(select(ClassSession).where(ClassSession.access_code == access_code.upper()))


def _user_from_access_token(db, token: str | None) -> User | None:
    if not token:
        return None
    try:
        payload = decode_token(token, expected_type="access")
        return db.get(User, int(payload["sub"]))
    except Exception:  # noqa: BLE001
        return None


def _class_active(class_session: ClassSession) -> bool:
    return class_session.status != ClassStatus.finished.value and not _is_expired(class_session.join_token_expires_at)


def _class_accepts_join(class_session: ClassSession, token: str | None) -> bool:
    if class_session.status == ClassStatus.finished.value or _is_expired(class_session.join_token_expires_at):
        return False
    if token:
        return token == class_session.join_token
    return bool(class_session.allow_anonymous_students and not class_session.require_teacher_approval)


def _is_expired(value: datetime | None) -> bool:
    if value is None:
        return False
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value < utc_now()


async def _reject(websocket: WebSocket, message: str) -> None:
    await websocket.accept()
    await websocket.send_json({"event": "error", "payload": {"message": message}})
    await websocket.close(code=1008)
