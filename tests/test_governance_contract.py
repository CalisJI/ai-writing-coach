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
    assert "| r6 | speaking core | complete / local acceptance pass |" in roadmap.casefold()
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


def test_r17_local_foundation_closeout_records_verified_route_boundary() -> None:
    project_state = (ROOT / "docs/project/PROJECT_STATE.md").read_text(encoding="utf-8")
    handoff = (ROOT / "docs/project/CURRENT_HANDOFF.md").read_text(encoding="utf-8")
    route_test = (ROOT / "tests/test_r17_admin_routes.py").read_text(encoding="utf-8")
    assert "R17 — Product Analytics & Operational Observability: **COMPLETE / LOCAL" in project_state
    assert "R17 — Product Analytics & Operational Observability: **IN PROGRESS / LOCAL" not in project_state
    assert "R17 — Product Analytics & Operational Observability: **IN PROGRESS / LOCAL" not in handoff
    assert "R17 local-foundation closeout:** COMPLETE / LOCAL ACCEPTANCE PASS" in handoff
    assert "tests/test_r17_admin_routes.py" in handoff
    assert "httpx.ASGITransport" in route_test
    assert "/api/admin/product-activity" in route_test and "/api/admin/readiness-summary" in route_test
    assert 'headers={"x-test-admin": "1"}' in route_test
    for sensitive in ("private-user", "private learner text", "private prompt", "private.example"):
        assert sensitive in route_test


def test_r18_reference_data_cache_contract_is_recorded() -> None:
    project_state = (ROOT / "docs/project/PROJECT_STATE.md").read_text(encoding="utf-8")
    handoff = (ROOT / "docs/project/CURRENT_HANDOFF.md").read_text(encoding="utf-8")
    route_test = (ROOT / "tests/test_reference_data_cache.py").read_text(encoding="utf-8")
    assert "R18 — Mobile/API Readiness: **COMPLETE / LOCAL ACCEPTANCE PASS**" in project_state
    assert "Current Orena program: Governance handoff — all documented non-production" in project_state
    assert "R18 — Mobile/API Readiness: **COMPLETE / LOCAL ACCEPTANCE PASS**" in handoff
    assert "R18 — Mobile/API Readiness: **IN PROGRESS / LOCAL FOUNDATION**" not in project_state
    assert "R18 — Mobile/API Readiness: **IN PROGRESS / LOCAL FOUNDATION**" not in handoff
    roadmap = (ROOT / "docs/project/ROADMAP.md").read_text(encoding="utf-8")
    assert "| R18 | Mobile/API Readiness | PLANNED / POST-R12 PLATFORM TRACK |" in roadmap
    assert "R18 local-foundation closeout" in handoff
    assert "R18 immutable reference-data cache contract" in handoff
    for contract in ("source_version", "If-None-Match", "no-store", "ASGITransport"):
        assert contract in route_test or contract in handoff


def test_r18_session_bootstrap_contract_is_recorded() -> None:
    project_state = (ROOT / "docs/project/PROJECT_STATE.md").read_text(encoding="utf-8")
    handoff = (ROOT / "docs/project/CURRENT_HANDOFF.md").read_text(encoding="utf-8")
    auth_source = (ROOT / "auth_support.py").read_text(encoding="utf-8")
    route_test = (ROOT / "tests/test_session_bootstrap.py").read_text(encoding="utf-8")
    assert "authenticated session-bootstrap" in handoff
    assert "R18 authenticated session-bootstrap contract" in handoff
    assert "GET /api/session/bootstrap" in handoff
    assert "/api/session/bootstrap" in auth_source
    assert 'SESSION_BOOTSTRAP_VERSION = "orena.session-bootstrap.v1"' in auth_source
    assert "httpx.ASGITransport" in route_test
    assert 'for language in ("en", "zh")' in route_test
    assert '"detail": "Authentication required"' in route_test


