"""Initial PostgreSQL shadow foundation.

Revision ID: 20260811_0001
Revises: None
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = "20260811_0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("user_key", sa.String(255), nullable=False, unique=True),
        sa.Column("email", sa.String(320), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("picture", sa.Text(), nullable=False),
        sa.Column("role", sa.String(40), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("last_login", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_table(
        "plans",
        sa.Column("id", sa.String(80), primary_key=True),
        sa.Column("name", sa.String(120), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("price_label", sa.String(120), nullable=False),
        sa.Column("active", sa.Boolean(), nullable=False),
    )
    op.create_table(
        "user_language_profiles",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("user_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("language_code", sa.String(20), nullable=False),
        sa.Column("goal", sa.String(40), nullable=False),
        sa.Column("style", sa.String(40), nullable=False),
        sa.Column("pinyin", sa.String(20), nullable=False),
        sa.Column("native_language", sa.String(20), nullable=False),
        sa.Column("theme_preset", sa.String(40), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("user_id", "language_code", name="uq_user_language_profile"),
    )
    op.create_table(
        "essays",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("user_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("language_code", sa.String(20), nullable=False),
        sa.Column("legacy_id", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("prompt", sa.Text(), nullable=False),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column("word_count", sa.Integer(), nullable=False),
        sa.Column("target_level", sa.String(20), nullable=False),
        sa.Column("grammar", sa.Float(), nullable=False),
        sa.Column("vocabulary", sa.Float(), nullable=False),
        sa.Column("coherence", sa.Float(), nullable=False),
        sa.Column("task_achievement", sa.Float(), nullable=False),
        sa.Column("naturalness", sa.Float(), nullable=False),
        sa.Column("overall", sa.Float(), nullable=False),
        sa.Column("level_estimate", sa.String(20), nullable=False),
        sa.Column("evaluator", sa.String(255), nullable=False),
        sa.Column("summary_vi", sa.Text(), nullable=False),
        sa.Column("strengths", sa.JSON(), nullable=False),
        sa.Column("priorities", sa.JSON(), nullable=False),
        sa.Column("errors", sa.JSON(), nullable=False),
        sa.Column("module_data", sa.JSON(), nullable=False),
        sa.Column("strength_evidence", sa.JSON(), nullable=False),
        sa.UniqueConstraint("user_id", "language_code", "legacy_id", name="uq_essay_legacy_scope"),
    )
    op.create_index("ix_essays_user_language_created", "essays", ["user_id", "language_code", "created_at"])
    op.create_table(
        "essay_revisions",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("essay_id", sa.Uuid(), sa.ForeignKey("essays.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("language_code", sa.String(20), nullable=False),
        sa.Column("series_legacy_id", sa.Integer(), nullable=False),
        sa.Column("revision_no", sa.Integer(), nullable=False),
        sa.Column("parent_essay_id", sa.Uuid(), sa.ForeignKey("essays.id", ondelete="SET NULL"), nullable=True),
        sa.Column("parent_legacy_id", sa.Integer(), nullable=True),
        sa.UniqueConstraint("essay_id", name="uq_essay_revision_essay"),
    )
    op.create_index("ix_essay_revisions_series", "essay_revisions", ["user_id", "language_code", "series_legacy_id", "revision_no"])
    op.create_table(
        "writing_errors",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("essay_id", sa.Uuid(), sa.ForeignKey("essays.id", ondelete="CASCADE"), nullable=False),
        sa.Column("ordinal", sa.Integer(), nullable=False),
        sa.Column("category", sa.String(120), nullable=False),
        sa.Column("fragment", sa.Text(), nullable=False),
        sa.Column("suggestion", sa.Text(), nullable=False),
        sa.Column("explanation_vi", sa.Text(), nullable=False),
        sa.Column("mini_rule_vi", sa.Text(), nullable=False),
        sa.Column("confidence", sa.Float(), nullable=True),
        sa.Column("payload", sa.JSON(), nullable=False),
        sa.UniqueConstraint("essay_id", "ordinal", name="uq_writing_error_ordinal"),
    )
    op.create_table(
        "saved_words",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("user_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("language_code", sa.String(20), nullable=False),
        sa.Column("word", sa.String(180), nullable=False),
        sa.Column("normalized_word", sa.String(180), nullable=False),
        sa.Column("phonetic", sa.String(180), nullable=False),
        sa.Column("part_of_speech", sa.String(120), nullable=False),
        sa.Column("definition", sa.Text(), nullable=False),
        sa.Column("translation_vi", sa.Text(), nullable=False),
        sa.Column("added_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("source_essay_id", sa.Uuid(), sa.ForeignKey("essays.id", ondelete="SET NULL"), nullable=True),
        sa.Column("source_fragment", sa.Text(), nullable=False),
        sa.Column("source_kind", sa.String(40), nullable=False),
        sa.Column("focus_note", sa.Text(), nullable=False),
        sa.Column("review_stage", sa.Integer(), nullable=False),
        sa.Column("successful_recalls", sa.Integer(), nullable=False),
        sa.Column("lapse_count", sa.Integer(), nullable=False),
        sa.Column("last_reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("next_review_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("user_id", "language_code", "normalized_word", name="uq_saved_word_scope"),
    )
    op.create_index("ix_saved_words_due", "saved_words", ["user_id", "language_code", "next_review_at"])
    op.create_table(
        "grammar_progress",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("user_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("language_code", sa.String(20), nullable=False),
        sa.Column("lesson_id", sa.String(255), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("user_id", "language_code", "lesson_id", name="uq_grammar_progress_scope"),
    )
    op.create_table(
        "reading_sessions",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("user_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("language_code", sa.String(20), nullable=False),
        sa.Column("legacy_id", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("target_level", sa.String(20), nullable=False),
        sa.Column("topic", sa.String(120), nullable=False),
        sa.Column("learner_goal", sa.String(80), nullable=False),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("passage", sa.Text(), nullable=False),
        sa.Column("questions", sa.JSON(), nullable=False),
        sa.Column("recycled_words", sa.JSON(), nullable=False),
        sa.Column("generation_mode", sa.String(40), nullable=False),
        sa.UniqueConstraint("user_id", "language_code", "legacy_id", name="uq_reading_session_legacy_scope"),
    )
    op.create_table(
        "reading_attempts",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("session_id", sa.Uuid(), sa.ForeignKey("reading_sessions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("legacy_id", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("answers", sa.JSON(), nullable=False),
        sa.Column("correct_count", sa.Integer(), nullable=False),
        sa.Column("total", sa.Integer(), nullable=False),
        sa.UniqueConstraint("session_id", "legacy_id", name="uq_reading_attempt_legacy"),
    )
    op.create_table(
        "plan_entitlements",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("plan_id", sa.String(80), sa.ForeignKey("plans.id", ondelete="CASCADE"), nullable=False),
        sa.Column("feature_key", sa.String(160), nullable=False),
        sa.Column("enabled", sa.Boolean(), nullable=False),
        sa.Column("monthly_limit", sa.Integer(), nullable=True),
        sa.UniqueConstraint("plan_id", "feature_key", name="uq_plan_entitlement"),
    )
    op.create_table(
        "subscriptions",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("user_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True),
        sa.Column("plan_id", sa.String(80), sa.ForeignKey("plans.id"), nullable=False),
        sa.Column("status", sa.String(40), nullable=False),
        sa.Column("provider", sa.String(80), nullable=False),
        sa.Column("external_customer_id", sa.String(255), nullable=False),
        sa.Column("external_subscription_id", sa.String(255), nullable=False),
        sa.Column("current_period_end", sa.DateTime(timezone=True), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_table(
        "usage_events",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("user_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("feature", sa.String(160), nullable=False),
        sa.Column("amount", sa.Integer(), nullable=False),
        sa.Column("request_id", sa.String(255), nullable=False),
        sa.Column("occurred_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_usage_user_feature_time", "usage_events", ["user_id", "feature", "occurred_at"])
    op.create_table(
        "platform_settings",
        sa.Column("key", sa.String(160), primary_key=True),
        sa.Column("value", sa.JSON(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_by", sa.String(255), nullable=False),
    )
    op.create_table(
        "audit_logs",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("user_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("action", sa.String(160), nullable=False),
        sa.Column("entity_type", sa.String(120), nullable=False),
        sa.Column("entity_id", sa.String(255), nullable=False),
        sa.Column("payload", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_audit_logs_created", "audit_logs", ["created_at"])


def downgrade() -> None:
    for table in [
        "audit_logs", "platform_settings", "usage_events", "subscriptions",
        "plan_entitlements", "reading_attempts", "reading_sessions",
        "grammar_progress", "saved_words", "writing_errors", "essay_revisions",
        "essays", "user_language_profiles", "plans", "users",
    ]:
        op.drop_table(table)
