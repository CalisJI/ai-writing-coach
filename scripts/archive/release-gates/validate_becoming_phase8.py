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
    ROOT/"writing_coach"/"becoming_reading.py",
    ROOT/"writing_coach"/"becoming_reading_selftest.py",
    ROOT/"scripts"/"becoming_release_gate.py",
    STATIC/"phase8.css",
    STATIC/"app.js",
    STATIC/"router.js",
    STATIC/"api.js",
    STATIC/"store.js",
    STATIC/"screens"/"reading.js",
    TEMPLATE,
    ROOT/"BECOMING_FRONTEND_VERSION",
]
for path in required:
    require(path.exists(),f"Missing {path.relative_to(ROOT)}")

if not errors:
    app=(ROOT/"app.py").read_text(encoding="utf-8")
    service=(ROOT/"writing_coach"/"becoming_reading.py").read_text(encoding="utf-8")
    html=TEMPLATE.read_text(encoding="utf-8")
    app_js=(STATIC/"app.js").read_text(encoding="utf-8")
    router=(STATIC/"router.js").read_text(encoding="utf-8")
    api=(STATIC/"api.js").read_text(encoding="utf-8")
    store=(STATIC/"store.js").read_text(encoding="utf-8")
    reading=(STATIC/"screens"/"reading.js").read_text(encoding="utf-8")
    version=(ROOT/"BECOMING_FRONTEND_VERSION").read_text(encoding="utf-8").strip()

    require(version=="2.7.0","BECOMING_FRONTEND_VERSION must be 2.7.0")
    require("SCHEMA_VERSION = 9" in app,"Phase 8 schema version 9 missing")
    require("ensure_becoming_reading_schema(conn)" in app,"reading schema hook missing")
    require("configure_becoming_reading(db, generate_structured)" in app,"shared AI generator configuration missing")

    for contract in [
        '@app.get("/api/reading/sessions"',
        '@app.get("/api/reading/session/{session_id}"',
        '@app.post("/api/reading/session"',
        '@app.post("/api/reading/session/{session_id}/answer"',
    ]:
        require(contract in app,f"Reading route missing: {contract}")

    # Preserve all established learner-surface contracts.
    for contract in [
        '@app.get("/api/learner-profile"',
        '@app.get("/api/learning-memory"',
        '@app.get("/api/practice-recommendation"',
        '@app.get("/api/practice-outcome/{essay_id}"',
        '@app.get("/api/library/vocabulary"',
        '@app.get("/api/dictionary"',
    ]:
        require(contract in app,f"Historical route regressed: {contract}")

    require("APIRouter" not in service,"becoming_reading.py must remain service-only")
    require("@router." not in service,"becoming_reading.py must not declare router decorators")
    require("app.include_router" not in service,"becoming_reading.py must not register routes")
    require("requests." not in service,"Reading must not bypass shared AI with direct requests")
    require("OLLAMA_URL" not in service,"Reading must not hardcode Ollama")
    require("CREATE TABLE IF NOT EXISTS reading_sessions" in service,"reading_sessions table missing")
    require("CREATE TABLE IF NOT EXISTS reading_attempts" in service,"reading_attempts table missing")
    require("def _public_question" in service,"pre-answer answer-hiding function missing")
    require('"correct_index": item["correct_index"]' not in service.split("def _public_question",1)[1].split("def ",1)[0],"correct answer leaks from public question")
    require("evidence not in passage" in service,"exact passage-evidence validation missing")
    require("actual_recycled" in service,"actual Library-term reuse verification missing")
    require("def _term_occurs" in service,"boundary-safe Library-term occurrence check missing")
    require("comprehension_check_only" in service,"conservative reading claim missing")
    require("_fallback(" in service,"offline/built-in reading fallback missing")

    require("/becoming-assets/phase8.css?v=2.7.0" in html,"Phase 8 stylesheet missing")
    require("/becoming-assets/app.js?v=2.7.0" in html,"Phase 8 cache version missing")
    require('data-route="read"' in html,"Read nav item missing")
    require("/static/becoming/" not in html,"legacy BECOMING asset path reintroduced")

    require("'read'" in router,"Read route missing from router")
    require("renderReading" in app_js,"Reading screen missing from app registry")
    require("state.readingSession=null" in app_js,"language switch does not clear reading session")
    require("readingSession:null" in store and "readingResult:null" in store,"reading state missing")

    for needle in [
        "readingSessions:",
        "readingSession:",
        "createReadingSession:",
        "submitReadingAnswers:",
    ]:
        require(needle in api,f"Reading API client missing: {needle}")

    require("READ · UNDERSTAND" in reading,"Reading editorial identity missing")
    require("READ FOR EVIDENCE, NOT SPEED." in reading,"Reading dominant idea missing")
    require("FROM YOUR LIBRARY" in reading,"Library recycling visibility missing")
    require("Correct answers stay on the server until you submit." in reading,"quiz-integrity message missing")
    require("Find in passage" in reading,"evidence-to-passage interaction missing")
    require("COMPREHENSION CHECK" in reading,"post-answer check missing")
    require("not a CEFR/HSK mastery score" in reading,"benchmark/mastery disclaimer missing")
    require("api.readingSessions(8)" in reading,"reading history missing")
    require("api.submitReadingAnswers" in reading,"answer submission missing")

    require(app.endswith("\n") and not app.endswith("\n\n"),"app.py EOF hygiene failed")

if errors:
    print("BECOMING Phase 8 validation FAILED")
    for item in errors:
        print(" -",item)
    raise SystemExit(1)

print("BECOMING Phase 8 validation OK")
print("Reading Studio + server-held answers + exact evidence + Library recycling + persisted attempts present")
