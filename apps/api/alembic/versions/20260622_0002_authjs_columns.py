"""align auth tables with authjs pg adapter

Revision ID: 20260622_0002
Revises: 20260622_0001
Create Date: 2026-06-22 15:58:00
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20260622_0002"
down_revision = "20260622_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column("users", "email_verified", new_column_name="emailVerified")

    op.add_column("accounts", sa.Column("id", sa.Text(), nullable=True))
    op.execute("update accounts set id = md5(provider || ':' || provider_account_id)")
    op.alter_column("accounts", "id", nullable=False)
    op.create_unique_constraint("accounts_id_key", "accounts", ["id"])

    op.alter_column("accounts", "user_id", new_column_name="userId")
    op.alter_column("accounts", "provider_account_id", new_column_name="providerAccountId")
    op.alter_column("sessions", "session_token", new_column_name="sessionToken")
    op.alter_column("sessions", "user_id", new_column_name="userId")
    op.create_index("ix_sessions_userId", "sessions", ["userId"], unique=False)
    op.drop_index("ix_sessions_user_id", table_name="sessions")


def downgrade() -> None:
    op.create_index("ix_sessions_user_id", "sessions", ["userId"], unique=False)
    op.drop_index("ix_sessions_userId", table_name="sessions")
    op.alter_column("sessions", "userId", new_column_name="user_id")
    op.alter_column("sessions", "sessionToken", new_column_name="session_token")

    op.alter_column("accounts", "providerAccountId", new_column_name="provider_account_id")
    op.alter_column("accounts", "userId", new_column_name="user_id")
    op.drop_constraint("accounts_id_key", "accounts", type_="unique")
    op.drop_column("accounts", "id")

    op.alter_column("users", "emailVerified", new_column_name="email_verified")
