from collections import OrderedDict
from datetime import datetime
import json

import httpx
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models import LessonSummary, TranscriptSegment
from app.services.keyword_extractor import KeywordExtractorService


class LiveLessonSummaryService:
    """Live pedagogical summary service.

    The production-safe default is local fallback. External AI providers can be
    connected here later without blocking the live class flow.
    """

    def __init__(self, db: Session):
        self.db = db
        self.settings = get_settings()
        self.keyword_extractor = KeywordExtractorService()

    def generate_live_summary(self, class_session_id: int) -> dict:
        segments = self._recent_unique_segments(class_session_id)
        if (
            self.settings.ai_summary_enabled
            and self.settings.ai_provider != "local"
            and self.settings.ai_api_key
            and self.settings.ai_model
        ):
            try:
                return self._generate_with_ai(class_session_id, segments)
            except Exception:  # noqa: BLE001
                return self._generate_local_fallback(class_session_id, segments, generated_by="local_fallback")
        return self._generate_local_fallback(class_session_id, segments, generated_by="local_fallback")

    def latest_summary(self, class_session_id: int) -> dict | None:
        summary = self.db.scalar(
            select(LessonSummary)
            .where(LessonSummary.class_session_id == class_session_id)
            .order_by(LessonSummary.created_at.desc())
            .limit(1)
        )
        if not summary:
            return None
        return {
            "summary_text": summary.summary_text,
            "bullet_points": self._bullet_points_from_text(summary.summary_text),
            "keywords": summary.keywords,
            "generated_by": "local_fallback",
            "is_auto_generated": True,
            "updated_at": summary.created_at,
        }

    def _recent_unique_segments(self, class_session_id: int) -> list[str]:
        max_segments = max(10, min(self.settings.summary_max_segments, 20))
        rows = list(
            self.db.scalars(
                select(TranscriptSegment)
                .where(TranscriptSegment.class_session_id == class_session_id)
                .order_by(TranscriptSegment.created_at.desc())
                .limit(max_segments * 2)
            )
        )
        unique: OrderedDict[str, None] = OrderedDict()
        for segment in reversed(rows):
            text = " ".join(segment.original_text.split())
            if text:
                unique[text] = None
        return list(unique.keys())[-max_segments:]

    def _generate_with_ai(self, class_session_id: int, segments: list[str]) -> dict:
        if self.settings.ai_provider.lower() not in {"openai", "openai_compatible"}:
            return self._generate_local_fallback(class_session_id, segments, generated_by="local_fallback")
        if not segments:
            return self._generate_local_fallback(class_session_id, segments, generated_by="local_fallback")

        prompt = (
            "Gere um resumo pedagógico curto, em português do Brasil, para apoio de acessibilidade. "
            "Não trate o resumo como documento oficial. Responda somente em JSON com as chaves "
            "summary_text, bullet_points e keywords.\n\n"
            f"Trechos recentes da aula:\n{chr(10).join(f'- {segment}' for segment in segments)}"
        )
        headers = {
            "Authorization": f"Bearer {self.settings.ai_api_key}",
            "Content-Type": "application/json",
        }
        body = {
            "model": self.settings.ai_model,
            "temperature": 0.2,
            "response_format": {"type": "json_object"},
            "messages": [
                {
                    "role": "system",
                    "content": "Você resume aulas para acessibilidade educacional sem inventar fatos.",
                },
                {"role": "user", "content": prompt},
            ],
        }
        with httpx.Client(timeout=12) as client:
            response = client.post(self.settings.ai_api_url, json=body, headers=headers)
            response.raise_for_status()
            payload = response.json()

        content = payload["choices"][0]["message"]["content"]
        parsed = json.loads(content)
        summary_text = str(parsed.get("summary_text") or "").strip()
        bullet_points = [str(item).strip() for item in parsed.get("bullet_points", []) if str(item).strip()][:5]
        keywords = [str(item).strip().lower() for item in parsed.get("keywords", []) if str(item).strip()][:10]
        if not summary_text:
            return self._generate_local_fallback(class_session_id, segments, generated_by="local_fallback")

        summary = LessonSummary(
            class_session_id=class_session_id,
            summary_text=summary_text,
            keywords=keywords,
        )
        self.db.add(summary)
        self.db.flush()
        self.db.refresh(summary)
        return {
            "summary_text": summary.summary_text,
            "bullet_points": bullet_points or self._compact_bullets(segments[-5:]),
            "keywords": summary.keywords,
            "generated_by": self.settings.ai_provider.lower(),
            "is_auto_generated": True,
            "updated_at": summary.created_at or datetime.utcnow(),
        }

    def _generate_local_fallback(self, class_session_id: int, segments: list[str], generated_by: str) -> dict:
        min_segments = max(1, self.settings.summary_min_segments)
        text = " ".join(segments)
        keywords = [str(item["word"]) for item in self.keyword_extractor.extract(text, limit=10)] if text else []
        if len(segments) < min_segments:
            summary_text = "Ainda há poucos trechos para um resumo confiável. Acompanhe a legenda ao vivo."
            bullet_points = segments[-3:] or ["A aula está começando e a legenda continuará atualizando este resumo."]
        else:
            relevant = segments[-5:]
            summary_text = (
                "Resumo automático de apoio: a aula abordou "
                f"{', '.join(keywords[:5]) if keywords else 'os principais pontos recentes'} "
                "com base nos trechos mais recentes da transcrição."
            )
            bullet_points = self._compact_bullets(relevant)

        summary = LessonSummary(
            class_session_id=class_session_id,
            summary_text=summary_text,
            keywords=keywords,
        )
        self.db.add(summary)
        self.db.flush()
        self.db.refresh(summary)
        return {
            "summary_text": summary.summary_text,
            "bullet_points": bullet_points,
            "keywords": summary.keywords,
            "generated_by": generated_by,
            "is_auto_generated": True,
            "updated_at": summary.created_at or datetime.utcnow(),
        }

    def _compact_bullets(self, segments: list[str]) -> list[str]:
        bullets: list[str] = []
        for text in segments:
            compact = text.strip()
            if len(compact) > 150:
                compact = f"{compact[:147].rstrip()}..."
            bullets.append(compact)
        return bullets[:5]

    def _bullet_points_from_text(self, text: str) -> list[str]:
        if not text:
            return []
        return self._compact_bullets([part.strip() for part in text.split(".") if part.strip()][:4])


LessonSummaryAIService = LiveLessonSummaryService
