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


def test_m16_shared_media_shadowing_governance_closeout_is_truthful() -> None:
    project_state = (ROOT / "docs/project/PROJECT_STATE.md").read_text(encoding="utf-8")
    handoff = (ROOT / "docs/project/CURRENT_HANDOFF.md").read_text(encoding="utf-8")
    roadmap = (ROOT / "docs/project/ROADMAP.md").read_text(encoding="utf-8")
    combined = "\n".join((project_state, handoff, roadmap)).casefold()

    assert "m1.4 is **closed / approved / merged**" in project_state.casefold()
    assert "m1.5 is **closed / approved / merged**" in project_state.casefold()
    assert "m1.6 shared-media shadowing integration is **closed / approved / merged**" in handoff.casefold()
    assert "m1.5 — active listening: **closed / merged**" in roadmap.casefold()
    assert "m1.6 — shadowing integration: **closed / merged**" in roadmap.casefold()
    assert "m1.6 shared-media shadowing integration is **closed / approved / merged**" in project_state.casefold()
    assert "| listening | development | available | available | no |" in project_state.casefold()
    assert "| speaking | development | available | available | no |" in project_state.casefold()
    assert "r6 — speaking core: **in progress / internal**" in project_state.casefold()
    assert "/api/speech/transcribe" in handoff
    assert "groq asr" in project_state.casefold()
    assert "not pronunciation" in project_state.casefold()
    assert "| r6 | speaking core | in progress |" in roadmap.casefold()
    assert "r2 — ai capability control plane: **in progress**" in project_state.casefold()
    assert "human-gated" in handoff.casefold()
    assert "r11" in combined and "planned" in combined
