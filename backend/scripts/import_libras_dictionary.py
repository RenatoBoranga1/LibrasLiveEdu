import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from app.core.database import SessionLocal  # noqa: E402
from app.importers.libras_dictionary_importer import LibrasDictionaryImporter  # noqa: E402


def write_report(report: dict) -> Path:
    report_path = ROOT / "data" / f"import_report_{report['id']}.json"
    with report_path.open("w", encoding="utf-8") as file:
        json.dump(report, file, ensure_ascii=False, indent=2)
    return report_path


def main() -> None:
    parser = argparse.ArgumentParser(description="Importa dicionario autorizado de Libras.")
    parser.add_argument("--source", required=True, help="Arquivo CSV/JSON ou nome do provider.")
    parser.add_argument("--source-type", choices=["csv", "json", "api"], default=None)
    args = parser.parse_args()

    source_type = args.source_type
    if not source_type:
        suffix = Path(args.source).suffix.lower()
        source_type = "csv" if suffix == ".csv" else "json" if suffix == ".json" else "api"

    with SessionLocal() as db:
        importer = LibrasDictionaryImporter(db)
        if source_type == "csv":
            job = importer.import_from_csv(args.source)
        elif source_type == "json":
            job = importer.import_from_json(args.source)
        else:
            job = importer.import_from_api(args.source)
        report = importer.generate_import_report(job.id)
        report_path = write_report(report)

    print(json.dumps({"report_path": str(report_path), "report": report}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
