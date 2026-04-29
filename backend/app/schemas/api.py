from datetime import date, datetime
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
    approved_by_user_id: int | None = None
    approved_at: datetime | None = None
    rejected_by_user_id: int | None = None
    rejected_at: datetime | None = None
    version: int = 1
    last_reviewed_at: datetime | None = None
    review_due_at: datetime | None = None
    is_regional: bool = False
    region: str | None = None
    age_group_suitability: str | None = None
    educational_notes: str | None = None
    risk_level: str | None = None

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
    is_regional: bool | None = None
    region: str | None = None
    age_group_suitability: str | None = None
    educational_notes: str | None = None
    risk_level: str | None = None
    status: str | None = Field(default=None, pattern="^(approved|pending|review|rejected|needs_specialist_review)$")
    difficulty_level: str | None = None
    curator_notes: str | None = None


class ClassSessionCreate(BaseModel):
    title: str
    subject_id: int | None = None
    teacher_name: str = "Professor Demo"
    teacher_email: str = "professor.demo@libraslive.local"
    max_participants: int = 60
    allow_anonymous_students: bool = True
    require_teacher_approval: bool = False


class ClassSessionRead(BaseModel):
    id: int
    title: str
    subject_id: int | None
    access_code: str
    join_token: str | None = None
    join_token_expires_at: datetime | None = None
    max_participants: int = 60
    allow_anonymous_students: bool = True
    require_teacher_approval: bool = False
    status: str
    started_at: datetime | None
    finished_at: datetime | None

    model_config = ConfigDict(from_attributes=True)


class ClassSessionPublicRead(BaseModel):
    id: int
    title: str
    subject_id: int | None
    access_code: str
    max_participants: int = 60
    allow_anonymous_students: bool = True
    require_teacher_approval: bool = False
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


class UserRead(BaseModel):
    id: int
    name: str
    email: str
    role: str
    guardian_email: str | None = None
    school_name: str | None = None
    accepted_terms_at: datetime | None = None
    accepted_privacy_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str = Field(min_length=8)
    role: str = Field(default="student", pattern="^(admin|professor|student|curator|guardian)$")
    birth_date: date | None = None
    guardian_email: str | None = None
    school_name: str | None = None
    accept_terms: bool = True
    accept_privacy: bool = True


class LoginRequest(BaseModel):
    email: str
    password: str


class RefreshRequest(BaseModel):
    refresh_token: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserRead


class ConsentRequest(BaseModel):
    guardian_name: str | None = None
    guardian_email: str | None = None
    consent_type: str = "educational_accessibility"
    consent_text_version: str = "v1"


class ConsentRevokeRequest(BaseModel):
    consent_type: str = "educational_accessibility"


class RejectSignRequest(BaseModel):
    reason: str
