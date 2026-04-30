from sqlalchemy import case, func, select
from sqlalchemy.orm import Session

from app.models import Sign


class SignRepository:
    def __init__(self, db: Session):
        self.db = db

    def find_best_by_normalized_word(self, normalized_word: str) -> Sign | None:
        status_rank = case(
            (Sign.status == "approved", 0),
            (Sign.status == "review", 1),
            (Sign.status == "pending", 2),
            else_=3,
        )
        statement = (
            select(Sign)
            .where(Sign.normalized_word == normalized_word)
            .order_by(status_rank, Sign.updated_at.desc())
            .limit(1)
        )
        return self.db.scalar(statement)

    def search(
        self,
        word: str | None = None,
        category_id: int | None = None,
        subject_id: int | None = None,
        status: str | None = None,
        source_name: str | None = None,
        limit: int = 100,
    ) -> list[Sign]:
        statement = select(Sign).order_by(Sign.word.asc()).limit(limit)
        if word:
            statement = statement.where(Sign.normalized_word.contains(word))
        if category_id:
            statement = statement.where(Sign.category_id == category_id)
        if subject_id:
            statement = statement.where(Sign.subject_id == subject_id)
        if status:
            statement = statement.where(Sign.status == status)
        if source_name:
            statement = statement.where(Sign.source_name.contains(source_name))
        return list(self.db.scalars(statement))

    def stats_by_status(self) -> dict[str, int]:
        rows = self.db.execute(select(Sign.status, func.count(Sign.id)).group_by(Sign.status)).all()
        return {status: count for status, count in rows}
