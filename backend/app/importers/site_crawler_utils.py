import json
import re
import time
import unicodedata
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.parse import parse_qs, quote_plus, urljoin, urlparse
from urllib.robotparser import RobotFileParser

import httpx

from app.core.config import get_settings
from app.services.text_normalizer import TextNormalizerService


VIDEO_EXTENSIONS = {".mp4", ".webm", ".mov"}
GIF_EXTENSIONS = {".gif"}
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}


def utc_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def strip_accents(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value)
    return "".join(char for char in normalized if not unicodedata.combining(char))


def clean_word(value: str | None) -> str | None:
    if not value:
        return None
    text = re.sub(r"\s+", " ", strip_accents(value)).strip(" \t\r\n:-_")
    text = re.sub(r"\s+em\s+libras$", "", text, flags=re.IGNORECASE).strip()
    return text.lower() or None


def word_from_media_url(url: str) -> str | None:
    name = Path(urlparse(url).path).stem
    name = re.sub(r"Sm_Prog\d+$", "", name, flags=re.IGNORECASE)
    name = re.sub(r"_?Prog\d+$", "", name, flags=re.IGNORECASE)
    name = re.sub(r"[-_]+", " ", name)
    name = re.sub(r"(?<=[a-z])(?=[A-Z])", " ", name)
    return clean_word(name)


def media_candidates(html: str) -> list[str]:
    candidates: list[str] = []
    patterns = [
        r"""(?:src|href|data-src|data-video|data-url|data-mp4|data-file|data-media|poster)=["']([^"']+)["']""",
        r"""((?:https?:\\?/\\?/[^"'\s<>]+)?/?(?:public/)?media/palavras/videos/[^"'\s<>]+\.(?:mp4|webm|mov)(?:\?[^"'\s<>]*)?)""",
        r"""((?:https?:\\?/\\?/[^"'\s<>]+)?/?public/media/mao/[^"'\s<>]+\.(?:jpg|jpeg|png|webp)(?:\?[^"'\s<>]*)?)""",
        r"""((?:https?:\\?/\\?/[^"'\s<>]+)?[^"'\s<>]+\.(?:mp4|webm|mov|jpg|jpeg|png|webp|gif)(?:\?[^"'\s<>]*)?)""",
        r"""["']([^"']+\.(?:mp4|webm|mov|jpg|jpeg|png|webp|gif)(?:\?[^"']*)?)["']""",
    ]
    for pattern in patterns:
        for raw in re.findall(pattern, html, flags=re.IGNORECASE):
            value = (raw[0] if isinstance(raw, tuple) else raw).replace("\\/", "/").strip()
            if value and value not in candidates:
                candidates.append(value)
    return candidates


def absolute_url(value: str, base_url: str) -> str:
    cleaned = value.replace("\\/", "/").strip()
    if cleaned.startswith("//"):
        return f"https:{cleaned}"
    if cleaned.startswith("public/media/"):
        cleaned = f"/{cleaned}"
    return urljoin(base_url, cleaned)


def path_has_extension(url: str, extensions: set[str]) -> bool:
    path = urlparse(url).path.lower()
    return any(path.endswith(extension) for extension in extensions)


def is_handshape_image(url: str) -> bool:
    return "/public/media/mao/" in urlparse(url).path.lower()


def is_ines_sign_video(url: str) -> bool:
    path = urlparse(url).path.lower()
    return "/public/media/palavras/videos/" in path and path_has_extension(url, VIDEO_EXTENSIONS)


def validate_remote_media(url: str, expected: str, *, timeout: int, user_agent: str) -> dict[str, Any]:
    headers = {"User-Agent": user_agent}
    result = {"url": url, "valid": False, "http_status": None, "content_type": None, "media_type": expected}
    try:
        with httpx.Client(timeout=timeout, follow_redirects=True) as client:
            response = client.head(url, headers=headers)
            if response.status_code in {403, 405, 501}:
                response = client.get(url, headers={**headers, "Range": "bytes=0-0"})
            result["http_status"] = response.status_code
            result["content_type"] = response.headers.get("content-type", "").split(";")[0].strip().lower() or None
    except Exception as exc:  # noqa: BLE001
        result["error"] = str(exc)
        return result

    if result["http_status"] not in {200, 206}:
        return result
    content_type = str(result["content_type"] or "")
    path = urlparse(url).path.lower()
    if expected == "video":
        result["valid"] = content_type in {"video/mp4", "video/webm", "video/quicktime", "application/octet-stream"} or path.endswith((".mp4", ".webm", ".mov"))
    elif expected == "gif":
        result["valid"] = content_type == "image/gif" or path.endswith(".gif")
    return result


