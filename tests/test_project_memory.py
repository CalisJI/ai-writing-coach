from __future__ import annotations

import copy
import json
from pathlib import Path

from scripts.validate_project_memory import (
    ROOT,
    scan_active_regressions,
    validate_repository,
    validate_schema,
    validate_state_semantics,
)


STATE_PATH = ROOT / "docs/project/CURRENT_PRODUCT_STATE.yaml"
SCHEMA_PATH = ROOT / "docs/project/CURRENT_PRODUCT_STATE.schema.json"


def _state() -> dict:
    return json.loads(STATE_PATH.read_text(encoding="utf-8"))


def _schema() -> dict:
    return json.loads(SCHEMA_PATH.read_text(encoding="utf-8"))


def test_repository_project_memory_is_valid() -> None:
    assert validate_repository() == []


def test_state_schema_rejects_missing_and_arbitrary_fields() -> None:
    missing = _state()
    del missing["product"]
    assert any("missing required field 'product'" in error for error in validate_schema(missing, _schema()))

    arbitrary = _state()
    arbitrary["agent_guess"] = "looks done"
    assert any("unsupported field 'agent_guess'" in error for error in validate_schema(arbitrary, _schema()))


def test_state_rejects_route_language_native_and_production_contradictions() -> None:
    route = _state()
    route["deprecated_routes"][0]["new_development_allowed"] = True
    assert any("/becoming must be compatibility-only" in error for error in validate_state_semantics(route))

    language = _state()
    language["languages"]["first_class"] = ["en"]
    assert any("exactly EN and ZH" in error for error in validate_state_semantics(language))

    native = _state()
    native["design"]["native_strategy"] = "independent_redesign"
    assert any("expected constant 'full_native_port'" in error for error in validate_schema(native, _schema()))

    production = _state()
    production["release_state"]["production_ready"] = True
    errors = validate_state_semantics(production)
    assert any("production_ready requires public_release_approved" in error for error in errors)
    assert any("pending human gates" in error for error in errors)


def test_active_navigation_to_becoming_is_a_tombstone_regression(tmp_path: Path) -> None:
    (tmp_path / "templates").mkdir()
    (tmp_path / "static").mkdir()
    (tmp_path / "mobile").mkdir()
    (tmp_path / "app.py").write_text(
        '@app.get("/")\ndef home(): ...\n'
        '@app.get("/becoming")\ndef becoming_preview():\n'
        '    return RedirectResponse("/", status_code=302)\n',
        encoding="utf-8",
    )
    (tmp_path / "mobile" / "navigation.tsx").write_text(
        '<Link href="/becoming">Open</Link>',
        encoding="utf-8",
    )
    errors = scan_active_regressions(tmp_path)
    assert any("active navigation to /becoming" in error for error in errors)


def test_resume_workflow_is_bounded_and_current_handoff_is_compact() -> None:
    resume = (ROOT / ".claude/commands/resume-orena.md").read_text(encoding="utf-8")
    for command in (
        "git branch --show-current",
        "git rev-parse HEAD",
        "git status --short",
        "git log -5 --oneline",
    ):
        assert command in resume
    for field in (
        "PRODUCT:",
        "BRANCH:",
        "HEAD:",
        "CURRENT STAGE:",
        "LAST VERIFIED:",
        "IN PROGRESS:",
        "OPEN P0/P1:",
        "HUMAN GATES:",
        "NEXT TASK:",
    ):
        assert field in resume
    assert "PROJECT_STATE.md" not in resume
    assert "ARCHITECTURE_INVARIANTS.md" not in resume
    assert "archive" in resume.casefold()

    handoff = (ROOT / "docs/project/CURRENT_HANDOFF.md").read_text(encoding="utf-8")
    assert len(handoff.encode("utf-8")) < 8_000
    assert "## NEXT EXACT TASK" in handoff
    assert "## R18 immutable" not in handoff


def test_valid_legacy_namespaces_do_not_trigger_product_regressions() -> None:
    state = copy.deepcopy(_state())
    assert {item["path"] for item in state["legacy_namespaces"]} == {
        "static/becoming/**",
        "templates/becoming/**",
        "writing_coach/becoming_*",
    }
    errors = scan_active_regressions(ROOT)
    assert not [error for error in errors if "namespace" in error]
