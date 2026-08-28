"""Add durable Shadowing round progress.

Revision ID: 20260828_0004
Revises: 20260828_0003
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = "20260828_0004"
down_revision = "20260828_0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "shadowing_progress",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("user_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("language_code", sa.String(20), nullable=False),
        sa.Column("asset_id", sa.String(255), nullable=False),
        sa.Column("segment_id", sa.String(255), nullable=False),
        sa.Column("completed_rounds", sa.Integer(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint(
            "user_id", "language_code", "asset_id", "segment_id",
            name="uq_shadowing_progress_scope_segment",
        ),
    )
    op.create_index(
        "ix_shadowing_progress_user_language_asset",
        "shadowing_progress",
        ["user_id", "language_code", "asset_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_shadowing_progress_user_language_asset", table_name="shadowing_progress")
    op.drop_table("shadowing_progress")
