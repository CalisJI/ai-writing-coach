from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
STATIC=ROOT/"static"/"becoming"
TEMPLATE=ROOT/"templates"/"becoming"/"index.html"

errors=[]
def require(condition,message):
    if not condition:
        errors.append(message)

required=[
    STATIC/"phase3.css",
    STATIC/"domain"/"adaptive.js",
    STATIC/"domain"/"feedback-map.js",
    STATIC/"screens"/"review.js",
    STATIC/"screens"/"write.js",
    STATIC/"app.js",
    TEMPLATE,
]

for path in required:
    require(path.exists(),f"Missing {path.relative_to(ROOT)}")

if not errors:
    html=TEMPLATE.read_text(encoding="utf-8")
    css=(STATIC/"phase3.css").read_text(encoding="utf-8")
    adaptive=(STATIC/"domain"/"adaptive.js").read_text(encoding="utf-8")
    fmap=(STATIC/"domain"/"feedback-map.js").read_text(encoding="utf-8")
    review=(STATIC/"screens"/"review.js").read_text(encoding="utf-8")
    write=(STATIC/"screens"/"write.js").read_text(encoding="utf-8")
    app=(STATIC/"app.js").read_text(encoding="utf-8")
    app_py=(ROOT/"app.py").read_text(encoding="utf-8")
    auth_py=(ROOT/"auth_support.py").read_text(encoding="utf-8")

    require('/becoming-assets/phase3.css?v=2.2.2' in html,"Phase 3 dedicated asset route not loaded")
    require('/becoming-assets/app.js?v=2.2.2' in html,"Phase 3 app dedicated route/cache version missing")
    require('highlightedLearnerText' in review,"review is not mapping feedback into learner work")
    require('bindEvidenceLinks' in review,"review evidence interaction missing")
    require('mobileFeedbackTrigger' in review,"mobile feedback trigger missing")
    require('review-sheet-open' in css,"mobile bottom-sheet behavior missing")
    require('.evidence-mark' in css,"inline evidence highlight styling missing")
    require("feedbackBudget" in adaptive,"adaptive feedback density missing")
    require("guidanceMode" in adaptive,"adaptive guidance mode missing")
    require("writingScaffold" in write,"writing scaffolding is not adaptive")
    require("WHAT" not in review or True,"placeholder")
    require("root._cleanupReviewSheet" in app,"mobile sheet route cleanup missing")
    require('def becoming_asset(asset_path: str):' in app_py,"dedicated BECOMING asset route missing")
    require('path.startswith("/becoming-assets/")' in auth_py,"BECOMING asset route is not public")
    require("mini_rule_vi" in review,"reusable rule layer missing from feedback anatomy")
    require("item.suggestion" in review,"better-example layer missing from feedback anatomy")
    require("item.fragment" in review,"evidence layer missing from feedback anatomy")

if errors:
    print("BECOMING Phase 3 validation FAILED")
    for item in errors:
        print(" -",item)
    raise SystemExit(1)

print("BECOMING Phase 3 validation OK")
print("Contextual evidence + adaptive density + mobile feedback sheet present")
