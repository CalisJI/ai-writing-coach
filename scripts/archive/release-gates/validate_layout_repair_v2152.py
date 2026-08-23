from __future__ import annotations
from pathlib import Path
import re
import sys

ROOT=Path(__file__).resolve().parents[1]

errors=[]

def require(cond,msg):
    if not cond:
        errors.append(msg)

css_path=ROOT/"static"/"becoming"/"layout-repair-v2152.css"
js_path=ROOT/"static"/"becoming"/"layout-repair-v2152.js"
template=ROOT/"templates"/"becoming"/"index.html"
version=ROOT/"BECOMING_FRONTEND_VERSION"

for p in [css_path,js_path,template,version]:
    require(p.exists(),f"Missing {p.relative_to(ROOT)}")

if not errors:
    css=css_path.read_text(encoding="utf-8")
    js=js_path.read_text(encoding="utf-8")
    html=template.read_text(encoding="utf-8")
    v=version.read_text(encoding="utf-8").strip()

    require(v=="2.15.2","Frontend version must be 2.15.2")

    required_css=[
        "--bc152-page-gutter",
        "--bc152-section-gap",
        "--bc152-card-pad-x",
        "--bc152-card-pad-y",
        "--bc152-content-max:1440px",
        ".bc152-page-shell",
        ".bc152-page-container",
        ".bc152-section-stack",
        ".bc152-layout-card",
        ".bc152-contain",
    ]
    for token in required_css:
        require(token in css,f"Missing layout CSS contract: {token}")

    required_js=[
        "installLayoutRepairV2152",
        "pageShell",
        "markSectionStacks",
        "markCards",
        "enforceContainment",
        "clearLegacyClasses",
        "MutationObserver",
    ]
    for token in required_js:
        require(token in js,f"Missing layout runtime: {token}")

    forbidden_css_patterns=[
        (r"\b(?:width|inline-size)\s*:\s*100vw\b","100vw width is forbidden"),
        (r"!important","!important is forbidden"),
        (r"transform\s*:\s*translateX","translateX layout patches are forbidden"),
        (r"margin-(?:left|right)\s*:\s*-\d","negative horizontal margin is forbidden"),
    ]
    for pattern,msg in forbidden_css_patterns:
        require(re.search(pattern,css,re.I) is None,msg)

    require("layout-system-v215.css" not in html,"Old v2.15 CSS is still loaded")
    require("layout-system-v2151.css" not in html,"Old v2.15.1 CSS is still loaded")
    require("layout-system-v215.js" not in html,"Old v2.15 JS is still loaded")
    require("layout-system-v2151.js" not in html,"Old v2.15.1 JS is still loaded")

    require(
        "/becoming-assets/layout-repair-v2152.css?v=2.15.2" in html,
        "v2.15.2 CSS not loaded by canonical template"
    )
    require(
        "/becoming-assets/layout-repair-v2152.js?v=2.15.2" in html,
        "v2.15.2 JS not loaded by canonical template"
    )
    require(
        "installLayoutRepairV2152" in html,
        "v2.15.2 runtime is not installed by canonical template"
    )

if errors:
    print("BECOMING v2.15.2 LAYOUT REPAIR validation FAILED")
    for error in errors:
        print(" -",error)
    raise SystemExit(1)

print("BECOMING v2.15.2 LAYOUT REPAIR validation OK")
print("Scope: gutter / section gap / card padding / containment only")
