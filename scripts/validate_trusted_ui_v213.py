from __future__ import annotations

from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
errors=[]

def require(cond: bool, msg: str) -> None:
    if not cond:
        errors.append(msg)

paths=[
    ROOT/"BECOMING_FRONTEND_VERSION",
    ROOT/"templates"/"becoming"/"index.html",
    ROOT/"static"/"becoming"/"trusted-ui-v213.css",
    ROOT/"static"/"becoming"/"trusted-ui-v213.js",
]
for path in paths:
    require(path.exists(),f"Missing {path.relative_to(ROOT)}")

if not errors:
    version=(ROOT/"BECOMING_FRONTEND_VERSION").read_text(encoding="utf-8").strip()
    template=(ROOT/"templates"/"becoming"/"index.html").read_text(encoding="utf-8")
    css=(ROOT/"static"/"becoming"/"trusted-ui-v213.css").read_text(encoding="utf-8")
    js=(ROOT/"static"/"becoming"/"trusted-ui-v213.js").read_text(encoding="utf-8")

    require(version=="2.13.0","frontend version must be 2.13.0")
    require("trusted-ui-v213.css?v=2.13.0" in template,"v2.13 CSS missing from template")
    require("trusted-ui-v213.js?v=2.13.0" in template,"v2.13 JS missing from template")
    require("installTrustedUiV213" in template,"v2.13 runtime is not installed")
    require("?v=2.12.0" not in template,"stale v2.12.0 cache marker remains")

    for needle in [
        "--bc13-depth-frame:",
        "--bc13-depth-raised:",
        "--bc13-depth-hero:",
        "--bc13-depth-control:",
        ".bc13-frame{",
        ".bc13-raised{",
        ".bc13-hero{",
        ".bc13-choice{",
        ".bc13-list-frame{",
        ".bc13-row,",
    ]:
        require(needle in css,f"trusted shared visual contract missing: {needle}")

    for route in ['home','write','read','library','journey','profile','review']:
        require(f'[data-screen-contract="{route}"]' in css,f"route style coverage missing: {route}")
        require(f"{route}:" in js,f"route runtime mapping missing: {route}")

    for needle in [
        ".bc13-dialog-shell{",
        "display:flex!important",
        "max-height:min(92dvh,960px)!important",
        "overflow:hidden!important",
        ".bc13-dialog-scroll{",
        "min-height:0!important",
        "overflow-y:auto!important",
        "overscroll-behavior:contain",
        "scrollbar-gutter:stable",
        ".bc13-comparison-grid{",
        ".bc13-comparison-card{",
        "max-height:none!important",
        "overflow:visible!important",
    ]:
        require(needle in css,f"modal scroll contract missing: {needle}")

    for needle in [
        "dialogScrollOwner",
        "dialogHeader",
        "comparisonGrid",
        "bc13-dialog-shell",
        "bc13-dialog-scroll",
        "bc13-comparison-grid",
        "bc13-comparison-card",
        "MutationObserver",
    ]:
        require(needle in js,f"modal/runtime contract missing: {needle}")

    for forbidden in [
        "Phiên bản mạnh hơn",
        "Bảng chứng gần đây",
        "Nhớ lại một mục",
        "Từ vựng",
        "Stronger Version",
        "最近",
        "词汇",
    ]:
        require(forbidden not in js,f"runtime hardcodes translated UI text: {forbidden}")

    require("@media(max-width:760px)" in css,"mobile breakpoint missing")
    require("grid-template-columns:1fr!important" in css,"mobile comparison stacking missing")
    require("max-height:calc(100dvh - 12px)!important" in css,"mobile dialog viewport guard missing")

if errors:
    print("BECOMING v2.13 TRUSTED UI validation FAILED")
    for item in errors:
        print(" -",item)
    raise SystemExit(1)

print("BECOMING v2.13 TRUSTED UI validation OK")
print("Route surface migration + shared controls + comparison dialog scroll ownership + mobile continuation present")
