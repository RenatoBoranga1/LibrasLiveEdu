from sqlalchemy.orm import Session

from app.models import ClassSession, KeywordDetected, TranscriptSegment
from app.services.keyword_extractor import KeywordExtractorService
from app.services.libras_translation import LibrasTranslationService
from app.services.sign_dictionary import SignDictionaryService
from app.services.text_normalizer import TextNormalizerService
from app.websocket.manager import websocket_manager


class TranscriptService:
    def __init__(self, db: Session):
        self.db = db
        self.normalizer = TextNormalizerService()
        self.keyword_extractor = KeywordExtractorService()
        self.dictionary = SignDictionaryService(db)
        self.translation = LibrasTranslationService(db)

    async def process_text(
        self,
        class_session: ClassSession,
        text: str,
        confidence: float | None = 0.98,
        start_time: float | None = None,
        end_time: float | None = None,
    ) -> list[dict]:
        events: list[dict] = []
        for block in self.normalizer.split_long_sentences(text):
            normalized = self.normalizer.normalize(block)
            segment = TranscriptSegment(
                class_session_id=class_session.id,
                original_text=block,
                normalized_text=normalized,
                confidence=confidence,
                start_time=start_time,
                end_time=end_time,
            )
            self.db.add(segment)
            self.db.flush()

            segment_payload = {
                "id": segment.id,
                "classSessionId": class_session.id,
                "originalText": segment.original_text,
                "normalizedText": segment.normalized_text,
                "confidence": segment.confidence,
            }
            await websocket_manager.broadcast(
                class_session.access_code,
                "transcript.segment.created",
                segment_payload,
            )
            events.append({"event": "transcript.segment.created", "payload": segment_payload})

            translation = await self.translation.create_translation(segment.id, block)
            translation_payload = {
                "id": translation.id,
                "transcriptSegmentId": segment.id,
                "glossText": translation.gloss_text,
                "avatarVideoUrl": translation.avatar_video_url,
                "animationPayloadUrl": translation.animation_payload_url,
                "translationStatus": translation.translation_status,
                "provider": translation.provider,
            }
            await websocket_manager.broadcast(class_session.access_code, "translation.created", translation_payload)
            events.append({"event": "translation.created", "payload": translation_payload})

            keyword_payloads = []
            card_payloads = []
            for item in self.keyword_extractor.extract(block):
                normalized_word = str(item["word"])
                sign = self.dictionary.find_for_word(normalized_word)
                keyword = KeywordDetected(
                    class_session_id=class_session.id,
                    transcript_segment_id=segment.id,
                    word=normalized_word,
                    normalized_word=normalized_word,
                    sign_id=sign.id if sign else None,
                    confidence=float(item["confidence"]),
                )
                self.db.add(keyword)
                self.db.flush()
                keyword_payloads.append(
                    {
                        "id": keyword.id,
                        "word": keyword.word,
                        "normalizedWord": keyword.normalized_word,
                        "signId": keyword.sign_id,
                        "confidence": keyword.confidence,
                    }
                )
                card_payloads.append(self.dictionary.build_card_payload(normalized_word))

            await websocket_manager.broadcast(
                class_session.access_code,
                "keywords.detected",
                {"items": keyword_payloads},
            )
            await websocket_manager.broadcast(
                class_session.access_code,
                "sign.card.created",
                {"items": card_payloads},
            )
            events.append({"event": "keywords.detected", "payload": {"items": keyword_payloads}})
            events.append({"event": "sign.card.created", "payload": {"items": card_payloads}})

        self.db.commit()
        return events
