from __future__ import annotations

import argparse
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
        root / "static" / "becoming" / "domain" / "rank.js",
        root / "static" / "becoming" / "domain" / "feedback-map.js",
        root / "static" / "becoming" / "screens" / "home.js",
        root / "static" / "becoming" / "screens" / "write.js",
        root / "static" / "becoming" / "screens" / "review.js",
        root / "static" / "becoming" / "screens" / "reading.js",
        root / "static" / "becoming" / "screens" / "library.js",
        root / "static" / "becoming" / "screens" / "journey.js",
        root / "static" / "becoming" / "screens" / "profile.js",
        root / "static" / "becoming" / "screens" / "onboarding.js",
        root / "BECOMING_FRONTEND_VERSION",
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
    router = read("static/becoming/router.js")
    primitives = read("static/becoming/components/primitives.js")
    dictionary = read("static/becoming/components/dictionary.js")
    rank_frame = read("static/becoming/components/rank-frame.js")
    i18n = read("static/becoming/domain/i18n.js")
    screen_contract = read("static/becoming/domain/screen-contract.js")
    skill_release = read("static/becoming/domain/skill-release.js")
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
        ("configure_becoming_linguistics(db, generate_structured)", "configure_becoming_linguistics(_learning_repository.connect, generate_structured)", "configure_becoming_linguistics(_specialized_learning_repository, generate_structured)"),
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
    if "practice_context:state.draft.practiceContext" not in screens["write"]:
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

    # Canonical product shell: same route IA, stronger composed desktop navigation.
    require_contains(errors, template, [
        'class="app-sidebar"', 'class="app-workspace"', 'class="nav-icon"',
        'data-i18n-label', 'data-learning-language-label',
    ], "canonical product shell")
    require_contains(errors, visual_css, [
        '--shell-sidebar-width:', '.app-sidebar{', '.app-workspace{',
        '.home-editorial-hero{', '.home-folio{', '.folio-spread{',
        '.home-journey-panel{', '.home-stage-track{',
    ], "canonical visual grammar")
    if "const label=node.querySelector('[data-i18n-label]')" not in i18n:
        errors.append("chrome i18n can destroy navigation icons instead of updating only the nav label")
    require_contains(errors, skill_registry, [
        'key="writing"', 'key="speaking"', 'key="reading"', 'key="listening"',
        'SkillReleaseState.PUBLIC', 'SkillReleaseState.DEVELOPMENT', 'SkillReleaseState.HIDDEN',
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
        "home": ["home-folio", "folio-spread", "home-journey-panel", "home-stage-track"],
        "write": ["writing-hero-surface", "visual-hero-surface"],
        "review": ["review-focus-hero", "visual-hero-surface", "review-paper-surface"],
        "reading": ["reading-hero-surface", "visual-hero-surface"],
        "library": ["library-recall-hero", "visual-hero-surface"],
        "journey": ["progress-hero", "visual-hero-surface", "progress-support-list"],
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
    if "header-actions')?.classList.add('is-processing')" not in app_js:
        errors.append("learning-language switch lacks visible processing state")

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
        "profileTheme", "theme-choice-grid", "applyPalette", "theme_preset",
    ], "Profile theme preference")
    if ".theme-choice-grid" not in app_css or ".theme-swatch" not in app_css:
        errors.append("theme selector visual system missing")

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
        root / "scripts" / "validate_postgres_foundation.py",
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
    if 'profiles: ["postgres"]' not in compose:
        errors.append("v1.3 no-cutover guard: PostgreSQL compose service is not opt-in")

    # Repository boundaries remain storage-neutral while the central runtime owns
    # the selected SQLite or PostgreSQL implementations.
    readiness_required = [
        root / "writing_coach" / "persistence" / "auth_repository.py",
        root / "writing_coach" / "persistence" / "platform_repository.py",
        root / "writing_coach" / "persistence" / "read_compare.py",
        root / "scripts" / "persistence_readiness.py",
        root / "scripts" / "validate_persistence_readiness.py",
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
