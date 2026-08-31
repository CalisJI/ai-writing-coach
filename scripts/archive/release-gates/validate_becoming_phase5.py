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
    ROOT / "writing_coach" / "becoming_practice.py",
    ROOT / "writing_coach" / "becoming_practice_selftest.py",
    ROOT / "scripts" / "becoming_release_gate.py",
    STATIC / "phase5.css",
    STATIC / "api.js",
    STATIC / "store.js",
    STATIC / "screens" / "home.js",
    STATIC / "screens" / "write.js",
    TEMPLATE,
    ROOT / "BECOMING_FRONTEND_VERSION",
]

for path in required:
    require(path.exists(), f"Missing {path.relative_to(ROOT)}")

if not errors:
    app = (ROOT / "app.py").read_text(encoding="utf-8")
    practice = (ROOT / "writing_coach" / "becoming_practice.py").read_text(encoding="utf-8")
    html = TEMPLATE.read_text(encoding="utf-8")
    api = (STATIC / "api.js").read_text(encoding="utf-8")
    store = (STATIC / "store.js").read_text(encoding="utf-8")
    home = (STATIC / "screens" / "home.js").read_text(encoding="utf-8")
    write = (STATIC / "screens" / "write.js").read_text(encoding="utf-8")
    version = (ROOT / "BECOMING_FRONTEND_VERSION").read_text(encoding="utf-8").strip()

    require(version == "2.4.0", "BECOMING_FRONTEND_VERSION must be 2.4.0")
    require("SCHEMA_VERSION = 7" in app, "Phase 5 must preserve schema version 7")

    require('@app.get("/api/practice-recommendation"' in app, "practice recommendation route missing")
    require('@app.post("/api/practice/next"' in app, "next practice route missing")
    require("build_practice_recommendation" in app, "practice engine not wired into app.py")
    require("personalize_generated_task" in app, "generated task personalization not wired")

    require("APIRouter" not in practice, "becoming_practice.py must remain service-only")
    require("@router." not in practice, "becoming_practice.py must not declare router decorators")
    require("app.include_router" not in practice, "becoming_practice.py must not register routers")
    require("def build_practice_recommendation" in practice, "recommendation engine missing")
    require("def personalize_generated_task" in practice, "task personalization helper missing")

    require("/becoming-assets/phase5.css?v=2.4.0" in html, "Phase 5 stylesheet not loaded")
    require("/becoming-assets/app.js?v=2.4.0" in html, "Phase 5 cache version missing")
    require("/static/becoming/" not in html, "legacy BECOMING asset route reintroduced")

    require("practiceRecommendation:" in api, "practice recommendation API client missing")
    require("nextPractice:" in api, "next practice API client missing")
    require("practiceRecommendation:null" in store, "practice recommendation state missing")
    require("api.practiceRecommendation()" in home, "Home does not request practice recommendation")
    require("api.nextPractice(" in home, "Home does not start personalized practice")
    require("MEMORY-GUIDED PRACTICE" in write, "Writing does not explain memory-guided practice")
    require("personalization.focus_label" in write, "Writing focus explanation missing")

if errors:
    print("BECOMING Phase 5 validation FAILED")
    for item in errors:
        print(" -", item)
    raise SystemExit(1)

print("BECOMING Phase 5 validation OK")
print("Personalized recommendation + explicit routes + memory-guided task + stabilized release contracts present")
