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
        provider_result = await self.provider.translate(text)
        status = provider_result.get("status")

        gloss_text = provider_result.get("gloss_text")
        if not gloss_text:
            gloss_text = self._build_gloss_from_curated_terms(text)

        translation_status = TranslationStatus.success.value if status == "success" and gloss_text else status
        if not gloss_text and translation_status not in {TranslationStatus.failed.value, TranslationStatus.pending.value}:
            translation_status = TranslationStatus.unavailable.value

        translation = LibrasTranslation(
            transcript_segment_id=transcript_segment_id,
            gloss_text=gloss_text,
            avatar_video_url=provider_result.get("avatar_video_url"),
            animation_payload_url=provider_result.get("animation_payload_url"),
            translation_status=translation_status or TranslationStatus.pending.value,
            provider=provider_result.get("provider", "demo"),
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
