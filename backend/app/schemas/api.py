from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class SubjectRead(BaseModel):
    id: int
    name: str
    description: str | None = None

    model_config = ConfigDict(from_attributes=True)


class SignCategoryRead(BaseModel):
    id: int
    name: str
    description: str | None = None

    model_config = ConfigDict(from_attributes=True)


class SignRead(BaseModel):
    id: int
    word: str
    normalized_word: str
    gloss: str | None = None
    description: str | None = None
    category_id: int | None = None
    subject_id: int | None = None
    image_url: str | None = None
    video_url: str | None = None
    avatar_animation_url: str | None = None
    example_sentence: str | None = None
    source_name: str | None = None
    source_url: str | None = None
    license: str | None = None
    regionalism: str | None = None
    status: str
    difficulty_level: str | None = None
    curator_notes: str | None = None

    model_config = ConfigDict(from_attributes=True)


class SignUpdate(BaseModel):
    gloss: str | None = None
    description: str | None = None
    image_url: str | None = None
    video_url: str | None = None
    avatar_animation_url: str | None = None
    hand_configuration: str | None = None
    movement_description: str | None = None
    facial_expression: str | None = None
    example_sentence: str | None = None
    regionalism: str | None = None
    status: str | None = Field(default=None, pattern="^(approved|pending|review|rejected)$")
    difficulty_level: str | None = None
    curator_notes: str | None = None


class ClassSessionCreate(BaseModel):
    title: str
    subject_id: int | None = None
    teacher_name: str = "Professor Demo"
    teacher_email: str = "professor.demo@libraslive.local"


class ClassSessionRead(BaseModel):
    id: int
    title: str
    subject_id: int | None
    access_code: str
    status: str
    started_at: datetime | None
    finished_at: datetime | None

    model_config = ConfigDict(from_attributes=True)


class TranscriptInput(BaseModel):
    text: str
    confidence: float | None = 0.98
    start_time: float | None = None
    end_time: float | None = None


class LiveEvent(BaseModel):
    event: str
    payload: dict[str, Any]


class ImportRequest(BaseModel):
    source: str
    source_type: str = Field(pattern="^(csv|json|api)$")
    provider_name: str | None = None


class ImportJobRead(BaseModel):
    id: int
    source_type: str
    source_name: str
    status: str
    total_records: int
    imported_records: int
    updated_records: int
    failed_records: int
    logs: list[dict[str, Any]]
    created_at: datetime
    finished_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class AdminStats(BaseModel):
    total_signs: int
    approved_signs: int
    pending_signs: int
    rejected_signs: int
    review_signs: int
    import_jobs: int


class SavedWordCreate(BaseModel):
    user_email: str = "aluno.demo@libraslive.local"
    user_name: str = "Aluno Demo"
    sign_id: int | None = None
    word: str | None = None
    class_session_id: int | None = None
    access_code: str | None = None
    notes: str | None = None


class LessonSummaryRead(BaseModel):
    id: int
    class_session_id: int
    summary_text: str
    keywords: list[str]
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
