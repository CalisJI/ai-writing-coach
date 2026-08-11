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
    ROOT/"static"/"becoming"/"layout-system-v215.css",
    ROOT/"static"/"becoming"/"layout-system-v215.js",
]
for path in required:
    require(path.exists(),f"Missing {path.relative_to(ROOT)}")

if not errors:
    version=(ROOT/"BECOMING_FRONTEND_VERSION").read_text(encoding="utf-8").strip()
    template=(ROOT/"templates"/"becoming"/"index.html").read_text(encoding="utf-8")
    css=(ROOT/"static"/"becoming"/"layout-system-v215.css").read_text(encoding="utf-8")
    js=(ROOT/"static"/"becoming"/"layout-system-v215.js").read_text(encoding="utf-8")

    require(version=="2.15.0","frontend version must be 2.15.0")
    require("layout-system-v215.css?v=2.15.0" in template,"v2.15 layout CSS missing from template")
    require("layout-system-v215.js?v=2.15.0" in template,"v2.15 layout JS missing from template")
    require("installLayoutSystemV215" in template,"v2.15 layout runtime not installed")
    require("?v=2.14.0" not in template,"stale v2.14.0 cache marker remains")

    for needle in [
        "--bc15-content-max:1480px",
        "--bc15-page-gutter:40px",
        "--bc15-column-gap:",
        ".bc15-page-container",
        "max-inline-size:var(--bc15-content-max)",
        "margin-inline:auto",
        "padding-inline:var(--bc15-page-gutter)",
        ".bc15-major-section",
        ".bc15-two-column",
        "max-inline-size:100%",
        "min-width:0",
    ]:
        require(needle in css,f"shared page-container contract missing: {needle}")

    # Required responsive gutter values.
    expected=[
        ("max-width:1439px","--bc15-page-gutter:32px"),
        ("max-width:1279px","--bc15-page-gutter:28px"),
        ("max-width:1023px","--bc15-page-gutter:24px"),
        ("max-width:767px","--bc15-page-gutter:18px"),
        ("max-width:420px","--bc15-page-gutter:16px"),
    ]
    for media,gutter in expected:
        require(media in css,f"responsive breakpoint missing: {media}")
        require(gutter in css,f"responsive gutter missing: {gutter}")

    for needle in [
        "pageRoot",
        "markMajorSections",
        "normalizeTwoColumns",
        "installLayoutSystemV215",
        "MutationObserver",
        "[data-screen-contract]",
    ]:
        require(needle in js,f"layout runtime contract missing: {needle}")

    # Every learner route remains handled through one screen-contract query,
    # not page-specific translated copy.
    for forbidden in [
        "Trang chủ","Bảng chứng gần đây","Ngôn ngữ đang học",
        "Home","Recent Evidence","首页","最近"
    ]:
        require(forbidden not in js,f"layout runtime hardcodes visible copy: {forbidden}")

    # Anti-pattern checks specific to the requested root cause.
    require(re.search(r"(?i)\\b(?:inline-size|width)\\s*:\\s*100vw\\b",css) is None,
            "v2.15 layout CSS must not declare width/inline-size:100vw")
    require("margin-left:" not in css and "margin-right:" not in css,
            "v2.15 must not patch individual horizontal margins")
    require("overflow-x:hidden" not in css and "overflow-x: hidden" not in css,
            "v2.15 must not hide horizontal overflow instead of fixing it")
    require("!important" not in css,"v2.15 layout layer should not require !important")

if errors:
    print("BECOMING v2.15 LAYOUT SYSTEM validation FAILED")
    for item in errors:
        print(" -",item)
    raise SystemExit(1)

print("BECOMING v2.15 LAYOUT SYSTEM validation OK")
print("Shared page container + bounded max width + responsive gutters + major-section containment + two-column gap contract present")
