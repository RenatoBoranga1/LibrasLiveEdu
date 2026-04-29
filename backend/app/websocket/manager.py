from collections import defaultdict
from typing import Any

from fastapi import WebSocket


class WebSocketManager:
    def __init__(self) -> None:
        self.active_connections: dict[str, dict[str, set[WebSocket]]] = defaultdict(lambda: defaultdict(set))

    async def connect(self, access_code: str, websocket: WebSocket, role: str = "student") -> None:
        await websocket.accept()
        self.active_connections[access_code][role].add(websocket)

    def disconnect(self, access_code: str, websocket: WebSocket, role: str | None = None) -> None:
        rooms = self.active_connections.get(access_code)
        if not rooms:
            return
        if role:
            rooms[role].discard(websocket)
            if not rooms[role]:
                rooms.pop(role, None)
        else:
            for connections in rooms.values():
                connections.discard(websocket)
        if not rooms:
            self.active_connections.pop(access_code, None)

    async def broadcast(self, access_code: str, event: str, payload: dict[str, Any], roles: list[str] | None = None) -> None:
        stale: list[tuple[str, WebSocket]] = []
        rooms = self.active_connections.get(access_code, {})
        target_roles = roles or list(rooms.keys())
        for role in target_roles:
            for connection in rooms.get(role, set()):
                try:
                    await connection.send_json({"event": event, "payload": payload})
                except RuntimeError:
                    stale.append((role, connection))
        for role, connection in stale:
            self.disconnect(access_code, connection, role)


websocket_manager = WebSocketManager()
