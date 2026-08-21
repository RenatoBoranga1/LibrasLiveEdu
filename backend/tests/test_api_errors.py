from fastapi.testclient import TestClient

from main import app


def test_http_errors_use_the_standard_envelope_and_keep_detail_compatibility():
    with TestClient(app) as client:
        response = client.get("/route-that-does-not-exist", headers={"X-Request-ID": "request-test-123"})

    assert response.status_code == 404
    assert response.headers["X-Request-ID"] == "request-test-123"
    assert response.json() == {
        "code": "HTTP_404",
        "message": "Not Found",
        "request_id": "request-test-123",
        "detail": "Not Found",
    }


def test_validation_errors_include_friendly_message_field_and_request_id():
    with TestClient(app) as client:
        response = client.post("/api/auth/login", json={})

    payload = response.json()
    assert response.status_code == 422
    assert payload["code"] == "VALIDATION_ERROR"
    assert payload["message"] == "Dados inválidos. Revise os campos enviados."
    assert payload["field"] in {"email", "password"}
    assert payload["request_id"]
    assert isinstance(payload["detail"], list)
    assert all("input" not in error for error in payload["detail"])
