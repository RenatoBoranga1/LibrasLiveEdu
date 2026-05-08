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
    avatar_video_url: str | None = None
    avatar_gif_url: str | None = None
    avatar_animation_url: str | None = None
    example_sentence: str | None = None
    source_name: str | None = None
    source_url: str | None = None
    source_reference_url: str | None = None
    license: str | None = None
    license_notes: str | None = None
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
    avatar_gif_url: str | None = None
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


class InesMediaImportRequest(BaseModel):
    source: str = "inline-admin-import"
    source_type: str = Field(default="json", pattern="^(csv|json)$")
    download_media: bool = False
    overwrite_files: bool = False
    authorized: bool = False
    authorization_reference: str | None = None
    content: str | None = None
    records: list[dict[str, Any]] | None = None


class InesMediaImportItem(BaseModel):
    word: str | None = None
    gloss: str | None = None
    source_name: str | None = None
    source_url: str | None = None
    source_reference_url: str | None = None
    video_url: str | None = None
    avatar_video_url: str | None = None
    avatar_gif_url: str | None = None
    gif_url: str | None = None
    image_url: str | None = None
    license: str | None = None
    license_notes: str | None = None
    curator_notes: str | None = None
    authorized: bool = False
    example_sentence: str | None = None
    grammatical_class: str | None = None
    meaning: str | None = None


class InesMediaImportStartRequest(BaseModel):
    mode: str = Field(pattern="^(pending_words|selected_words|json_items|csv_items)$")
    words: list[str] = Field(default_factory=list)
    items: list[InesMediaImportItem] = Field(default_factory=list)
    csv: str = ""
    max_items: int | None = None
    approve_authorized: bool = False
    download_media: bool = False
    store_remote_url: bool = True
    overwrite: bool = False


class InesMediaImportReport(BaseModel):
    total_items: int = 0
    processed_items: int = 0
    created_count: int = 0
    updated_count: int = 0
    approved_count: int = 0
    pending_count: int = 0
    skipped_count: int = 0
    error_count: int = 0
    video_found_count: int = 0
    gif_found_count: int = 0
    image_found_count: int = 0
    video_missing_count: int = 0
    errors: list[dict[str, Any]] = Field(default_factory=list)
    warnings: list[dict[str, Any]] = Field(default_factory=list)
    items: list[dict[str, Any]] = Field(default_factory=list)
    manual_required: list[dict[str, Any]] = Field(default_factory=list)


class InesMediaImportJobResponse(BaseModel):
    job_id: int | None = None
    status: str
    report: InesMediaImportReport


class LibrasGifMediaItem(BaseModel):
    word: str
    gloss: str | None = None
    avatar_gif_url: str | None = None
    gif_url: str | None = None
    image_url: str | None = None
    source_name: str | None = None
    source_url: str | None = None
    source_reference_url: str | None = None
    license: str | None = None
    license_notes: str | None = None
    curator_notes: str | None = None
    authorized: bool = False


class LibrasGifMediaImportRequest(BaseModel):
    source_name: str = "IFPR Campus Umuarama - Libras GIFs"
    source_url: str = "https://ifpr.edu.br/umuarama/libras-gifs/"
    items: list[LibrasGifMediaItem] = Field(default_factory=list)
    approve_authorized: bool = False
    overwrite: bool = False


class InesMediaAutoPendingRequest(BaseModel):
    max_items: int | None = 10
    approve_authorized: bool = False
    overwrite: bool = False


class InesMediaAutoSelectedRequest(BaseModel):
    words: list[str] = Field(default_factory=list)
    max_items: int | None = 10
    approve_authorized: bool = False
    overwrite: bool = False


class InesMediaDiagnoseRequest(BaseModel):
    words: list[str] = Field(default_factory=list)
    max_items: int | None = None


class InesMediaDiagnoseResult(BaseModel):
    word: str
    normalized_word: str
    search_url: str
    http_status: int | None = None
    page_loaded: bool = False
    word_found_in_page: bool = False
    source_reference_url: str | None = None
    image_found: bool = False
    image_url: str | None = None
    video_found: bool = False
    video_url: str | None = None
    gif_found: bool = False
    gif_url: str | None = None
    media_type: str = "none"
    detection_method: str = "none"
    video_host_allowed: bool = False
    can_import: bool = False
    can_use_avatar: bool = False
    reason: str
    warnings: list[str] = Field(default_factory=list)
    errors: list[str] = Field(default_factory=list)


class InesMediaDiagnoseResponse(BaseModel):
    status: str
    total_items: int
    results: list[InesMediaDiagnoseResult]


