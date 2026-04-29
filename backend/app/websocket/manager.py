from collections import defaultdict
from typing import Any

from fastapi import WebSocket


class WebSocketManager:
    def __init__(self) -> None:
        self.active_connections: dict[str, set[WebSocket]] = defaultdict(set)

    async def connect(self, access_code: str, websocket: WebSocket) -> None:
        await websocket.accept()
        self.active_connections[access_code].add(websocket)

    def disconnect(self, access_code: str, websocket: WebSocket) -> None:
        self.active_connections[access_code].discard(websocket)
        if not self.active_connections[access_code]:
            self.active_connections.pop(access_code, None)

    async def broadcast(self, access_code: str, event: str, payload: dict[str, Any]) -> None:
        stale: list[WebSocket] = []
        for connection in self.active_connections.get(access_code, set()):
            try:
                await connection.send_json({"event": event, "payload": payload})
            except RuntimeError:
                stale.append(connection)
        for connection in stale:
            self.disconnect(access_code, connection)


websocket_manager = WebSocketManager()
