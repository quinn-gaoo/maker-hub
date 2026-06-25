"""add project official flag

Revision ID: 20260625_0011
Revises: 20260624_0010
Create Date: 2026-06-25 17:20:00
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20260625_0011"
down_revision = "20260624_0010"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "projects",
        sa.Column("is_official", sa.Boolean(), nullable=False, server_default=sa.false()),
    )


def downgrade() -> None:
    op.drop_column("projects", "is_official")
