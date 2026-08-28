from __future__ import annotations

import argparse
import json
import re
import shutil
import subprocess
from pathlib import Path


def fail(errors: list[str]) -> None:
    print("BECOMING RELEASE GATE FAILED")
    for item in errors:
        print(" -", item)
    raise SystemExit(1)


def service_only(errors: list[str], path: Path, label: str) -> None:
    text = path.read_text(encoding="utf-8")
    if "APIRouter" in text or "@router." in text or "app.include_router" in text:
        errors.append(f"{label} must remain service-only; route ownership belongs to app.py")


def require_contains(errors: list[str], text: str, needles: list[str], label: str) -> None:
    for needle in needles:
        if needle not in text:
            errors.append(f"{label} missing: {needle}")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--project", default=".")
    parser.add_argument("--expected", default="")
    args = parser.parse_args()

    root = Path(args.project).resolve()
    errors: list[str] = []

    required = [
        root / "app.py",
        root / "compose.yaml",
        root / "auth_support.py",
        root / "writing_coach" / "becoming_memory.py",
        root / "writing_coach" / "becoming_practice.py",
        root / "writing_coach" / "becoming_outcomes.py",
        root / "writing_coach" / "becoming_library.py",
        root / "writing_coach" / "becoming_reading.py",
        root / "writing_coach" / "becoming_linguistics.py",
        root / "writing_coach" / "core" / "skill_registry.py",
        root / "templates" / "becoming" / "index.html",
        root / "static" / "becoming" / "app.js",
        root / "static" / "becoming" / "app.css",
        root / "static" / "becoming" / "theme.js",
        root / "static" / "becoming" / "theme.css",
        root / "static" / "becoming" / "visual-alignment.css",
        root / "static" / "becoming" / "router.js",
        root / "static" / "becoming" / "store.js",
        root / "static" / "becoming" / "components" / "primitives.js",
        root / "static" / "becoming" / "components" / "dictionary.js",
        root / "static" / "becoming" / "components" / "rank-frame.js",
        root / "static" / "becoming" / "domain" / "support.js",
        root / "static" / "becoming" / "domain" / "i18n.js",
        root / "static" / "becoming" / "domain" / "screen-contract.js",
        root / "static" / "becoming" / "domain" / "skill-release.js",
        root / "static" / "becoming" / "domain" / "shadowing-practice.js",
        root / "static" / "becoming" / "domain" / "shared-media-session.js",
        root / "static" / "becoming" / "components" / "audio-recorder.js",
        root / "static" / "becoming" / "screens" / "listening.js",
        root / "static" / "becoming" / "screens" / "speaking.js",
        root / "static" / "becoming" / "speaking.css",
        root / "static" / "becoming" / "orena" / "speaking.css",
        root / "writing_coach" / "speech_api.py",
        root / "writing_coach" / "speech_asr.py",
        root / "writing_coach" / "speech_pronunciation.py",
        root / "writing_coach" / "speaking_evaluator.py",
        root / "tests" / "test_speech_pronunciation.py",
        root / "tests" / "test_speaking_evaluator.py",
        root / "scripts" / "test_m3_pronunciation_contract.mjs",
        root / "scripts" / "test_shadowing_practice.mjs",
        root / "scripts" / "test_speaking_core.mjs",
        root / "scripts" / "test_speaking_groq_flow.mjs",
        root / "scripts" / "test_speaking_ui.mjs",
        root / "scripts" / "test_speaking_rnnoise_contract.mjs",
        root / "scripts" / "test_speaking_voice_enhancement_contract.mjs",
        root / "scripts" / "r8_release_matrix.mjs",
        root / "docs" / "project" / "R8_PRE_PUBLIC_MATRIX.json",
        root / "scripts" / "test_speech_api_bounds.py",
        root / "static" / "becoming" / "domain" / "rank.js",
        root / "static" / "becoming" / "domain" / "feedback-map.js",
        root / "static" / "becoming" / "screens" / "home.js",
        root / "static" / "becoming" / "screens" / "write.js",
        root / "static" / "becoming" / "screens" / "review.js",
        root / "static" / "becoming" / "screens" / "reading.js",
        root / "static" / "becoming" / "screens" / "library.js",
        root / "static" / "becoming" / "screens" / "grammar.js",
        root / "static" / "becoming" / "grammar.css",
        root / "static" / "becoming" / "components" / "grammar-learning.js",
        root / "scripts" / "test_m4_grammar_ui.mjs",
        root / "scripts" / "test_m4_grammar_learning_renderer.mjs",
        root / "writing_coach" / "grammar_knowledge.py",
        root / "writing_coach" / "grammar_learning_model.py",
        root / "tests" / "test_grammar_learning_model.py",
        root / "docs" / "ORENA_GRAMMAR_LEARNING_MODEL_V1.md",
        root / "writing_coach" / "languages" / "english" / "grammar_knowledge.json",
        root / "writing_coach" / "languages" / "english" / "grammar_knowledge_base.py",
        root / "writing_coach" / "languages" / "chinese" / "grammar_knowledge.json",
        root / "writing_coach" / "languages" / "chinese" / "grammar_knowledge_base.py",
        root / "scripts" / "audit_static_grammar_knowledge.py",
        root / "tests" / "test_static_grammar_knowledge.py",
        root / "static" / "becoming" / "screens" / "journey.js",
        root / "static" / "becoming" / "screens" / "profile.js",
        root / "static" / "becoming" / "screens" / "onboarding.js",
        root / "BECOMING_FRONTEND_VERSION",
        root / "static" / "becoming" / "tempo.css",
        root / "static" / "becoming" / "tempo.js",
        root / "static" / "becoming" / "orena" / "tokens.css",
        root / "static" / "becoming" / "orena" / "shell.css",
        root / "static" / "becoming" / "orena" / "shell.js",
        root / "static" / "becoming" / "orena" / "home.css",
        root / "static" / "becoming" / "orena" / "writing.css",
        root / "static" / "becoming" / "orena" / "adopt.css",
        root / "scripts" / "validate_browser_esm_graph.mjs",
        root / "docs" / "BECOMING_UIUX_SKILL.md",
        root / "docs" / "BECOMING_DESIGN_TOKENS.json",
        root / "docs" / "BECOMING_VISUAL_REFERENCE_ALIGNMENT_ADDENDUM.md",
        root / "docs" / "BECOMING_HIGH_FIDELITY_IMPLEMENTATION_MODE.md",
        root / "docs" / "BECOMING_UIUX_IMPLEMENTATION_CONTRACT.md",
        root / "docs" / "PUBLIC_DEPLOYMENT.md",
        root / "scripts" / "validate_public_staging_readiness.py",
        root / "docs" / "PUBLIC_PRODUCT_RELEASE_ROADMAP.md",
    ]
    for path in required:
        if not path.exists():
            errors.append(f"missing required path: {path.relative_to(root)}")

    if errors:
        fail(errors)

    def read(rel: str) -> str:
        return (root / rel).read_text(encoding="utf-8")

    app = read("app.py")
    compose = read("compose.yaml")
    template = read("templates/becoming/index.html")
    api = read("static/becoming/api.js")
    store = read("static/becoming/store.js")
    app_js = read("static/becoming/app.js")
    app_css = read("static/becoming/app.css")
    theme_js = read("static/becoming/theme.js")
    theme_css = read("static/becoming/theme.css")
    visual_css = read("static/becoming/visual-alignment.css")
    orena_tokens = read("static/becoming/orena/tokens.css")
    orena_shell_css = read("static/becoming/orena/shell.css")
    orena_home_css = read("static/becoming/orena/home.css")
    orena_writing_css = read("static/becoming/orena/writing.css")
    orena_profile_css = read("static/becoming/orena/profile.css")
    router = read("static/becoming/router.js")
    primitives = read("static/becoming/components/primitives.js")
    dictionary = read("static/becoming/components/dictionary.js")
    rank_frame = read("static/becoming/components/rank-frame.js")
    i18n = read("static/becoming/domain/i18n.js")
    screen_contract = read("static/becoming/domain/screen-contract.js")
    skill_release = read("static/becoming/domain/skill-release.js")
    shadowing_practice = read("static/becoming/domain/shadowing-practice.js")
    shared_media_session = read("static/becoming/domain/shared-media-session.js")
    audio_recorder = read("static/becoming/components/audio-recorder.js")
    listening_screen = read("static/becoming/screens/listening.js")
    speaking_screen = read("static/becoming/screens/speaking.js")
    speaking_css = read("static/becoming/speaking.css")
    orena_speaking_css = read("static/becoming/orena/speaking.css")
    speech_api = read("writing_coach/speech_api.py")
    speech_asr = read("writing_coach/speech_asr.py")
    speech_pronunciation = read("writing_coach/speech_pronunciation.py")
    speaking_evaluator = read("writing_coach/speaking_evaluator.py")
    r8_matrix = read("scripts/r8_release_matrix.mjs")
    r8_matrix_report = read("docs/project/R8_PRE_PUBLIC_MATRIX.json")
    skill_registry = read("writing_coach/core/skill_registry.py")
    platform_api = read("writing_coach/core/platform_api.py")
    rank_domain = read("static/becoming/domain/rank.js")
    feedback_map = read("static/becoming/domain/feedback-map.js")
    phase3_css = read("static/becoming/phase3.css")
    phase4_css = read("static/becoming/phase4.css")
    phase7_css = read("static/becoming/phase7.css")
    screens = {
        name: read(f"static/becoming/screens/{name}.js")
        for name in ["home", "write", "review", "reading", "library", "journey", "profile", "onboarding"]
    }
    memory_service = root / "writing_coach" / "becoming_memory.py"
    practice_service = root / "writing_coach" / "becoming_practice.py"
    outcome_service = root / "writing_coach" / "becoming_outcomes.py"
    library_service = root / "writing_coach" / "becoming_library.py"
    reading_service = root / "writing_coach" / "becoming_reading.py"
    linguistics_service = root / "writing_coach" / "becoming_linguistics.py"
    specialized_repository = root / "writing_coach" / "persistence" / "specialized_repository.py"
    memory_text = memory_service.read_text(encoding="utf-8")
    library_text = library_service.read_text(encoding="utf-8")
    reading_text = reading_service.read_text(encoding="utf-8")
    linguistics_text = linguistics_service.read_text(encoding="utf-8")
    specialized_repository_text = specialized_repository.read_text(encoding="utf-8")
    frontend_version = read("BECOMING_FRONTEND_VERSION").strip()

    # Historical source/deployment incidents.
    if not app.endswith("\n") or app.endswith("\n\n"):
        errors.append("INC-006: app.py must end with exactly one newline")
    if "writing_data:/data" not in compose:
        errors.append("INC-002: persistent writing_data:/data mount missing")
    for mount in [
        "./static:/app/static:ro",
        "./templates:/app/templates:ro",
        "./app.py:/app/app.py:ro",
        "./writing_coach:/app/writing_coach:ro",
    ]:
        if mount not in compose:
            errors.append(f"INC-002: local source bind mount missing: {mount}")

    if "/static/becoming/" in template:
        errors.append("INC-003: template regressed to legacy /static/becoming asset URLs")
    if "/becoming-assets/" not in template:
        errors.append("INC-003: dedicated /becoming-assets route not used")
    for asset in [
        "tokens.css", "theme.css", "base.css", "app.css", "physical.css",
        "phase3.css", "phase4.css", "phase5.css", "phase6.css", "phase7.css", "phase8.css",
        "visual-alignment.css",
    ]:
        if f"/becoming-assets/{asset}" not in template:
            errors.append(f"asset contract missing: {asset}")

    for path, label in [
        (memory_service, "becoming_memory.py"),
        (practice_service, "becoming_practice.py"),
        (outcome_service, "becoming_outcomes.py"),
        (library_service, "becoming_library.py"),
        (reading_service, "becoming_reading.py"),
        (linguistics_service, "becoming_linguistics.py"),
    ]:
        service_only(errors, path, label)

    for forbidden in [
        "becoming_memory_router", "becoming_practice_router", "becoming_outcomes_router",
        "becoming_library_router", "becoming_reading_router", "becoming_linguistics_router",
    ]:
        if forbidden in app:
            errors.append(f"INC-005: indirect router registration reintroduced: {forbidden}")

    # Explicit API route contracts through Reading Studio.
    route_contracts = [
        '@app.get("/api/learner-profile"',
        '@app.put("/api/learner-profile"',
        '@app.get("/api/learning-memory"',
        '@app.get("/api/practice-recommendation"',
        '@app.post("/api/practice/next"',
        '@app.get("/api/practice-outcome/{essay_id}"',
        '@app.get("/api/practice-outcomes"',
        '@app.get("/api/library/vocabulary"',
        '@app.post("/api/library/vocabulary"',
        '@app.post("/api/library/vocabulary/{word}/review"',
        '@app.delete("/api/library/vocabulary/{word}"',
        '@app.get("/api/reading/sessions"',
        '@app.get("/api/reading/session/{session_id}"',
        '@app.post("/api/reading/session"',
        '@app.post("/api/reading/session/{session_id}/answer"',
        '@app.post("/api/essays/{essay_id}/linguistic-annotations"',
    ]
    for needle in route_contracts:
        count = app.count(needle)
        if count != 1:
            errors.append(f"route contract count={count}, expected=1: {needle}")

    # Historical behavior must survive the v1.3.2 repository-boundary move.
    # Accept the old direct connection spelling or the new explicit SQLite
    # repository adapter, but require one of them for every protected service.
    adapter_contracts = [
        ("configure_becoming_memory(db)", "configure_becoming_memory(_learning_repository.connect)", "configure_becoming_memory(_specialized_learning_repository)"),
        ("configure_becoming_outcomes(db)", "configure_becoming_outcomes(_learning_repository.connect)", "configure_becoming_outcomes(_specialized_learning_repository)"),
        ("configure_becoming_library(db)", "configure_becoming_library(_learning_repository.connect)", "configure_becoming_library(_specialized_learning_repository)"),
        ("configure_becoming_reading(db, generate_structured)", "configure_becoming_reading(_learning_repository.connect, generate_structured)", "configure_becoming_reading(_specialized_learning_repository, generate_structured)"),
        ("configure_becoming_linguistics(db, generate_structured)", "configure_becoming_linguistics(_learning_repository.connect, generate_structured)", "configure_becoming_linguistics(_specialized_learning_repository)"),
    ]
    for old_needle, core_needle, specialized_needle in adapter_contracts:
        if old_needle not in app and core_needle not in app and specialized_needle not in app:
            errors.append(f"historical app contract missing repository adapter: {old_needle}")
    schema_initializers = [
        "_learning_repository.initialize(schema_version=SCHEMA_VERSION)",
        "_specialized_learning_repository.initialize()",
        "_learning_cache.initialize()",
    ]
    schema_positions = [app.find(item) for item in schema_initializers]
    if any(position < 0 for position in schema_positions):
        errors.append("v1.3.4 schema initialization call missing")
    elif schema_positions != sorted(schema_positions):
        errors.append("v1.3.4 schema initialization order must be core, specialized, cache")
    require_contains(errors, app, [
        "practice_context: PracticeContextIn | None",
        'd["practice_context"]',
        "strength_evidence_json",
    ], "historical app contract")
    learning_repo_text_for_contract = read("writing_coach/persistence/learning_repository.py") if (root / "writing_coach/persistence/learning_repository.py").exists() else ""
    if '"UPDATE essays SET module_data_json = ? WHERE id = ?"' not in app and "module_data_json = ?" not in learning_repo_text_for_contract:
        errors.append("historical app contract missing practice-context persistence")

    if "SCHEMA_VERSION = 11" not in app:
        errors.append("backend schema version 11 missing")

    # Phase 5–8 feature ownership.
    require_contains(errors, api, [
        "practiceRecommendation:", "nextPractice:", "practiceOutcome:", "practiceOutcomes:",
        "libraryVocabulary:", "saveLibraryVocabulary:", "reviewLibraryVocabulary:",
        "deleteLibraryVocabulary:", "readingSessions:", "readingSession:",
        "createReadingSession:", "submitReadingAnswers:", "linguisticAnnotations:",
    ], "API client")
    if "api.practiceRecommendation()" not in screens["home"] or "api.nextPractice(" not in screens["home"]:
        errors.append("Home does not use the server personalized-practice engine")
    compact_write = re.sub(r"\s+", "", screens["write"])
    if "practice_context:state.draft.practiceContext" not in compact_write:
        errors.append("Writing does not submit persisted practice context")
    if "api.practiceOutcome(result.id)" not in screens["write"]:
        errors.append("Writing does not resolve immediate practice outcome")
    if "practiceOutcomeBlock" not in screens["review"]:
        errors.append("Review does not render practice outcome")
    if "api.practiceOutcomes(1)" not in screens["home"]:
        errors.append("Home does not surface latest practice outcome")

    require_contains(errors, library_text, [
        "def list_library_vocabulary", "def save_library_vocabulary",
        "def review_library_vocabulary", "def delete_library_vocabulary",
    ], "Library service")
    require_contains(errors, reading_text, [
        "def create_reading_session", "def submit_reading_answers", "def _public_question",
        "comprehension_check_only", "def _term_occurs",
    ], "Reading service")
    require_contains(errors, specialized_repository_text, [
        "CREATE TABLE IF NOT EXISTS vocabulary_learning",
        "CREATE TABLE IF NOT EXISTS reading_sessions",
        "CREATE TABLE IF NOT EXISTS reading_attempts",
    ], "specialized repository schema")
    for forbidden in ["requests.", "OLLAMA_URL", "/api/chat"]:
        if forbidden in reading_text:
            errors.append(f"Reading service bypasses shared AI abstraction: {forbidden}")

    # v2.7.1 permanent UI root-cause fixes.
    if ".main-content:focus-visible{outline:none}" not in app_css.replace("\n", ""):
        errors.append("INC-007: full-page main-content focus rail fix missing")
    require_contains(errors, store, [
        "becoming.draft.v2", "becoming.draft.v1", "function activateLanguage",
        "function clearLanguageDerivedState", "state.lastEvaluation=null",
        "becoming.support-language.v1", "export function setSupportLanguage",
        "export function supportLanguage",
    ], "language state isolation")
    if "previousRoute==='review'" not in app_js:
        errors.append("INC-008: cross-language Review invalidation missing")
    require_contains(errors, feedback_map, ["expandLexicalRange", "export function sentenceContext"], "feedback mapping")
    if "writingProgressOverview" not in screens["journey"]:
        errors.append("Writing progress overview missing from Journey")
    if "export function helpTip" not in primitives:
        errors.append("shared help tooltip primitive missing")
    if "dictionaryResultMarkup" not in screens["library"] or "selectionLookupButton" not in screens["write"]:
        errors.append("shared dictionary/Pinyin assistance regressed")

    # v2.7.2 profile migration: additive theme preference only.
    require_contains(errors, memory_text, [
        "native_language: str", "theme_preset: str",
        '"native_language": "vi"', '"theme_preset": "editorial"',
    ], "learner profile migration")
    require_contains(errors, specialized_repository_text, [
        "ADD COLUMN native_language", "ADD COLUMN theme_preset",
    ], "learner profile schema migration")

    # Interface localization is a separate product layer from learning language.
    require_contains(errors, i18n, [
        "export function uiLocale", "export function t", "export function applyChromeI18n",
        "export function categoryLabel", "export function masteryLabel",
        "export function practiceModeLabel", "export function topicLabel",
    ], "interface i18n")
    if "becoming.support-language.v1" not in template:
        errors.append("initial HTML does not restore interface language before module boot")
    for name, text in screens.items():
        if "../domain/i18n.js" not in text or "t(" not in text:
            errors.append(f"{name}.js is not routed through the shared interface i18n layer")

    # Prevent the known half-language dynamic fields in non-Vietnamese interfaces.
    if "uiLocale()==='vi'&&payload.translation_vi" not in dictionary:
        errors.append("dictionary translation_vi is not gated to Vietnamese interface locale")
    if "uiLocale()==='vi'?(checked.explanation_vi" not in screens["reading"]:
        errors.append("Reading explanation_vi can leak into non-Vietnamese interface locale")
    if "uiLocale()==='vi'?item.translation_vi" not in screens["library"]:
        errors.append("Library translation_vi can leak into non-Vietnamese interface locale")

    # Design philosophy contract: every current/future route requires explicit learner-goal metadata.
    route_match = re.search(r"VALID\s*=\s*new Set\(\[([^\]]+)\]\)", router, re.S)
    if not route_match:
        errors.append("could not read router VALID route set")
        routes: set[str] = set()
    else:
        routes = set(re.findall(r"['\"]([a-z_-]+)['\"]", route_match.group(1)))
    contracts = set(re.findall(r"^\s{2}([a-z_-]+):\{", screen_contract, re.M))
    if routes and routes != contracts:
        errors.append(f"screen-contract routes do not match router routes: router={sorted(routes)} contract={sorted(contracts)}")
    require_contains(errors, screen_contract, [
        "learnerGoal:", "dominantIdea:", "primaryAction:", "progressiveDisclosure:", "evidence:",
        "visualHero:", "surfaceHierarchy:", "themeBias:", "accentPolicy:", "fidelityMode:'high'",
    ], "BECOMING screen design + visual alignment contract")

    # v2.11 HIGH-FIDELITY IMPLEMENTATION MODE.
    high_fidelity_doc = read("docs/BECOMING_HIGH_FIDELITY_IMPLEMENTATION_MODE.md")
    require_contains(errors, high_fidelity_doc, [
        "HIGH-FIDELITY IMPLEMENTATION MODE",
        "physical depth",
        "component thickness",
        "ICON CONSISTENCY",
        "REQUIRED PHASE 4",
        "TOP 3 GAP REFINEMENT",
        "VISUAL QA SCORE",
    ], "high-fidelity execution contract")

    require_contains(errors, app_js, [
        "const SCREEN_INDEX={",
        "root.dataset.screenIndex=SCREEN_INDEX[route]||''",
    ], "editorial screen landmark runtime")

    require_contains(errors, visual_css, [
        "BECOMING v2.11 — HIGH-FIDELITY IMPLEMENTATION MODE",
        "--hf-depth-raised:",
        "--hf-depth-hero:",
        "--hf-depth-control:",
        "--hf-depth-control-pressed:",
        ".main-content::before",
        ".nav-icon{",
        "box-shadow:var(--hf-depth-control)",
        ".home-folio .folio-spread",
        ".writing-hero-surface",
        ".review-focus-hero",
        ".reading-passage.reading-hero-surface",
        ".library-recall-hero",
        ".progress-hero",
        ".growth-rank",
    ], "high-fidelity visual system")

    # Physicality must be layered rather than one generic shadow.
    for needle in [
        "inset 0 1px 0",
        "0 3px 0",
        "var(--hf-contact-tight)",
        "var(--hf-ambient)",
    ]:
        if needle not in visual_css:
            errors.append(f"high-fidelity material/depth cue missing: {needle}")

    # Main nav icons must stay one coherent stroke/tile family.
    require_contains(errors, visual_css, [
        "stroke-width:1.9",
        "stroke-linecap:round",
        "stroke-linejoin:round",
        ".primary-nav a.active .nav-icon",
    ], "high-fidelity icon family")

    # High fidelity must remain responsive and avoid nested Journey cards.
    if ".journey-section-surface .journey-entry.visual-raised-surface" not in visual_css or "box-shadow:none" not in visual_css:
        errors.append("high-fidelity Journey evidence flattening missing")
    if "@media(max-width:720px)" not in visual_css or "overflow-x:auto" not in visual_css:
        errors.append("high-fidelity mobile navigation continuation missing")

    # v2.10 combined bug fixes + dashboard + linguistic lens.
    require_contains(errors, linguistics_text, [
        "CACHE_KEY = \"linguistic_annotations_v1\"",
        "def configure_becoming_linguistics",
        "def linguistic_annotations_for_essay",
        "module_data_json",
        "parts_of_speech_learning_aid",
    ], "linguistic annotation service")
    for forbidden in ["APIRouter", "@router.", "app.include_router", "requests.", "OLLAMA_URL", "/api/chat"]:
        if forbidden in linguistics_text:
            errors.append(f"linguistic annotation service bypasses service/API ownership: {forbidden}")

    if "function revisionList(groups=[])" not in screens["journey"]:
        errors.append("Journey regression: revisionList helper is missing")
    if "${revisionList(groups)}" not in screens["journey"]:
        errors.append("Journey revision evidence is not integrated into the main flow")

    require_contains(errors, primitives, [
        "export function installTooltipLayer",
        "data-tooltip=",
        "globalHelpTooltip",
    ], "shared tooltip portal")
    if "help-tip-popover" in primitives:
        errors.append("shared tooltip regressed to nested popover markup that can be clipped")
    if "installTooltipLayer();" not in app_js:
        errors.append("global tooltip layer is not installed during app bootstrap")
    if ".global-help-tooltip" not in app_css:
        errors.append("global tooltip portal styles missing")

    require_contains(errors, screens["home"], [
        "writingDashboardMarkup", "home.dashboard_kicker",
        "dashboardJourneyLink", "metricOverview(dashboard)",
    ], "Home Writing Dashboard")
    if ".writing-dashboard{" not in visual_css:
        errors.append("Writing Dashboard visual hierarchy/styles missing")
    if "api.dashboard()" not in screens["home"] or "api.learningMemory()" not in screens["home"]:
        errors.append("Writing Dashboard does not reuse existing evidence APIs")

    require_contains(errors, screens["review"], [
        "installLinguisticLens", "posLensToggle", "api.linguisticAnnotations",
        "review.pos_kicker", "review.pos_legend",
    ], "Review parts-of-speech lens")
    require_contains(errors, feedback_map, [
        "normalizedPosAnnotations", "renderAnnotatedSlice",
        "pos-token", "error-mark",
    ], "combined evidence/POS text renderer")
    if ".pos-token" not in phase3_css or ".evidence-mark.error-mark" not in phase3_css:
        errors.append("POS underline or semantic error emphasis styles missing")
    if "var(--color-important)" not in phase3_css:
        errors.append("error evidence does not reuse the Important semantic design token")

    # M1.6 shared-media Shadowing integration.
    require_contains(errors, shadowing_practice, [
        "createShadowingPracticeSession",
        "selectShadowingPracticeSegment",
        "recordShadowingPracticeRound",
        "shadowingPracticeSummary",
        "asset_id",
        "current_segment_id",
    ], "M1.6 Shadowing session domain")
    for forbidden in [
        "fetch(",
        "MediaRecorder",
        "SpeechRecognition",
        "pronunciation_evaluator",
        "speaking_evaluator",
    ]:
        if forbidden in shadowing_practice:
            errors.append(f"M1.6 Shadowing domain must remain local/session-only: {forbidden}")
    require_contains(errors, listening_screen, [
        "createShadowingPracticeSession",
        "selectShadowingPracticeSegment",
        "recordShadowingPracticeRound",
        "shadowingPracticeSummary",
        "shadowingWorkspace",
        "data-shadow-selected",
        "data-shadow-round",
        "shadowingSession",
        "'shadowing'",
    ], "M1.6 shared-media Shadowing integration")
    for forbidden in [
        "MediaRecorder",
        "SpeechRecognition",
        "pronunciation_evaluator",
        "speaking_evaluator",
    ]:
        if forbidden in listening_screen:
            errors.append(f"M1.6 must not activate recording/evaluation scope: {forbidden}")
    speaking_contract = re.search(
        r'SkillCapability\(\s*key="speaking",\s*'
        r'release_state=SkillReleaseState\.DEVELOPMENT,\s*'
        r'source_available=True,\s*'
        r'internal_available=True,\s*\)',
        skill_registry,
        re.S,
    )
    if not speaking_contract:
        errors.append(
            "Speaking Core must remain DEVELOPMENT + internal-only, not PUBLIC"
        )

    # Product-visible internal Speaking Core: shared media + browser recording +
    # authenticated ASR and provider-backed pronunciation boundaries. Audio remains
    # non-persistent; pronunciation scores are per-take evidence, not proficiency.
    require_contains(errors, shared_media_session, [
        "setSharedMediaSession", "getSharedMediaSession",
        "selectSharedMediaSegment", "learning_language",
    ], "shared media session bridge")
    for forbidden in ["fetch(", "localStorage", "sessionStorage"]:
        if forbidden in shared_media_session:
            errors.append(f"shared media session must remain memory-only: {forbidden}")

    require_contains(errors, audio_recorder, [
        "getUserMedia", "MediaRecorder", "createObjectURL",
        "revokeObjectURL", "cleanup", "processingMode=processingPipeline.mode",
        "mode:'rnnoise-enhanced'",
    ], "local enhanced audio recorder")
    require_contains(errors, speaking_screen, [
        "getSharedMediaSession", "createLocalAudioRecorder",
        "data-speaking-record", "data-speaking-stop",
        "data-speaking-discard", "data-speaking-replay",
        "audio controls", "go('listen')",
        "transcribe=api.transcribeSpeech", "await transcribe(",
        "pronunciationAssess=api.assessPronunciation", "await pronunciationAssess(",
        "data-speaking-asr-result", "data-speaking-content-match",
        "data-speaking-pronunciation", "data-score-kind", "synthetic_demo",
    ], "internal Speaking Core")
    require_contains(errors, api, [
        "transcribeSpeech:", "/api/speech/transcribe", "new FormData()",
        "assessPronunciation:", "/api/speech/pronunciation",
    ], "Speaking API client boundary")
    require_contains(errors, speech_api, [
        'router = APIRouter(prefix="/api/speech"',
        'router.post("/transcribe")',
        'router.post("/pronunciation")',
        "configure_speech_pronunciation",
        "async def _read_upload_limited",
        "async def _read_pronunciation_upload_limited",
        "data = await _read_upload_limited(file, max_bytes=max_bytes)",
    ], "bounded authenticated speech API")
    require_contains(errors, speech_asr, [
        'provider_id = "groq"', "def max_bytes(self) -> int:",
        "whisper-large-v3-turbo",
    ], "Groq speech ASR adapter")
    require_contains(errors, speech_pronunciation, [
        'provider_id = "azure-speech"', "AZURE_SPEECH_KEY", "AZURE_SPEECH_REGION",
        "Pronunciation-Assessment", "pcm_s16le", "zh-CN", "en-US",
        "DemoPronunciationProvider", "synthetic_demo", "PRONUNCIATION_PROVIDER",
    ], "Azure pronunciation assessment adapter")
    require_contains(errors, speaking_evaluator, [
        "build_speaking_evaluation", "LANGUAGE_LOCALES", "transcription_confidence",
        "deterministic_reference_alignment", '"proficiency": None',
        '"synthetic_demo"',
    ], "R7 per-take Speaking evaluation contract")
    require_contains(errors, r8_matrix, [
        "R8-pre-public-en-zh", "test_writing_evaluation_flow.mjs",
        "test_speaking_ui.mjs", "provider_credentials", "public_promotion",
        "writing_public:false", "speaking_public:false",
    ], "R8 EN/ZH pre-public release matrix")
    require_contains(errors, r8_matrix_report, [
        '"matrix": "R8-pre-public-en-zh"', '"writing_public": false',
        '"speaking_public": false', '"capability_activation": false',
        '"provider_credentials"', '"postgres_migration"', '"public_promotion"',
    ], "R8 matrix evidence report")
    for forbidden in [
        "fetch(", "FormData", "XMLHttpRequest",
        "SpeechRecognition", "pronunciation_evaluator",
        "speaking_evaluator", "accuracy_percent",
    ]:
        if forbidden in speaking_screen or forbidden in audio_recorder:
            errors.append(
                f"Speaking screen/recorder bypasses API boundary or claims unsupported scoring: {forbidden}"
            )
    require_contains(errors, template, [
        'data-route="speak" data-skill="speaking" hidden',
        f"/becoming-assets/speaking.css?v={frontend_version}",
    ], "Speaking internal navigation")
    require_contains(errors, router, ["'speak'"], "Speaking route")
    require_contains(errors, skill_release, ["speak:'speaking'"], "Speaking release route")
    require_contains(errors, app_js, ["renderSpeaking", "speak:renderSpeaking"], "Speaking app registration")
    require_contains(errors, screen_contract, ["speak:{", "Record my voice"], "Speaking screen contract")
    if ".speaking-workspace" not in speaking_css or ".speaking-recorder" not in speaking_css:
        errors.append("Speaking Core product-visible layout styles missing")
    require_contains(errors, orena_speaking_css, [
        ".o-pronunciation-evidence", ".o-pronunciation-word-head",
        ".o-pronunciation-phoneme",
    ], "Orena Speaking pronunciation evidence styles")

    # Orena Phase 2 Grammar Learning Model foundation.
    grammar_learning_component = read("static/becoming/components/grammar-learning.js")
    grammar_learning_model = read("writing_coach/grammar_learning_model.py")
    grammar_knowledge_contract = read("writing_coach/grammar_knowledge.py")
    grammar_screen = read("static/becoming/screens/grammar.js")
    grammar_css = read("static/becoming/grammar.css")
    grammar_learning_doc = read("docs/ORENA_GRAMMAR_LEARNING_MODEL_V1.md")

    require_contains(errors, grammar_learning_model, [
        "CANONICAL_FLOW", '"notice"', '"understand"', '"connect"', '"compare"',
        '"apply"', '"recall"', '"transfer"', "ALLOWED_BLOCK_TYPES",
        "validate_grammar_learning_model", "APPLY, RECALL and TRANSFER",
        "SEMANTIC_ROLES", "INTERACTION_TYPES", '"common_mistake"', '"exception"',
    ], "Grammar learning-model contract")
    require_contains(errors, grammar_knowledge_contract, [
        "validate_grammar_learning_model", 'source.get("content_status") == "curated"',
        "requires a validated learning_model", "legacy lesson.mistakes",
        "legacy lesson.exceptions",
    ], "Grammar curated-content gate")
    require_contains(errors, app, [
        '"learning_model": dict(knowledge.get("learning_model") or {})',
        '"source": "static-grammar-kb"',
    ], "Grammar static rich-content API")
    require_contains(errors, grammar_learning_component, [
        "GrammarFormula", "SemanticSentence", "TransformationFlow", "WordOrderFlow",
        "ParticleInsertion", "TimelineVisual", "ContrastCard", "RealLifeScene",
        "SentenceBuilder", "CommonMistake", "GrammarException", "MicroPractice",
        "PersonalPractice", "RecallPrompt", "MemoryHook", "SkillTransfer",
        "grammarLearningCompletion", "data-learning-evidence-stage", "data-interaction-type", "flowLabel",
    ], "Grammar reusable learning renderer")
    require_contains(errors, grammar_screen, [
        f"../components/grammar-learning.js?v={frontend_version}",
        "hasGrammarLearningModel(detail.learning_model)",
        "renderGrammarLearningModel(detail.learning_model",
        "legacyLessonBody(detail,c)",
        "grammarLearningCompletion(slot,detail.learning_model",
    ], "Grammar rich/legacy rollout boundary")
    require_contains(errors, grammar_css, [
        ".grammar-learning-flow", ".grammar-formula", ".grammar-sentence-flow",
        ".grammar-timeline", ".grammar-memory-hook", ".grammar-skill-transfer",
        "var(--color-informational)", "var(--color-attention)",
        "var(--color-important)", "var(--color-positive)",
    ], "Grammar visual-memory foundation")
    require_contains(errors, grammar_learning_doc, [
        "FOUNDATION / NOT YET VISUALLY APPROVED",
        "NOTICE → UNDERSTAND → CONNECT → COMPARE → APPLY → RECALL → TRANSFER",
        "Semantic role contract", "Micro-practice interaction contract",
        "incorrect → WHY → correct", "No horizontal scrolling",
        "No full 508-item migration",
    ], "Grammar Phase 2 hard gate")
    for forbidden in ["fetch(", "XMLHttpRequest", "/api/chat", "OLLAMA_URL"]:
        if forbidden in grammar_learning_component or forbidden in grammar_learning_model:
            errors.append(f"Grammar learning foundation bypasses static/shared runtime boundary: {forbidden}")
    for forbidden in ["<small>BEFORE</small>", "<small>AFTER</small>", 'aria-label="Grammar learning flow"']:
        if forbidden in grammar_learning_component:
            errors.append(f"Grammar rich renderer hard-codes learner chrome: {forbidden}")
    for forbidden in ["min-width:max-content", ".grammar-learning-flow{grid-template-columns:repeat(4,minmax(110px,1fr));overflow-x:auto}"]:
        if forbidden in grammar_css:
            errors.append(f"Grammar core content can force horizontal scrolling: {forbidden}")

    # M4.3 Phase 3 — representative English quality gate.
    phase3_targets = {
        "a1-be-am-is-are",
        "a2-present-perfect-vs-past-simple",
        "b1-passive-voice-present-and-past",
    }
    english_grammar_knowledge = json.loads(
        (root / "writing_coach/languages/english/grammar_knowledge.json").read_text(
            encoding="utf-8"
        )
    )
    phase3_curated = {
        item["id"]
        for item in english_grammar_knowledge
        if item.get("source", {}).get("content_status") == "curated"
    }
    if phase3_curated != phase3_targets:
        errors.append(
            "Grammar Phase 3 must keep exactly three representative English "
            f"curated IDs before mass migration: {sorted(phase3_curated)}"
        )
    phase3_by_id = {item["id"]: item for item in english_grammar_knowledge}
    for grammar_id in sorted(phase3_targets):
        model = phase3_by_id.get(grammar_id, {}).get("learning_model")
        if not isinstance(model, dict) or model.get("schema_version") != 2:
            errors.append(
                f"Grammar Phase 3 representative missing learning_model: {grammar_id}"
            )
            continue
        block_types = {
            block.get("type")
            for block in model.get("blocks", [])
            if isinstance(block, dict)
        }
        for required_type in {
            "scene", "common_mistake", "personal_practice",
            "recall", "memory_hook", "skill_transfer",
        }:
            if required_type not in block_types:
                errors.append(
                    f"Grammar Phase 3 {grammar_id} missing block: {required_type}"
                )
    for grammar_id in sorted(phase3_targets):
        model = phase3_by_id.get(grammar_id, {}).get("learning_model") or {}
        policy = model.get("language_policy") or {}
        if policy.get("target_language") != "en":
            errors.append(
                f"Grammar Phase 3 {grammar_id} target-language policy is not English"
            )
        if not model.get("capabilities"):
            errors.append(
                f"Grammar Phase 3 {grammar_id} has no visualization capabilities"
            )

    phase3_doc = (
        root / "docs/ORENA_GRAMMAR_PHASE3_ENGLISH_REPRESENTATIVES.md"
    ).read_text(encoding="utf-8")
    require_contains(errors, phase3_doc, [
        "IMPLEMENTED / UNIVERSAL + MOBILE HARDENING APPLIED / VISUAL RECHECK PENDING",
        "a1-be-am-is-are",
        "a2-present-perfect-vs-past-simple",
        "b1-passive-voice-present-and-past",
        "full 508-item migration remains BLOCKED",
        "Phase 3 cannot be marked APPROVED until screenshot QA is completed",
    ], "Grammar Phase 3 representative hard gate")

    universal_grammar_doc = read("docs/ORENA_GRAMMAR_UNIVERSAL_ARCHITECTURE.md")
    require_contains(errors, universal_grammar_doc, [
        "PHASE 3A IMPLEMENTED / VISUAL RECHECK PENDING",
        "target language",
        "interface language",
        "explanation language",
        "translation language",
        "Future languages",
        "Mass migration",
    ], "Universal Grammar architecture contract")

    grammar_runtime = read("writing_coach/languages/runtime.py")
    for forbidden in [
        "CHINESE_GRAMMAR_COURSE",
        "ENGLISH_GRAMMAR_COURSE",
        "CHINESE_GRAMMAR_KNOWLEDGE_BY_ID",
        "ENGLISH_GRAMMAR_KNOWLEDGE_BY_ID",
    ]:
        if forbidden in grammar_runtime:
            errors.append(
                f"Universal Grammar runtime still hard-codes language selection: {forbidden}"
            )

    grammar_component = read("static/becoming/components/grammar-learning.js")
    for forbidden in [
        "targetLanguage==='zh'",
        'targetLanguage === "zh"',
        "hidePinyin",
        "showPinyin",
    ]:
        if forbidden in grammar_component:
            errors.append(
                f"Universal Grammar shared renderer hard-codes language behavior: {forbidden}"
            )
    require_contains(errors, grammar_component, [
        "grammarLanguageContext",
        "interfaceLanguage",
        "explanationLanguage",
        "translationLanguage",
        "targetLanguage",
        "data-reading-aid-toggle",
        "AgreementMap",
        "InflectionTable",
    ], "Universal Grammar renderer contract")

    phase3b_mobile_doc = read(
        "docs/ORENA_GRAMMAR_PHASE3B_MOBILE_HARDENING.md"
    )
    require_contains(errors, phase3b_mobile_doc, [
        "IMPLEMENTED / VISUAL RECHECK PENDING",
        "320px", "360px", "375px", "390px", "414px", "430px",
        "MASS MIGRATION REMAINS BLOCKED",
        "shared by block type/capability",
    ], "Grammar Phase 3B mobile hardening contract")

    phase3b_marker = "/* ORENA Grammar Mobile Hardening — M4.3 Phase 3B"
    if phase3b_marker not in grammar_css:
        errors.append("Grammar Phase 3B mobile CSS marker missing")
    else:
        phase3b_start = grammar_css.index(phase3b_marker)
        phase3b_next_marker = (
            "/* ORENA Grammar Mobile Viewport Containment — M4.3 Phase 3B.1"
        )
        phase3b_end = grammar_css.find(phase3b_next_marker, phase3b_start)
        phase3b_css = grammar_css[
            phase3b_start : phase3b_end if phase3b_end > phase3b_start else None
        ]
        for needle in [
            "@media(max-width:640px)",
            '.main-content[data-screen-contract="grammar"]',
            ".grammar-lesson",
            ".grammar-visual-canvas",
            ".grammar-formula-line",
            ".grammar-formula-part",
            ".grammar-sentence-flow",
            ".grammar-transformation",
            ".grammar-lesson-actions",
            "grid-template-columns:minmax(0,1fr)",
            "max-width:100%",
            "min-width:0",
        ]:
            if needle not in phase3b_css:
                errors.append(
                    f"Grammar Phase 3B mobile layout contract missing: {needle}"
                )
        for forbidden in [
            "overflow-x:auto",
            "min-width:max-content",
            "white-space:nowrap",
        ]:
            if forbidden in phase3b_css:
                errors.append(
                    f"Grammar Phase 3B core lesson can force horizontal layout: {forbidden}"
                )

    phase3b1_marker = (
        "/* ORENA Grammar Mobile Viewport Containment — M4.3 Phase 3B.1"
    )
    if phase3b1_marker not in grammar_css:
        errors.append("Grammar Phase 3B.1 viewport containment marker missing")
    else:
        phase3b1_start = grammar_css.index(phase3b1_marker)
        phase3b1_next_marker = (
            "/* ORENA Grammar Roadmap Typography — M4.3 Phase 3B.2"
        )
        phase3b1_end = grammar_css.find(phase3b1_next_marker, phase3b1_start)
        phase3b1_css = grammar_css[
            phase3b1_start : phase3b1_end if phase3b1_end > phase3b1_start else None
        ]
        for needle in [
            'body:has(.main-content[data-screen-contract="grammar"])',
            ".app-shell",
            ".app-workspace",
            '.main-content[data-screen-contract="grammar"]',
            "max-width:100vw",
            "overflow-x:hidden",
            "contain:inline-size",
            "overflow-wrap:anywhere",
            "white-space:normal",
        ]:
            if needle not in phase3b1_css:
                errors.append(
                    f"Grammar Phase 3B.1 viewport contract missing: {needle}"
                )

    full_rollout_doc = read("docs/ORENA_GRAMMAR_FULL_EN_ZH_ROLLOUT.md")
    require_contains(errors, full_rollout_doc, [
        "STRUCTURAL ROLLOUT COMPLETE / BROAD QA PENDING",
        "269 / 269",
        "239 / 239",
        "508 / 508",
        "Runtime AI: **0**",
        "source-adapted-v1",
        "FULL STRUCTURAL ROLLOUT IS COMPLETE",
    ], "Universal Grammar full EN/ZH rollout contract")

    chinese_grammar_knowledge = json.loads(
        (root / "writing_coach/languages/chinese/grammar_knowledge.json").read_text(
            encoding="utf-8"
        )
    )
    full_rollout_sets = {
        "en": english_grammar_knowledge,
        "zh": chinese_grammar_knowledge,
    }
    expected_full_counts = {"en": 269, "zh": 239}
    full_rollout_total = 0
    for language_code, items in full_rollout_sets.items():
        if len(items) != expected_full_counts[language_code]:
            errors.append(
                f"Universal Grammar {language_code} coverage changed: {len(items)}"
            )
        for item in items:
            grammar_id = item.get("id", "<missing>")
            model = item.get("learning_model")
            if not isinstance(model, dict) or model.get("schema_version") != 2:
                errors.append(
                    f"Universal Grammar full rollout missing schema-v2 model: "
                    f"{language_code}:{grammar_id}"
                )
                continue
            if model.get("language_policy", {}).get("target_language") != language_code:
                errors.append(
                    f"Universal Grammar target-language mismatch: "
                    f"{language_code}:{grammar_id}"
                )
            if item.get("source", {}).get("runtime_ai") is not False:
                errors.append(
                    f"Universal Grammar runtime AI must stay disabled: "
                    f"{language_code}:{grammar_id}"
                )
            if not item.get("source", {}).get("universal_model_status"):
                errors.append(
                    f"Universal Grammar migration marker missing: "
                    f"{language_code}:{grammar_id}"
                )
            full_rollout_total += 1
    if full_rollout_total != 508:
        errors.append(
            f"Universal Grammar full rollout must cover 508 entries, got "
            f"{full_rollout_total}"
        )

    # Navigation routes should be tactile controls without adding/changing routes.
    for needle in [
        ".primary-nav a{",
        "box-shadow:var(--depth-1)",
        ".primary-nav a:hover",
        ".primary-nav a.active",
    ]:
        if needle not in visual_css:
            errors.append(f"tactile navigation contract missing: {needle}")

    # Visual alignment addendum: shared material/depth system and one clear hero per major screen.
    require_contains(errors, visual_css, [
        "--depth-0:", "--depth-1:", "--depth-2:", "--depth-3:", "--depth-4:",
        "--visual-section-tone:", "--visual-raised-tone:", "--visual-hero-tone:",
        ".visual-section-surface", ".visual-raised-surface", ".visual-hero-surface",
    ], "BECOMING visual depth/material system")
    if 'var(--depth-3)' not in visual_css:
        errors.append("visual hero surfaces do not reuse shared DEPTH-3 token")
    if 'var(--depth-4)' not in visual_css:
        errors.append("floating controls do not reuse shared DEPTH-4 token")
    if "storedTheme() || 'light'" not in theme_js:
        errors.append("light-first default identity missing; dark must remain an explicit display preference")
    if '/becoming-assets/visual-alignment.css' not in template:
        errors.append("visual-alignment.css is not loaded by the BECOMING template")
    if template.find('/becoming-assets/visual-alignment.css') < template.find('/becoming-assets/phase8.css'):
        errors.append("visual-alignment.css must load after phase CSS so shared calibration wins without page-specific patches")

    # Canonical product shell: same route IA, Orena desktop rail and mobile drawer.
    require_contains(errors, template, [
        'id="app" class="o-shell"', 'class="o-sidebar"', 'class="o-workspace"',
        'class="o-nav-icon"', 'data-sidebar="expanded"', 'data-drawer="closed"',
        'id="drawerToggle"', 'aria-controls="primaryNav"',
        'data-i18n-label', 'data-learning-language-label',
    ], "canonical product shell")
    require_contains(errors, orena_tokens, [
        '--o-sidebar-w:', '--o-header-h:', '--o-shadow-card:', '--o-motion:',
    ], "Orena visual tokens")
    require_contains(errors, orena_shell_css, [
        '.o-shell{', '.o-sidebar{', '.o-workspace{', '.o-nav{',
        '@media (max-width:1023px)', '.o-shell[data-drawer="open"]',
    ], "Orena responsive shell")
    require_contains(errors, orena_home_css, [
        '.o-hero{', '.o-home-split{', '.o-journey{', '.o-stages{',
    ], "Orena Home composition")
    require_contains(errors, orena_writing_css, [
        '.o-write{', '.o-editor{', '.o-review{', '.o-doc{',
    ], "Orena Writing and Review composition")
    require_contains(errors, visual_css, [
        '--shell-sidebar-width:', '.app-sidebar{', '.app-workspace{',
        '.home-editorial-hero{', '.home-folio{', '.folio-spread{',
        '.home-journey-panel{', '.home-stage-track{',
    ], "canonical visual grammar")
    if "const label=node.querySelector('[data-i18n-label]')" not in i18n:
        errors.append("chrome i18n can destroy navigation icons instead of updating only the nav label")
    require_contains(errors, skill_registry, [
        'key="writing"', 'key="speaking"', 'key="reading"', 'key="listening"',
        'SkillReleaseState.PUBLIC', 'SkillReleaseState.DEVELOPMENT', 'HIDDEN = "hidden"',
    ], "public skill release registry")
    require_contains(errors, platform_api, [
        '@router.get("/api/platform/skills")', '"policy": "language-wide"',
    ], "public skill platform contract")
    require_contains(errors, template, [
        'data-route="write" data-skill="writing"',
        'data-route="read" data-skill="reading"',
        'data-route="listen" data-skill="listening"',
    ], "skill-aware navigation")
    require_contains(errors, app_js + skill_release, [
        "applySkillNavigation(state.skills", "item.public_available===true",
        "item.internal_available===true",
    ], "shared skill navigation contract")
    if 'html[data-theme="dark"][data-palette="editorial"]' not in visual_css:
        errors.append("canonical dark visual calibration missing")
    if '--theme-accent-600:#FF6A00' not in visual_css:
        errors.append("canonical dark orange signal is not preserved")

    visual_screen_contracts = {
        "home": ["o-hero", "o-journey", "o-stages"],
        "write": ["o-write", "o-editor", "o-write-aside", "o-write-sticky"],
        "review": ["o-review", "o-doc", "o-review-aside"],
        "reading": ["o-reader", "o-reading-grid", "data-reading-rail"],
        "library": ["o-recall-head", "o-lib-body", "o-lib-rail"],
        "journey": ["o-journey-focus", "o-journey-body-grid", "o-target"],
        "profile": ["visual-identity-column"],
        "onboarding": ["visual-onboarding-stage"],
    }
    for screen_name, needles in visual_screen_contracts.items():
        require_contains(errors, screens[screen_name], needles, f"{screen_name} visual hierarchy")
    if "writing-progress-grid" in screens["journey"]:
        errors.append("Journey regressed to same-weight metric card grid instead of one primary progress object")
    if "screenContract(route)" not in app_js:
        errors.append("runtime does not attach/check the BECOMING screen design contract")

    # Functional asynchronous feedback: no silent user-triggered waiting.
    require_contains(errors, primitives, [
        "export function spinner", "export function setBusy", "export async function runBusy",
        "export function showLoadingDialog", "export function updateDialog",
    ], "shared async feedback primitives")
    if "showLoadingDialog(" not in dictionary or "api.dictionary" not in dictionary:
        errors.append("dictionary/Pinyin lookup does not show immediate loading state before existing API call")
    if ".busy-spinner" not in app_css or "@keyframes becoming-spin" not in app_css:
        errors.append("shared visible busy indicator styles missing")
    if "o-topbar-actions')?.classList.add('is-processing')" not in app_js:
        errors.append("interface-language switch lacks visible processing state")

    # Chinese Review Pinyin: visible by default (auto/on), hidden only by explicit Profile setting.
    review = screens["review"]
    profile = screens["profile"]
    require_contains(errors, review, [
        "review-pinyin-summary", "pinyinPlaceholder", "hydrateReviewPinyin",
        "api.dictionary(term)", "state.profile?.pinyin==='off'", "busy.loading_pinyin",
    ], "Chinese Review Pinyin")
    require_contains(errors, profile, [
        "profilePinyin", "profile.pinyin_auto", "profile.pinyin_on", "profile.pinyin_off",
    ], "Pinyin user setting")
    if ".review-pinyin" not in phase3_css or ".review-pinyin-overview" not in phase3_css:
        errors.append("Chinese Review Pinyin visual/processing states missing")

    # Theme personalization: palette family is separate from light/dark and server profile persistence.
    require_contains(errors, theme_js, [
        "becoming.palette.v1", "editorial", "sage", "clay", "blueprint",
        "export function applyPalette", "export function activePalette", "THEME_PALETTES",
    ], "theme palette runtime")
    for palette in ["sage", "clay", "blueprint"]:
        if f'html[data-palette="{palette}"]' not in theme_css:
            errors.append(f"theme CSS palette missing: {palette}")
    require_contains(errors, profile, [
        "profileTheme", "THEME_PALETTES.map", "applyPalette", "theme_preset",
    ], "Profile theme preference")
    require_contains(errors, orena_profile_css, [
        ".profile-page .theme-choice-grid", ".profile-page .theme-choice.selected",
        ".profile-page .theme-swatch",
    ], "Profile palette selector visual system")

    # Growth Rank: original evidence-derived identity frame, not activity XP or external benchmark.
    require_contains(errors, rank_domain, [
        "deriveGrowthRank", "revision_wins", "reliableStrengths", "masteredStrengths",
        "claim:'internal_growth_rank'",
    ], "growth rank derivation")
    require_contains(errors, rank_frame, [
        "growth-rank-frame", "profile.rank.note", "rank-evidence-row", "rank-progress",
    ], "growth rank frame")
    if "growthRankFrame(rank)" not in profile:
        errors.append("Profile does not render the evidence-derived growth rank")
    if ".growth-rank-frame" not in app_css:
        errors.append("growth rank visual frame missing")
    rank_text = (rank_domain + rank_frame).lower()
    for forbidden in ["streak", "leaderboard", "moba", "league of legends", "mobile legends"]:
        if forbidden in rank_text:
            errors.append(f"growth rank uses forbidden activity/brand concept: {forbidden}")
    if re.search(r"\bxp\b", rank_text):
        errors.append("growth rank uses forbidden activity concept: xp")

    # New UI layers cannot bypass current network/AI architecture.
    for label, text in [
        ("dictionary", dictionary), ("i18n", i18n), ("rank", rank_domain + rank_frame),
        ("theme", theme_js), ("screen-contract", screen_contract), ("visual-alignment", visual_css),
    ]:
        for forbidden in ["/api/chat", "OLLAMA_URL", "requests."]:
            if forbidden in text:
                errors.append(f"{label} bypasses existing API/AI abstraction: {forbidden}")

    # INC-004 PowerShell URI interpolation regression.
    unsafe = re.compile(r"\$[A-Za-z_][A-Za-z0-9_]*\?")
    for ps1 in root.rglob("*.ps1"):
        for lineno, line in enumerate(ps1.read_text(encoding="utf-8", errors="replace").splitlines(), 1):
            if line.lstrip().startswith("#"):
                continue
            if unsafe.search(line):
                errors.append(f"unsafe PowerShell URI interpolation: {ps1.relative_to(root)}:{lineno}")

    # PostgreSQL foundation remains present behind the v1.4 central runtime selector.
    postgres_required = [
        root / "alembic.ini",
        root / "migrations" / "env.py",
        root / "migrations" / "versions" / "20260811_0001_postgres_foundation.py",
        root / "writing_coach" / "persistence" / "models.py",
        root / "writing_coach" / "persistence" / "importer.py",
        root / "writing_coach" / "persistence" / "product_repository.py",
        root / "scripts" / "postgres_shadow.py",
        root / "scripts" / "archive" / "release-gates" / "validate_postgres_foundation.py",
        root / "docs" / "POSTGRES_FOUNDATION.md",
    ]
    for path in postgres_required:
        if not path.exists():
            errors.append(f"v1.3 PostgreSQL foundation missing: {path.relative_to(root)}")
    requirements = read("requirements.txt")
    for dep in ["SQLAlchemy>=2.0,<3", "alembic>=1.13,<2", "psycopg[binary]>=3.1,<4"]:
        if dep not in requirements:
            errors.append(f"v1.3 PostgreSQL foundation dependency missing: {dep}")
    product_service = read("writing_coach/product/service.py")
    persistence_runtime = read("writing_coach/persistence/runtime.py")
    if "configure_product_repository" not in app or "Product repository has not been installed" not in product_service:
        errors.append("v1.4 product repository is not installed fail-closed by the central runtime")
    for repository in [
        "PostgresAuthRepository(engine)", "PostgresPlatformRepository(engine)",
        "PostgresProductRepository(engine)", "PostgresLearningRepository(engine)",
        "PostgresSpecializedLearningRepository(engine)",
    ]:
        if repository not in persistence_runtime:
            errors.append(f"v1.4 PostgreSQL runtime family missing: {repository}")
    if "build_runtime(" not in app or "PERSISTENCE_BACKEND" not in persistence_runtime:
        errors.append("v1.4 central persistence runtime selection missing")
    if "create_shadow_engine" in app:
        errors.append("v1.4 runtime must not select the shadow PostgreSQL engine")
    deployment = read("writing_coach/core/deployment.py")
    if "PUBLIC_BASE_URL is required when APP_ENV=production." not in deployment:
        errors.append("v1.3.5 production public-origin guard missing")
    if "Google authentication must be configured when APP_ENV=production." not in deployment:
        errors.append("v1.3.5 production authentication guard missing")
    if '"/api/readiness"' not in read("auth_support.py") or '@app.get("/api/readiness")' not in app:
        errors.append("v1.3.5 non-sensitive readiness route missing")
    public_deployment = read("docs/PUBLIC_DEPLOYMENT.md")
    staging_validator = read("scripts/validate_public_staging_readiness.py")
    require_contains(errors, public_deployment, [
        "PERSISTENCE_BACKEND=postgresql", "POSTGRES_RUNTIME_URL=postgresql+psycopg://...",
        "APP_BIND_HOST=127.0.0.1", "Cloudflare Tunnel -> writing-coach:8000 -> PostgreSQL",
        "POSTGRES_SHADOW_URL", "Do not rerun migration, import, rehearsal, or parity commands",
    ], "v1.4 public PostgreSQL staging contract")
    require_contains(errors, staging_validator, [
        "resolve_deployment_config(env)", 'backend == "postgresql"',
        "_valid_runtime_url(raw_runtime_url)", 'APP_BIND_HOST", "")).strip() == "127.0.0.1"',
        'CLOUDFLARE_TUNNEL_TOKEN", "")).strip()',
    ], "v1.4 secret-safe public staging validator")
    # v1.4 PostgreSQL-first runtime contract. D-001/D-002 supersede the
    # historical pre-cutover rule that required PostgreSQL to be opt-in.
    writing_service = compose.split("  writing-coach:", 1)[1].split("\n  postgres:", 1)[0]
    postgres_service = compose.split("\n  postgres:", 1)[1].split("\n  cloudflared:", 1)[0]
    if "PERSISTENCE_BACKEND: ${PERSISTENCE_BACKEND:-postgresql}" not in writing_service:
        errors.append("v1.4 PostgreSQL-first guard: writing-coach default backend is not PostgreSQL")
    if "POSTGRES_RUNTIME_URL: ${POSTGRES_RUNTIME_URL:-postgresql+psycopg://" not in writing_service:
        errors.append("v1.4 PostgreSQL-first guard: local runtime URL default is missing")
    if "POSTGRES_SHADOW_URL: ${POSTGRES_SHADOW_URL:-}" not in writing_service:
        errors.append("v1.4 PostgreSQL-first guard: shadow URL separation is missing")
    if "POSTGRES_RUNTIME_URL: ${POSTGRES_SHADOW_URL" in compose:
        errors.append("v1.4 PostgreSQL-first guard: shadow URL must never select runtime")
    if "depends_on:" not in writing_service or "condition: service_healthy" not in writing_service:
        errors.append("v1.4 PostgreSQL-first guard: writing-coach does not wait for healthy PostgreSQL")
    if 'profiles: ["postgres"]' in postgres_service:
        errors.append("v1.4 PostgreSQL-first guard: PostgreSQL service must not be opt-in")
    if 'backend=os.getenv("PERSISTENCE_BACKEND", "postgresql")' not in app:
        errors.append("v1.4 PostgreSQL-first guard: application entrypoint can silently default to SQLite")

    # Repository boundaries remain storage-neutral while the central runtime owns
    # the selected SQLite or PostgreSQL implementations.
    readiness_required = [
        root / "writing_coach" / "persistence" / "auth_repository.py",
        root / "writing_coach" / "persistence" / "platform_repository.py",
        root / "writing_coach" / "persistence" / "read_compare.py",
        root / "scripts" / "persistence_readiness.py",
        root / "scripts" / "archive" / "release-gates" / "validate_persistence_readiness.py",
        root / "docs" / "PERSISTENCE_RUNTIME_READINESS.md",
    ]
    for path in readiness_required:
        if not path.exists():
            errors.append(f"v1.3.1 persistence readiness missing: {path.relative_to(root)}")
    auth_text = read("auth_support.py")
    platform_ai_text = read("writing_coach/ai/platform.py")
    auth_repo_text = read("writing_coach/persistence/auth_repository.py") if (root / "writing_coach/persistence/auth_repository.py").exists() else ""
    platform_repo_text = read("writing_coach/persistence/platform_repository.py") if (root / "writing_coach/persistence/platform_repository.py").exists() else ""
    if "import sqlite3" in auth_text or "sqlite3.connect" in auth_text:
        errors.append("v1.3.1 auth boundary regression: auth_support.py bypasses AuthRepository")
    if "configure_auth_repository" not in auth_text or not all(
        name in auth_repo_text for name in ["SQLiteAuthRepository", "PostgresAuthRepository"]
    ):
        errors.append("v1.4 auth repository contract incomplete")
    if "import sqlite3" in platform_ai_text or "sqlite3.connect" in platform_ai_text:
        errors.append("v1.3.1 platform boundary regression: ai/platform.py bypasses PlatformRepository")
    if "configure_platform_repository" not in platform_ai_text or not all(
        name in platform_repo_text for name in ["SQLitePlatformRepository", "PostgresPlatformRepository"]
    ):
        errors.append("v1.4 platform repository contract incomplete")
    if "_persistence_runtime.learning_repository" not in app:
        errors.append("v1.4 learning repository is not owned by the central runtime")
    learning_repo_path = root / "writing_coach" / "persistence" / "learning_repository.py"
    if learning_repo_path.exists():
        learning_repo_text = read("writing_coach/persistence/learning_repository.py")
        if "class PostgresLearningRepository" not in learning_repo_text:
            errors.append("v1.3.2 learning repository PostgreSQL implementation missing")
        if "conn.execute(" in app or "import sqlite3" in app:
            errors.append("v1.3.2 learning core boundary regression: app.py still owns SQLite SQL")

    # M4 full grammar curriculum foundation: audited coverage, locked syllabus,
    # graded practice, review/checkpoints, and explicit non-mastery semantics.
    grammar_required = [
        root / "writing_coach" / "languages" / "english" / "grammar_curriculum.json",
        root / "writing_coach" / "languages" / "english" / "grammar_curriculum.py",
        root / "writing_coach" / "languages" / "chinese" / "grammar_curriculum.json",
        root / "writing_coach" / "languages" / "chinese" / "grammar_curriculum.py",
        root / "scripts" / "audit_full_grammar_curriculum.py",
        root / "tests" / "test_full_grammar_curriculum.py",
    ]
    for path in grammar_required:
        if not path.exists():
            errors.append(f"M4 full grammar curriculum missing: {path.relative_to(root)}")
    if all(path.exists() for path in grammar_required):
        grammar_catalog_text = read("writing_coach/grammar_catalog.py")
        runtime_text = read("writing_coach/languages/runtime.py")
        require_contains(errors, grammar_catalog_text, [
            "_RICH_REQUIRED", "module_scope", "practice_blueprint", "official_mapping", "production",
        ], "M4 rich grammar catalog")
        require_contains(errors, runtime_text, [
            "LOCKED MODULE BOUNDARY", "LOCKED LESSON SCOPE", "context only", "authoritative teaching target", "PRACTICE BLUEPRINT",
            "Do not copy HSK books", "Do not copy Destination",
        ], "M4 locked grammar lesson prompt")
        require_contains(errors, app, [
            '"curriculum_policy"', '"completion_is_mastery": False',
            '"activity_evidence_not_mastery"', '"static-grammar-kb"',
            "active_grammar_knowledge_by_id", "api_grammar_reference",
        ], "M4 static grammar API semantics")
        for forbidden in [
            "def generate_grammar_lesson(",
            "grammar_lesson_generator",
            "grammar_lesson_prompts",
        ]:
            if forbidden in app:
                errors.append(f"M4.2 runtime Grammar must not generate lessons with AI: {forbidden}")
        grammar_knowledge_text = read("writing_coach/grammar_knowledge.py")
        require_contains(errors, grammar_knowledge_text, [
            "validate_grammar_knowledge", "runtime_ai", "cross_skill",
            "quick_reference", "content_status",
        ], "M4.2 static Grammar Knowledge Base contract")

        grammar_screen = read("static/becoming/screens/grammar.js")
        grammar_css = read("static/becoming/grammar.css")
        require_contains(errors, api, [
            "grammarLibrary:", "grammarLesson:", "grammarReference:", "completeGrammar:", "uncompleteGrammar:",
        ], "M4 Grammar UI API client")
        require_contains(errors, router, ["'grammar'"], "M4 Grammar UI route")
        require_contains(errors, app_js, ["renderGrammar", "grammar:renderGrammar"], "M4 Grammar UI registration")
        require_contains(errors, app_js, [
            f"./router.js?v={frontend_version}",
            f"./domain/screen-contract.js?v={frontend_version}",
            f"./domain/skill-release.js?v={frontend_version}",
            f"./screens/grammar.js?v={frontend_version}",
        ], "M4 route-critical ESM cache busting")
        require_contains(errors, app, [
            'Cache-Control": "no-store, max-age=0',
        ], "BECOMING asset no-store policy")
        require_contains(errors, template, [
            'data-route="grammar"', f"/becoming-assets/grammar.css?v={frontend_version}",
        ], "M4 Grammar UI navigation")
        require_contains(errors, i18n, ["chrome.grammar"], "M4 Grammar UI chrome localization")
        require_contains(errors, screen_contract, ["grammar:{", "Continue curriculum"], "M4 Grammar screen contract")
        require_contains(errors, grammar_screen, [
            "api.grammarLibrary()", "api.grammarLesson(", "api.completeGrammar(", "api.uncompleteGrammar(",
            "guided_practice", "data-grammar-practice-input", "data-grammar-production", "data-grammar-reveal",
            "productionEntries", "sourceLabel",
        ], "M4 Grammar learner-facing screen")
        for internal_leak in ["listBlock(c.targetScope,detail.scope)", "detail.module_scope", "detail.restrictions"]:
            if internal_leak in grammar_screen:
                errors.append(f"M4 Grammar UI leaks internal syllabus metadata: {internal_leak}")
        for forbidden in ["fetch(", "XMLHttpRequest"]:
            if forbidden in grammar_screen:
                errors.append(f"M4 Grammar UI bypasses shared API client: {forbidden}")
        require_contains(errors, grammar_css, [
            ".grammar-hero", ".grammar-module", ".grammar-lesson-layout", ".grammar-production",
        ], "M4 Grammar learner-facing styles")

    # Version/cache consistency.
    # INC-009: browser modules must be validated as an ESM graph.
    node = shutil.which("node")
    if not node:
        errors.append("INC-009: Node.js is required for browser ESM graph validation")
    else:
        esm = subprocess.run(
            [
                node,
                "--experimental-vm-modules",
                str(root / "scripts" / "validate_browser_esm_graph.mjs"),
                str(root),
            ],
            capture_output=True,
            text=True,
        )
        if esm.returncode != 0:
            detail = (esm.stderr or esm.stdout or "browser ESM graph failed").strip()
            errors.append(f"INC-009: {detail}")

    if args.expected and frontend_version != args.expected:
        errors.append(f"BECOMING_FRONTEND_VERSION={frontend_version}, expected={args.expected}")
    if f"?v={frontend_version}" not in template:
        errors.append(f"template cache query does not match BECOMING_FRONTEND_VERSION {frontend_version}")

    if errors:
        fail(errors)

    print("BECOMING RELEASE GATE OK")
    print(f"Frontend version: {frontend_version}")
    print("Guarded: historical incidents + v2.10 product contracts + HIGH-FIDELITY visual execution + v1.4 central persistence runtime + public skill release architecture + PostgreSQL public staging")


if __name__ == "__main__":
    main()
