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
    assert "r6 — speaking core: **complete / local acceptance pass**" in project_state.casefold()
    assert "r6 is **complete / local acceptance pass**" in project_state.casefold()
    assert "r6 is **in progress / internal**" not in project_state.casefold()
    assert "r7 — speaking evaluation + pronunciation: complete / local acceptance pass" in project_state.casefold()
    assert "audio-free" in project_state.casefold()
    assert "durable attempts, public activation, and broader release work are not part of this slice" not in project_state.casefold()
    assert "authenticated speaking attempts boundary" in handoff.casefold()
    assert "/api/speech/transcribe" in handoff
    assert "groq asr" in project_state.casefold()
    assert "not pronunciation" in project_state.casefold()
    # ROADMAP retains the approved execution table until its next governance
    # checkpoint; the verified project state above is the canonical closeout.
    assert "| r6 | speaking core | in progress / internal / secondary |" in roadmap.casefold()
    assert "r2 — ai capability control plane: **human gate / ready, not product-blocking**" in project_state.casefold()
    assert "human-gated" in handoff.casefold()
    assert "r11" in combined and "planned" in combined


def test_r8_pre_public_matrix_keeps_release_gates_deferred() -> None:
    report = (ROOT / "docs/project/R8_PRE_PUBLIC_MATRIX.json").read_text(encoding="utf-8")
    assert '"matrix": "R8-pre-public-en-zh"' in report
    assert '"writing_public": false' in report
    assert '"speaking_public": false' in report
    assert '"capability_activation": false' in report
    assert '"inspected": [' in report
    assert '"status": "static-inspection"' in report
    for gate in ("provider_credentials", "postgres_migration", "public_promotion"):
        assert f'"gate": "{gate}"' in report


def test_r11_pre_public_listening_matrix_records_behavioral_and_deferred_evidence() -> None:
    report = (ROOT / "docs/project/R11_PRE_PUBLIC_MATRIX.json").read_text(encoding="utf-8")
    runner = (ROOT / "scripts/r11_release_matrix.mjs").read_text(encoding="utf-8")
    assert '"matrix": "R11-pre-public-en-zh-listening"' in report
    assert '"scope": "behavioral"' in report
    assert '"scope": "source-boundary"' in report
    assert '"listening_public": false' in report
    assert '"capability_activation": false' in report
    for gate in ("postgres_migration", "capability_activation", "public_promotion"):
        assert f'"gate": "{gate}"' in report
    assert "test_r11_listening_progress.mjs" in runner
    assert "test_r9_shadowing_feedback.mjs" in runner
    assert "canonical R11 matrix report is stale" in runner
    assert "if(output)" in runner


def test_r13_local_admin_matrix_is_reproducible_and_runtime_safe() -> None:
    report = (ROOT / "docs/project/R13_LOCAL_ACCEPTANCE_MATRIX.json").read_text(encoding="utf-8")
    runner = (ROOT / "scripts/r13_release_matrix.mjs").read_text(encoding="utf-8")
    project_state = (ROOT / "docs/project/PROJECT_STATE.md").read_text(encoding="utf-8")
    handoff = (ROOT / "docs/project/CURRENT_HANDOFF.md").read_text(encoding="utf-8")
    assert '"matrix": "R13-local-admin-acceptance"' in report
    assert '"r13_local_complete": true' in report
    assert '"learner_runtime_activation": false' in report
    assert '"production_mutation": false' in report
    assert '"scope": "mounted-behavior"' in report
    assert '"scope": "source-and-test-boundary"' in report
    assert '"gate": "credentialed_provider_health"' in report
    assert '"gate": "learner_runtime_activation"' in report
    assert "canonical R13 matrix report is stale" in runner
    assert "test_r13_admin_capability_matrix.mjs" in runner
    assert "config_provenance" in runner
    assert "R13 — Platform Admin Completion: COMPLETE / LOCAL ACCEPTANCE PASS" in project_state
    assert "R13 local acceptance is now closed" in handoff
