from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
GOVERNANCE_FILES = (
    "AGENTS.md",
    "docs/project/README.md",
    "docs/project/PROJECT_STATE.md",
    "docs/project/ARCHITECTURE_INVARIANTS.md",
    "docs/project/CURRENT_HANDOFF.md",
    "docs/project/DOMAIN_BOUNDARIES.md",
    "docs/project/ROADMAP.md",
    "docs/project/DECISION_LOG.md",
    "docs/project/REVIEW_POLICY.md",
)


def test_canonical_governance_context_is_present_and_discoverable() -> None:
    assert all((ROOT / path).is_file() for path in GOVERNANCE_FILES)

    agents = (ROOT / "AGENTS.md").read_text(encoding="utf-8")
    for path in GOVERNANCE_FILES[1:7]:
        assert path in agents

    project_state = (ROOT / "docs/project/PROJECT_STATE.md").read_text(encoding="utf-8")
    assert "PostgreSQL is the authoritative runtime." in project_state
