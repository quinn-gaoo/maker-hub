"""initial schema

Revision ID: 20260622_0001
Revises:
Create Date: 2026-06-22 01:30:00
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20260622_0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.String(length=255), primary_key=True),
        sa.Column("name", sa.String(length=255), nullable=True),
        sa.Column("email", sa.String(length=255), nullable=True, unique=True),
        sa.Column("email_verified", sa.DateTime(timezone=True), nullable=True),
        sa.Column("image", sa.Text(), nullable=True),
        sa.Column("username", sa.String(length=64), nullable=True, unique=True),
        sa.Column("avatar_url", sa.Text(), nullable=True),
        sa.Column("bio", sa.Text(), nullable=False, server_default=""),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="active"),
    )
    op.create_index("ix_users_username", "users", ["username"], unique=True)

    op.create_table(
        "accounts",
        sa.Column("user_id", sa.String(length=255), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("type", sa.String(length=255), nullable=False),
        sa.Column("provider", sa.String(length=255), nullable=False),
        sa.Column("provider_account_id", sa.String(length=255), nullable=False),
        sa.Column("refresh_token", sa.Text(), nullable=True),
        sa.Column("access_token", sa.Text(), nullable=True),
        sa.Column("expires_at", sa.BigInteger(), nullable=True),
        sa.Column("token_type", sa.String(length=255), nullable=True),
        sa.Column("scope", sa.String(length=255), nullable=True),
        sa.Column("id_token", sa.Text(), nullable=True),
        sa.Column("session_state", sa.String(length=255), nullable=True),
        sa.PrimaryKeyConstraint("provider", "provider_account_id"),
    )

    op.create_table(
        "sessions",
        sa.Column("session_token", sa.String(length=255), primary_key=True),
        sa.Column("user_id", sa.String(length=255), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("expires", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_sessions_user_id", "sessions", ["user_id"], unique=False)

    op.create_table(
        "verification_token",
        sa.Column("identifier", sa.String(length=255), nullable=False),
        sa.Column("token", sa.String(length=255), nullable=False),
        sa.Column("expires", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("identifier", "token"),
    )

    op.create_table(
        "projects",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("user_id", sa.String(length=255), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("slug", sa.String(length=140), nullable=False, unique=True),
        sa.Column("title", sa.String(length=120), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("project_url", sa.Text(), nullable=False),
        sa.Column("cover_image_url", sa.Text(), nullable=True),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="published"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_projects_slug", "projects", ["slug"], unique=True)
    op.create_index("ix_projects_user_id", "projects", ["user_id"], unique=False)

    op.create_table(
        "project_images",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("project_id", sa.String(length=36), sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=False),
        sa.Column("image_url", sa.Text(), nullable=False),
        sa.Column("sort_order", sa.Integer(), nullable=False),
    )

    op.create_table(
        "tags",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("name", sa.String(length=64), nullable=False, unique=True),
        sa.Column("slug", sa.String(length=64), nullable=False, unique=True),
    )
    op.create_index("ix_tags_slug", "tags", ["slug"], unique=True)

    op.create_table(
        "project_tags",
        sa.Column("project_id", sa.String(length=36), sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=False),
        sa.Column("tag_id", sa.String(length=36), sa.ForeignKey("tags.id", ondelete="CASCADE"), nullable=False),
        sa.PrimaryKeyConstraint("project_id", "tag_id"),
    )

    op.create_table(
        "comments",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("project_id", sa.String(length=36), sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", sa.String(length=255), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="published"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_comments_project_id", "comments", ["project_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_comments_project_id", table_name="comments")
    op.drop_table("comments")
    op.drop_table("project_tags")
    op.drop_index("ix_tags_slug", table_name="tags")
    op.drop_table("tags")
    op.drop_table("project_images")
    op.drop_index("ix_projects_user_id", table_name="projects")
    op.drop_index("ix_projects_slug", table_name="projects")
    op.drop_table("projects")
    op.drop_table("verification_token")
    op.drop_index("ix_sessions_user_id", table_name="sessions")
    op.drop_table("sessions")
    op.drop_table("accounts")
    op.drop_index("ix_users_username", table_name="users")
    op.drop_table("users")

