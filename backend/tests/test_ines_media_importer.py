from app.importers.ines_media_importer import InesMediaImporter
from app.importers.ifpr_gif_importer import IfprGifImporter
from app.importers.media_auto_fill_importer import MediaAutoFillImporter
from app.schemas.api import InesMediaImportStartRequest


def test_validate_json_items_reports_missing_video_and_duplicates():
    importer = InesMediaImporter(db=None)  # type: ignore[arg-type]
    payload = InesMediaImportStartRequest(
        mode="json_items",
        items=[
            {"word": "bom dia", "gloss": "BOM-DIA"},
            {"word": "bom dia", "gloss": "BOM-DIA"},
        ],
        max_items=10,
    )

    report = importer.validate(payload)

    assert report["total_items"] == 2
    assert report["skipped_count"] == 1
    assert any("sem vídeo" in item["message"] for item in report["warnings"])


def test_validate_rejects_invalid_media_url():
    importer = InesMediaImporter(db=None)  # type: ignore[arg-type]
    payload = InesMediaImportStartRequest(
        mode="json_items",
        items=[{"word": "tecnologia", "video_url": "COLE_AQUI_A_URL"}],
        max_items=10,
    )

    report = importer.validate(payload)

    assert report["error_count"] == 1
    assert "video_url" in report["errors"][0]["message"]


def test_validate_accepts_authorized_gif_url_without_video_warning():
    importer = InesMediaImporter(db=None)  # type: ignore[arg-type]
    payload = InesMediaImportStartRequest(
        mode="json_items",
        items=[
            {
                "word": "professor",
                "avatar_gif_url": "https://ifpr.edu.br/umuarama/libras-gifs/professor.gif",
                "source_name": "IFPR Campus Umuarama - Libras GIFs",
                "source_url": "https://ifpr.edu.br/umuarama/libras-gifs/",
                "license": "Uso autorizado para apoio educacional",
                "license_notes": "GIF cadastrado como apoio visual complementar.",
            }
        ],
        max_items=10,
    )

    report = importer.validate(payload)

    assert report["error_count"] == 0
    assert not any("sem v" in item["message"].lower() for item in report["warnings"])


def test_effective_limit_does_not_exceed_configuration():
    importer = InesMediaImporter(db=None)  # type: ignore[arg-type]
    old_limit = importer.settings.ines_import_max_items
    importer.settings.ines_import_max_items = 3
    try:
        payload = InesMediaImportStartRequest(
            mode="json_items",
            items=[
                {"word": "um"},
                {"word": "dois"},
                {"word": "três"},
                {"word": "quatro"},
            ],
            max_items=99,
        )

        report = importer.validate(payload)

        assert report["total_items"] == 3
        assert any("excede o limite" in item["message"] for item in report["warnings"])
    finally:
        importer.settings.ines_import_max_items = old_limit


def test_diagnose_respects_max_items_without_db_writes(monkeypatch):
    importer = InesMediaImporter(db=None)  # type: ignore[arg-type]
    old_limit = importer.settings.ines_import_max_items
    importer.settings.ines_import_max_items = 2
    calls: list[str] = []

    def fake_diagnose(word: str):
        calls.append(word)
        return {
            "word": word,
            "normalized_word": word,
            "search_url": f"https://dicionario.ines.gov.br/?q={word}",
            "http_status": 200,
            "page_loaded": True,
            "word_found_in_page": True,
            "source_reference_url": f"https://dicionario.ines.gov.br/?q={word}",
            "image_found": False,
            "image_url": None,
            "video_found": False,
            "video_url": None,
            "video_host_allowed": False,
            "can_import": False,
            "reason": "Sem vídeo detectado.",
            "warnings": [],
            "errors": [],
        }

    monkeypatch.setattr(importer, "_diagnose_one_word", fake_diagnose)
    monkeypatch.setattr(importer, "_delay", lambda: None)
    try:
        response = importer.diagnose_words(["bom dia", "professor", "aluno"], max_items=10)
    finally:
        importer.settings.ines_import_max_items = old_limit

    assert response["status"] == "completed"
    assert response["total_items"] == 2
    assert calls == ["bom dia", "professor"]


def test_diagnose_returns_can_import_false_when_video_is_not_found(monkeypatch):
    importer = InesMediaImporter(db=None)  # type: ignore[arg-type]

    class FakeResponse:
        status_code = 200
        text = "<html><body>Professor <img src='/professor.png' /></body></html>"
        url = "https://dicionario.ines.gov.br/?q=professor"

    class FakeClient:
        def __init__(self, *args, **kwargs):
            pass

        def __enter__(self):
            return self

        def __exit__(self, *args):
            return False

        def get(self, *args, **kwargs):
            return FakeResponse()

    monkeypatch.setattr("app.importers.ines_media_importer.httpx.Client", FakeClient)

    response = importer.diagnose_words(["professor"], max_items=1)
    result = response["results"][0]

    assert result["page_loaded"] is True
    assert result["word_found_in_page"] is True
    assert result["image_found"] is True
    assert result["video_found"] is False
    assert result["can_import"] is False
    assert "nenhuma URL de vídeo" in result["reason"]


