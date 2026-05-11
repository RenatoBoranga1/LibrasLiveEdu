import re
from pathlib import Path
from typing import Any
from urllib.parse import urljoin, urlparse

from app.core.config import get_settings
from app.importers.site_crawler_utils import (
    ControlledSiteCrawler,
    absolute_url,
    clean_word,
    extract_internal_links,
    media_candidates,
    path_has_extension,
    utc_iso,
    validate_remote_media,
    word_from_media_url,
)


class LibrasGifSiteCrawler(ControlledSiteCrawler):
    source_name = "IFPR Campus Umuarama - Libras GIFs"
    source_url = "https://ifpr.edu.br/umuarama/libras-gifs/"
    license_text = "Uso autorizado ou licença identificada para apoio educacional"
    license_notes = "GIF utilizado como apoio visual em Libras, com fonte registrada."

    def __init__(self, *, max_pages: int | None = None, delay_ms: int | None = None, timeout_seconds: int | None = None):
        super().__init__(max_pages=max_pages, delay_ms=delay_ms, timeout_seconds=timeout_seconds)
        settings = get_settings()
        self.source_url = settings.ifpr_gif_base_url
        self.source_name = settings.ifpr_gif_source_name
        self.license_text = settings.ifpr_gif_license_text
        self.license_notes = settings.ifpr_gif_license_notes

    def crawl(
        self,
        *,
        output: str | Path | None = None,
        dry_run: bool = False,
    ) -> dict[str, Any]:
        entries: dict[str, Any] = {}
        pages_without_gif: list[dict[str, Any]] = []
        queue = [self.source_url]
        allowed_host = urlparse(self.source_url).hostname or "ifpr.edu.br"

        with self._client() as client:
            while queue and len(self.visited) < self.max_pages:
                url = queue.pop(0)
                html = self._fetch(client, url)
                if html is None:
                    continue
                page_entries = self._extract_entries(html, url)
                if not page_entries:
                    pages_without_gif.append({"url": url})
                for entry in page_entries:
                    key = entry["normalized_word"]
                    if key in entries:
                        variant_key = f"{key}#{len([item for item in entries if item.startswith(key + '#')]) + 1}"
                        self.duplicates.append({"word": entry["word"], "existing_key": key, "variant_key": variant_key})
                        entries[variant_key] = entry
                    else:
                        entries[key] = entry
                for link in extract_internal_links(html, url, allowed_host, allow_external=False):
                    if "libras" in link.lower() and link not in self.visited and link not in queue and len(queue) + len(self.visited) < self.max_pages:
                        queue.append(link)
                self._delay()

        manifest = {
            "generated_at": utc_iso(),
            "source_name": self.source_name,
            "source_url": self.source_url,
            "license": self.license_text,
            "license_notes": self.license_notes,
            "total_entries": len(entries),
            "entries": entries,
            "errors": self.errors,
            "pages_without_gif": pages_without_gif,
            "duplicates": self.duplicates,
            "report": self.report(entries, pages_without_gif),
        }
        if not dry_run:
            self._write_manifest(manifest, output)
        return manifest

    def report(self, entries: dict[str, Any], pages_without_gif: list[dict[str, Any]], manifest_path: str | None = None) -> dict[str, Any]:
        return {
            "status": "completed",
            "source": "ifpr",
            "pages_visited": len(self.visited),
            "entries_found": len(entries),
            "gifs_found": len(entries),
            "errors_count": len(self.errors),
            "duplicates_count": len(self.duplicates),
            "manifest_path": manifest_path,
            "pages_without_gif": len(pages_without_gif),
        }

    def _extract_entries(self, html: str, page_url: str) -> list[dict[str, Any]]:
        entries: list[dict[str, Any]] = []
        for gif_url in self._gif_urls(html, page_url):
            word = self._word_for_gif(html, gif_url) or word_from_media_url(gif_url)
            word = clean_word(word)
            if not word:
                continue
            validation = validate_remote_media(
                gif_url,
                "gif",
                timeout=self.timeout_seconds,
                user_agent=self.settings.crawler_user_agent,
            )
            if not validation.get("valid"):
                self.errors.append({"word": word, "url": gif_url, "message": "GIF detectado, mas validação falhou.", "validation": validation})
                continue
            final_gif_url = str(validation.get("final_url") or gif_url)
            entries.append(
                {
                    "word": word,
                    "normalized_word": self.normalizer.normalize_word(word),
                    "gloss": word.upper(),
                    "avatar_gif_url": final_gif_url,
                    "source_reference_url": page_url,
                    "media_type": "gif",
                    "can_use_avatar": True,
                    "detection_method": "gif_site_crawl",
                    "validated": True,
                    "http_status": validation.get("http_status"),
                    "content_type": validation.get("content_type"),
                    "validation_status_code": validation.get("status_code") or validation.get("http_status"),
                    "validation_content_type": validation.get("content_type"),
                    "validation_final_url": validation.get("final_url"),
                    "validation_content_length": validation.get("content_length"),
                    "validation_reason": validation.get("reason"),
                }
            )
        return entries

    def _gif_urls(self, html: str, page_url: str) -> list[str]:
        urls: list[str] = []
        for candidate in media_candidates(html):
            absolute = absolute_url(candidate, page_url)
            if path_has_extension(absolute, {".gif"}) or "media.giphy.com" in absolute or "giphy.com/media/" in absolute:
                if absolute not in urls:
                    urls.append(absolute)
        return urls

    def _word_for_gif(self, html: str, gif_url: str) -> str | None:
        escaped = re.escape(gif_url.split("/")[-1])
        context_match = re.search(rf"([^<>]{{0,120}}{escaped}[^<>]{{0,120}})", html, flags=re.IGNORECASE)
        context = context_match.group(1) if context_match else ""
        for pattern in [
            r"""alt=["']([^"']{2,80})["']""",
            r"""title=["']([^"']{2,80})["']""",
            r"""<figcaption[^>]*>([^<]{2,100})</figcaption>""",
        ]:
            match = re.search(pattern, context, flags=re.IGNORECASE)
            if match:
                return match.group(1)
        return None
