"""Add durable Active Listening progress.

Revision ID: 20260828_0003
Revises: 20260828_0002
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = "20260828_0003"
down_revision = "20260828_0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "listening_progress",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("user_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("language_code", sa.String(20), nullable=False),
        sa.Column("asset_id", sa.String(255), nullable=False),
        sa.Column("segment_id", sa.String(255), nullable=False),
        sa.Column("presentation", sa.String(20), nullable=False),
        sa.Column("revealed", sa.Boolean(), nullable=False),
        sa.Column("checked_attempt_count", sa.Integer(), nullable=False),
        sa.Column("best_accuracy_percent", sa.Integer(), nullable=True),
        sa.Column("best_exact", sa.Boolean(), nullable=False),
        sa.Column("last_answer", sa.Text(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint(
            "user_id", "language_code", "asset_id", "segment_id",
            name="uq_listening_progress_scope_segment",
        ),
    )
    op.create_index(
        "ix_listening_progress_user_language_asset",
        "listening_progress",
        ["user_id", "language_code", "asset_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_listening_progress_user_language_asset", table_name="listening_progress")
    op.drop_table("listening_progress")
