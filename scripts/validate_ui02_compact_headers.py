from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCREENS = ROOT / "static" / "becoming" / "screens"
CSS = ROOT / "static" / "becoming" / "visual-alignment.css"


def require(condition: bool, message: str) -> None:
    if not condition:
        raise SystemExit(message)


for name, forbidden in {
    "home.js": ("insight.statement", "home-proof-line", "editorial-title"),
    "grammar.js": ('<header class="grammar-page-head">', "editorial-title"),
    "journey.js": ('<header class="journey-header">', "editorial-title"),
    "library.js": ('<header class="library-header">', "editorial-title"),
    "listening.js": ('<header class="listening-header">', "editorial-title"),
    "reading.js": ('<header class="reading-header">', "editorial-title"),
    "speaking.js": ('<header class="speaking-header">', "editorial-title"),
    "review.js": ("insight.statement", "review.empty_title", "editorial-title"),
    "write.js": ('<header class="write-header">',),
    "profile.js": ('<header class="journey-header">', "editorial-title"),
}.items():
    source = (SCREENS / name).read_text(encoding="utf-8")
    for token in forbidden:
        require(token not in source, f"{name} still renders editorial header content: {token}")

css = CSS.read_text(encoding="utf-8")
for token in (
    ".home-editorial-copy .editorial-title",
):
    require(token not in css, f"stale Home editorial presentation remains: {token}")
require(css.count(".home-editorial-hero{\n  min-height:0;") == 2,
        "Home work panel must not reserve hero-height viewport space")

print("UI-02 functional-first learner screen contract OK")
