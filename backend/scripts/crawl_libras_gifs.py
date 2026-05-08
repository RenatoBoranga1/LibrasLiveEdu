import argparse
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from app.importers.libras_gif_site_crawler import LibrasGifSiteCrawler  # noqa: E402


def main() -> None:
    parser = argparse.ArgumentParser(description="Crawler controlado de GIFs Libras para gerar manifesto.")
    parser.add_argument("--max-pages", type=int, default=100)
    parser.add_argument("--delay-ms", type=int, default=None)
    parser.add_argument("--output", default=str(ROOT / "data" / "generated" / "libras_gif_manifest.generated.json"))
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--resume", action="store_true", help="Reservado para evolucao futura; o crawler atual deduplica URLs na execucao.")
    parser.add_argument("--limit", type=int, default=None, help="Alias de max-pages para compatibilidade operacional.")
    parser.add_argument("--only-word", help="Reservado; associacao por palavra acontece no manifesto extraido da pagina.")
    args = parser.parse_args()

    max_pages = args.limit or args.max_pages
    crawler = LibrasGifSiteCrawler(max_pages=max_pages, delay_ms=args.delay_ms)
    manifest = crawler.crawl(output=args.output, dry_run=args.dry_run)
    report = manifest["report"]
    report["manifest_path"] = None if args.dry_run else args.output
    print(report)


if __name__ == "__main__":
    main()
