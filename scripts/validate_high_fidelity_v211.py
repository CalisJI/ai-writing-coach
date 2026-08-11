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
    ROOT/"BECOMING_FRONTEND_VERSION",
    ROOT/"templates"/"becoming"/"index.html",
    ROOT/"docs"/"BECOMING_UIUX_SKILL.md",
    ROOT/"docs"/"BECOMING_DESIGN_TOKENS.json",
    ROOT/"docs"/"BECOMING_VISUAL_REFERENCE_ALIGNMENT_ADDENDUM.md",
    ROOT/"docs"/"BECOMING_HIGH_FIDELITY_IMPLEMENTATION_MODE.md",
    ROOT/"docs"/"BECOMING_UIUX_IMPLEMENTATION_CONTRACT.md",
    STATIC/"app.js",
    STATIC/"visual-alignment.css",
    STATIC/"domain"/"screen-contract.js",
]
for path in required:
    require(path.exists(),f"Missing {path.relative_to(ROOT)}")

refs=ROOT/"docs"/"visual-references"
for name in [
    "BECOMING_LIGHT_REFERENCE.png",
    "BECOMING_DARK_REFERENCE.png",
]:
    require((refs/name).exists(),f"Missing canonical reference: {name}")

if not errors:
    version=(ROOT/"BECOMING_FRONTEND_VERSION").read_text(encoding="utf-8").strip()
    template=(ROOT/"templates"/"becoming"/"index.html").read_text(encoding="utf-8")
    app=(STATIC/"app.js").read_text(encoding="utf-8")
    visual=(STATIC/"visual-alignment.css").read_text(encoding="utf-8")
    contract=(STATIC/"domain"/"screen-contract.js").read_text(encoding="utf-8")
    mode=(ROOT/"docs"/"BECOMING_HIGH_FIDELITY_IMPLEMENTATION_MODE.md").read_text(encoding="utf-8")
    implementation=(ROOT/"docs"/"BECOMING_UIUX_IMPLEMENTATION_CONTRACT.md").read_text(encoding="utf-8")

    require(version=="2.11.0","frontend version must be 2.11.0")
    require("?v=2.11.0" in template,"template v2.11.0 cache marker missing")
    require("?v=2.10.0" not in template,"stale v2.10.0 cache marker remains")

    # Execution mode is a project contract, not just a package note.
    for needle in [
        "HIGH-FIDELITY IMPLEMENTATION MODE",
        "component thickness",
        "ICON CONSISTENCY",
        "REQUIRED PHASE 4",
        "TOP 3 GAP REFINEMENT",
        "VISUAL QA SCORE",
    ]:
        require(needle in mode,f"high-fidelity execution rule missing: {needle}")

    require(
        "HIGH-FIDELITY IMPLEMENTATION BOOTSTRAP" in implementation,
        "future-agent high-fidelity bootstrap missing",
    )

    # Every current route must explicitly opt into high fidelity.
    contracts=re.findall(r"^\s{2}([a-z_-]+):\{(.*?)^\s{2}\},",contract,re.M|re.S)
    require(bool(contracts),"screen contracts could not be parsed")
    for route,body in contracts:
        require("fidelityMode:'high'" in body,f"{route} is missing fidelityMode:'high'")

    # Editorial context landmarks.
    require("const SCREEN_INDEX={" in app,"screen index map missing")
    require("root.dataset.screenIndex=SCREEN_INDEX[route]||''" in app,"screen index runtime binding missing")
    require(".main-content::before" in visual,"screen landmark visual missing")

    # Shared physical depth / perceived thickness.
    for needle in [
        "--hf-depth-section:",
        "--hf-depth-raised:",
        "--hf-depth-hero:",
        "--hf-depth-control:",
        "--hf-depth-control-pressed:",
        "--hf-lower-edge:",
        "--hf-contact-tight:",
        "--hf-ambient:",
    ]:
        require(needle in visual,f"shared high-fidelity token missing: {needle}")

    # Same virtual-light / layered-depth cues.
    for needle in [
        "inset 0 1px 0",
        "0 3px 0",
        "radial-gradient",
        "linear-gradient",
        "var(--hf-contact-tight)",
    ]:
        require(needle in visual,f"material cue missing: {needle}")

    # Icon family.
    for needle in [
        ".nav-icon{",
        ".nav-icon svg{",
        "stroke-width:1.9",
        "stroke-linecap:round",
        "stroke-linejoin:round",
        ".primary-nav a.active .nav-icon",
    ]:
        require(needle in visual,f"icon-family contract missing: {needle}")

    # Major-screen hero system.
    for needle in [
        ".home-folio .folio-spread",
        ".writing-hero-surface",
        ".review-focus-hero",
        ".reading-passage.reading-hero-surface",
        ".library-recall-hero",
        ".progress-hero",
        ".growth-rank",
        ".choice.visual-raised-surface",
    ]:
        require(needle in visual,f"screen hero fidelity missing: {needle}")

    # Anti-pattern corrections from refinement pass.
    require(
        ".journey-section-surface .journey-entry.visual-raised-surface" in visual
        and "box-shadow:none" in visual,
        "Journey nested-card refinement missing",
    )
    require(
        ".profile-section .radio-option:has(input:checked)" in visual,
        "Profile selected-control physical state missing",
    )
    require(
        ".review-side .strength-surface" in visual
        and ".review-side .next-action-surface" in visual,
        "Review support-surface family missing",
    )

    # Responsive continuation.
    require("@media(max-width:720px)" in visual,"mobile high-fidelity breakpoint missing")
    require("overflow-x:auto" in visual,"mobile horizontal navigation continuation missing")
    require(".main-content::before{display:none}" in visual,"mobile landmark removal missing")

    # Accent discipline: active nav icon uses accent, not every icon.
    require(".primary-nav a.active .nav-icon" in visual,"active nav signal missing")
    require(
        visual.count("var(--color-accent-600)") < 80,
        "accent usage appears excessively repeated in high-fidelity layer",
    )

if errors:
    print("BECOMING v2.11 HIGH-FIDELITY validation FAILED")
    for item in errors:
        print(" -",item)
    raise SystemExit(1)

print("BECOMING v2.11 HIGH-FIDELITY validation OK")
print("Physical depth + perceived thickness + icon family + hero hierarchy + Light/Dark parity + refinement contracts present")