def test_r18_compact_media_status_contract_is_recorded() -> None:
    project_state = (ROOT / "docs/project/PROJECT_STATE.md").read_text(encoding="utf-8")
    handoff = (ROOT / "docs/project/CURRENT_HANDOFF.md").read_text(encoding="utf-8")
    media_source = (ROOT / "writing_coach/media_api.py").read_text(encoding="utf-8")
    api_source = (ROOT / "static/becoming/api.js").read_text(encoding="utf-8")
    route_test = (ROOT / "tests/test_media_status_compact.py").read_text(encoding="utf-8")
    accessor_test = (ROOT / "scripts/test_media_status_compact_accessor.mjs").read_text(encoding="utf-8")
    assert "compact media" in handoff
    assert "R18 resumable media-status response shaping" in handoff
    assert "compact: true" in handoff
    assert 'compact: bool = False' in media_source
    assert "resume_handle" in media_source
    assert "media_job_unavailable" in media_source
    assert "mediaImportStatusCompact" in api_source
    assert "JSON.parse(calls[0].options.body)" in accessor_test
    assert "httpx.ASGITransport" in route_test
    for state in ("processing", "ready", "failed"):
        assert f'"{state}"' in route_test


def test_r12_local_retention_foundation_closeout_is_recorded() -> None:
    project_state = (ROOT / "docs/project/PROJECT_STATE.md").read_text(encoding="utf-8")
    handoff = (ROOT / "docs/project/CURRENT_HANDOFF.md").read_text(encoding="utf-8")
    roadmap = (ROOT / "docs/project/ROADMAP.md").read_text(encoding="utf-8")
    return_test = (ROOT / "scripts/test_r12_listening_return.mjs").read_text(encoding="utf-8")
    habit_test = (ROOT / "scripts/test_r12_listening_habit_home.mjs").read_text(encoding="utf-8")
    plan_test = (ROOT / "scripts/test_r12_next_practice_plan.mjs").read_text(encoding="utf-8")
    onboarding_test = (ROOT / "scripts/test_home_personalized_practice_flow.mjs").read_text(encoding="utf-8")
    assert "**R12 — Retention & Growth: COMPLETE / LOCAL ACCEPTANCE PASS." in project_state
    assert "R12 — Retention & Growth: **COMPLETE / LOCAL ACCEPTANCE PASS**" in handoff
    assert "R12 local-foundation closeout" in handoff
    assert "R12 — Retention & Growth: IN PROGRESS / LOCAL FOUNDATION" not in project_state
    assert "R12 — Retention & Growth: **IN PROGRESS / LOCAL FOUNDATION**" not in handoff
    assert "| R12 | Retention & Growth | PLANNED |" in roadmap
    for script in (return_test, habit_test, plan_test, onboarding_test):
        assert "en" in script and "zh" in script


def test_r10_reading_matrix_records_en_zh_evidence_and_deferred_gates() -> None:
    project_state = (ROOT / "docs/project/PROJECT_STATE.md").read_text(encoding="utf-8")
    handoff = (ROOT / "docs/project/CURRENT_HANDOFF.md").read_text(encoding="utf-8")
    report = (ROOT / "docs/project/R10_PRE_PUBLIC_MATRIX.json").read_text(encoding="utf-8")
    runner = (ROOT / "scripts/r10_release_matrix.mjs").read_text(encoding="utf-8")

    assert "R10" in project_state and "Reading Completion" in project_state
    assert "**R10 — Reading Completion: COMPLETE / LOCAL ACCEPTANCE PASS.**" in project_state
    assert "R10 — Reading Completion: **COMPLETE / LOCAL ACCEPTANCE PASS**" in handoff
    assert "R10_PRE_PUBLIC_MATRIX.json" in handoff
    assert "contextual dictionary lookup" in handoff
    assert "R10-pre-public-en-zh-reading" in report
    assert "canonical R10 matrix report is stale" in runner
    for check in (
        "scripts/test_r10_reading_flow.mjs",
        "scripts/test_r16_reading_contextual_dictionary.mjs",
        "scripts/test_r16_contextual_dictionary.mjs",
    ):
        assert f'"check": "{check}"' in report
        assert check in runner
    for gate in ("provider_credentials", "production_mutation", "public_promotion"):
        assert f'"gate": "{gate}"' in report
    assert '"reading_public": false' in report
    assert '"provider_activation": false' in report


