from __future__ import annotations
from pathlib import Path
import re

ROOT=Path(__file__).resolve().parents[1]
errors=[]

def require(cond,msg):
    if not cond:
        errors.append(msg)

trusted=ROOT/"static"/"becoming"/"trusted-ui-v213.css"
template=ROOT/"templates"/"becoming"/"index.html"
version=ROOT/"BECOMING_FRONTEND_VERSION"

for p in (trusted,template,version):
    require(p.exists(),f"Missing {p.relative_to(ROOT)}")

if not errors:
    css=trusted.read_text(encoding="utf-8",errors="ignore")
    html=template.read_text(encoding="utf-8",errors="ignore")
    v=version.read_text(encoding="utf-8").strip()

    # Strip comments before forbidden-pattern checks so validator comments
    # can never create the false failure that affected v2.15.4.
    executable_css=re.sub(r"/\*.*?\*/","",css,flags=re.S)

    require(v=="2.15.5","Frontend version must be 2.15.5")

    for token in [
        "BECOMING v2.15.5 SHARED LAYOUT REPAIR START",
        ".bc13-raised",
        ".bc13-row",
        "--bc155-card-pad-x",
        "--bc155-row-pad-x",
        "select option",
        "var(--color-ink-strong, CanvasText)",
        "var(--color-surface, Canvas)",
    ]:
        require(token in css,f"Missing shared repair contract: {token}")

    require(css.count("BECOMING v2.15.5 SHARED LAYOUT REPAIR START")==1,
            "v2.15.5 repair block must exist exactly once")

    for pattern,msg in [
        (r"\b(?:width|inline-size)\s*:\s*100vw\b","100vw width forbidden in repair CSS"),
        (r"!important","important declaration forbidden in repair CSS"),
        (r"transform\s*:\s*translateX","translateX layout patch forbidden"),
        (r"margin-(?:left|right)\s*:\s*-\d","negative horizontal margin patch forbidden"),
    ]:
        require(re.search(pattern,executable_css,re.I) is None,msg)

    for old in [
        "layout-system-v215.css","layout-system-v2151.css",
        "layout-repair-v2152.css","layout-repair-v2153.css","layout-repair-v2154.css",
        "layout-system-v215.js","layout-system-v2151.js",
        "layout-repair-v2152.js","layout-repair-v2153.js","layout-repair-v2154.js",
        "installLayoutSystemV215","installLayoutSystemV2151",
        "installLayoutRepairV2152","installLayoutRepairV2153","installLayoutRepairV2154",
    ]:
        require(old not in html,f"Experimental layout layer still referenced: {old}")

if errors:
    print("BECOMING v2.15.5 validation FAILED")
    for e in errors:
        print(" -",e)
    raise SystemExit(1)

print("BECOMING v2.15.5 validation OK")
print("Shared bc13 primitive padding + select contrast; experimental layout layers removed")