def test_find_ines_entry_detects_video_urls_in_data_attributes(monkeypatch):
    importer = InesMediaImporter(db=None)  # type: ignore[arg-type]

    class FakeResponse:
        status_code = 200
        text = "<html><body>Professor <div data-video='/media/professor.mp4'></div></body></html>"
        url = "https://dicionario.ines.gov.br/?q=professor"

    class FakeClient:
        def __init__(self, *args, **kwargs):
            pass

        def __enter__(self):
            return self

        def __exit__(self, *args):
            return False

        def get(self, *args, **kwargs):
            return FakeResponse()

    monkeypatch.setattr("app.importers.ines_media_importer.httpx.Client", FakeClient)

    result = importer.find_ines_entry_for_word("professor")

    assert result["found"] is True
    assert result["video_url"].endswith("/media/professor.mp4")
    assert result["avatar_video_url"] == result["video_url"]


def test_ifpr_gif_importer_detects_authorized_gif_by_alt_text(monkeypatch):
    importer = IfprGifImporter()
    old_enabled = importer.settings.ifpr_gif_import_enabled
    importer.settings.ifpr_gif_import_enabled = True

    class FakeResponse:
        status_code = 200
        text = "<html><body><img alt='Professor em Libras' src='/wp-content/professor.gif' /></body></html>"
        url = "https://ifpr.edu.br/umuarama/libras-gifs/"

    class FakeClient:
        def __init__(self, *args, **kwargs):
            pass

        def __enter__(self):
            return self

        def __exit__(self, *args):
            return False

        def get(self, *args, **kwargs):
            return FakeResponse()

    monkeypatch.setattr("app.importers.ifpr_gif_importer.httpx.Client", FakeClient)
    try:
        result = importer.find_gif_for_word("professor")
    finally:
        importer.settings.ifpr_gif_import_enabled = old_enabled

    assert result["found"] is True
    assert result["media_type"] == "gif"
    assert result["avatar_gif_url"].endswith("/wp-content/professor.gif")
    assert result["source_name"] == importer.settings.ifpr_gif_source_name


def test_media_auto_fill_diagnose_uses_ifpr_after_ines_miss(monkeypatch):
    importer = MediaAutoFillImporter(db=None)  # type: ignore[arg-type]
    monkeypatch.setattr(importer, "_delay", lambda: None)
    monkeypatch.setattr(
        importer.ines,
        "find_ines_entry_for_word",
        lambda word: {
            "found": False,
            "word": word,
            "normalized_word": "aluno",
            "reason": "Video nao encontrado no INES.",
            "warnings": [],
            "errors": [],
        },
    )
    monkeypatch.setattr(
        importer.ifpr,
        "find_gif_for_word",
        lambda word: {
            "source": "ifpr",
            "found": True,
            "media_type": "gif",
            "word": word,
            "avatar_gif_url": "https://ifpr.edu.br/umuarama/libras-gifs/aluno.gif",
            "source_name": "IFPR Campus Umuarama - Libras GIFs",
            "source_url": "https://ifpr.edu.br/umuarama/libras-gifs/",
            "source_reference_url": "https://ifpr.edu.br/umuarama/libras-gifs/",
            "license": "Uso autorizado",
            "license_notes": "Fonte registrada.",
            "reason": "GIF encontrado na fonte IFPR.",
            "warnings": [],
            "errors": [],
        },
    )

    report = importer.diagnose_media_sources(["aluno"], max_items=1, source_priority=["ines", "ifpr"])

    assert report["total_items"] == 1
    assert report["gif_found_count"] == 1
    assert report["media_missing_count"] == 0
    assert report["items"][0]["source_used"] == "ifpr"
    assert report["items"][0]["avatar_gif_url"].endswith("aluno.gif")


def test_media_auto_fill_diagnose_respects_max_items(monkeypatch):
    importer = MediaAutoFillImporter(db=None)  # type: ignore[arg-type]
    old_limit = importer.settings.media_auto_fill_max_items
    importer.settings.media_auto_fill_max_items = 1
    calls: list[str] = []

    def fake_find(word: str, source_priority: list[str]):
        calls.append(word)
        return {
            "word": word,
            "normalized_word": word,
            "source_used": None,
            "media_type": "none",
            "media_found": False,
            "reason": "Sem midia.",
            "recommended_action": "Importar manualmente",
            "warnings": [],
            "errors": [],
        }

    monkeypatch.setattr(importer, "_find_media", fake_find)
    monkeypatch.setattr(importer, "_delay", lambda: None)
    try:
        report = importer.diagnose_media_sources(["professor", "aluno"], max_items=10)
    finally:
        importer.settings.media_auto_fill_max_items = old_limit

    assert report["total_items"] == 1
    assert calls == ["professor"]
