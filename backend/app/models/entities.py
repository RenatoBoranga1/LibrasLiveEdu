from datetime import date, datetime
from enum import Enum
from typing import Any

from sqlalchemy import Boolean, Date, DateTime, Float, ForeignKey, Integer, JSON, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class UserRole(str, Enum):
    admin = "admin"
    professor = "professor"
    student = "student"
    curator = "curator"
    guardian = "guardian"


class ClassStatus(str, Enum):
    active = "active"
    paused = "paused"
    finished = "finished"


class TranslationStatus(str, Enum):
    success = "success"
    pending = "pending"
    fallback = "fallback"
    failed = "failed"
    unavailable = "unavailable"


class SignStatus(str, Enum):
    approved = "approved"
    pending = "pending"
    review = "review"
    rejected = "rejected"
    needs_specialist_review = "needs_specialist_review"


class ImportSourceType(str, Enum):
    csv = "csv"
    json = "json"
    api = "api"


class ImportStatus(str, Enum):
    pending = "pending"
    running = "running"
    completed = "completed"
    failed = "failed"


class User(TimestampMixin, Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(160), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(30), default=UserRole.student.value, nullable=False)
    birth_date: Mapped[date | None] = mapped_column(Date)
    guardian_email: Mapped[str | None] = mapped_column(String(255))
    school_name: Mapped[str | None] = mapped_column(String(220))
    accepted_terms_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    accepted_privacy_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    class_sessions: Mapped[list["ClassSession"]] = relationship(back_populates="teacher")
    saved_words: Mapped[list["SavedWord"]] = relationship(back_populates="user")
    consent_records: Mapped[list["ConsentRecord"]] = relationship(back_populates="user")


class SignCategory(TimestampMixin, Base):
    __tablename__ = "sign_categories"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(120), unique=True, nullable=False)
    description: Mapped[str | None] = mapped_column(Text)

    signs: Mapped[list["Sign"]] = relationship(back_populates="category")


class Subject(TimestampMixin, Base):
    __tablename__ = "subjects"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(120), unique=True, nullable=False)
    description: Mapped[str | None] = mapped_column(Text)

    signs: Mapped[list["Sign"]] = relationship(back_populates="subject")
    class_sessions: Mapped[list["ClassSession"]] = relationship(back_populates="subject")


class ClassSession(TimestampMixin, Base):
    __tablename__ = "class_sessions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    teacher_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    title: Mapped[str] = mapped_column(String(220), nullable=False)
    subject_id: Mapped[int | None] = mapped_column(ForeignKey("subjects.id"))
    access_code: Mapped[str] = mapped_column(String(24), unique=True, index=True, nullable=False)
    join_token: Mapped[str | None] = mapped_column(String(160), unique=True, index=True)
    join_token_expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    max_participants: Mapped[int] = mapped_column(Integer, default=60, nullable=False)
    allow_anonymous_students: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    require_teacher_approval: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    status: Mapped[str] = mapped_column(String(30), default=ClassStatus.active.value, nullable=False)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), server_default=func.now())
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    teacher: Mapped["User"] = relationship(back_populates="class_sessions")
    subject: Mapped["Subject"] = relationship(back_populates="class_sessions")
    transcript_segments: Mapped[list["TranscriptSegment"]] = relationship(back_populates="class_session")
    keywords: Mapped[list["KeywordDetected"]] = relationship(back_populates="class_session")
    summaries: Mapped[list["LessonSummary"]] = relationship(back_populates="class_session")
    saved_words: Mapped[list["SavedWord"]] = relationship(back_populates="class_session")


class TranscriptSegment(Base):
    __tablename__ = "transcript_segments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    class_session_id: Mapped[int] = mapped_column(ForeignKey("class_sessions.id"), nullable=False)
    original_text: Mapped[str] = mapped_column(Text, nullable=False)
    normalized_text: Mapped[str] = mapped_column(Text, nullable=False)
    confidence: Mapped[float | None] = mapped_column(Float)
    start_time: Mapped[float | None] = mapped_column(Float)
    end_time: Mapped[float | None] = mapped_column(Float)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    class_session: Mapped["ClassSession"] = relationship(back_populates="transcript_segments")
    translations: Mapped[list["LibrasTranslation"]] = relationship(back_populates="transcript_segment")
    keywords: Mapped[list["KeywordDetected"]] = relationship(back_populates="transcript_segment")


class LibrasTranslation(Base):
    __tablename__ = "libras_translations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    transcript_segment_id: Mapped[int] = mapped_column(ForeignKey("transcript_segments.id"), nullable=False)
    gloss_text: Mapped[str | None] = mapped_column(Text)
    avatar_video_url: Mapped[str | None] = mapped_column(String(500))
    animation_payload_url: Mapped[str | None] = mapped_column(String(500))
    translation_status: Mapped[str] = mapped_column(
        String(30), default=TranslationStatus.pending.value, nullable=False
    )
    provider: Mapped[str | None] = mapped_column(String(120))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    transcript_segment: Mapped["TranscriptSegment"] = relationship(back_populates="translations")


