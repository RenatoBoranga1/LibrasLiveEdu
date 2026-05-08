from pathlib import Path
from typing import Any
from urllib.parse import urljoin, urlparse

from app.core.config import get_settings
from app.importers.site_crawler_utils import (
    ControlledSiteCrawler,
    IMAGE_EXTENSIONS,
    VIDEO_EXTENSIONS,
    absolute_url,
    extract_internal_links,
    extract_labeled_text,
    extract_page_word,
    ines_search_url,
    is_handshape_image,
    is_ines_sign_video,
    media_candidates,
    path_has_extension,
    utc_iso,
    validate_remote_media,
    word_from_media_url,
)


class InesSiteCrawler(ControlledSiteCrawler):
    source_name = "Dicionário da Língua Brasileira de Sinais - INES"
    source_url = "https://dicionario.ines.gov.br/"
    license_text = "Uso autorizado pelo INES/Governo para o projeto LibrasLive Edu"
    license_notes = "Mídia autorizada para uso educacional no aplicativo LibrasLive Edu."

    def __init__(self, *, max_pages: int | None = None, delay_ms: int | None = None, timeout_seconds: int | None = None):
        super().__init__(max_pages=max_pages, delay_ms=delay_ms, timeout_seconds=timeout_seconds)
        self.settings = get_settings()
        self.source_url = self.settings.ines_base_url.rstrip("/") + "/"

    def crawl(
        self,
        *,
        words: list[str] | None = None,
        output: str | Path | None = None,
        dry_run: bool = False,
    ) -> dict[str, Any]:
        entries: dict[str, Any] = {}
        pages_without_video: list[dict[str, Any]] = []
        queue = self._seed_urls(words or [])
        allowed_host = urlparse(self.source_url).hostname or "dicionario.ines.gov.br"

        with self._client() as client:
            while queue and len(self.visited) < self.max_pages:
                url = queue.pop(0)
                html = self._fetch(client, url)
                if html is None:
                    continue
                page_entries = self._extract_entries(html, url)
                for entry in page_entries:
                    key = entry["normalized_word"]
                    if key in entries:
                        variant_key = f"{key}#{len([item for item in entries if item.startswith(key + '#')]) + 1}"
                        self.duplicates.append({"word": entry["word"], "existing_key": key, "variant_key": variant_key})
                        entries[variant_key] = entry
                    else:
                        entries[key] = entry
                    if not entry.get("video_url"):
                        pages_without_video.append({"word": entry["word"], "url": url})
                if not words:
                    for link in extract_internal_links(html, url, allowed_host, allow_external=self.settings.crawler_allow_external_domains):
                        if self._is_relevant_link(link) and link not in self.visited and link not in queue and len(queue) + len(self.visited) < self.max_pages:
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
            "pages_without_video": pages_without_video,
            "duplicates": self.duplicates,
            "report": self.report(entries, pages_without_video),
        }
        if not dry_run:
            self._write_manifest(manifest, output)
        return manifest

    def report(self, entries: dict[str, Any], pages_without_video: list[dict[str, Any]], manifest_path: str | None = None) -> dict[str, Any]:
        return {
            "status": "completed",
            "source": "ines",
            "pages_visited": len(self.visited),
            "entries_found": len(entries),
            "videos_found": sum(1 for entry in entries.values() if entry.get("video_url")),
            "support_images_found": sum(1 for entry in entries.values() if entry.get("image_url")),
            "entries_without_video": len(pages_without_video),
            "errors_count": len(self.errors),
            "duplicates_count": len(self.duplicates),
            "manifest_path": manifest_path,
        }

    def _seed_urls(self, words: list[str]) -> list[str]:
        if words:
            return list(dict.fromkeys(ines_search_url(self.source_url, word) for word in words if word.strip()))
        urls = [self.source_url]
        sitemap_url = urljoin(self.source_url, "/sitemap.xml")
        urls.append(sitemap_url)
        for letter in "abcdefghijklmnopqrstuvwxyz":
            urls.append(urljoin(self.source_url, f"/?letra={letter}"))
        return list(dict.fromkeys(urls))

    def _extract_entry(self, html: str, page_url: str) -> dict[str, Any] | None:
        entries = self._extract_entries(html, page_url)
        return entries[0] if entries else None

    def _extract_entries(self, html: str, page_url: str) -> list[dict[str, Any]]:
        candidates = [absolute_url(candidate, page_url) for candidate in media_candidates(html)]
        video_urls = self._unique([url for url in candidates if is_ines_sign_video(url)])
        video_urls.extend(url for url in self._unique([url for url in candidates if path_has_extension(url, VIDEO_EXTENSIONS)]) if url not in video_urls)
        image_url = next((url for url in candidates if is_handshape_image(url)), None)
        if not image_url:
            image_url = next((url for url in candidates if path_has_extension(url, IMAGE_EXTENSIONS)), None)

        page_word = extract_page_word(html, page_url)
        entries: list[dict[str, Any]] = []
        for video_url in video_urls:
            validation = validate_remote_media(
                video_url,
                "video",
                timeout=self.timeout_seconds,
                user_agent=self.settings.crawler_user_agent,
            )
            word = (page_word if len(video_urls) == 1 else None) or word_from_media_url(video_url)
            entry = self._entry_for_media(
                word=word,
                page_url=page_url,
                video_url=video_url,
                image_url=image_url,
                validation=validation,
                html=html,
            )
            if entry:
                entries.append(entry)
            elif not validation.get("valid"):
                self.errors.append({"word": word, "url": video_url, "message": "Vídeo detectado, mas validação falhou.", "validation": validation})

        if entries:
            return entries
        if not image_url:
            return []

        entry = self._entry_for_media(
            word=page_word or word_from_media_url(image_url),
            page_url=page_url,
            video_url=None,
            image_url=image_url,
            validation={"valid": False, "http_status": None, "content_type": None},
            html=html,
        )
        return [entry] if entry else []

    def _entry_for_media(
        self,
        *,
        word: str | None,
        page_url: str,
        video_url: str | None,
        image_url: str | None,
        validation: dict[str, Any],
        html: str,
    ) -> dict[str, Any] | None:
        if not word:
            return None
        normalized_word = self.normalizer.normalize_word(word)
        if not normalized_word:
            return None

        can_use_avatar = bool(video_url and validation.get("valid"))
        return {
            "word": word,
            "normalized_word": normalized_word,
            "gloss": word.upper(),
            "source_reference_url": page_url,
            "video_url": video_url if can_use_avatar else None,
            "avatar_video_url": video_url if can_use_avatar else None,
            "image_url": image_url,
            "meaning": extract_labeled_text(html, ["Acepção", "Significado"]) or "",
            "grammatical_class": extract_labeled_text(html, ["Classe Gramatical"]) or "",
            "media_type": "video" if can_use_avatar else "image",
            "can_use_avatar": can_use_avatar,
            "detection_method": "site_crawl" if can_use_avatar else "support_image_only",
            "validated": bool(validation.get("valid")) if video_url else False,
            "http_status": validation.get("http_status"),
            "content_type": validation.get("content_type"),
        }

    def _unique(self, values: list[str]) -> list[str]:
        unique: list[str] = []
        for value in values:
            if value not in unique:
                unique.append(value)
        return unique

    def _is_relevant_link(self, url: str) -> bool:
        text = url.lower()
        return any(token in text for token in ("palavra", "sinal", "dicionario", "busca", "libras", "?q=", "letra="))
