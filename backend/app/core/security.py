import base64
import hashlib
import hmac
import json
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any

from app.core.config import get_settings


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 240_000)
    return f"pbkdf2_sha256${salt}${base64.urlsafe_b64encode(digest).decode('ascii')}"


def verify_password(password: str, password_hash: str) -> bool:
    if password_hash == "demo-not-for-production":
        return False
    try:
        algorithm, salt, encoded_digest = password_hash.split("$", 2)
    except ValueError:
        return False
    if algorithm != "pbkdf2_sha256":
        return False
    candidate = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 240_000)
    return hmac.compare_digest(base64.urlsafe_b64encode(candidate).decode("ascii"), encoded_digest)


def _b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode("ascii").rstrip("=")


def _b64url_decode(data: str) -> bytes:
    padded = data + "=" * (-len(data) % 4)
    return base64.urlsafe_b64decode(padded.encode("ascii"))


def create_token(subject: str, role: str, token_type: str = "access", expires_delta: timedelta | None = None) -> str:
    settings = get_settings()
    if expires_delta is None:
        expires_delta = timedelta(minutes=settings.access_token_expire_minutes)
    header = {"alg": "HS256", "typ": "JWT"}
    payload = {
        "sub": subject,
        "role": role,
        "type": token_type,
        "iat": int(utc_now().timestamp()),
        "exp": int((utc_now() + expires_delta).timestamp()),
        "jti": secrets.token_urlsafe(12),
    }
    signing_input = ".".join(
        [
            _b64url(json.dumps(header, separators=(",", ":")).encode("utf-8")),
            _b64url(json.dumps(payload, separators=(",", ":")).encode("utf-8")),
        ]
    )
    signature = hmac.new(settings.secret_key.encode("utf-8"), signing_input.encode("ascii"), hashlib.sha256).digest()
    return f"{signing_input}.{_b64url(signature)}"


def decode_token(token: str, expected_type: str | None = None) -> dict[str, Any]:
    settings = get_settings()
    try:
        header_part, payload_part, signature_part = token.split(".")
        signing_input = f"{header_part}.{payload_part}"
        expected = hmac.new(settings.secret_key.encode("utf-8"), signing_input.encode("ascii"), hashlib.sha256).digest()
        if not hmac.compare_digest(_b64url(expected), signature_part):
            raise ValueError("invalid signature")
        payload = json.loads(_b64url_decode(payload_part))
        if int(payload.get("exp", 0)) < int(utc_now().timestamp()):
            raise ValueError("expired token")
        if expected_type and payload.get("type") != expected_type:
            raise ValueError("invalid token type")
        return payload
    except Exception as exc:  # noqa: BLE001
        raise ValueError("invalid token") from exc


def create_access_pair(user_id: int, role: str) -> dict[str, str]:
    settings = get_settings()
    return {
        "access_token": create_token(str(user_id), role, "access"),
        "refresh_token": create_token(
            str(user_id),
            role,
            "refresh",
            expires_delta=timedelta(days=settings.refresh_token_expire_days),
        ),
        "token_type": "bearer",
    }


def create_join_token() -> str:
    return secrets.token_urlsafe(32)
