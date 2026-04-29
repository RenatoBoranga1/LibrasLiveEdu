from sqlalchemy.orm import Session

from app.models import Sign
from app.repositories.sign_repository import SignRepository
from app.services.text_normalizer import TextNormalizerService


class SignDictionaryService:
    def __init__(self, db: Session):
        self.db = db
        self.normalizer = TextNormalizerService()
        self.repository = SignRepository(db)

    def find_for_word(self, word: str) -> Sign | None:
        return self.repository.find_best_by_normalized_word(self.normalizer.normalize_word(word))

    def build_card_payload(self, word: str) -> dict:
        sign = self.find_for_word(word)
        if not sign:
            return {
                "word": word,
                "status": "missing",
                "title": "Sinal ainda não cadastrado",
                "curation": "pending",
            }

        return {
            "id": sign.id,
            "word": sign.word,
            "status": sign.status,
            "gloss": sign.gloss,
            "imageUrl": sign.image_url,
            "videoUrl": sign.video_url,
            "avatarAnimationUrl": sign.avatar_animation_url,
            "sourceName": sign.source_name,
            "license": sign.license,
            "curation": "approved" if sign.status == "approved" else "pending",
        }
