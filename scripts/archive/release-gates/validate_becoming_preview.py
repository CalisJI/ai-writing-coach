from pathlib import Path
import json
import sys

ROOT = Path(__file__).resolve().parents[1]

required = [
    ROOT / "templates" / "becoming" / "index.html",
    ROOT / "static" / "becoming" / "tokens.css",
    ROOT / "static" / "becoming" / "base.css",
    ROOT / "static" / "becoming" / "app.css",
    ROOT / "static" / "becoming" / "app.js",
    ROOT / "static" / "becoming" / "screens" / "onboarding.js",
    ROOT / "static" / "becoming" / "screens" / "home.js",
    ROOT / "static" / "becoming" / "screens" / "write.js",
    ROOT / "static" / "becoming" / "screens" / "review.js",
    ROOT / "static" / "becoming" / "screens" / "journey.js",
    ROOT / "static" / "becoming" / "screens" / "profile.js",
]

errors = []

def require(condition, message):
    if not condition:
        errors.append(message)

for path in required:
    require(path.exists(), f"Missing: {path.relative_to(ROOT)}")

if not errors:
    index = required[0].read_text(encoding="utf-8")
    tokens = (ROOT / "static" / "becoming" / "tokens.css").read_text(encoding="utf-8")
    home = (ROOT / "static" / "becoming" / "screens" / "home.js").read_text(encoding="utf-8")
    feedback = (ROOT / "static" / "becoming" / "domain" / "feedback.js").read_text(encoding="utf-8")
    review = (ROOT / "static" / "becoming" / "screens" / "review.js").read_text(encoding="utf-8")
    write = (ROOT / "static" / "becoming" / "screens" / "write.js").read_text(encoding="utf-8")
    app = (ROOT / "app.py").read_text(encoding="utf-8")

    require("BECOMING" in index, "BECOMING brand missing")
    require("Dashboard" not in index, "Preview must not use a dashboard shell")
    require("#FF6A1A" in tokens, "Supplied orange accent token missing")
    require("Roboto Condensed" in tokens, "Display font token missing")
    require("Noto Sans SC" in tokens, "CJK font token missing")
    require("ONE PATTERN IS HOLDING YOU BACK" in feedback, "Editorial learner insight missing")
    require("YOUR WORK · THE EVIDENCE" in review, "Review must connect feedback to learner work")
    require("Review my writing" in write, "Writing screen primary action missing")
    require('app.get("/becoming"' in app, "BECOMING preview route missing")

if errors:
    print("BECOMING preview validation FAILED")
    for item in errors:
        print(" -", item)
    raise SystemExit(1)

print("BECOMING preview validation OK")
print("Editorial Intelligence constraints present")
