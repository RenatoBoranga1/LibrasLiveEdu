from app.importers.ines_bulk_video_url_filler import InesBulkVideoUrlFiller, build_ines_video_url_from_word
from app.importers.media_auto_fill_importer import MediaAutoFillImporter


def test_build_ines_video_url_from_word_abacate():
    assert (
        build_ines_video_url_from_word("abacate")
        == "https://dicionario.ines.gov.br/public/media/palavras/videos/abacateSm_Prog001.mp4"
    )


def test_build_ines_video_url_from_word_removes_accents_and_spaces():
    assert (
        build_ines_video_url_from_word("ação")
        == "https://dicionario.ines.gov.br/public/media/palavras/videos/acaoSm_Prog001.mp4"
    )
    assert (
        build_ines_video_url_from_word("bom dia")
        == "https://dicionario.ines.gov.br/public/media/palavras/videos/bomdiaSm_Prog001.mp4"
    )


def test_diagnose_standard_video_accepts_200_mp4(monkeypatch):
    monkeypatch.setattr(
        "app.importers.ines_bulk_video_url_filler.validate_remote_media_url",
        lambda url, expected_type, timeout_seconds=15, user_agent="": {
            "valid": True,
            "final_url": url,
            "status_code": 200,
            "content_type": "video/mp4",
            "content_length": 123,
            "media_type": "video",
            "reason": "Mídia validada com sucesso.",
        },
    )

    item = InesBulkVideoUrlFiller(db=None).diagnose_word("abacate")

    assert item["validated"] is True
    assert item["video_url"].endswith("abacateSm_Prog001.mp4")
    assert item["can_use_avatar"] is True
    assert item["detection_method"] == "ines_standard_pattern"


def test_diagnose_standard_video_accepts_206_mp4(monkeypatch):
    monkeypatch.setattr(
        "app.importers.ines_bulk_video_url_filler.validate_remote_media_url",
        lambda url, expected_type, timeout_seconds=15, user_agent="": {
            "valid": True,
            "final_url": url,
            "status_code": 206,
            "content_type": "video/mp4",
            "content_length": 123,
            "media_type": "video",
            "reason": "Mídia validada com sucesso.",
        },
    )

    item = InesBulkVideoUrlFiller(db=None).diagnose_word("abafar")

    assert item["validated"] is True
    assert item["http_status"] == 206
    assert item["video_url"].endswith("abafarSm_Prog001.mp4")


def test_diagnose_standard_video_rejects_404(monkeypatch):
    monkeypatch.setattr(
        "app.importers.ines_bulk_video_url_filler.validate_remote_media_url",
        lambda url, expected_type, timeout_seconds=15, user_agent="": {
            "valid": False,
            "final_url": url,
            "status_code": 404,
            "content_type": "text/html",
            "content_length": None,
            "media_type": "none",
            "reason": "URL não retornou vídeo válido.",
        },
    )

    item = InesBulkVideoUrlFiller(db=None).diagnose_word("escola")

    assert item["validated"] is False
    assert item["video_url"] is None
    assert item["can_use_avatar"] is False
    assert item["detection_method"] == "ines_standard_pattern_failed"


def test_diagnose_standard_video_rejects_html_and_static_image(monkeypatch):
    for content_type in ("text/html", "image/jpeg"):
        monkeypatch.setattr(
            "app.importers.ines_bulk_video_url_filler.validate_remote_media_url",
            lambda url, expected_type, timeout_seconds=15, user_agent="", content_type=content_type: {
                "valid": False,
                "final_url": url,
                "status_code": 200,
                "content_type": content_type,
                "content_length": None,
                "media_type": "none",
                "reason": "URL não retornou vídeo válido.",
            },
        )

        item = InesBulkVideoUrlFiller(db=None).diagnose_word("abaixo")

        assert item["validated"] is False
        assert item["video_url"] is None
        assert item["content_type"] == content_type


def test_media_auto_fill_uses_standard_pattern_before_live_lookup(monkeypatch):
    importer = MediaAutoFillImporter(db=None)  # type: ignore[arg-type]
    old_enabled = importer.settings.ines_standard_video_fill_enabled
    importer.settings.ines_standard_video_fill_enabled = True
    monkeypatch.setattr(importer.ines, "find_ines_entry_for_word", lambda word: (_ for _ in ()).throw(AssertionError("live INES lookup should not run")))
    monkeypatch.setattr(
        "app.importers.ines_bulk_video_url_filler.validate_remote_media_url",
        lambda url, expected_type, timeout_seconds=15, user_agent="": {
            "valid": True,
            "final_url": url,
            "status_code": 200,
            "content_type": "video/mp4",
            "content_length": 123,
            "media_type": "video",
            "reason": "Mídia validada com sucesso.",
        },
    )
    monkeypatch.setattr(
        "app.importers.media_auto_fill_importer.validate_remote_media_url",
        lambda url, expected_type, timeout_seconds=15, user_agent="": {
            "valid": True,
            "final_url": url,
            "status_code": 200,
            "content_type": "video/mp4",
            "content_length": 123,
            "media_type": "video",
            "reason": "Mídia validada com sucesso.",
        },
    )

    try:
        result = importer._find_media("abacate", ["ines"])
    finally:
        importer.settings.ines_standard_video_fill_enabled = old_enabled

    assert result["video_url"].endswith("abacateSm_Prog001.mp4")
    assert result["validated"] is True
    assert result["can_use_avatar"] is True
    assert result["detection_method"] == "ines_standard_pattern"
