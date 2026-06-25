"""add user role for admin

Revision ID: 20260624_0010
Revises: 20260624_0009
Create Date: 2026-06-24 16:10:00
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20260624_0010"
down_revision = "20260624_0009"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("role", sa.String(length=32), nullable=False, server_default="user"),
    )


def downgrade() -> None:
    op.drop_column("users", "role")
