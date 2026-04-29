from app.importers.libras_dictionary_importer import LibrasDictionaryImporter


def test_importer_validates_required_fields():
    importer = LibrasDictionaryImporter(db=None)  # type: ignore[arg-type]
    valid, error = importer.validate_required_fields({"word": "professor"})
    assert not valid
    assert "source_name" in error


def test_importer_rejects_unknown_license():
    importer = LibrasDictionaryImporter(db=None)  # type: ignore[arg-type]
    valid, error = importer.validate_license({"license": "desconhecida"})
    assert not valid
    assert "Licenca" in error
