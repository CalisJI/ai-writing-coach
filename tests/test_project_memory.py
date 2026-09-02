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


def test_seed_or_mock_listening_content_is_never_real_content_completion() -> None:
    """Human QA confirmed the built-in lessons are still seed/synthetic."""

    catalog = _state()["listening"]["real_media_catalog"]
    assert catalog["status"] == "seed_or_mock_only"
    assert catalog["real_playable_en_evidence"] is False
    assert catalog["real_playable_zh_evidence"] is False
    assert catalog["human_playback_acceptance"] != "approved"
    assert catalog["public_catalog_publication"] == "not_approved"
    assert catalog["seed_or_mock_counts_as_real_content"] is False

    # Seed content cannot be laundered into acceptance or publication.
    claimed = copy.deepcopy(_state())
    claimed["listening"]["real_media_catalog"]["real_playable_en_evidence"] = True
    claimed["listening"]["real_media_catalog"]["human_playback_acceptance"] = "approved"
    claimed["listening"]["real_media_catalog"]["public_catalog_publication"] = "approved"
    errors = validate_state_semantics(claimed)
    assert any("cannot carry real playable EN/ZH evidence" in error for error in errors)
    assert any("cannot hold human playback acceptance" in error for error in errors)
    assert any("cannot be published" in error for error in errors)

    # A catalog cannot be declared complete without both languages and a human.
    complete = copy.deepcopy(_state())
    complete["listening"]["real_media_catalog"]["status"] = "real_content_complete"
    complete["skills"]["state"]["listening"]["content_readiness"] = "real_content_complete"
    errors = validate_state_semantics(complete)
    assert any("requires real playable EN and ZH evidence" in error for error in errors)
    assert any("requires human playback acceptance" in error for error in errors)


def test_listening_engine_completion_does_not_imply_real_catalog_completion() -> None:
    state = _state()
    listening = state["skills"]["state"]["listening"]

    # The engine is done and locally accepted; the catalog is not real yet.
    assert listening["implementation"] == "complete_local"
    assert listening["local_acceptance"] == "passed"
    assert listening["pre_public_matrix"] == "complete"
    assert listening["content_readiness"] == "seed_or_mock_only"

    # That combination must be valid: behaviour and content are separate truths.
    assert validate_state_semantics(state) == []

    # And the two Listening content fields cannot silently drift apart.
    drifted = copy.deepcopy(state)
    drifted["skills"]["state"]["listening"]["content_readiness"] = "real_content_complete"
    assert any(
        "content_readiness must match" in error
        for error in validate_state_semantics(drifted)
    )


def test_local_completion_survives_not_being_public() -> None:
    """A fresh agent must not rebuild finished work just because it is internal."""

    state = _state()
    for skill in ("writing", "speaking", "reading"):
        facts = state["skills"]["state"][skill]
        assert facts["implementation"] == "complete_local"
        assert facts["local_acceptance"] == "passed"
        assert facts["pre_public_matrix"] == "complete"
        assert facts["learner_visibility"] == "internal"
        assert facts["public_release"] == "not_approved"

    # Internal visibility alongside completed local work is a valid state.
    assert validate_state_semantics(state) == []

    # Release still cannot be claimed without human acceptance.
    forced = copy.deepcopy(state)
    forced["skills"]["state"]["writing"]["public_release"] = "approved"
    errors = validate_state_semantics(forced)
    assert any("without human acceptance" in error for error in errors)
    assert any("contradicts release_state.public_release_approved" in error for error in errors)


def test_skill_state_is_not_collapsed_into_a_single_enum() -> None:
    schema = _schema()["properties"]["skills"]["properties"]["state"]
    for skill in ("writing", "speaking", "reading", "listening"):
        dimensions = set(schema["properties"][skill]["required"])
        assert dimensions == {
            "implementation",
            "local_acceptance",
            "pre_public_matrix",
            "learner_visibility",
            "content_readiness",
            "human_acceptance",
            "public_release",
        }

    # The old collapsed per-skill enum must be gone from release_state.
    release = _schema()["properties"]["release_state"]["properties"]
    assert not {"writing", "speaking", "reading", "listening"} & release.keys()


def test_valid_legacy_namespaces_do_not_trigger_product_regressions() -> None:
    state = copy.deepcopy(_state())
    assert {item["path"] for item in state["legacy_namespaces"]} == {
        "static/becoming/**",
        "templates/becoming/**",
        "writing_coach/becoming_*",
    }
    errors = scan_active_regressions(ROOT)
    assert not [error for error in errors if "namespace" in error]
