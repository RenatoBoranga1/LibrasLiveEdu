from app.importers.ines_media_importer import InesMediaImporter
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
