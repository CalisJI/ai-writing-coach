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
    ROOT/"writing_coach"/"becoming_outcomes.py",
    ROOT/"writing_coach"/"becoming_outcomes_selftest.py",
    ROOT/"scripts"/"becoming_release_gate.py",
    STATIC/"phase6.css",
    STATIC/"api.js",
    STATIC/"store.js",
    STATIC/"screens"/"home.js",
    STATIC/"screens"/"write.js",
    STATIC/"screens"/"review.js",
    TEMPLATE,
    ROOT/"BECOMING_FRONTEND_VERSION",
]
for path in required:
    require(path.exists(),f"Missing {path.relative_to(ROOT)}")

if not errors:
    app=(ROOT/"app.py").read_text(encoding="utf-8")
    outcomes=(ROOT/"writing_coach"/"becoming_outcomes.py").read_text(encoding="utf-8")
    html=TEMPLATE.read_text(encoding="utf-8")
    api=(STATIC/"api.js").read_text(encoding="utf-8")
    store=(STATIC/"store.js").read_text(encoding="utf-8")
    home=(STATIC/"screens"/"home.js").read_text(encoding="utf-8")
    write=(STATIC/"screens"/"write.js").read_text(encoding="utf-8")
    review=(STATIC/"screens"/"review.js").read_text(encoding="utf-8")
    version=(ROOT/"BECOMING_FRONTEND_VERSION").read_text(encoding="utf-8").strip()

    require(version=="2.5.0","BECOMING_FRONTEND_VERSION must be 2.5.0")
    require("SCHEMA_VERSION = 7" in app,"Phase 6 must preserve schema v7")
    require("practice_context: PracticeContextIn | None" in app,"EssayIn practice_context missing")
    require("configure_becoming_outcomes(db)" in app,"outcome DB configuration missing")
    require('@app.get("/api/practice-outcome/{essay_id}"' in app,"single outcome route missing")
    require('@app.get("/api/practice-outcomes"' in app,"outcome list route missing")
    require('"UPDATE essays SET module_data_json = ? WHERE id = ?"' in app,"practice context persistence missing")
    require('d["practice_context"]' in app,"essay detail practice context missing")

    require("APIRouter" not in outcomes,"outcome service must remain router-free")
    require("@router." not in outcomes,"outcome service must remain router-free")
    require("app.include_router" not in outcomes,"outcome service must not register routes")
    require("def derive_practice_outcome" in outcomes,"outcome derivation missing")
    require("previous_issue_count" in outcomes,"revision comparison missing")
    require("needs_more_evidence" in outcomes,"conservative transfer status missing")

    require("/becoming-assets/phase6.css?v=2.5.0" in html,"Phase 6 stylesheet missing")
    require("/becoming-assets/app.js?v=2.5.0" in html,"Phase 6 cache version missing")
    require("/static/becoming/" not in html,"legacy BECOMING asset route reintroduced")

    require("practiceOutcome:" in api,"single outcome API client missing")
    require("practiceOutcomes:" in api,"outcome history API client missing")
    require("practiceContext:null" in store,"practiceContext draft state missing")
    require("latestPracticeOutcome:null" in store,"latest outcome state missing")
    require("practice_context:state.draft.practiceContext" in write,"Writing does not submit practice context")
    require("api.practiceOutcome(result.id)" in write,"Writing does not resolve immediate outcome")
    require("practiceContext:null" in write,"manual/fresh writing does not exit memory-guided lane")
    require("practiceOutcomeBlock" in review,"Review outcome block missing")
    require("result.practice_outcome" in review,"Review does not consume outcome")
    require("api.practiceOutcomes(1)" in home,"Home latest outcome request missing")
    require("practiceOutcomeSignal" in home,"Home outcome signal missing")

if errors:
    print("BECOMING Phase 6 validation FAILED")
    for item in errors:
        print(" -",item)
    raise SystemExit(1)

print("BECOMING Phase 6 validation OK")
print("Practice context persistence + conservative outcome derivation + Review/Home closure present")
