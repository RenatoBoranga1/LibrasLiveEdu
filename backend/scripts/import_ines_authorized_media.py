import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from app.core.database import SessionLocal  # noqa: E402
from app.importers.ines_authorized_media_importer import InesAuthorizedMediaImporter  # noqa: E402


def write_report(report: dict) -> Path:
    report_path = ROOT / "data" / f"ines_media_import_report_{report['id']}.json"
    with report_path.open("w", encoding="utf-8") as file:
        json.dump(report, file, ensure_ascii=False, indent=2, default=str)
    return report_path


def main() -> None:
    parser = argparse.ArgumentParser(description="Importa mídias INES autorizadas por manifesto CSV/JSON.")
    parser.add_argument("--manifest", required=True, help="Arquivo CSV/JSON autorizado com palavras e URLs de mídia.")
    parser.add_argument("--source-type", choices=["csv", "json"], default=None)
    parser.add_argument("--authorized", action="store_true", help="Confirma que há autorização formal para baixar as mídias.")
    parser.add_argument("--authorization-reference", default=None, help="Número/URL/documento da autorização.")
    parser.add_argument("--no-download-media", action="store_true", help="Registra URLs sem baixar os arquivos.")
    parser.add_argument("--overwrite-files", action="store_true", help="Baixa novamente arquivos já existentes.")
    args = parser.parse_args()

    source_type = args.source_type
    if not source_type:
        suffix = Path(args.manifest).suffix.lower()
        source_type = "csv" if suffix == ".csv" else "json"

    with SessionLocal() as db:
        importer = InesAuthorizedMediaImporter(db)
        job = importer.import_manifest(
            args.manifest,
            source_type,
            download_media=not args.no_download_media,
            overwrite_files=args.overwrite_files,
            authorized=args.authorized,
            authorization_reference=args.authorization_reference,
        )
        report = {
            "id": job.id,
            "source_type": job.source_type,
            "source_name": job.source_name,
            "status": job.status,
            "total_records": job.total_records,
            "imported_records": job.imported_records,
            "updated_records": job.updated_records,
            "failed_records": job.failed_records,
            "logs": job.logs,
            "created_at": job.created_at,
            "finished_at": job.finished_at,
        }
        report_path = write_report(report)

    print(json.dumps({"report_path": str(report_path), "report": report}, ensure_ascii=False, indent=2, default=str))


if __name__ == "__main__":
    main()
