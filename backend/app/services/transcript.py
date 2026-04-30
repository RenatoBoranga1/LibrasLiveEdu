from datetime import timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.security import utc_now
from app.models import ClassSession, KeywordDetected, LessonSummary, TranscriptSegment
from app.services.keyword_extractor import KeywordExtractorService
from app.services.lesson_summary_ai import LiveLessonSummaryService
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
        self.summary = LiveLessonSummaryService(db)

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
                "status": translation.translation_status,
                "glossText": translation.gloss_text,
                "avatarVideoUrl": translation.avatar_video_url,
                "animationPayloadUrl": translation.animation_payload_url,
                "translationStatus": translation.translation_status,
                "provider": translation.provider,
                "providerName": translation.provider,
                "providerConfigured": getattr(translation, "provider_configured", False),
                "warningMessage": getattr(translation, "warning_message", None),
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

        await self._maybe_emit_live_summary(class_session, events)
        self.db.commit()
        return events

    async def _maybe_emit_live_summary(self, class_session: ClassSession, events: list[dict]) -> None:
        try:
            segment_count = self.db.scalar(
                select(func.count(TranscriptSegment.id)).where(TranscriptSegment.class_session_id == class_session.id)
            ) or 0
            if segment_count < self.summary.settings.summary_min_segments:
                return

            latest_summary = self.db.scalar(
                select(LessonSummary)
                .where(LessonSummary.class_session_id == class_session.id)
                .order_by(LessonSummary.created_at.desc())
                .limit(1)
            )
            if latest_summary and latest_summary.created_at:
                latest_at = latest_summary.created_at
                if latest_at.tzinfo is None:
                    latest_at = latest_at.replace(tzinfo=timezone.utc)
                elapsed = (utc_now() - latest_at).total_seconds()
                if elapsed < self.summary.settings.summary_interval_seconds:
                    return

            summary = self.summary.generate_live_summary(class_session.id)
            payload = {
                "summaryText": summary.get("summary_text", ""),
                "bulletPoints": summary.get("bullet_points", []),
                "keywords": summary.get("keywords", []),
                "generatedBy": summary.get("generated_by", "local_fallback"),
                "isAutoGenerated": summary.get("is_auto_generated", True),
                "updatedAt": summary.get("updated_at").isoformat()
                if hasattr(summary.get("updated_at"), "isoformat")
                else summary.get("updated_at"),
            }
            await websocket_manager.broadcast(class_session.access_code, "summary.updated", payload)
            events.append({"event": "summary.updated", "payload": payload})
        except Exception:
            return
