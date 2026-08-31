from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
version = (ROOT / "VERSION").read_text(encoding="utf-8").strip()
index = (ROOT / "templates" / "index.html").read_text(encoding="utf-8")
js = (ROOT / "static" / "product-design-v124.js").read_text(encoding="utf-8")

errors = []

def require(condition, message):
    if not condition:
        errors.append(message)

require(version == "1.2.4", "VERSION must be 1.2.4")
require('/static/product-design-v124.js?v=1.2.4' in index, "v1.2.4 design JS must be loaded")
require('subtree:true' not in js, "language observer must not watch subtree text mutations")
require("option.textContent!==wanted" in js, "language labels must only be written when changed")
require("observer.disconnect()" in js, "observer must disconnect during normalization")
require("observer.observe(select,{childList:true})" in js, "observer should watch direct option-list changes only")

if errors:
    print("v1.2.4 validation FAILED:")
    for error in errors:
        print(" -", error)
    raise SystemExit(1)

print("v1.2.4 validation OK")
print("Language MutationObserver self-loop protection is present")