def test_r14_local_operations_foundation_closeout_is_recorded() -> None:
    project_state = (ROOT / "docs/project/PROJECT_STATE.md").read_text(encoding="utf-8")
    handoff = (ROOT / "docs/project/CURRENT_HANDOFF.md").read_text(encoding="utf-8")
    roadmap = (ROOT / "docs/project/ROADMAP.md").read_text(encoding="utf-8")
    report = (ROOT / "docs/project/R14_LOCAL_ACCEPTANCE_MATRIX.json").read_text(encoding="utf-8")
    runner = (ROOT / "scripts/r14_release_matrix.mjs").read_text(encoding="utf-8")
    telemetry_tests = (ROOT / "tests/test_ai_telemetry.py").read_text(encoding="utf-8")
    control_plane_tests = (ROOT / "tests/test_ai_control_plane.py").read_text(encoding="utf-8")

    state_start = project_state.find("R14 — AI Usage, Cost, Quota & Provider Operations:")
    assert state_start >= 0
    state_section = project_state[state_start:state_start + 700]
    assert "COMPLETE / LOCAL" in state_section
    assert "ACCEPTANCE PASS" in state_section
    assert "IN PROGRESS / LOCAL FOUNDATION" not in state_section
    assert "R14 — AI Usage, Cost, Quota & Provider Operations: **COMPLETE / LOCAL ACCEPTANCE PASS**" in handoff
    assert "R14 local-operations closeout" in handoff
    assert "| R14 | AI Usage, Cost, Quota & Provider Operations | PLANNED / POST-R12 PLATFORM TRACK |" in roadmap

    assert '"matrix": "R14-local-ai-operations-foundation"' in report
    assert '"r14_local_complete": true' in report
    assert '"scope": "mounted-behavior"' in report
    assert '"scope": "source-and-test-boundary"' in report
    for gate in (
        "provider_credentials",
        "billing_or_quota_enforcement",
        "learner_runtime_activation",
        "production_postgresql_observation",
    ):
        assert f'"gate": "{gate}"' in report
    assert "canonical R14 matrix report is stale" in runner
    assert "test_r13_admin_capability_matrix.mjs" in runner
    for contract in (
        "test_success_telemetry_keeps_capability_provider_model_and_reported_usage",
        "test_admin_operations_aggregates_cost_by_catalog_and_trend",
        "test_operations_endpoint_is_read_only_and_aggregates_without_provider_probe",
        "test_live_test_failure_taxonomy_is_distinct_and_sanitized",
    ):
        assert contract in telemetry_tests or contract in control_plane_tests


