from typing import Any

import httpx

from app.core.config import get_settings


class VLibrasProvider:
    """Integration point for an authorized VLibras/API provider.

    Keep this adapter conservative: if no authorized endpoint is configured,
    the service reports unavailability and the app falls back to captions/cards.
    """

    def __init__(self) -> None:
        self.settings = get_settings()

    @property
    def configured(self) -> bool:
        return bool(self.settings.vlibras_api_url)

    async def translate(self, text: str) -> dict[str, Any]:
        if not self.configured:
            return {
                "status": "fallback",
                "provider": "VLibras",
                "provider_name": "VLibras",
                "provider_configured": False,
                "gloss_text": None,
                "avatar_video_url": None,
                "animation_payload_url": None,
                "warning_message": "Provedor de avatar Libras não configurado. Exibindo legenda e glosa de apoio.",
            }

        headers = {}
        if self.settings.vlibras_api_key:
            headers["Authorization"] = f"Bearer {self.settings.vlibras_api_key}"

        async with httpx.AsyncClient(timeout=20) as client:
            response = await client.post(
                self.settings.vlibras_api_url,
                json={"text": text},
                headers=headers,
            )
            response.raise_for_status()
            payload = response.json()
            return {
                "status": payload.get("status", "success"),
                "provider": "VLibras",
                "provider_name": "VLibras",
                "provider_configured": True,
                "gloss_text": payload.get("gloss_text"),
                "avatar_video_url": payload.get("avatar_video_url"),
                "animation_payload_url": payload.get("animation_payload_url"),
                "warning_message": payload.get("warning_message"),
            }
