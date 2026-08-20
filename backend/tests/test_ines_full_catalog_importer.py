import pytest
from fastapi import HTTPException
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session

from app.api.signs import scan_ines_catalog
from app.core.config import get_settings
from app.importers.ines_full_catalog_importer import InesFullCatalogImporter
from app.models import Sign, SignAuditLog, User, UserRole
from app.models.base import Base
from app.schemas.api import InesCatalogScanRequest


def _session() -> Session:
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    return Session(engine)


def _admin(db: Session) -> User:
    user = User(name="Admin", email="admin.catalog@example.com", password_hash="hash", role=UserRole.admin.value)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def _patch_validators(monkeypatch, *, video_valid: bool = True, image_valid: bool = True) -> None:
    monkeypatch.setattr(
        "app.importers.ines_full_catalog_importer.validate_remote_media_url",
        lambda url, expected_type, timeout_seconds=15, user_agent="": {
            "valid": video_valid,
            "final_url": url,
            "status_code": 200 if video_valid else 404,
            "content_type": "video/mp4" if video_valid else "text/html",
            "content_length": 123 if video_valid else None,
            "media_type": "video" if video_valid else "none",
            "reason": "Mídia validada com sucesso." if video_valid else "URL não retornou vídeo válido.",
        },
    )
    monkeypatch.setattr(
        "app.importers.ines_full_catalog_importer.validate_remote_image_url",
        lambda url, timeout_seconds=15, user_agent="": {
            "valid": image_valid,
            "final_url": url,
            "status_code": 200 if image_valid else 404,
            "content_type": "image/jpeg" if image_valid else "text/html",
            "content_length": 45 if image_valid else None,
            "media_type": "image",
            "can_use_avatar": False,
            "reason": "Imagem validada como apoio visual.",
        },
    )


def test_full_catalog_manifest_keeps_jpg_as_support_image(monkeypatch):
    _patch_validators(monkeypatch, video_valid=False, image_valid=True)
    importer = InesFullCatalogImporter()
    raw_manifest = {
        "entries": {
            "aprender": {
                "word": "aprender",
                "normalized_word": "aprender",
                "image_url": "https://dicionario.ines.gov.br/public/media/mao/cg51a.jpg",
                "media_type": "image",
                "validated": False,
            }
        },
        "errors": [],
        "pages_without_video": [],
        "duplicates": [],
    }

    manifest = importer._catalog_manifest(raw_manifest, ["A"])
    entry = manifest["entries"][0]

    assert entry["image_url"].endswith("cg51a.jpg")
    assert entry["handshape_image_url"].endswith("cg51a.jpg")
    assert entry["video_url"] is None
    assert entry["media_type"] == "image"
    assert entry["can_use_avatar"] is False
    assert manifest["stats"]["images_valid"] == 1
    assert manifest["stats"]["without_video"] == 1


def test_full_catalog_manifest_uses_validated_standard_pattern_fallback(monkeypatch):
    _patch_validators(monkeypatch, video_valid=True, image_valid=True)
    importer = InesFullCatalogImporter()
    raw_manifest = {
        "entries": {
            "abacate": {
                "word": "abacate",
                "normalized_word": "abacate",
                "image_url": "https://dicionario.ines.gov.br/public/media/mao/cg01.jpg",
                "media_type": "image",
                "validated": False,
            }
        },
        "errors": [],
        "pages_without_video": [],
        "duplicates": [],
    }

    manifest = importer._catalog_manifest(raw_manifest, ["A"])
    entry = manifest["entries"][0]

    assert entry["video_url"] == "https://dicionario.ines.gov.br/public/media/palavras/videos/abacateSm_Prog001.mp4"
    assert entry["avatar_video_url"] == entry["video_url"]
    assert entry["image_url"].endswith("cg01.jpg")
    assert entry["media_type"] == "video"
    assert entry["can_use_avatar"] is True
    assert entry["detection_method"] == "ines_standard_pattern"
    assert manifest["stats"]["videos_valid"] == 1


def test_full_catalog_import_saves_video_and_avatar_video_pending(monkeypatch):
    _patch_validators(monkeypatch, video_valid=True, image_valid=True)
    db = _session()
    user = _admin(db)
    video_url = "https://dicionario.ines.gov.br/public/media/palavras/videos/abacateSm_Prog001.mp4"
    manifest = {
        "source": {
            "name": "Dicionário da Língua Brasileira de Sinais - INES",
            "base_url": "https://dicionario.ines.gov.br/",
            "authorization": "Uso autorizado para o projeto social educacional LibrasLive Edu",
        },
        "entries": [
            {
                "word": "abacate",
                "normalized_word": "abacate",
                "gloss": "ABACATE",
                "video_url": video_url,
                "avatar_video_url": video_url,
                "image_url": "https://dicionario.ines.gov.br/public/media/mao/cg01.jpg",
                "media_type": "video",
                "can_use_avatar": True,
                "video_validated": True,
                "license_notes": "Vídeo autorizado para uso educacional no aplicativo LibrasLive Edu.",
                "source_reference_url": "https://dicionario.ines.gov.br/?q=abacate",
            }
        ],
    }

    job, report = InesFullCatalogImporter(db).import_catalog_manifest(manifest=manifest, user=user)
    sign = db.scalar(select(Sign).where(Sign.normalized_word == "abacate"))
    audit = db.scalar(select(SignAuditLog).where(SignAuditLog.sign_id == sign.id))

    assert job.status == "completed"
    assert report["created_count"] == 1
    assert sign.status == "pending"
    assert sign.video_url == video_url
    assert sign.avatar_video_url == video_url
    assert sign.image_url.endswith("cg01.jpg")
    assert audit.action == "ines_full_catalog_import"


def test_full_catalog_import_does_not_save_invalid_video(monkeypatch):
    _patch_validators(monkeypatch, video_valid=False, image_valid=True)
    db = _session()
    user = _admin(db)
    manifest = {
        "entries": [
            {
                "word": "escola",
                "normalized_word": "escola",
                "video_url": "https://dicionario.ines.gov.br/public/media/palavras/videos/escolaSm_Prog001.mp4",
                "image_url": "https://dicionario.ines.gov.br/public/media/mao/cg02.jpg",
                "media_type": "video",
            }
        ],
    }

    _, report = InesFullCatalogImporter(db).import_catalog_manifest(manifest=manifest, user=user)
    sign = db.scalar(select(Sign).where(Sign.normalized_word == "escola"))

    assert report["video_missing_count"] == 1
    assert sign.status == "pending"
    assert sign.video_url is None
    assert sign.avatar_video_url is None
    assert sign.image_url.endswith("cg02.jpg")


def test_ines_catalog_scan_endpoint_requires_enabled_setting():
    db = _session()
    user = _admin(db)
    settings = get_settings()
    old_enabled = settings.ines_full_catalog_import_enabled
    settings.ines_full_catalog_import_enabled = False

    try:
        with pytest.raises(HTTPException) as exc:
            scan_ines_catalog(InesCatalogScanRequest(letters=["A"], max_items=1, dry_run=True), db=db, user=user)
    finally:
        settings.ines_full_catalog_import_enabled = old_enabled

    assert exc.value.status_code == 403
    assert "desativada" in str(exc.value.detail)
