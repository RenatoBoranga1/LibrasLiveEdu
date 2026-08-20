import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = ROOT.parent
sys.path.insert(0, str(ROOT))

from app.importers.ines_full_catalog_importer import InesFullCatalogImporter  # noqa: E402


def parse_letters(value: str | None) -> list[str]:
    if not value:
        return list("ABCDEFGHIJKLMNOPQRSTUVWXYZ")
    return [letter.strip().upper() for letter in value.replace(",", " ").split() if letter.strip()]


def main() -> None:
    parser = argparse.ArgumentParser(description="Crawler controlado do catálogo completo do Dicionário INES.")
    parser.add_argument("--letters", default=None, help="Letras separadas por vírgula ou espaço. Ex.: A,B,C")
    parser.add_argument("--max-items", type=int, default=100)
    parser.add_argument("--delay-ms", type=int, default=None)
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--use-browser", action="store_true")
    parser.add_argument("--overwrite-manifest", action="store_true")
    parser.add_argument(
        "--output",
        default=str(REPO_ROOT / "backend" / "app" / "importers" / "manifests" / "ines_full_catalog.generated.json"),
    )
    args = parser.parse_args()

    importer = InesFullCatalogImporter()
    job, report, manifest = importer.scan_catalog(
        letters=parse_letters(args.letters),
        max_items=args.max_items,
        delay_ms=args.delay_ms,
        dry_run=True,
        use_browser=args.use_browser,
        overwrite_manifest=args.overwrite_manifest,
    )
    report["job_id"] = job.id if job else None
    if not args.dry_run:
        output = Path(args.output)
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
        report["manifest_path"] = str(output)
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
