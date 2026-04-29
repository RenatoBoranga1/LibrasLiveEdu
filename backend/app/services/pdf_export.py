from io import BytesIO

from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import ClassSession, KeywordDetected, LessonSummary, SavedWord, Sign, TranscriptSegment


ACCESSIBILITY_NOTE = (
    "Esta ferramenta e um recurso de apoio a acessibilidade e a inclusao educacional. "
    "Ela nao substitui interpretes humanos de Libras em situacoes formais, mas oferece "
    "suporte complementar por meio de legenda em tempo real, avatar em Libras e recursos visuais."
)


class PdfExportService:
    def __init__(self, db: Session):
        self.db = db

    def export_class_session(self, class_session_id: int) -> bytes:
        class_session = self.db.get(ClassSession, class_session_id)
        if not class_session:
            raise ValueError("Aula nao encontrada.")

        segments = list(
            self.db.scalars(
                select(TranscriptSegment)
                .where(TranscriptSegment.class_session_id == class_session_id)
                .order_by(TranscriptSegment.created_at.asc())
            )
        )
        summary = self.db.scalar(
            select(LessonSummary)
            .where(LessonSummary.class_session_id == class_session_id)
            .order_by(LessonSummary.created_at.desc())
            .limit(1)
        )
        keywords = list(
            self.db.scalars(
                select(KeywordDetected.normalized_word)
                .where(KeywordDetected.class_session_id == class_session_id)
                .distinct()
            )
        )
        saved_words = list(
            self.db.scalars(
                select(Sign.word)
                .join(SavedWord, SavedWord.sign_id == Sign.id)
                .where(SavedWord.class_session_id == class_session_id)
                .distinct()
            )
        )

        buffer = BytesIO()
        page = canvas.Canvas(buffer, pagesize=A4)
        width, height = A4
        y = height - 56
        page.setFont("Helvetica-Bold", 16)
        page.drawString(48, y, f"LibrasLive Edu - {class_session.title}")
        y -= 28
        page.setFont("Helvetica", 10)
        page.drawString(48, y, f"Disciplina: {class_session.subject.name if class_session.subject else 'Nao informada'}")
        y -= 14
        page.drawString(48, y, f"Professor: {class_session.teacher.name if class_session.teacher else 'Nao informado'}")
        y -= 14
        page.drawString(48, y, f"Data: {class_session.started_at or class_session.created_at}")
        y -= 14
        page.drawString(48, y, f"Codigo da sala: {class_session.access_code}")
        y -= 24
        y = self._draw_wrapped(page, "Observacao de acessibilidade: " + ACCESSIBILITY_NOTE, 48, y, width - 96)
        y -= 16
        if summary:
            page.setFont("Helvetica-Bold", 12)
            page.drawString(48, y, "Resumo")
            y -= 16
            y = self._draw_wrapped(page, summary.summary_text, 48, y, width - 96)
            y -= 16

        page.setFont("Helvetica-Bold", 12)
        page.drawString(48, y, "Palavras-chave")
        y -= 16
        page.setFont("Helvetica", 10)
        y = self._draw_wrapped(page, ", ".join(keywords) if keywords else "Nenhuma palavra-chave registrada.", 48, y, width - 96)
        y -= 12

        page.setFont("Helvetica-Bold", 12)
        page.drawString(48, y, "Palavras salvas")
        y -= 16
        page.setFont("Helvetica", 10)
        y = self._draw_wrapped(page, ", ".join(saved_words) if saved_words else "Nenhuma palavra salva registrada.", 48, y, width - 96)
        y -= 16

        page.setFont("Helvetica-Bold", 12)
        page.drawString(48, y, "Transcricao")
        y -= 16
        page.setFont("Helvetica", 10)
        for segment in segments:
            if y < 80:
                page.showPage()
                y = height - 56
                page.setFont("Helvetica", 10)
            y = self._draw_wrapped(page, f"- {segment.original_text}", 48, y, width - 96)
            y -= 8

        page.save()
        return buffer.getvalue()

    def _draw_wrapped(self, page: canvas.Canvas, text: str, x: int, y: float, max_width: float) -> float:
        words = text.split()
        line = ""
        for word in words:
            candidate = f"{line} {word}".strip()
            if page.stringWidth(candidate, "Helvetica", 10) > max_width:
                page.drawString(x, y, line)
                y -= 14
                line = word
            else:
                line = candidate
        if line:
            page.drawString(x, y, line)
            y -= 14
        return y
