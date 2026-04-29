import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from app.core.database import SessionLocal  # noqa: E402
from app.importers.libras_dictionary_importer import LibrasDictionaryImporter  # noqa: E402


def main() -> None:
    with SessionLocal() as db:
        importer = LibrasDictionaryImporter(db)
        job = importer.import_from_vlibras_api()
        report = importer.generate_import_report(job.id)
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
