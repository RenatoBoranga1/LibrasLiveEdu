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

    def find_expression_in_text(self, text: str, max_words: int = 4) -> Sign | None:
        words = [word for word in text.replace(".", " ").replace(",", " ").split() if word.strip()]
        if len(words) < 2:
            return None
        max_size = min(max_words, len(words))
        for size in range(max_size, 1, -1):
            for start in range(0, len(words) - size + 1):
                phrase = " ".join(words[start : start + size])
                sign = self.find_for_word(phrase)
                if sign:
                    return sign
        return None

    def build_card_payload(self, word: str) -> dict:
        sign = self.find_for_word(word)
        if not sign:
            return {
                "word": word,
                "status": "unavailable",
                "title": "Sinal ainda não cadastrado",
                "curation": "pending",
            }

        approved = sign.status == "approved"
        pending_review = sign.status in {"pending", "review", "needs_specialist_review"}
        card_status = sign.status if approved else "pending" if pending_review else "unavailable"
        return {
            "id": sign.id,
            "word": sign.word,
            "status": card_status,
            "title": "Sinal aprovado" if approved else "Aguardando curadoria" if pending_review else "Sinal ainda não cadastrado",
            "gloss": sign.gloss if approved else None,
            "imageUrl": sign.image_url if approved else None,
            "videoUrl": sign.video_url if approved else None,
            "avatarVideoUrl": sign.video_url if approved else None,
            "avatarAnimationUrl": sign.avatar_animation_url if approved else None,
            "sourceName": sign.source_name if approved or pending_review else None,
            "sourceUrl": sign.source_url if approved or pending_review else None,
            "sourceReferenceUrl": _source_reference_url(sign) if approved or pending_review else None,
            "license": sign.license if approved or pending_review else None,
            "licenseNotes": _license_notes(sign) if approved or pending_review else None,
            "curation": "approved" if approved else "pending",
        }

    def build_card_payload_from_sign(self, sign: Sign) -> dict:
        approved = sign.status == "approved"
        pending_review = sign.status in {"pending", "review", "needs_specialist_review"}
        card_status = sign.status if approved else "pending" if pending_review else "unavailable"
        return {
            "id": sign.id,
            "word": sign.word,
            "status": card_status,
            "title": "Sinal aprovado" if approved else "Aguardando curadoria" if pending_review else "Sinal ainda não cadastrado",
            "gloss": sign.gloss if approved else None,
            "imageUrl": sign.image_url if approved else None,
            "videoUrl": sign.video_url if approved else None,
            "avatarVideoUrl": sign.video_url if approved else None,
            "avatarAnimationUrl": sign.avatar_animation_url if approved else None,
            "sourceName": sign.source_name if approved or pending_review else None,
            "sourceUrl": sign.source_url if approved or pending_review else None,
            "sourceReferenceUrl": _source_reference_url(sign) if approved or pending_review else None,
            "license": sign.license if approved or pending_review else None,
            "licenseNotes": _license_notes(sign) if approved or pending_review else None,
            "curation": "approved" if approved else "pending",
        }


def _metadata_value(sign: Sign, label: str) -> str | None:
    notes = sign.educational_notes or ""
    prefix = f"{label}:"
    for line in notes.splitlines():
        if line.strip().startswith(prefix):
            value = line.split(":", 1)[1].strip()
            return value or None
    return None


def _source_reference_url(sign: Sign) -> str | None:
    return _metadata_value(sign, "URL consultada") or sign.source_url


def _license_notes(sign: Sign) -> str | None:
    return _metadata_value(sign, "Observações de licença")
