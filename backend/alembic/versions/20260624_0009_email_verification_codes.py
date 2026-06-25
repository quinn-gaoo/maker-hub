"""add email verification codes

Revision ID: 20260624_0009
Revises: 20260622_0008
Create Date: 2026-06-24 13:30:00
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20260624_0009"
down_revision = "20260622_0008"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "email_verification_codes",
        sa.Column("id", sa.String(length=255), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("purpose", sa.String(length=64), nullable=False),
        sa.Column("code_hash", sa.String(length=255), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_email_verification_codes_email"), "email_verification_codes", ["email"], unique=False)
    op.create_index(op.f("ix_email_verification_codes_purpose"), "email_verification_codes", ["purpose"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_email_verification_codes_purpose"), table_name="email_verification_codes")
    op.drop_index(op.f("ix_email_verification_codes_email"), table_name="email_verification_codes")
    op.drop_table("email_verification_codes")
