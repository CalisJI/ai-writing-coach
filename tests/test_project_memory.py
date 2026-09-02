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


def test_seed_or_mock_content_can_never_become_real_content_completion() -> None:
    """The rule, tested on a constructed state so real progress cannot retire it."""

    seeded = copy.deepcopy(_state())
    seeded["listening"]["real_media_catalog"].update({
        "status": "seed_or_mock_only",
        "real_playable_en_evidence": True,
        "real_playable_zh_evidence": True,
        "human_playback_acceptance": "approved",
        "public_catalog_publication": "approved",
    })
    seeded["skills"]["state"]["listening"]["content_readiness"] = "seed_or_mock_only"
    errors = validate_state_semantics(seeded)
    assert any("cannot carry real playable EN/ZH evidence" in error for error in errors)
    assert any("cannot hold human playback acceptance" in error for error in errors)
    assert any("cannot be published" in error for error in errors)

    # Nor can a catalog be called complete without both languages and a human.
    claimed = copy.deepcopy(_state())
    claimed["listening"]["real_media_catalog"].update({
        "status": "real_content_complete",
        "real_playable_zh_evidence": False,
        "human_playback_acceptance": "approval_required",
    })
    claimed["skills"]["state"]["listening"]["content_readiness"] = "real_content_complete"
    errors = validate_state_semantics(claimed)
    assert any("requires real playable EN and ZH evidence" in error for error in errors)
    assert any("requires human playback acceptance" in error for error in errors)

    # And publication always trails human acceptance.
    published = copy.deepcopy(_state())
    published["listening"]["real_media_catalog"]["public_catalog_publication"] = "approved"
    assert any(
        "publication requires human playback acceptance" in error
        for error in validate_state_semantics(published)
    )


def test_listening_catalog_is_not_yet_complete_and_never_implied_by_the_engine() -> None:
    state = _state()
    listening = state["skills"]["state"]["listening"]
    catalog = state["listening"]["real_media_catalog"]

    # The engine is finished and locally accepted.
    assert listening["implementation"] == "complete_local"
    assert listening["local_acceptance"] == "passed"
    assert listening["pre_public_matrix"] == "complete"

    # The catalog is its own, still-unfinished truth.
    assert catalog["status"] != "real_content_complete"
    assert catalog["human_playback_acceptance"] != "approved"
    assert catalog["public_catalog_publication"] == "not_approved"
    assert catalog["seed_or_mock_counts_as_real_content"] is False
    assert listening["learner_visibility"] == "internal"

    # Behaviour and content are independent: this combination must be valid.
    assert validate_state_semantics(state) == []

    # The two Listening content fields cannot silently drift apart.
    drifted = copy.deepcopy(state)
    drifted["skills"]["state"]["listening"]["content_readiness"] = (
        "seed_or_mock_only" if listening["content_readiness"] != "seed_or_mock_only" else "real_content_partial"
    )
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
        # Writing is beta and the others internal; the point is that none of
        # them are public, and none of that erases the completed local work.
        assert facts["learner_visibility"] in {"internal", "beta"}
        assert facts["public_release"] == "not_approved"

    # Non-public visibility alongside completed local work is a valid state.
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


def test_machine_memory_learner_visibility_matches_the_skill_registry() -> None:
    """The registry is the running truth; memory must not drift from it.

    Memory once said Writing was `internal` while `skill_registry.py` and
    PROJECT_STATE both said BETA. Implementation fact wins, and this keeps the
    two from disagreeing again.
    """

    from writing_coach.core.skill_registry import all_skills

    registry = {skill.key: skill.release_state.value for skill in all_skills()}
    recorded = _state()["skills"]["state"]
    for skill, facts in recorded.items():
        assert skill in registry, f"{skill} is not a registered skill"
        expected = "internal" if registry[skill] == "development" else registry[skill]
        assert facts["learner_visibility"] == expected, (
            f"{skill}: memory says {facts['learner_visibility']}, registry says {registry[skill]}"
        )


def test_valid_legacy_namespaces_do_not_trigger_product_regressions() -> None:
    state = copy.deepcopy(_state())
    assert {item["path"] for item in state["legacy_namespaces"]} == {
        "static/becoming/**",
        "templates/becoming/**",
        "writing_coach/becoming_*",
    }
    errors = scan_active_regressions(ROOT)
    assert not [error for error in errors if "namespace" in error]