class MediaAutoFillDiagnoseRequest(BaseModel):
    words: list[str] = Field(default_factory=list)
    max_items: int | None = 10
    source_priority: list[str] = Field(default_factory=lambda: ["ines", "ifpr"])


class MediaAutoFillPendingRequest(BaseModel):
    max_items: int | None = 10
    source_priority: list[str] = Field(default_factory=lambda: ["ines", "ifpr"])
    overwrite: bool = False


class MediaAutoFillSelectedRequest(BaseModel):
    words: list[str] = Field(default_factory=list)
    max_items: int | None = 10
    source_priority: list[str] = Field(default_factory=lambda: ["ines", "ifpr"])
    overwrite: bool = False


class MediaAutoFillReport(BaseModel):
    status: str = "completed"
    total_items: int = 0
    processed_items: int = 0
    media_found_count: int = 0
    video_found_count: int = 0
    gif_found_count: int = 0
    image_found_count: int = 0
    media_missing_count: int = 0
    created_count: int = 0
    updated_count: int = 0
    pending_count: int = 0
    skipped_count: int = 0
    error_count: int = 0
    items: list[dict[str, Any]] = Field(default_factory=list)
    warnings: list[dict[str, Any]] = Field(default_factory=list)
    errors: list[dict[str, Any]] = Field(default_factory=list)


class MediaAutoFillResponse(BaseModel):
    job_id: int | None = None
    status: str
    report: MediaAutoFillReport


class CrawlStartRequest(BaseModel):
    max_pages: int | None = 20
    delay_ms: int | None = None
    output: str | None = None
    dry_run: bool = False
    words: list[str] = Field(default_factory=list)


class CrawlJobResponse(BaseModel):
    job_id: int | None = None
    status: str
    report: dict[str, Any]
    manifest: dict[str, Any] | None = None


class MediaManifestImportRequest(BaseModel):
    source: str = "combined"
    manifest: dict[str, Any] = Field(default_factory=dict)
    approve_authorized: bool = False
    overwrite: bool = False


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
    no_video_signs: int = 0
    video_signs: int = 0
    gif_signs: int = 0
    pending_with_video_signs: int = 0
    pending_with_media_signs: int = 0
    approved_with_video_signs: int = 0
    ready_for_avatar_signs: int = 0
    needs_curation_signs: int = 0


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


class LiveSummaryRead(BaseModel):
    summary_text: str
    bullet_points: list[str] = Field(default_factory=list)
    keywords: list[str] = Field(default_factory=list)
    generated_by: str = "local_fallback"
    is_auto_generated: bool = True
    updated_at: datetime | None = None


class LiveSummaryEventRead(BaseModel):
    summaryText: str
    bulletPoints: list[str] = Field(default_factory=list)
    keywords: list[str] = Field(default_factory=list)
    generatedBy: str = "local_fallback"
    isAutoGenerated: bool = True
    updatedAt: str | None = None


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


class ManualSignCreate(BaseModel):
    word: str
    gloss: str | None = None
    example_sentence: str | None = None
    grammatical_class: str | None = None
    meaning: str | None = None
    handshape: str | None = None
    movement: str | None = None
    location: str | None = None
    orientation: str | None = None
    facial_expression: str | None = None
    source_name: str = "Dicionário da Língua Brasileira de Sinais - INES"
    source_url: str = "https://dicionario.ines.gov.br/"
    source_reference_url: str | None = "https://dicionario.ines.gov.br/"
    license: str = "Uso autorizado pelo INES/Governo para o projeto LibrasLive Edu"
    license_notes: str | None = "Vídeo autorizado para uso educacional no aplicativo LibrasLive Edu."
    image_url: str | None = None
    video_url: str | None = None
    avatar_video_url: str | None = None
    avatar_gif_url: str | None = None
    animation_payload_url: str | None = None
    curator_notes: str | None = "Sinal cadastrado com base no Dicionário INES e autorização de uso registrada."


class SignCurationRequest(BaseModel):
    status: str = Field(pattern="^(approved|pending|review|rejected|needs_specialist_review)$")
    curator_notes: str | None = None


class SignMediaUpdate(BaseModel):
    gloss: str | None = None
    source_name: str | None = None
    source_url: str | None = None
    source_reference_url: str | None = None
    license: str | None = None
    license_notes: str | None = None
    video_url: str | None = None
    avatar_video_url: str | None = None
    avatar_gif_url: str | None = None
    image_url: str | None = None
    curator_notes: str | None = None
