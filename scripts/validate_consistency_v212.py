from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
errors = []

def require(condition: bool, message: str) -> None:
    if not condition:
        errors.append(message)

version_path = ROOT / "BECOMING_FRONTEND_VERSION"
template_path = ROOT / "templates" / "becoming" / "index.html"
css_path = ROOT / "static" / "becoming" / "consistency-v212.css"
js_path = ROOT / "static" / "becoming" / "consistency-v212.js"

for path in [version_path, template_path, css_path, js_path]:
    require(path.exists(), f"Missing {path.relative_to(ROOT)}")

if not errors:
    version = version_path.read_text(encoding="utf-8").strip()
    template = template_path.read_text(encoding="utf-8")
    css = css_path.read_text(encoding="utf-8")
    js = js_path.read_text(encoding="utf-8")

    require(version == "2.12.0", "frontend version must be 2.12.0")
    require("consistency-v212.css?v=2.12.0" in template, "consistency CSS is not served by template")
    require("consistency-v212.js?v=2.12.0" in template, "consistency JS is not served by template")
    require("installConsistencyV212" in template, "consistency runtime is not installed")
    require("?v=2.11.0" not in template, "stale v2.11.0 cache marker remains")

    for needle in [
        "--bc12-depth-section:",
        "--bc12-depth-raised:",
        "--bc12-depth-hero:",
        "--bc12-depth-control:",
        ".bc12-priority-feedback",
        ".bc12-positive-section",
        ".bc12-comparison-grid",
        ".bc12-comparison-card",
        ".feedback-anatomy-row",
        ".help-tip-trigger",
        "@media(max-width:760px)",
    ]:
        require(needle in css, f"consistency CSS contract missing: {needle}")

    for forbidden in [
        "Phiên bản mạnh hơn",
        "Từ vựng",
        "Stronger Version",
        "词汇",
        "更强",
    ]:
        require(forbidden not in js, f"runtime hardcodes translated UI text: {forbidden}")

    for needle in [
        "normalizeReview",
        "normalizeDialogs",
        "probableComparisonGrid",
        "MutationObserver",
        "bc12-comparison-grid",
        "bc12-comparison-card",
    ]:
        require(needle in js, f"consistency runtime contract missing: {needle}")

if errors:
    print("BECOMING v2.12 UI consistency validation FAILED")
    for item in errors:
        print(" -", item)
    raise SystemExit(1)

print("BECOMING v2.12 UI consistency validation OK")
print("Review surfaces + feedback hierarchy + helper controls + comparison dialogs + mobile continuation normalized")
