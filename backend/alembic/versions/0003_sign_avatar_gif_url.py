"""add avatar gif url to signs

Revision ID: 0003_sign_avatar_gif_url
Revises: 0002_security_privacy_curatorship
Create Date: 2026-05-05
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0003_sign_avatar_gif_url"
down_revision: Union[str, None] = "0002_security_privacy_curatorship"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("signs", sa.Column("avatar_gif_url", sa.String(length=500), nullable=True))


def downgrade() -> None:
    op.drop_column("signs", "avatar_gif_url")