class Sign(TimestampMixin, Base):
    __tablename__ = "signs"
    __table_args__ = (
        UniqueConstraint("normalized_word", "gloss", "regionalism", name="uq_sign_word_gloss_region"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    word: Mapped[str] = mapped_column(String(180), nullable=False)
    normalized_word: Mapped[str] = mapped_column(String(180), index=True, nullable=False)
    gloss: Mapped[str | None] = mapped_column(String(220))
    description: Mapped[str | None] = mapped_column(Text)
    category_id: Mapped[int | None] = mapped_column(ForeignKey("sign_categories.id"))
    subject_id: Mapped[int | None] = mapped_column(ForeignKey("subjects.id"))
    image_url: Mapped[str | None] = mapped_column(String(500))
    video_url: Mapped[str | None] = mapped_column(String(500))
    avatar_animation_url: Mapped[str | None] = mapped_column(String(500))
    hand_configuration: Mapped[str | None] = mapped_column(String(220))
    movement_description: Mapped[str | None] = mapped_column(Text)
    facial_expression: Mapped[str | None] = mapped_column(String(220))
    example_sentence: Mapped[str | None] = mapped_column(Text)
    source_name: Mapped[str | None] = mapped_column(String(220))
    source_url: Mapped[str | None] = mapped_column(String(500))
    license: Mapped[str | None] = mapped_column(String(220))
    regionalism: Mapped[str | None] = mapped_column(String(120))
    status: Mapped[str] = mapped_column(String(30), default=SignStatus.pending.value, nullable=False)
    difficulty_level: Mapped[str | None] = mapped_column(String(60))
    curator_notes: Mapped[str | None] = mapped_column(Text)
    approved_by_user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"))
    approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    rejected_by_user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"))
    rejected_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    last_reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    review_due_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    is_regional: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    region: Mapped[str | None] = mapped_column(String(120))
    age_group_suitability: Mapped[str | None] = mapped_column(String(120))
    educational_notes: Mapped[str | None] = mapped_column(Text)
    risk_level: Mapped[str | None] = mapped_column(String(60))

    category: Mapped["SignCategory"] = relationship(back_populates="signs")
    subject: Mapped["Subject"] = relationship(back_populates="signs")
    keyword_detections: Mapped[list["KeywordDetected"]] = relationship(back_populates="sign")
    saved_words: Mapped[list["SavedWord"]] = relationship(back_populates="sign")
    audit_logs: Mapped[list["SignAuditLog"]] = relationship(back_populates="sign")


class KeywordDetected(Base):
    __tablename__ = "keywords_detected"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    class_session_id: Mapped[int] = mapped_column(ForeignKey("class_sessions.id"), nullable=False)
    transcript_segment_id: Mapped[int] = mapped_column(ForeignKey("transcript_segments.id"), nullable=False)
    word: Mapped[str] = mapped_column(String(180), nullable=False)
    normalized_word: Mapped[str] = mapped_column(String(180), index=True, nullable=False)
    sign_id: Mapped[int | None] = mapped_column(ForeignKey("signs.id"))
    confidence: Mapped[float | None] = mapped_column(Float)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    class_session: Mapped["ClassSession"] = relationship(back_populates="keywords")
    transcript_segment: Mapped["TranscriptSegment"] = relationship(back_populates="keywords")
    sign: Mapped["Sign"] = relationship(back_populates="keyword_detections")


class ImportJob(Base):
    __tablename__ = "import_jobs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    source_type: Mapped[str] = mapped_column(String(30), nullable=False)
    source_name: Mapped[str] = mapped_column(String(220), nullable=False)
    status: Mapped[str] = mapped_column(String(30), default=ImportStatus.pending.value, nullable=False)
    total_records: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    imported_records: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    updated_records: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    failed_records: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    logs: Mapped[list[dict[str, Any]]] = mapped_column(JSON, default=list, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class SavedWord(Base):
    __tablename__ = "saved_words"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    sign_id: Mapped[int] = mapped_column(ForeignKey("signs.id"), nullable=False)
    class_session_id: Mapped[int | None] = mapped_column(ForeignKey("class_sessions.id"))
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    user: Mapped["User"] = relationship(back_populates="saved_words")
    sign: Mapped["Sign"] = relationship(back_populates="saved_words")
    class_session: Mapped["ClassSession"] = relationship(back_populates="saved_words")


class LessonSummary(Base):
    __tablename__ = "lesson_summaries"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    class_session_id: Mapped[int] = mapped_column(ForeignKey("class_sessions.id"), nullable=False)
    summary_text: Mapped[str] = mapped_column(Text, nullable=False)
    keywords: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    class_session: Mapped["ClassSession"] = relationship(back_populates="summaries")


class ConsentRecord(Base):
    __tablename__ = "consent_records"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"))
    guardian_name: Mapped[str | None] = mapped_column(String(160))
    guardian_email: Mapped[str | None] = mapped_column(String(255))
    consent_type: Mapped[str] = mapped_column(String(80), nullable=False)
    consent_text_version: Mapped[str] = mapped_column(String(40), default="v1", nullable=False)
    accepted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    ip_address: Mapped[str | None] = mapped_column(String(80))
    user_agent: Mapped[str | None] = mapped_column(String(500))

    user: Mapped["User"] = relationship(back_populates="consent_records")


class DataRetentionPolicy(Base):
    __tablename__ = "data_retention_policies"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    entity_name: Mapped[str] = mapped_column(String(120), nullable=False)
    retention_days: Mapped[int] = mapped_column(Integer, nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class SignAuditLog(Base):
    __tablename__ = "sign_audit_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    sign_id: Mapped[int] = mapped_column(ForeignKey("signs.id"), nullable=False)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"))
    action: Mapped[str] = mapped_column(String(80), nullable=False)
    old_value: Mapped[dict[str, Any] | None] = mapped_column(JSON)
    new_value: Mapped[dict[str, Any] | None] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    sign: Mapped["Sign"] = relationship(back_populates="audit_logs")


class AccessLog(Base):
    __tablename__ = "access_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"))
    class_session_id: Mapped[int | None] = mapped_column(ForeignKey("class_sessions.id"))
    action: Mapped[str] = mapped_column(String(120), nullable=False)
    ip_address: Mapped[str | None] = mapped_column(String(80))
    user_agent: Mapped[str | None] = mapped_column(String(500))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
