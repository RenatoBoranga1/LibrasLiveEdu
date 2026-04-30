from sqlalchemy.orm import Session

from app.models import LibrasTranslation, TranslationStatus
from app.providers.vlibras import VLibrasProvider
from app.services.keyword_extractor import KeywordExtractorService
from app.services.sign_dictionary import SignDictionaryService


class LibrasTranslationService:
    def __init__(self, db: Session):
        self.db = db
        self.provider = VLibrasProvider()
        self.keyword_extractor = KeywordExtractorService()
        self.dictionary = SignDictionaryService(db)

    async def create_translation(self, transcript_segment_id: int, text: str) -> LibrasTranslation:
        try:
            provider_result = await self.provider.translate(text)
        except Exception:  # noqa: BLE001
            provider_result = {
                "status": TranslationStatus.fallback.value,
                "provider_name": "VLibras",
                "provider_configured": self.provider.configured,
                "gloss_text": None,
                "avatar_video_url": None,
                "animation_payload_url": None,
                "warning_message": "Provedor de avatar Libras indisponível. Exibindo legenda e glosa de apoio.",
            }
        status = provider_result.get("status") or TranslationStatus.fallback.value

        gloss_text = provider_result.get("gloss_text")
        if not gloss_text:
            gloss_text = self._build_gloss_from_curated_terms(text)

        has_avatar = bool(provider_result.get("avatar_video_url") or provider_result.get("animation_payload_url"))
        translation_status = status
        if status == TranslationStatus.success.value and not (gloss_text or has_avatar):
            translation_status = TranslationStatus.fallback.value

        translation = LibrasTranslation(
            transcript_segment_id=transcript_segment_id,
            gloss_text=gloss_text,
            avatar_video_url=provider_result.get("avatar_video_url"),
            animation_payload_url=provider_result.get("animation_payload_url"),
            translation_status=translation_status or TranslationStatus.pending.value,
            provider=provider_result.get("provider_name") or provider_result.get("provider", "VLibras"),
        )
        provider_configured = bool(provider_result.get("provider_configured"))
        translation.provider_configured = provider_configured
        translation.warning_message = provider_result.get("warning_message") or (
            "Provedor de avatar Libras não configurado. Exibindo legenda e glosa de apoio."
            if not provider_configured
            else "Provedor de avatar não retornou mídia para este trecho. Exibindo legenda e apoio visual."
        )
        self.db.add(translation)
        self.db.flush()
        return translation

    def _build_gloss_from_curated_terms(self, text: str) -> str | None:
        glosses: list[str] = []
        for item in self.keyword_extractor.extract(text, limit=6):
            sign = self.dictionary.find_for_word(str(item["word"]))
            if sign and sign.status == "approved" and sign.gloss:
                glosses.append(sign.gloss)
        return " ".join(glosses) if glosses else None
