from types import SimpleNamespace

from fastapi.testclient import TestClient

from app.api import public
from app.core.database import get_db
from main import app


class FakeDatabase:
    def __init__(self, available: bool = True):
        self.available = available

    def execute(self, _statement):
        if not self.available:
            raise RuntimeError("database unavailable")
        return 1


class FakeRedis:
    def __init__(self, available: bool = True):
        self.available = available
        self.closed = False

    def ping(self):
        if not self.available:
            raise RuntimeError("redis unavailable")
        return True

    def close(self):
        self.closed = True


def override_database(database: FakeDatabase):
    def dependency():
        yield database

    return dependency


def test_health_is_a_dependency_free_liveness_check():
    with TestClient(app) as client:
        response = client.get("/health")
        compatibility_response = client.get("/api/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "libraslive-edu-api"}
    assert compatibility_response.json() == response.json()
    assert "environment" not in response.json()
    assert "demo_mode" not in response.json()


def test_ready_reports_database_as_ready(monkeypatch):
    app.dependency_overrides[get_db] = override_database(FakeDatabase())
    monkeypatch.setattr(public, "get_settings", lambda: SimpleNamespace(redis_url=None))
    try:
        with TestClient(app) as client:
            response = client.get("/ready")
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    assert response.json() == {"status": "ready", "checks": {"database": "ready"}}


def test_ready_returns_503_when_database_is_unavailable(monkeypatch):
    app.dependency_overrides[get_db] = override_database(FakeDatabase(available=False))
    monkeypatch.setattr(public, "get_settings", lambda: SimpleNamespace(redis_url=None))
    try:
        with TestClient(app) as client:
            response = client.get("/ready")
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 503
    assert response.json()["status"] == "not_ready"
    assert response.json()["checks"] == {"database": "unavailable"}


def test_ready_checks_redis_only_when_configured(monkeypatch):
    redis_client = FakeRedis()
    app.dependency_overrides[get_db] = override_database(FakeDatabase())
    monkeypatch.setattr(public, "get_settings", lambda: SimpleNamespace(redis_url="redis://configured"))
    monkeypatch.setattr(public, "get_redis_client", lambda: redis_client)
    try:
        with TestClient(app) as client:
            response = client.get("/ready")
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    assert response.json()["checks"] == {"database": "ready", "redis": "ready"}
    assert redis_client.closed is True


def test_ready_returns_503_when_configured_redis_is_unavailable(monkeypatch):
    redis_client = FakeRedis(available=False)
    app.dependency_overrides[get_db] = override_database(FakeDatabase())
    monkeypatch.setattr(public, "get_settings", lambda: SimpleNamespace(redis_url="redis://configured"))
    monkeypatch.setattr(public, "get_redis_client", lambda: redis_client)
    try:
        with TestClient(app) as client:
            response = client.get("/ready")
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 503
    assert response.json() == {
        "status": "not_ready",
        "checks": {"database": "ready", "redis": "unavailable"},
    }
    assert redis_client.closed is True
