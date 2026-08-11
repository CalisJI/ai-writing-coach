from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
STATIC=ROOT/"static"/"becoming"
TEMPLATE=ROOT/"templates"/"becoming"/"index.html"

errors=[]

def require(condition,message):
    if not condition:
        errors.append(message)

required=[
    ROOT/"app.py",
    ROOT/"writing_coach"/"becoming_library.py",
    ROOT/"writing_coach"/"becoming_library_selftest.py",
    ROOT/"scripts"/"becoming_release_gate.py",
    STATIC/"phase7.css",
    STATIC/"app.js",
    STATIC/"router.js",
    STATIC/"api.js",
    STATIC/"store.js",
    STATIC/"screens"/"review.js",
    STATIC/"screens"/"library.js",
    TEMPLATE,
    ROOT/"BECOMING_FRONTEND_VERSION",
]
for path in required:
    require(path.exists(),f"Missing {path.relative_to(ROOT)}")

if not errors:
    app=(ROOT/"app.py").read_text(encoding="utf-8")
    service=(ROOT/"writing_coach"/"becoming_library.py").read_text(encoding="utf-8")
    html=TEMPLATE.read_text(encoding="utf-8")
    app_js=(STATIC/"app.js").read_text(encoding="utf-8")
    router=(STATIC/"router.js").read_text(encoding="utf-8")
    api=(STATIC/"api.js").read_text(encoding="utf-8")
    store=(STATIC/"store.js").read_text(encoding="utf-8")
    review=(STATIC/"screens"/"review.js").read_text(encoding="utf-8")
    library=(STATIC/"screens"/"library.js").read_text(encoding="utf-8")
    version=(ROOT/"BECOMING_FRONTEND_VERSION").read_text(encoding="utf-8").strip()

    require(version=="2.6.0","BECOMING_FRONTEND_VERSION must be 2.6.0")
    require("SCHEMA_VERSION = 8" in app,"Phase 7 schema version 8 missing")
    require("ensure_becoming_library_schema(conn)" in app,"library schema hook missing")
    require("configure_becoming_library(db)" in app,"library DB configuration missing")

    for contract in [
        '@app.get("/api/library/vocabulary"',
        '@app.post("/api/library/vocabulary"',
        '@app.post("/api/library/vocabulary/{word}/review"',
        '@app.delete("/api/library/vocabulary/{word}"',
    ]:
        require(contract in app,f"Library route missing: {contract}")

    # Preserve the legacy dictionary/vocabulary API instead of breaking old UI.
    require('@app.get("/api/dictionary")' in app,"legacy dictionary endpoint regressed")
    require('@app.get("/api/vocabulary")' in app,"legacy vocabulary GET regressed")
    require('@app.post("/api/vocabulary")' in app,"legacy vocabulary POST regressed")
    require('@app.delete("/api/vocabulary/{word}")' in app,"legacy vocabulary DELETE regressed")

    require("APIRouter" not in service,"becoming_library.py must remain service-only")
    require("@router." not in service,"becoming_library.py must not declare router decorators")
    require("app.include_router" not in service,"becoming_library.py must not register routes")
    require("CREATE TABLE IF NOT EXISTS vocabulary_learning" in service,"vocabulary learning table missing")
    require("INSERT OR IGNORE INTO vocabulary_learning" in service,"legacy saved-word migration missing")
    require("STAGE_LABELS" in service,"recall stage vocabulary missing")
    require('pattern=r"^(again|got_it)$"' in service,"review result contract missing")
    require("timedelta(minutes=10)" in service,"Again reschedule behavior missing")
    require("successful_recalls" in service and "lapse_count" in service,"recall evidence counters missing")

    require("/becoming-assets/phase7.css?v=2.6.0" in html,"Phase 7 stylesheet missing")
    require("/becoming-assets/app.js?v=2.6.0" in html,"Phase 7 cache version missing")
    require('data-route="library"' in html,"Library nav item missing")
    require("/static/becoming/" not in html,"legacy BECOMING asset path reintroduced")

    require("'library'" in router,"Library route missing from router")
    require("renderLibrary" in app_js,"Library screen missing from app screen registry")
    require("libraryVocabulary:null" in store,"Library state missing")

    for needle in [
        "dictionary:",
        "libraryVocabulary:",
        "saveLibraryVocabulary:",
        "reviewLibraryVocabulary:",
        "deleteLibraryVocabulary:",
    ]:
        require(needle in api,f"Library API client missing: {needle}")

    require("ACTIVE RECALL" in library,"active recall surface missing")
    require("Show meaning" in library,"progressive reveal missing")
    require("Again" in library and "Got it" in library,"recall actions missing")
    require("self-reported recall evidence" in library,"recall evidence disclaimer missing")
    require("api.dictionary(term)" in library,"existing dictionary integration missing")
    require("api.reviewLibraryVocabulary" in library,"review scheduling integration missing")

    require("data-save-library" in review,"feedback phrase capture missing")
    require("data-save-strength" in review,"strength phrase capture missing")
    require("api.saveLibraryVocabulary" in review,"Review-to-Library API integration missing")

    require(app.endswith("\n") and not app.endswith("\n\n"),"app.py EOF hygiene failed")

if errors:
    print("BECOMING Phase 7 validation FAILED")
    for item in errors:
        print(" -",item)
    raise SystemExit(1)

print("BECOMING Phase 7 validation OK")
print("Library route + evidence capture + active recall + additive schema + legacy vocabulary compatibility present")
