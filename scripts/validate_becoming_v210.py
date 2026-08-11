from __future__ import annotations

from pathlib import Path
import re

ROOT=Path(__file__).resolve().parents[1]
STATIC=ROOT/"static"/"becoming"
errors=[]

def require(condition: bool, message: str) -> None:
    if not condition:
        errors.append(message)

required=[
    ROOT/"app.py",
    ROOT/"writing_coach"/"becoming_linguistics.py",
    ROOT/"writing_coach"/"becoming_linguistics_selftest.py",
    STATIC/"api.js",
    STATIC/"app.js",
    STATIC/"app.css",
    STATIC/"visual-alignment.css",
    STATIC/"phase3.css",
    STATIC/"components"/"primitives.js",
    STATIC/"domain"/"feedback-map.js",
    STATIC/"domain"/"i18n.js",
    STATIC/"screens"/"home.js",
    STATIC/"screens"/"journey.js",
    STATIC/"screens"/"review.js",
    ROOT/"templates"/"becoming"/"index.html",
    ROOT/"BECOMING_FRONTEND_VERSION",
]
for path in required:
    require(path.exists(),f"Missing {path.relative_to(ROOT)}")

if not errors:
    app=(ROOT/"app.py").read_text(encoding="utf-8")
    service=(ROOT/"writing_coach"/"becoming_linguistics.py").read_text(encoding="utf-8")
    api=(STATIC/"api.js").read_text(encoding="utf-8")
    app_js=(STATIC/"app.js").read_text(encoding="utf-8")
    app_css=(STATIC/"app.css").read_text(encoding="utf-8")
    visual=(STATIC/"visual-alignment.css").read_text(encoding="utf-8")
    phase3=(STATIC/"phase3.css").read_text(encoding="utf-8")
    primitives=(STATIC/"components"/"primitives.js").read_text(encoding="utf-8")
    feedback_map=(STATIC/"domain"/"feedback-map.js").read_text(encoding="utf-8")
    i18n=(STATIC/"domain"/"i18n.js").read_text(encoding="utf-8")
    home=(STATIC/"screens"/"home.js").read_text(encoding="utf-8")
    journey=(STATIC/"screens"/"journey.js").read_text(encoding="utf-8")
    review=(STATIC/"screens"/"review.js").read_text(encoding="utf-8")
    template=(ROOT/"templates"/"becoming"/"index.html").read_text(encoding="utf-8")
    version=(ROOT/"BECOMING_FRONTEND_VERSION").read_text(encoding="utf-8").strip()

    require(version=="2.10.0","BECOMING_FRONTEND_VERSION must be 2.10.0")
    require("?v=2.10.0" in template,"v2.10.0 cache marker missing")
    require("?v=2.9.0" not in template,"stale v2.9.0 cache marker remains")
    require("SCHEMA_VERSION = 11" in app,"backend schema must remain 11")
    require(app.endswith("\n") and not app.endswith("\n\n"),"app.py EOF hygiene failed")

    # BUG A1 — Journey.
    require("function revisionList(groups=[])" in journey,"Journey revisionList helper missing")
    require("${revisionList(groups)}" in journey,"Journey revision list not rendered")
    require("data-journey-essay" in journey,"Journey revision interaction regressed")

    # BUG A2 — tooltip clipping.
    require("export function installTooltipLayer" in primitives,"global tooltip installer missing")
    require("data-tooltip=" in primitives,"helpTip no longer exposes portal tooltip data")
    require("help-tip-popover" not in primitives,"nested tooltip body still rendered inside clipped surfaces")
    require("installTooltipLayer();" in app_js,"tooltip layer is not installed at bootstrap")
    require(".global-help-tooltip" in app_css,"fixed-position global tooltip styles missing")
    require("position:fixed" in app_css.split(".global-help-tooltip",1)[1][:220],"global tooltip is not fixed to viewport")

    # POLISH — tactile navigation.
    nav_section=visual[visual.rfind("v2.10 — COMBINED DASHBOARD"):]
    require(".primary-nav a{" in nav_section,"v2.10 tactile nav override missing")
    require("box-shadow:var(--depth-1)" in nav_section,"inactive nav does not use shared tactile depth")
    require(".primary-nav a:hover" in nav_section and "var(--depth-2)" in nav_section,
            "hover navigation depth missing")
    require(".primary-nav a.active" in nav_section and "--color-accent-600" in nav_section,
            "active navigation signal missing")

    # FEATURE — dashboard.
    require("writingDashboardMarkup" in home,"Writing Dashboard markup function missing")
    require("metricOverview(dashboard)" in home,"Dashboard does not reuse current metric data")
    require("dashboardEvidence" in home,"Dashboard evidence derivation missing")
    require("dashboardJourneyLink" in home,"Dashboard is not connected to Journey")
    require(".writing-dashboard{" in visual,"Writing Dashboard visual composition missing")
    require("home.dashboard_title" in i18n,"Dashboard i18n missing")

    # FEATURE — POS lens.
    require("linguisticAnnotations:" in api,"linguistic annotation API client missing")
    require("installLinguisticLens" in review,"Review POS lens integration missing")
    require("posLensToggle" in review,"POS lens toggle missing")
    require("api.linguisticAnnotations" in review,"POS lens is not connected end-to-end")
    require("normalizedPosAnnotations" in feedback_map,"POS annotation normalization missing")
    require("renderAnnotatedSlice" in feedback_map,"POS annotation renderer missing")
    require("data-tooltip" in feedback_map,"POS hover does not use shared tooltip system")
    require(".pos-token" in phase3,"POS underline styles missing")
    require(".pos-legend" in phase3,"POS legend styles missing")

    # Error clarity.
    require("error-mark" in feedback_map,"error evidence class missing")
    require(".evidence-mark.error-mark" in phase3,"semantic error emphasis style missing")
    require("var(--color-important)" in phase3,"errors do not reuse Important token")

    # Architecture/API.
    require(
        '@app.post("/api/essays/{essay_id}/linguistic-annotations"' in app,
        "explicit linguistic annotation route missing",
    )
    require("configure_becoming_linguistics(db, generate_structured)" in app,
            "linguistic service is not configured with shared AI abstraction")
    require("APIRouter" not in service and "@router." not in service and "app.include_router" not in service,
            "linguistic service must remain service-only")
    require("module_data_json" in service and "linguistic_annotations_v1" in service,
            "linguistic cache does not reuse existing essay module data")
    for forbidden in ["requests.", "OLLAMA_URL", "/api/chat"]:
        require(forbidden not in service,f"linguistic service bypasses AI abstraction: {forbidden}")

    # Multilingual feature labels.
    for key in [
        "home.dashboard_kicker",
        "review.pos_kicker",
        "review.pos_group_noun",
        "review.error_evidence",
        "pos.noun",
    ]:
        require(i18n.count(f"'{key}'")>=3,f"{key} missing from VI/EN/ZH interface locales")

if errors:
    print("BECOMING v2.10 combined validation FAILED")
    for item in errors:
        print(" -",item)
    raise SystemExit(1)

print("BECOMING v2.10 combined validation OK")
print("Journey fix + tooltip portal + tactile nav + evidence dashboard + POS lens + semantic error clarity present")