def test_post_r12_governance_pointer_reconciles_completed_ledger() -> None:
    project_state = (ROOT / "docs/project/PROJECT_STATE.md").read_text(encoding="utf-8")
    handoff = (ROOT / "docs/project/CURRENT_HANDOFF.md").read_text(encoding="utf-8")
    roadmap = (ROOT / "docs/project/ROADMAP.md").read_text(encoding="utf-8")

    assert "Current Orena program: Governance handoff — all documented non-production" in project_state
    assert "Current Orena program: R18" not in project_state
    assert "R3 — Writing Evaluation Completion: **COMPLETE / LOCAL ACCEPTANCE PASS**" in project_state
    normalized_state = " ".join(project_state.split())
    normalized_handoff = " ".join(handoff.split())
    for status in (
        "**R12 — Retention & Growth: COMPLETE / LOCAL ACCEPTANCE PASS.**",
        "**R13 — Platform Admin Completion: COMPLETE / LOCAL ACCEPTANCE PASS.**",
        "**R14 — AI Usage, Cost, Quota & Provider Operations: COMPLETE / LOCAL ACCEPTANCE PASS.**",
        "R15 — SaaS Plans, Entitlements & Usage Policy: **COMPLETE / LOCAL ACCEPTANCE PASS**.",
        "R16 — Advanced Learning Intelligence: **COMPLETE / LOCAL ACCEPTANCE PASS** for",
        "R17 — Product Analytics & Operational Observability: **COMPLETE / LOCAL ACCEPTANCE PASS**.",
        "R18 — Mobile/API Readiness: **COMPLETE / LOCAL ACCEPTANCE PASS**.",
    ):
        assert status in normalized_state
    for status in (
        "R12 — Retention & Growth: **COMPLETE / LOCAL ACCEPTANCE PASS**",
        "R13 — Platform Admin Completion: **COMPLETE / LOCAL ACCEPTANCE PASS**.",
        "R14 — AI Usage, Cost, Quota & Provider Operations: **COMPLETE / LOCAL ACCEPTANCE PASS**",
        "R15 - SaaS Plans, Entitlements & Usage Policy: **COMPLETE / LOCAL ACCEPTANCE PASS**",
        "R16 — Advanced Learning Intelligence: **COMPLETE / LOCAL ACCEPTANCE PASS**",
        "R17 — Product Analytics & Operational Observability: **COMPLETE / LOCAL ACCEPTANCE PASS**",
        "R18 — Mobile/API Readiness: **COMPLETE / LOCAL ACCEPTANCE PASS**",
    ):
        assert status in normalized_handoff
    assert "Current governance lane (2026-08-29)" in handoff
    assert "No autonomous implementation owner is assigned" in normalized_handoff
    assert "R8 public-product-gate owner" not in handoff
    assert "mobile/API-readiness follow-on owner" not in handoff
    assert "R2 capability-activation" in handoff
    assert "R8" in handoff and "R11" in handoff and "human gate" in handoff.casefold()
    assert "**Next handoff:** Human governance decision for R8/R11 public promotion" in normalized_handoff
    assert "R8 — Public Product Gate" in project_state
    assert "R11" in project_state and "human gate" in project_state.casefold()
    assert "| R12 | Retention & Growth | PLANNED |" in roadmap
    assert "| R14 | AI Usage, Cost, Quota & Provider Operations | PLANNED / POST-R12 PLATFORM TRACK |" in roadmap


def test_r3_roadmap_status_matches_verified_local_closeout() -> None:
    project_state = (ROOT / "docs/project/PROJECT_STATE.md").read_text(encoding="utf-8")
    handoff = (ROOT / "docs/project/CURRENT_HANDOFF.md").read_text(encoding="utf-8")
    roadmap = (ROOT / "docs/project/ROADMAP.md").read_text(encoding="utf-8")
    normalized_roadmap = " ".join(roadmap.split())

    assert "| R3 | Writing Evaluation Completion | COMPLETE / LOCAL ACCEPTANCE PASS |" in roadmap
    assert "**COMPLETE / LOCAL ACCEPTANCE PASS.**" in roadmap
    assert "| R3 | Writing Evaluation Completion | IN PROGRESS / PRIMARY |" not in roadmap
    assert "**IN PROGRESS / PRIMARY.**" not in roadmap
    assert "R3 — Writing Evaluation Completion: **COMPLETE / LOCAL ACCEPTANCE PASS**" in project_state
    assert "R3 — Writing Evaluation Completion: **COMPLETE / LOCAL ACCEPTANCE PASS**" in handoff
    assert "R2 — AI Capability Control Plane: **HUMAN GATE / READY, NOT PRODUCT-BLOCKING**" in project_state
    assert "R8 — Public Product Gate: Writing + Speaking EN/ZH: **PRE-PUBLIC MATRIX" in handoff
    assert "During the historical R3/R4 primary lane" in roadmap
    assert "While R3/R4 are the primary lane" not in roadmap
    assert "Current R6 ownership and any promotion remain governed" in normalized_roadmap
    assert "human governance decision" in handoff.casefold()
    assert "## Historical execution order" in roadmap
    assert "The historical primary execution from the post-R5 checkpoint was:" in roadmap
    assert "Current ownership and promotion gates are recorded in" in normalized_roadmap
    assert "Primary execution from the post-R5 checkpoint is:" not in roadmap
    assert "while R3/R4 are primary" not in roadmap
    assert "### Historical execution relationship" in roadmap
    assert "The historical primary path was:" in roadmap
    assert "The existing primary path remains:" not in roadmap
    assert "no active autonomous R3/R4 implementation lane" in normalized_roadmap


