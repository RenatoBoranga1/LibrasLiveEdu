from datetime import timedelta
import re

import pytest
from fastapi import HTTPException

from app.api.deps import generate_access_code
from app.api.deps import require_role
from app.api.classes import _join_token_expired
from app.core.security import create_join_token, create_token, decode_token, hash_password, utc_now, verify_password
from app.models import ClassSession, User, UserRole


def test_password_hash_never_accepts_demo_hash():
    assert verify_password("qualquer", "demo-not-for-production") is False
    password_hash = hash_password("SenhaSegura#2026")
    assert password_hash != "SenhaSegura#2026"
    assert verify_password("SenhaSegura#2026", password_hash) is True


def test_jwt_rejects_wrong_type_and_expired_token():
    access = create_token("1", "professor", "access")
    payload = decode_token(access, expected_type="access")
    assert payload["sub"] == "1"
    refresh = create_token("1", "professor", "refresh")
    try:
        decode_token(refresh, expected_type="access")
    except ValueError:
        pass
    else:
        raise AssertionError("refresh token should not be accepted as access token")
    expired = create_token("1", "student", "access", expires_delta=timedelta(seconds=-1))
    try:
        decode_token(expired, expected_type="access")
    except ValueError:
        pass
    else:
        raise AssertionError("expired token should be rejected")


def test_secure_class_code_and_join_token_format():
    code = generate_access_code()
    assert re.fullmatch(r"AULA-[A-Z2-9]{4}-[A-Z2-9]{4}", code)
    token = create_join_token()
    assert len(token) >= 32
    assert token != create_join_token()


def test_utc_now_is_timezone_aware():
    assert utc_now().tzinfo is not None


def test_role_dependency_blocks_wrong_profile():
    dependency = require_role(["admin"])
    user = User(name="Aluno", email="aluno@example.com", password_hash="hash", role=UserRole.student.value)
    with pytest.raises(HTTPException):
        dependency(user)


def test_join_token_expiration_is_detected():
    class_session = ClassSession(
        teacher_id=1,
        title="Aula",
        access_code="AULA-8F4K-29QX",
        join_token="token",
        join_token_expires_at=utc_now() - timedelta(minutes=1),
        status="active",
    )
    assert _join_token_expired(class_session) is True
