from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
STATIC = ROOT / "static" / "becoming"
TEMPLATE = ROOT / "templates" / "becoming" / "index.html"

errors = []


def require(condition, message):
    if not condition:
        errors.append(message)


required = [
    ROOT / "app.py",
    ROOT / "writing_coach" / "becoming_memory.py",
    ROOT / "writing_coach" / "becoming_memory_selftest.py",
    ROOT / "writing_coach" / "becoming_memory_selftest.py",
    STATIC / "phase4.css",
    STATIC / "api.js",
    STATIC / "store.js",
    STATIC / "app.js",
    STATIC / "domain" / "feedback.js",
    STATIC / "domain" / "feedback-map.js",
    STATIC / "screens" / "home.js",
    STATIC / "screens" / "journey.js",
    STATIC / "screens" / "profile.js",
    STATIC / "screens" / "onboarding.js",
    STATIC / "screens" / "review.js",
    TEMPLATE,
    ROOT / "BECOMING_FRONTEND_VERSION",
]

for path in required:
    require(path.exists(), f"Missing {path.relative_to(ROOT)}")

if not errors:
    app_py = (ROOT / "app.py").read_text(encoding="utf-8")
    memory_py = (ROOT / "writing_coach" / "becoming_memory.py").read_text(encoding="utf-8")
    html = TEMPLATE.read_text(encoding="utf-8")
    api = (STATIC / "api.js").read_text(encoding="utf-8")
    store = (STATIC / "store.js").read_text(encoding="utf-8")
    app_js = (STATIC / "app.js").read_text(encoding="utf-8")
    home = (STATIC / "screens" / "home.js").read_text(encoding="utf-8")
    journey = (STATIC / "screens" / "journey.js").read_text(encoding="utf-8")
    review = (STATIC / "screens" / "review.js").read_text(encoding="utf-8")
    fmap = (STATIC / "domain" / "feedback-map.js").read_text(encoding="utf-8")
    frontend_version = (ROOT / "BECOMING_FRONTEND_VERSION").read_text(encoding="utf-8").strip()

    require(frontend_version == "2.3.0", "BECOMING_FRONTEND_VERSION must be 2.3.0")
    require('SCHEMA_VERSION = 7' in app_py, "backend schema version 7 missing")
    require('strength_evidence_json' in app_py, "strength evidence persistence missing")
    require('"strength_evidence": {' in app_py, "strength evidence evaluator schema missing")
    require('result["strength_evidence"]' in app_py, "strength evidence validation missing")
    require('configure_becoming_memory(db)' in app_py, "BECOMING memory DB configuration missing")
    require('app.include_router(becoming_memory_router)' in app_py, "BECOMING memory router is not explicitly registered")

    require('CREATE TABLE IF NOT EXISTS learner_profile' in memory_py, "persistent learner profile table missing")
    require('@router.get("/api/learner-profile")' in memory_py, "learner profile GET missing")
    require('@router.put("/api/learner-profile")' in memory_py, "learner profile PUT missing")
    require('@router.get("/api/learning-memory")' in memory_py, "learning memory API missing")
    require('Mastered' in memory_py and 'Stable' in memory_py, "mastery vocabulary missing")

    require('/becoming-assets/phase4.css?v=2.3.0' in html, "Phase 4 stylesheet not loaded")
    require('/becoming-assets/app.js?v=2.3.0' in html, "Phase 4 app cache version missing")
    require('/static/becoming/' not in html, "BECOMING template regressed to legacy /static/becoming route")

    require('learnerProfile:' in api, "learner profile API client missing")
    require('saveLearnerProfile:' in api, "learner profile save client missing")
    require('learningMemory:' in api, "learning memory client missing")
    require('legacyProfile:' in store, "local profile migration cache missing")
    require('loadProfileForActiveLanguage' in app_js, "server profile bootstrap missing")

    require('api.learningMemory()' in home, "Home does not consume persistent learning memory")
    require('api.learningMemory()' in journey, "Journey does not consume persistent learning memory")
    require('POSITIVE PATTERN MEMORY' in journey, "Journey positive pattern memory missing")
    require('BENCHMARK, SECONDARY' in journey, "benchmark/mastery separation missing")

    require('strength_evidence' in review, "Review does not consume exact strength evidence")
    require('strength-mark' in fmap, "positive evidence inline mapping missing")
    require('data-feedback-key' in fmap, "unified evidence linkage missing")

if errors:
    print("BECOMING Phase 4 validation FAILED")
    for item in errors:
        print(" -", item)
    raise SystemExit(1)

print("BECOMING Phase 4 validation OK")
print("Persistent profile + strength evidence + learning memory + memory-driven Home/Journey present")
