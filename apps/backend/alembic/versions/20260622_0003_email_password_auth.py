"""add password hash for email auth

Revision ID: 20260622_0003
Revises: 20260622_0002
Create Date: 2026-06-22 16:40:00
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20260622_0003"
down_revision = "20260622_0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("password_hash", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "password_hash")
