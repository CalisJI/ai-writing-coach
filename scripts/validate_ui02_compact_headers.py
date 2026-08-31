from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCREENS = ROOT / "static" / "becoming" / "screens"
CSS = ROOT / "static" / "becoming" / "visual-alignment.css"


def require(condition: bool, message: str) -> None:
    if not condition:
        raise SystemExit(message)


# UI-02 removed editorial headers from every learner screen. That was right for
# eight of them -- a working screen should open with the work, not with a
# headline about it. Home is the exception the rule swept up with the rest: it
# is the one screen whose job IS the statement, and the visual reference
# (docs/visual-references/BECOMING_APPLICATION_*.png) draws it exactly that way,
# with an accent eyebrow over a large editorial line. Removing it left Home
# opening on a 527px hole where the headline had been.
#
# So Home may carry its hero again. Every other screen stays compact, and the
# ban on the old bloated markup stands everywhere including here: what returns
# is a hero built from homeInsight -- real evidence -- not the previous header.
for name, forbidden in {
    "home.js": ("home-proof-line", "editorial-title"),
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