def extract_internal_links(html: str, page_url: str, allowed_host: str, *, allow_external: bool = False) -> list[str]:
    links: list[str] = []
    raw_links = re.findall(r"""href=["']([^"']+)["']""", html, flags=re.IGNORECASE)
    raw_links.extend(re.findall(r"<loc>\s*([^<\s]+)\s*</loc>", html, flags=re.IGNORECASE))
    for href in raw_links:
        absolute = urljoin(page_url, href.strip())
        parsed = urlparse(absolute)
        if parsed.scheme not in {"http", "https"}:
            continue
        if not allow_external and parsed.hostname != allowed_host:
            continue
        if absolute not in links:
            links.append(absolute)
    return links


def extract_page_word(html: str, page_url: str) -> str | None:
    for pattern in [
        r"""(?:Palavra|Sinal)\s*:?\s*</?[^>]*>\s*([^<\n\r]{2,80})""",
        r"""<title[^>]*>([^<]{2,120})</title>""",
        r"""<h1[^>]*>([^<]{2,120})</h1>""",
    ]:
        match = re.search(pattern, html, flags=re.IGNORECASE)
        if match:
            word = clean_word(re.sub(r"\s*[-|].*$", "", match.group(1)))
            if word:
                return word
    query = parse_qs(urlparse(page_url).query)
    for key in ("q", "palavra", "word"):
        if query.get(key):
            return clean_word(query[key][0])
    return None


def extract_labeled_text(html: str, labels: list[str]) -> str | None:
    text = re.sub(r"<[^>]+>", " ", html)
    text = re.sub(r"\s+", " ", text)
    for label in labels:
        pattern = rf"{re.escape(label)}\s*:?\s*(.{{1,180}}?)(?:\s+(?:Palavra|Sinal|Vídeo|Video|Acepção|Exemplo|Classe Gramatical|Exemplo Libras|Origem|Imagem)\s*:|\s{{2,}}|$)"
        match = re.search(pattern, text, flags=re.IGNORECASE)
        if match:
            value = match.group(1).strip(" :-")
            if value:
                return value[:180]
    return None


class ControlledSiteCrawler:
    source_url: str

    def __init__(self, *, max_pages: int | None = None, delay_ms: int | None = None, timeout_seconds: int | None = None):
        self.settings = get_settings()
        self.max_pages = max(1, min(max_pages or self.settings.crawler_max_pages, self.settings.crawler_max_pages))
        self.delay_ms = self.settings.crawler_delay_ms if delay_ms is None else max(0, delay_ms)
        self.timeout_seconds = timeout_seconds or self.settings.crawler_timeout_seconds
        self.normalizer = TextNormalizerService()
        self.visited: set[str] = set()
        self.errors: list[dict[str, Any]] = []
        self.duplicates: list[dict[str, Any]] = []
        self._robots: RobotFileParser | None = None

    def _client(self) -> httpx.Client:
        return httpx.Client(timeout=self.timeout_seconds, follow_redirects=True, headers={"User-Agent": self.settings.crawler_user_agent})

    def _delay(self) -> None:
        delay = self.delay_ms / 1000
        if delay:
            time.sleep(delay)

    def _can_fetch(self, url: str) -> bool:
        if not self.settings.crawler_respect_robots:
            return True
        if self._robots is None:
            self._robots = RobotFileParser()
            self._robots.set_url(urljoin(self.source_url, "/robots.txt"))
            try:
                self._robots.read()
            except Exception:  # noqa: BLE001
                return True
        return self._robots.can_fetch(self.settings.crawler_user_agent, url)

    def _fetch(self, client: httpx.Client, url: str) -> str | None:
        if url in self.visited or len(self.visited) >= self.max_pages:
            return None
        if not self._can_fetch(url):
            self.errors.append({"url": url, "message": "Bloqueado por robots.txt."})
            return None
        self.visited.add(url)
        try:
            response = client.get(url)
            if response.status_code >= 400:
                self.errors.append({"url": url, "message": f"HTTP {response.status_code}."})
                return None
            return response.text
        except Exception as exc:  # noqa: BLE001
            self.errors.append({"url": url, "message": str(exc)})
            return None

    def _write_manifest(self, manifest: dict[str, Any], output: str | Path | None) -> None:
        if not output:
            return
        path = Path(output)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")


def ines_search_url(base_url: str, word: str) -> str:
    return f"{base_url.rstrip('/')}/?q={quote_plus(word)}"
