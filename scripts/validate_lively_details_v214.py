from __future__ import annotations

from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
errors=[]

def require(cond: bool,msg: str)->None:
    if not cond:
        errors.append(msg)

required=[
    ROOT/"BECOMING_FRONTEND_VERSION",
    ROOT/"templates"/"becoming"/"index.html",
    ROOT/"static"/"becoming"/"lively-details-v214.css",
    ROOT/"static"/"becoming"/"lively-details-v214.js",
]
for path in required:
    require(path.exists(),f"Missing {path.relative_to(ROOT)}")

if not errors:
    version=(ROOT/"BECOMING_FRONTEND_VERSION").read_text(encoding="utf-8").strip()
    template=(ROOT/"templates"/"becoming"/"index.html").read_text(encoding="utf-8")
    css=(ROOT/"static"/"becoming"/"lively-details-v214.css").read_text(encoding="utf-8")
    js=(ROOT/"static"/"becoming"/"lively-details-v214.js").read_text(encoding="utf-8")

    require(version=="2.14.0","frontend version must be 2.14.0")
    require("lively-details-v214.css?v=2.14.0" in template,"v2.14 CSS missing from template")
    require("lively-details-v214.js?v=2.14.0" in template,"v2.14 JS missing from template")
    require("installLivelyDetailsV214" in template,"v2.14 runtime not installed")
    require("?v=2.13.0" not in template,"stale v2.13.0 cache marker remains")

    for needle in [
        ".bc14-spark-tile{",
        ".bc14-positive-badge{",
        ".bc14-accent-chip{",
        ".bc14-mini-card{",
        ".bc14-progress-fill::after",
        ".bc14-tactile:hover",
        "@media(prefers-reduced-motion:reduce)",
    ]:
        require(needle in css,f"lively detail CSS missing: {needle}")

    for needle in [
        "normalizeComparisonDialogs",
        "normalizePriorityChip",
        "normalizeDashboardCards",
        "normalizeProgressEndpoints",
        "installLivelyDetailsV214",
        "MutationObserver",
        "sparkSvg",
        "checkSvg",
        "leafSvg",
    ]:
        require(needle in js,f"lively detail runtime missing: {needle}")

    # v2.14 is decoration/polish only: do not bind styling to translations.
    for forbidden in [
        "Phiên bản mạnh hơn","Từ vựng","Stronger Version","Vocabulary","词汇","更强"
    ]:
        require(forbidden not in js,f"runtime hardcodes translated visible text: {forbidden}")

    # Protect v2.13 scroll ownership: v2.14 must decorate, not override it.
    require(".bc13-dialog-scroll" not in css,"v2.14 must not override the trusted dialog scroll owner")
    require("overflow-y" not in js,"v2.14 runtime must not mutate scrolling behavior")
    require("scrollTop" not in js,"v2.14 runtime must not own dialog scrolling")

if errors:
    print("BECOMING v2.14 LIVELY DETAILS validation FAILED")
    for item in errors:
        print(" -",item)
    raise SystemExit(1)

print("BECOMING v2.14 LIVELY DETAILS validation OK")
print("Spark emblem + positive badge + tactile vocabulary chip + mini dashboard cards + real progress endpoints + reduced-motion contract present")
