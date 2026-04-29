"""security privacy curatorship

Revision ID: 0002_security_privacy_curatorship
Revises: 0001_initial_schema
Create Date: 2026-04-29
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0002_security_privacy_curatorship"
down_revision: Union[str, None] = "0001_initial_schema"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("birth_date", sa.Date(), nullable=True))
    op.add_column("users", sa.Column("guardian_email", sa.String(length=255), nullable=True))
    op.add_column("users", sa.Column("school_name", sa.String(length=220), nullable=True))
    op.add_column("users", sa.Column("accepted_terms_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("users", sa.Column("accepted_privacy_at", sa.DateTime(timezone=True), nullable=True))

    op.alter_column("class_sessions", "access_code", type_=sa.String(length=24))
    op.add_column("class_sessions", sa.Column("join_token", sa.String(length=160), nullable=True))
    op.add_column("class_sessions", sa.Column("join_token_expires_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("class_sessions", sa.Column("max_participants", sa.Integer(), nullable=False, server_default="60"))
    op.add_column("class_sessions", sa.Column("allow_anonymous_students", sa.Boolean(), nullable=False, server_default=sa.true()))
    op.add_column("class_sessions", sa.Column("require_teacher_approval", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.create_index("ix_class_sessions_join_token", "class_sessions", ["join_token"], unique=True)

    op.add_column("signs", sa.Column("approved_by_user_id", sa.Integer(), nullable=True))
    op.add_column("signs", sa.Column("approved_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("signs", sa.Column("rejected_by_user_id", sa.Integer(), nullable=True))
    op.add_column("signs", sa.Column("rejected_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("signs", sa.Column("version", sa.Integer(), nullable=False, server_default="1"))
    op.add_column("signs", sa.Column("last_reviewed_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("signs", sa.Column("review_due_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("signs", sa.Column("is_regional", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column("signs", sa.Column("region", sa.String(length=120), nullable=True))
    op.add_column("signs", sa.Column("age_group_suitability", sa.String(length=120), nullable=True))
    op.add_column("signs", sa.Column("educational_notes", sa.Text(), nullable=True))
    op.add_column("signs", sa.Column("risk_level", sa.String(length=60), nullable=True))
    op.create_foreign_key("fk_signs_approved_by_user_id", "signs", "users", ["approved_by_user_id"], ["id"])
    op.create_foreign_key("fk_signs_rejected_by_user_id", "signs", "users", ["rejected_by_user_id"], ["id"])

    op.create_table(
        "consent_records",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("guardian_name", sa.String(length=160), nullable=True),
        sa.Column("guardian_email", sa.String(length=255), nullable=True),
        sa.Column("consent_type", sa.String(length=80), nullable=False),
        sa.Column("consent_text_version", sa.String(length=40), nullable=False, server_default="v1"),
        sa.Column("accepted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("ip_address", sa.String(length=80), nullable=True),
        sa.Column("user_agent", sa.String(length=500), nullable=True),
    )
    op.create_table(
        "data_retention_policies",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("entity_name", sa.String(length=120), nullable=False),
        sa.Column("retention_days", sa.Integer(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.true()),
    )
    op.create_table(
        "sign_audit_logs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("sign_id", sa.Integer(), sa.ForeignKey("signs.id"), nullable=False),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("action", sa.String(length=80), nullable=False),
        sa.Column("old_value", sa.JSON(), nullable=True),
        sa.Column("new_value", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_table(
        "access_logs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("class_session_id", sa.Integer(), sa.ForeignKey("class_sessions.id"), nullable=True),
        sa.Column("action", sa.String(length=120), nullable=False),
        sa.Column("ip_address", sa.String(length=80), nullable=True),
        sa.Column("user_agent", sa.String(length=500), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("access_logs")
    op.drop_table("sign_audit_logs")
    op.drop_table("data_retention_policies")
    op.drop_table("consent_records")
    op.drop_constraint("fk_signs_rejected_by_user_id", "signs", type_="foreignkey")
    op.drop_constraint("fk_signs_approved_by_user_id", "signs", type_="foreignkey")
    for column in [
        "risk_level",
        "educational_notes",
        "age_group_suitability",
        "region",
        "is_regional",
        "review_due_at",
        "last_reviewed_at",
        "version",
        "rejected_at",
        "rejected_by_user_id",
        "approved_at",
        "approved_by_user_id",
    ]:
        op.drop_column("signs", column)
    op.drop_index("ix_class_sessions_join_token", table_name="class_sessions")
    for column in [
        "require_teacher_approval",
        "allow_anonymous_students",
        "max_participants",
        "join_token_expires_at",
        "join_token",
    ]:
        op.drop_column("class_sessions", column)
    op.alter_column("class_sessions", "access_code", type_=sa.String(length=12))
    for column in [
        "accepted_privacy_at",
        "accepted_terms_at",
        "school_name",
        "guardian_email",
        "birth_date",
    ]:
        op.drop_column("users", column)
