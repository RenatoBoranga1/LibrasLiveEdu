import re
from typing import Any, Literal
from urllib.parse import urlparse

import httpx


MediaValidationType = Literal["video", "gif", "animation"]

VIDEO_CONTENT_TYPES = {"video/mp4", "video/webm", "video/quicktime"}
VIDEO_EXTENSIONS = (".mp4", ".webm", ".mov")
GIF_EXTENSIONS = (".gif",)
STATIC_IMAGE_CONTENT_TYPES = {"image/jpeg", "image/jpg", "image/png", "image/webp"}
STATIC_IMAGE_EXTENSIONS = (".jpg", ".jpeg", ".png", ".webp")


def is_static_support_image_url(url: str) -> bool:
    path = urlparse(url).path.lower()
    return "/public/media/mao/" in path or path.endswith(STATIC_IMAGE_EXTENSIONS)


def validate_remote_media_url(
    url: str,
    expected_type: MediaValidationType,
    timeout_seconds: int = 15,
    user_agent: str = "LibrasLiveEdu-media-validator/1.0",
) -> dict[str, Any]:
    result = {
        "valid": False,
        "url": url,
        "final_url": url,
        "status_code": None,
        "content_type": None,
        "content_length": None,
        "media_type": "none",
        "reason": "Validação não executada.",
    }

    if not _is_http_url(url):
        result["reason"] = "URL deve começar com http:// ou https://."
        return result
    if is_static_support_image_url(url):
        result["reason"] = "Imagem estática é apenas apoio visual e não serve para Avatar Libras."
        return result

    headers = {"User-Agent": user_agent}
    try:
        with httpx.Client(timeout=timeout_seconds, follow_redirects=True) as client:
            response = _head_then_range_get(client, url, headers)
    except httpx.TimeoutException:
        result["reason"] = "Timeout ao validar a mídia remota."
        return result
    except httpx.RequestError as exc:
        result["reason"] = f"Erro de rede ao validar mídia: {exc}"
        return result
    except Exception as exc:  # noqa: BLE001
        result["reason"] = f"Erro inesperado ao validar mídia: {exc}"
        return result

    content_type = _content_type(response)
    final_url = str(response.url)
    result.update(
        {
            "final_url": final_url,
            "status_code": response.status_code,
            "content_type": content_type,
            "content_length": _content_length(response),
        }
    )

    if response.status_code not in {200, 206}:
        result["reason"] = "URL não retornou status HTTP válido para mídia."
        return result
    if content_type in {"text/html", "text/plain"}:
        result["reason"] = "URL retornou texto/HTML, não mídia de Avatar."
        return result
    if content_type in STATIC_IMAGE_CONTENT_TYPES or is_static_support_image_url(final_url):
        result["reason"] = "URL retornou imagem estática; use apenas como image_url de apoio visual."
        return result

    if expected_type == "video" and _is_valid_video(content_type, final_url):
        result.update({"valid": True, "media_type": "video", "reason": "Mídia validada com sucesso."})
        return result
    if expected_type == "gif" and _is_valid_gif(content_type, final_url):
        result.update({"valid": True, "media_type": "gif", "reason": "Mídia validada com sucesso."})
        return result
    if expected_type == "animation" and _is_valid_animation(content_type, final_url):
        result.update({"valid": True, "media_type": "animation", "reason": "Mídia validada com sucesso."})
        return result

    result["reason"] = "URL não retornou vídeo/GIF/animação válido para o tipo esperado."
    return result


def _head_then_range_get(client: httpx.Client, url: str, headers: dict[str, str]) -> httpx.Response:
    try:
        response = client.head(url, headers=headers)
    except Exception:  # noqa: BLE001
        return client.get(url, headers={**headers, "Range": "bytes=0-0"})
    if response.status_code in {403, 405, 501} or not _content_type(response):
        return client.get(url, headers={**headers, "Range": "bytes=0-0"})
    return response


def _content_type(response: httpx.Response) -> str | None:
    headers = getattr(response, "headers", {}) or {}
    value = headers.get("content-type", "").split(";", 1)[0].strip().lower()
    return value or None


def _content_length(response: httpx.Response) -> int | None:
    raw_length = response.headers.get("content-length")
    if raw_length and raw_length.isdigit():
        return int(raw_length)
    content_range = response.headers.get("content-range", "")
    match = re.search(r"/(\d+)$", content_range)
    if match:
        return int(match.group(1))
    return None


def _is_valid_video(content_type: str | None, final_url: str) -> bool:
    path = urlparse(final_url).path.lower()
    return bool(
        content_type in VIDEO_CONTENT_TYPES
        or (content_type == "application/octet-stream" and path.endswith(VIDEO_EXTENSIONS))
    )


def _is_valid_gif(content_type: str | None, final_url: str) -> bool:
    path = urlparse(final_url).path.lower()
    return bool(content_type == "image/gif" or (content_type == "application/octet-stream" and path.endswith(GIF_EXTENSIONS)))


def _is_valid_animation(content_type: str | None, final_url: str) -> bool:
    path = urlparse(final_url).path.lower()
    return bool(
        _is_valid_video(content_type, final_url)
        or content_type == "model/gltf+json"
        or (content_type == "application/octet-stream" and path.endswith((".glb", ".gltf")))
    )


def _is_http_url(url: str) -> bool:
    return url.startswith("http://") or url.startswith("https://")


def validate_remote_image_url(
    url: str,
    timeout_seconds: int = 15,
    user_agent: str = "LibrasLiveEdu-media-validator/1.0",
) -> dict[str, Any]:
    result = {
        "valid": False,
        "url": url,
        "final_url": url,
        "status_code": None,
        "content_type": None,
        "content_length": None,
        "media_type": "image",
        "can_use_avatar": False,
        "reason": "Validação não executada.",
    }

    if not _is_http_url(url):
        result["reason"] = "URL deve começar com http:// ou https://."
        return result

    headers = {"User-Agent": user_agent}
    try:
        with httpx.Client(timeout=timeout_seconds, follow_redirects=True) as client:
            response = _head_then_range_get(client, url, headers)
    except httpx.TimeoutException:
        result["reason"] = "Timeout ao validar a imagem remota."
        return result
    except httpx.RequestError as exc:
        result["reason"] = f"Erro de rede ao validar imagem: {exc}"
        return result
    except Exception as exc:  # noqa: BLE001
        result["reason"] = f"Erro inesperado ao validar imagem: {exc}"
        return result

    content_type = _content_type(response)
    final_url = str(response.url)
    result.update(
        {
            "final_url": final_url,
            "status_code": response.status_code,
            "content_type": content_type,
            "content_length": _content_length(response),
        }
    )

    if response.status_code not in {200, 206}:
        result["reason"] = "URL não retornou status HTTP válido para imagem."
        return result
    if content_type in STATIC_IMAGE_CONTENT_TYPES or urlparse(final_url).path.lower().endswith(STATIC_IMAGE_EXTENSIONS):
        result.update({"valid": True, "reason": "Imagem validada como apoio visual. Não serve para Avatar Libras."})
        return result

    result["reason"] = "URL não retornou imagem de apoio válida."
    return result
