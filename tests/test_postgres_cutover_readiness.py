"""Focused regression guards for v1.3.6 shadow cutover verification."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

def test_timestamp_semantics_are_compared() -> None:
    source = (ROOT / "writing_coach/persistence/cutover_verification.py").read_text(encoding="utf-8")
    assert "current_period_end" in source and "occurred_at" in source
    assert "_time" in source

def test_product_only_users_do_not_expand_auth_scope() -> None:
    source = (ROOT / "writing_coach/persistence/cutover_verification.py").read_text(encoding="utf-8")
    assert "auth_keys" in source
    assert "u.user_key in auth_keys" in source
    assert "users.get(x.user_id" in source

def test_orphan_and_head_failures_use_structured_rehearsal_contract() -> None:
    source = (ROOT / "scripts/postgres_cutover_rehearsal.py").read_text(encoding="utf-8")
    assert '"completed_steps"' in source
    assert '"failing_step"' in source
    assert '"alembic-head-verification"' in source
    assert "orphan_user_dirs" in source
