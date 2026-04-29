"""initial schema

Revision ID: 0001_initial_schema
Revises:
Create Date: 2026-04-28
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0001_initial_schema"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(length=160), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("role", sa.String(length=30), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    op.create_table(
        "sign_categories",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("name"),
    )

    op.create_table(
        "subjects",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("name"),
    )

    op.create_table(
        "class_sessions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("teacher_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("title", sa.String(length=220), nullable=False),
        sa.Column("subject_id", sa.Integer(), sa.ForeignKey("subjects.id"), nullable=True),
        sa.Column("access_code", sa.String(length=12), nullable=False),
        sa.Column("status", sa.String(length=30), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.Column("finished_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_class_sessions_access_code", "class_sessions", ["access_code"], unique=True)

    op.create_table(
        "signs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("word", sa.String(length=180), nullable=False),
        sa.Column("normalized_word", sa.String(length=180), nullable=False),
        sa.Column("gloss", sa.String(length=220), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("category_id", sa.Integer(), sa.ForeignKey("sign_categories.id"), nullable=True),
        sa.Column("subject_id", sa.Integer(), sa.ForeignKey("subjects.id"), nullable=True),
        sa.Column("image_url", sa.String(length=500), nullable=True),
        sa.Column("video_url", sa.String(length=500), nullable=True),
        sa.Column("avatar_animation_url", sa.String(length=500), nullable=True),
        sa.Column("hand_configuration", sa.String(length=220), nullable=True),
        sa.Column("movement_description", sa.Text(), nullable=True),
        sa.Column("facial_expression", sa.String(length=220), nullable=True),
        sa.Column("example_sentence", sa.Text(), nullable=True),
        sa.Column("source_name", sa.String(length=220), nullable=True),
        sa.Column("source_url", sa.String(length=500), nullable=True),
        sa.Column("license", sa.String(length=220), nullable=True),
        sa.Column("regionalism", sa.String(length=120), nullable=True),
        sa.Column("status", sa.String(length=30), nullable=False),
        sa.Column("difficulty_level", sa.String(length=60), nullable=True),
        sa.Column("curator_notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("normalized_word", "gloss", "regionalism", name="uq_sign_word_gloss_region"),
    )
    op.create_index("ix_signs_normalized_word", "signs", ["normalized_word"], unique=False)

    op.create_table(
        "transcript_segments",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("class_session_id", sa.Integer(), sa.ForeignKey("class_sessions.id"), nullable=False),
        sa.Column("original_text", sa.Text(), nullable=False),
        sa.Column("normalized_text", sa.Text(), nullable=False),
        sa.Column("confidence", sa.Float(), nullable=True),
        sa.Column("start_time", sa.Float(), nullable=True),
        sa.Column("end_time", sa.Float(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    op.create_table(
        "libras_translations",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("transcript_segment_id", sa.Integer(), sa.ForeignKey("transcript_segments.id"), nullable=False),
        sa.Column("gloss_text", sa.Text(), nullable=True),
        sa.Column("avatar_video_url", sa.String(length=500), nullable=True),
        sa.Column("animation_payload_url", sa.String(length=500), nullable=True),
        sa.Column("translation_status", sa.String(length=30), nullable=False),
        sa.Column("provider", sa.String(length=120), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    op.create_table(
        "keywords_detected",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("class_session_id", sa.Integer(), sa.ForeignKey("class_sessions.id"), nullable=False),
        sa.Column("transcript_segment_id", sa.Integer(), sa.ForeignKey("transcript_segments.id"), nullable=False),
        sa.Column("word", sa.String(length=180), nullable=False),
        sa.Column("normalized_word", sa.String(length=180), nullable=False),
        sa.Column("sign_id", sa.Integer(), sa.ForeignKey("signs.id"), nullable=True),
        sa.Column("confidence", sa.Float(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_keywords_detected_normalized_word", "keywords_detected", ["normalized_word"], unique=False)

    op.create_table(
        "import_jobs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("source_type", sa.String(length=30), nullable=False),
        sa.Column("source_name", sa.String(length=220), nullable=False),
        sa.Column("status", sa.String(length=30), nullable=False),
        sa.Column("total_records", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("imported_records", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("updated_records", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("failed_records", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("logs", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("finished_at", sa.DateTime(timezone=True), nullable=True),
    )

    op.create_table(
        "saved_words",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("sign_id", sa.Integer(), sa.ForeignKey("signs.id"), nullable=False),
        sa.Column("class_session_id", sa.Integer(), sa.ForeignKey("class_sessions.id"), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    op.create_table(
        "lesson_summaries",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("class_session_id", sa.Integer(), sa.ForeignKey("class_sessions.id"), nullable=False),
        sa.Column("summary_text", sa.Text(), nullable=False),
        sa.Column("keywords", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("lesson_summaries")
    op.drop_table("saved_words")
    op.drop_table("import_jobs")
    op.drop_index("ix_keywords_detected_normalized_word", table_name="keywords_detected")
    op.drop_table("keywords_detected")
    op.drop_table("libras_translations")
    op.drop_table("transcript_segments")
    op.drop_index("ix_signs_normalized_word", table_name="signs")
    op.drop_table("signs")
    op.drop_index("ix_class_sessions_access_code", table_name="class_sessions")
    op.drop_table("class_sessions")
    op.drop_table("subjects")
    op.drop_table("sign_categories")
    op.drop_index("ix_users_email", table_name="users")
    op.drop_table("users")
