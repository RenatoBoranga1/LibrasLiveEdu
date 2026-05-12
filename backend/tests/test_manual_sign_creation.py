import pytest
from fastapi import HTTPException
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session

from app.api.signs import create_manual_sign
from app.models import Sign, SignAuditLog, User, UserRole
from app.models.base import Base
from app.schemas.api import ManualSignCreate


def _session() -> Session:
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    return Session(engine)


def _admin(db: Session) -> User:
    user = User(name="Admin", email="admin@example.com", password_hash="hash", role=UserRole.admin.value)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def test_manual_create_saves_pending_with_valid_video(monkeypatch):
    db = _session()
    user = _admin(db)
    monkeypatch.setattr(
        "app.api.signs.validate_remote_media_url",
        lambda url, expected_type: {
            "valid": True,
            "final_url": url,
            "status_code": 200,
            "content_type": "video/mp4",
            "content_length": 123,
            "media_type": expected_type,
            "reason": "Mídia validada com sucesso.",
        },
    )

    sign = create_manual_sign(
        ManualSignCreate(
            word="abacate",
            gloss="ABACATE",
            video_url="https://dicionario.ines.gov.br/public/media/palavras/videos/abacateSm_Prog001.mp4",
        ),
        db=db,
        user=user,
    )

    assert sign.status == "pending"
    assert sign.video_url.endswith("abacateSm_Prog001.mp4")
    assert db.scalar(select(SignAuditLog).where(SignAuditLog.sign_id == sign.id)).action == "manual_create"


def test_manual_create_rejects_invalid_video(monkeypatch):
    db = _session()
    user = _admin(db)
    monkeypatch.setattr(
        "app.api.signs.validate_remote_media_url",
        lambda url, expected_type: {
            "valid": False,
            "final_url": url,
            "status_code": 404,
            "content_type": "text/html",
            "content_length": None,
            "media_type": "none",
            "reason": "URL não retornou vídeo válido.",
        },
    )

    with pytest.raises(HTTPException):
        create_manual_sign(
            ManualSignCreate(word="escola", video_url="https://dicionario.ines.gov.br/public/media/palavras/videos/escolaSm_Prog001.mp4"),
            db=db,
            user=user,
        )

    db.rollback()
    assert db.scalar(select(Sign).where(Sign.normalized_word == "escola")) is None


def test_manual_create_allows_support_image_only(monkeypatch):
    db = _session()
    user = _admin(db)
    validator_called = False

    def fake_validator(url: str, expected_type: str):
        nonlocal validator_called
        validator_called = True
        return {"valid": False, "reason": "Não deveria validar imagem como Avatar."}

    monkeypatch.setattr("app.api.signs.validate_remote_media_url", fake_validator)

    sign = create_manual_sign(
        ManualSignCreate(word="apoio", image_url="https://dicionario.ines.gov.br/public/media/mao/cg51a.jpg"),
        db=db,
        user=user,
    )

    assert sign.status == "pending"
    assert sign.image_url.endswith("cg51a.jpg")
    assert sign.video_url is None
    assert validator_called is False
