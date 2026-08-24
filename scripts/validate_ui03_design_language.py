from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TOKENS = (ROOT / "static/becoming/tokens.css").read_text(encoding="utf-8")
CSS = (ROOT / "static/becoming/visual-alignment.css").read_text(encoding="utf-8")
PRIMITIVES = (ROOT / "static/becoming/components/primitives.js").read_text(encoding="utf-8")
HOME = (ROOT / "static/becoming/screens/home.js").read_text(encoding="utf-8")
ORENA_TOKENS = (ROOT / "static/becoming/orena/tokens.css").read_text(encoding="utf-8")
ORENA_SHELL = (ROOT / "static/becoming/orena/shell.css").read_text(encoding="utf-8")
ORENA_WRITING = (ROOT / "static/becoming/orena/writing.css").read_text(encoding="utf-8")
ORENA_PROFILE = (ROOT / "static/becoming/orena/profile.css").read_text(encoding="utf-8")
TEMPLATE = (ROOT / "templates/becoming/index.html").read_text(encoding="utf-8")
FRONTEND_VERSION = (ROOT / "BECOMING_FRONTEND_VERSION").read_text(encoding="utf-8").strip()


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

require(FRONTEND_VERSION == "2.17.5", "Orena Profile integration must use frontend version 2.17.5")
for token in ("--o-sidebar-w:", "--o-header-h:", "--o-shadow-card:", "--o-motion:"):
    require(token in ORENA_TOKENS, f"missing Orena integration token: {token}")
for selector in (".o-shell{", ".o-sidebar{", ".o-workspace{", ".o-nav{"):
    require(selector in ORENA_SHELL, f"missing Orena shell primitive: {selector}")
for selector in (".o-write{", ".o-editor{", ".o-review{", ".o-lens.active{"):
    require(selector in ORENA_WRITING, f"missing Orena Writing/Review primitive: {selector}")
for selector in (".o-profile{", ".o-profile-panel", ".o-profile-setting{", ".o-profile-about-card{", ".o-switch{"):
    require(selector in ORENA_PROFILE, f"missing Orena Profile primitive: {selector}")
require(
    "@media(max-width:720px)" in ORENA_PROFILE,
    "Orena Profile must retain its mobile grouped-row contract",
)
for asset in ("orena/tokens.css", "orena/shell.css", "orena/writing.css", "orena/home.css", "orena/adopt.css", "orena/profile.css"):
    require(f"/becoming-assets/{asset}?v={FRONTEND_VERSION}" in TEMPLATE, f"missing versioned Orena asset: {asset}")
require('id="app" class="o-shell"' in TEMPLATE, "template must render the Orena shell")
require('aria-controls="primaryNav"' in TEMPLATE, "mobile drawer must retain an accessible control relationship")

print("UI-03 Orena design language contract OK")
