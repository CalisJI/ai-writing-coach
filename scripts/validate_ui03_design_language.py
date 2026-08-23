from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TOKENS = (ROOT / "static/becoming/tokens.css").read_text(encoding="utf-8")
CSS = (ROOT / "static/becoming/visual-alignment.css").read_text(encoding="utf-8")
PRIMITIVES = (ROOT / "static/becoming/components/primitives.js").read_text(encoding="utf-8")
HOME = (ROOT / "static/becoming/screens/home.js").read_text(encoding="utf-8")


def require(condition: bool, message: str) -> None:
    if not condition:
        raise SystemExit(message)


for token in (
    "--orena-section-gap:",
    "--orena-card-padding:",
    "--orena-icon-size:",
    "--orena-icon-control-size:",
):
    require(token in TOKENS, f"missing shared Orena token: {token}")

for selector in (
    ".orena-section-heading",
    ".orena-card,",
    ".orena-action-tile",
    ".orena-chip",
    ".orena-icon-button",
    ".orena-progress",
):
    require(selector in CSS, f"missing shared Orena visual primitive: {selector}")

for export in ("iconButton", "sectionHeading", "progressBar"):
    require(f"export function {export}" in PRIMITIVES, f"missing reusable primitive: {export}")

require('aria-label="${attr(label)}"' in PRIMITIVES, "icon buttons must retain an accessible name")
require("sectionHeading({" in HOME, "Home must validate the shared section heading")
require("${progressBar(pct,{label})}" in PRIMITIVES, "metric rows must reuse the shared progress bar")

print("UI-03 Orena design language contract OK")