"""add project reactions

Revision ID: 20260622_0005
Revises: 20260622_0004
Create Date: 2026-06-22 23:50:00
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20260622_0005"
down_revision = "20260622_0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "project_reactions",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("project_id", sa.String(length=36), sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", sa.String(length=255), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("reaction", sa.String(length=8), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("project_id", "user_id", name="uq_project_reactions_project_user"),
    )
    op.create_index("ix_project_reactions_project_id", "project_reactions", ["project_id"], unique=False)
    op.create_index("ix_project_reactions_user_id", "project_reactions", ["user_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_project_reactions_user_id", table_name="project_reactions")
    op.drop_index("ix_project_reactions_project_id", table_name="project_reactions")
    op.drop_table("project_reactions")
