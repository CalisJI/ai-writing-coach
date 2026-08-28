"""Add privacy-bounded Speaking attempt evidence.

Revision ID: 20260828_0002
Revises: 20260811_0001
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = "20260828_0002"
down_revision = "20260811_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "speaking_attempts",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("user_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("language_code", sa.String(20), nullable=False),
        sa.Column("take_id", sa.String(120), nullable=False),
        sa.Column("asset_id", sa.String(255), nullable=False),
        sa.Column("segment_id", sa.String(255), nullable=False),
        sa.Column("reference_text", sa.Text(), nullable=False),
        sa.Column("transcript_text", sa.Text(), nullable=False),
        sa.Column("dimensions", sa.JSON(), nullable=False),
        sa.Column("provenance", sa.JSON(), nullable=False),
        sa.Column("evidence", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("user_id", "language_code", "take_id", name="uq_speaking_attempt_scope_take"),
    )
    op.create_index(
        "ix_speaking_attempts_user_language_created",
        "speaking_attempts",
        ["user_id", "language_code", "created_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_speaking_attempts_user_language_created", table_name="speaking_attempts")
    op.drop_table("speaking_attempts")