def test_r4_roadmap_status_matches_verified_learning_loop_closeout() -> None:
    project_state = (ROOT / "docs/project/PROJECT_STATE.md").read_text(encoding="utf-8")
    handoff = (ROOT / "docs/project/CURRENT_HANDOFF.md").read_text(encoding="utf-8")
    roadmap = (ROOT / "docs/project/ROADMAP.md").read_text(encoding="utf-8")
    normalized_roadmap = " ".join(roadmap.split())
    r4_section = roadmap.split("## R4 — Writing Learning Loop + Grammar Transfer", 1)[1].split("## R5", 1)[0]

    assert "| R4 | Writing Learning Loop + Grammar Transfer | COMPLETE / LOCAL ACCEPTANCE PASS |" in roadmap
    assert "| R4 | Writing Learning Loop + Grammar Transfer | PLANNED |" not in roadmap
    assert "**COMPLETE / LOCAL ACCEPTANCE PASS.**" in r4_section
    assert "The shared EN/ZH evidence-to-grammar, targeted-practice, revision-lineage, and downstream Review/Journey/Library contracts are locally accepted." in normalized_roadmap
    assert "Public promotion remains governed by R8 and the R2 capability-activation gate." in normalized_roadmap
    assert "**R4 — Writing Learning Loop + Grammar Transfer: COMPLETE / LOCAL ACCEPTANCE PASS.**" in project_state
    assert "R4 — Writing Learning Loop + Grammar Transfer: **COMPLETE / LOCAL ACCEPTANCE PASS**" in handoff
    assert "R2 — AI Capability Control Plane: **HUMAN GATE / READY, NOT PRODUCT-BLOCKING**" in project_state
    assert "R8 — Public Product Gate: Writing + Speaking EN/ZH: **PRE-PUBLIC MATRIX" in handoff


def test_r6_roadmap_status_matches_verified_speaking_core_closeout() -> None:
    project_state = (ROOT / "docs/project/PROJECT_STATE.md").read_text(encoding="utf-8")
    handoff = (ROOT / "docs/project/CURRENT_HANDOFF.md").read_text(encoding="utf-8")
    roadmap = (ROOT / "docs/project/ROADMAP.md").read_text(encoding="utf-8")
    normalized_roadmap = " ".join(roadmap.split())
    r6_section = roadmap.split("## R6 — Speaking Core", 1)[1].split("## R7", 1)[0]

    assert "| R6 | Speaking Core | COMPLETE / LOCAL ACCEPTANCE PASS |" in roadmap
    assert "| R6 | Speaking Core | IN PROGRESS / INTERNAL / SECONDARY |" not in roadmap
    assert "**COMPLETE / LOCAL ACCEPTANCE PASS.**" in r6_section
    assert "The EN/ZH record-to-transcript-to-feedback boundary is locally accepted." in normalized_roadmap
    assert "pronunciation, fluency, or proficiency scoring" in normalized_roadmap
    assert "those dimensions remain R7 work" in normalized_roadmap
    assert "R2 activation and R8 public promotion remain explicit human gates" in normalized_roadmap
    assert "R6 — Speaking Core: **COMPLETE / LOCAL ACCEPTANCE PASS**" in project_state
    assert "R6 — Speaking Core: **COMPLETE / LOCAL ACCEPTANCE PASS**" in handoff
    assert "R7 — Speaking Evaluation + Pronunciation: **COMPLETE / LOCAL ACCEPTANCE PASS**" in handoff


