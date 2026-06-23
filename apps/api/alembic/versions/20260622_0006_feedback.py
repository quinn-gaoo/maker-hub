"""add feedback

Revision ID: 20260622_0006
Revises: 20260622_0005
Create Date: 2026-06-22 22:58:00
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20260622_0006"
down_revision = "20260622_0005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "feedback",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="new"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("feedback")
