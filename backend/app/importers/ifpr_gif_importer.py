import html
import re
from typing import Any
from urllib.parse import urljoin, urlparse

import httpx

from app.core.config import get_settings
from app.services.media_validation import validate_remote_media_url
from app.services.text_normalizer import TextNormalizerService


class IfprGifImporter:
    """Controlled IFPR GIF lookup for admin-triggered media enrichment.

    The importer never downloads files. It only detects public GIF URLs that can
    be matched to the requested word with a conservative filename, alt/title or
    nearby-text match.
    """

    def __init__(self):
        self.settings = get_settings()
        self.normalizer = TextNormalizerService()

    def find_gif_for_word(self, word: str) -> dict[str, Any]:
        normalized_word = self.normalizer.normalize_word(word)
        base_url = self.settings.ifpr_gif_base_url
        result: dict[str, Any] = {
            "source": "ifpr",
            "found": False,
            "media_type": "gif",
            "word": word,
            "normalized_word": normalized_word,
            "search_url": base_url,
            "http_status": None,
            "page_loaded": False,
            "word_found_in_page": False,
            "avatar_gif_url": None,
            "image_url": None,
            "source_name": self.settings.ifpr_gif_source_name,
            "source_url": base_url,
            "source_reference_url": base_url,
            "license": self.settings.ifpr_gif_license_text,
            "license_notes": self.settings.ifpr_gif_license_notes,
            "reason": "Diagnóstico IFPR não executado.",
            "validated": False,
            "validation_status_code": None,
            "validation_content_type": None,
            "validation_final_url": None,
            "validation_content_length": None,
            "validation_reason": None,
            "warnings": [],
            "errors": [],
        }

        if not self.settings.ifpr_gif_import_enabled:
            result["reason"] = "Importação IFPR GIF desativada neste ambiente."
            result["warnings"].append("Ative IFPR_GIF_IMPORT_ENABLED=true somente no ambiente administrativo.")
            return result

        try:
            with httpx.Client(timeout=self.settings.media_auto_fill_timeout_seconds, follow_redirects=True) as client:
                response = client.get(base_url, headers={"User-Agent": "LibrasLiveEdu-admin-gif-lookup/1.0"})
        except httpx.TimeoutException:
            result["reason"] = "Falha ao consultar IFPR GIFs."
            result["errors"].append("Timeout ao consultar a página.")
            return result
        except httpx.RequestError as exc:
            result["reason"] = "Falha ao consultar IFPR GIFs."
            result["errors"].append(f"Erro de rede ao consultar a página: {exc}")
            return result
        except Exception as exc:  # noqa: BLE001
            result["reason"] = "Falha ao consultar IFPR GIFs."
            result["errors"].append(f"Erro inesperado ao consultar a página: {exc}")
            return result

        result["http_status"] = response.status_code
        result["source_reference_url"] = str(response.url)
        if response.status_code >= 400:
            result["reason"] = "Falha ao consultar IFPR GIFs."
            result["errors"].append(f"IFPR retornou HTTP {response.status_code}.")
            return result

        page_url = str(response.url)
        page_html = response.text
        normalized_page = self.normalizer.normalize_word(page_html)
        result["page_loaded"] = True
        result["word_found_in_page"] = bool(normalized_word and normalized_word in normalized_page)

        gif_url = self._matching_gif_url(page_html, page_url, normalized_word)
        if not gif_url:
            result["reason"] = "Página carregada, mas nenhum GIF correspondente à palavra foi detectado com segurança."
            result["warnings"].append("Use importação manual por JSON/CSV quando a URL autorizada estiver disponível.")
            return result

        validation = validate_remote_media_url(
            gif_url,
            "gif",
            timeout_seconds=self.settings.media_auto_fill_timeout_seconds,
            user_agent="LibrasLiveEdu-admin-gif-validator/1.0",
        )
        result.update(
            {
                "validated": bool(validation.get("valid")),
                "validation_status_code": validation.get("status_code"),
                "validation_content_type": validation.get("content_type"),
                "validation_final_url": validation.get("final_url"),
                "validation_content_length": validation.get("content_length"),
                "validation_reason": validation.get("reason"),
                "http_status": validation.get("status_code"),
            }
        )
        if not validation.get("valid"):
            result["reason"] = "GIF encontrado, mas a URL não passou na validação remota."
            result["errors"].append(str(validation.get("reason") or "GIF inválido."))
            return result

        result["found"] = True
        result["avatar_gif_url"] = str(validation.get("final_url") or gif_url)
        result["image_url"] = result["avatar_gif_url"]
        result["reason"] = "GIF encontrado na fonte IFPR."
        return result

    def _matching_gif_url(self, page_html: str, page_url: str, normalized_word: str) -> str | None:
        if not normalized_word:
            return None

        for tag in re.findall(r"<img\b[^>]*>", page_html, flags=re.IGNORECASE | re.DOTALL):
            source = self._attr(tag, "src") or self._attr(tag, "data-src") or self._attr(tag, "data-url")
            if not source or not self._looks_like_gif(source):
                continue
            alt_title = " ".join(filter(None, [self._attr(tag, "alt"), self._attr(tag, "title")]))
            absolute = self._absolute_url(page_url, source)
            if self._matches_word(absolute, alt_title, normalized_word):
                return absolute

        for candidate, context in self._gif_candidates_with_context(page_html):
            absolute = self._absolute_url(page_url, candidate)
            if self._matches_word(absolute, context, normalized_word):
                return absolute
        return None

    def _gif_candidates_with_context(self, page_html: str) -> list[tuple[str, str]]:
        candidates: list[tuple[str, str]] = []
        patterns = [
            r"""(?:src|href|data-src|data-url|data-gif)=["']([^"']+\.gif(?:\?[^"']*)?)["']""",
            r"""["']([^"']+\.gif(?:\?[^"']*)?)["']""",
            r"""(https?:\\?/\\?/[^"'\s<>]+\.gif(?:\?[^"'\s<>]*)?)""",
        ]
        for pattern in patterns:
            for match in re.finditer(pattern, page_html, flags=re.IGNORECASE):
                raw = match.group(1).replace("\\/", "/").strip()
                context_start = max(0, match.start() - 240)
                context_end = min(len(page_html), match.end() + 240)
                context = re.sub(r"<[^>]+>", " ", page_html[context_start:context_end])
                context = html.unescape(re.sub(r"\s+", " ", context))
                if raw and (raw, context) not in candidates:
                    candidates.append((raw, context))
        return candidates

    def _matches_word(self, absolute_url: str, context: str, normalized_word: str) -> bool:
        if not self._is_http_url(absolute_url):
            return False
        path_match = self.normalizer.normalize_word(urlparse(absolute_url).path)
        context_match = self.normalizer.normalize_word(context)
        return normalized_word in path_match or normalized_word in context_match

    def _absolute_url(self, page_url: str, value: str) -> str:
        return urljoin(page_url, value.replace("\\/", "/").strip())

    def _attr(self, tag: str, name: str) -> str | None:
        match = re.search(rf"""{name}=["']([^"']+)["']""", tag, flags=re.IGNORECASE)
        if not match:
            return None
        value = html.unescape(match.group(1).strip())
        return value or None

    def _looks_like_gif(self, value: str) -> bool:
        return urlparse(value).path.lower().endswith(".gif")

    def _is_http_url(self, value: str) -> bool:
        normalized = value.lower()
        return normalized.startswith("http://") or normalized.startswith("https://")