def test_r7_roadmap_status_matches_verified_speaking_evaluation_closeout() -> None:
    project_state = (ROOT / "docs/project/PROJECT_STATE.md").read_text(encoding="utf-8")
    handoff = (ROOT / "docs/project/CURRENT_HANDOFF.md").read_text(encoding="utf-8")
    roadmap = (ROOT / "docs/project/ROADMAP.md").read_text(encoding="utf-8")
    normalized_roadmap = " ".join(roadmap.split())
    r7_section = roadmap.split("## R7 — Speaking Evaluation + Pronunciation Completion", 1)[1].split("## R8", 1)[0]

    assert "| R7 | Speaking Evaluation + Pronunciation Completion | COMPLETE / LOCAL ACCEPTANCE PASS |" in roadmap
    assert "| R7 | Speaking Evaluation + Pronunciation Completion | PLANNED |" not in roadmap
    assert "**COMPLETE / LOCAL ACCEPTANCE PASS.**" in r7_section
    assert "The EN/ZH evaluator, pronunciation evidence, localized feedback, and durable learner-scoped attempt/history contracts are locally accepted." in normalized_roadmap
    assert "Transcription confidence, pronunciation, fluency, and proficiency remain separate dimensions" in normalized_roadmap
    assert "R2 capability activation and R8 public promotion remain explicit human gates." in normalized_roadmap
    assert "R7 — Speaking Evaluation + Pronunciation: COMPLETE / LOCAL ACCEPTANCE PASS." in project_state
    assert "R7 — Speaking Evaluation + Pronunciation: **COMPLETE / LOCAL ACCEPTANCE PASS**" in handoff


def test_r16_local_foundation_closeout_records_complete_evidence_chain() -> None:
    project_state = (ROOT / "docs/project/PROJECT_STATE.md").read_text(encoding="utf-8")
    handoff = (ROOT / "docs/project/CURRENT_HANDOFF.md").read_text(encoding="utf-8")
    normalized_state = " ".join(project_state.split())
    normalized_handoff = " ".join(handoff.split())

    assert "R16 — Advanced Learning Intelligence: **COMPLETE / LOCAL ACCEPTANCE PASS** for contextual dictionary lookups in Writing, Review, Reading, and shared Listening/Speaking transcripts" in normalized_state
    assert "the scheduled Library review handoff" in normalized_state
    assert "R16 local-foundation evidence reconciliation" in handoff
    assert "Home presents only a valid due review" in normalized_handoff
    assert "due/due-soon" not in normalized_handoff
    for evidence in (
        "scripts/test_r16_contextual_dictionary.mjs",
        "scripts/run_r16_contextual_dictionary.py",
        "scripts/test_r16_reading_contextual_dictionary.mjs",
        "scripts/test_r16_shared_transcript_contextual_dictionary.mjs",
        "scripts/test_adaptive_difficulty_locale.mjs",
        "scripts/run_r16_adaptive_practice.py",
        "scripts/test_review_cue_locale.mjs",
        "scripts/test_cross_skill_transfer_locale.mjs",
        "scripts/test_home_library_review_handoff.mjs",
    ):
        assert evidence in normalized_handoff
    assert "EN/ZH behavior remains shared through existing contracts" in normalized_handoff
    assert "provider credentials, production activation, and public promotion remain deferred gates" in normalized_handoff
