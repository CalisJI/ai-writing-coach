from __future__ import annotations
from pathlib import Path
import re

ROOT=Path(__file__).resolve().parents[1]
errors=[]

def require(cond: bool,msg: str)->None:
    if not cond:
        errors.append(msg)

required=[
    ROOT/"BECOMING_FRONTEND_VERSION",
    ROOT/"templates"/"becoming"/"index.html",
    ROOT/"static"/"becoming"/"layout-system-v2151.css",
    ROOT/"static"/"becoming"/"layout-system-v2151.js",
]
for path in required:
    require(path.exists(),f"Missing {path.relative_to(ROOT)}")

if not errors:
    version=(ROOT/"BECOMING_FRONTEND_VERSION").read_text(encoding="utf-8").strip()
    template=(ROOT/"templates"/"becoming"/"index.html").read_text(encoding="utf-8")
    css=(ROOT/"static"/"becoming"/"layout-system-v2151.css").read_text(encoding="utf-8")
    js=(ROOT/"static"/"becoming"/"layout-system-v2151.js").read_text(encoding="utf-8")

    require(version=="2.15.1","frontend version must be 2.15.1")
    require("layout-system-v2151.css?v=2.15.1" in template,"v2.15.1 CSS missing")
    require("layout-system-v2151.js?v=2.15.1" in template,"v2.15.1 JS missing")
    require("installLayoutSystemV2151" in template,"v2.15.1 runtime missing")
    require("layout-system-v215.css" not in template,"old v2.15 layout CSS still loaded")
    require("layout-system-v215.js" not in template,"old v2.15 layout JS still loaded")

    for needle in [
        "--bc151-content-max:1400px",
        "--bc151-page-gutter:40px",
        "inline-size:calc(100% - (2 * var(--bc151-page-gutter)))",
        "margin-inline:auto",
        "padding-inline:0",
        ".bc151-major-section",
        ".bc151-two-column",
    ]:
        require(needle in css,f"external-gutter contract missing: {needle}")

    for needle in [
        "semanticPageInside",
        "fallbackScreens",
        "pageRoot",
        "measureVisible",
        "auditVisible",
        "BECOMING_LAYOUT_AUDIT",
        "installLayoutSystemV2151",
        "MutationObserver",
    ]:
        require(needle in js,f"live geometry runtime missing: {needle}")

    # The new runtime must not key layout off translated visible text.
    for forbidden in [
        "Recall one item","Recent evidence","What still needs attention",
        "Nhớ lại một mục","Bằng chứng gần đây","最近"
    ]:
        require(forbidden not in js,f"layout runtime hardcodes UI copy: {forbidden}")

    # No page-specific patching / overflow masking in the new layer.
    require(re.search(r"(?i)\\b(?:inline-size|width)\\s*:\\s*100vw\\b",css) is None,
            "v2.15.1 must not declare 100vw width")
    require("overflow-x:hidden" not in css and "overflow-x: hidden" not in css,
            "v2.15.1 must not hide overflow")
    require("!important" not in css,"v2.15.1 should not require !important")

if errors:
    print("BECOMING v2.15.1 LIVE LAYOUT validation FAILED")
    for item in errors:
        print(" -",item)
    raise SystemExit(1)

print("BECOMING v2.15.1 LIVE LAYOUT validation OK")
print("Outer gutter geometry + fallback screen discovery + actual DOM audit API present")
