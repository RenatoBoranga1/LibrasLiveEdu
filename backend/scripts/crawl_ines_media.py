import argparse
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from app.core.database import SessionLocal  # noqa: E402
from app.importers.ines_site_crawler import InesSiteCrawler  # noqa: E402
from app.models import Sign  # noqa: E402


def words_from_db(limit: int | None = None) -> list[str]:
    with SessionLocal() as db:
        query = db.query(Sign.word).order_by(Sign.updated_at.desc())
        if limit:
            query = query.limit(limit)
        return [row[0] for row in query.all()]


def words_from_file(path: str) -> list[str]:
    return [line.strip() for line in Path(path).read_text(encoding="utf-8").splitlines() if line.strip()]


def main() -> None:
    parser = argparse.ArgumentParser(description="Crawler controlado do Dicionario INES para gerar manifesto de videos.")
    parser.add_argument("--max-pages", type=int, default=100)
    parser.add_argument("--delay-ms", type=int, default=None)
    parser.add_argument("--words-from-db", action="store_true")
    parser.add_argument("--words-file")
    parser.add_argument("--output", default=str(ROOT / "data" / "generated" / "ines_video_manifest.generated.json"))
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--resume", action="store_true", help="Reservado para evolucao futura; o crawler atual deduplica URLs na execucao.")
    parser.add_argument("--limit", type=int, default=None)
    parser.add_argument("--only-word")
    args = parser.parse_args()

    words: list[str] = []
    if args.only_word:
        words = [args.only_word]
    elif args.words_file:
        words = words_from_file(args.words_file)
    elif args.words_from_db:
        words = words_from_db(args.limit)
    if args.limit and words:
        words = words[: args.limit]

    crawler = InesSiteCrawler(max_pages=args.max_pages, delay_ms=args.delay_ms)
    manifest = crawler.crawl(words=words, output=args.output, dry_run=args.dry_run)
    report = manifest["report"]
    report["manifest_path"] = None if args.dry_run else args.output
    print(report)


if __name__ == "__main__":
    main()
