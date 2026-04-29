from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import ClassSession, KeywordDetected, LessonSummary, TranscriptSegment
from app.services.keyword_extractor import KeywordExtractorService


class LessonSummaryService:
    def __init__(self, db: Session):
        self.db = db
        self.keyword_extractor = KeywordExtractorService()

    def create_summary(self, class_session_id: int) -> LessonSummary:
        segments = list(
            self.db.scalars(
                select(TranscriptSegment)
                .where(TranscriptSegment.class_session_id == class_session_id)
                .order_by(TranscriptSegment.created_at.asc())
            )
        )
        text = " ".join(segment.original_text for segment in segments)
        keywords = [str(item["word"]) for item in self.keyword_extractor.extract(text, limit=12)]

        class_session = self.db.get(ClassSession, class_session_id)
        title = class_session.title if class_session else "aula"
        if text:
            summary_text = (
                f"Resumo demo da aula '{title}': os principais pontos abordados foram "
                f"{', '.join(keywords[:6])}. Revise a transcricao completa e os cards visuais."
            )
        else:
            summary_text = (
                f"Resumo demo da aula '{title}': ainda nao ha transcricao suficiente para gerar um resumo."
            )

        summary = LessonSummary(
            class_session_id=class_session_id,
            summary_text=summary_text,
            keywords=keywords,
        )
        self.db.add(summary)
        self.db.flush()
        return summary

    def keyword_list(self, class_session_id: int) -> list[str]:
        rows = self.db.scalars(
            select(KeywordDetected.normalized_word)
            .where(KeywordDetected.class_session_id == class_session_id)
            .distinct()
        )
        return list(rows)
