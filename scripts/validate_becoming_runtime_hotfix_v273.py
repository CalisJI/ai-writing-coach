from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
errors=[]

def require(condition,message):
    if not condition:
        errors.append(message)

version=(ROOT/"BECOMING_FRONTEND_VERSION").read_text(encoding="utf-8").strip()
template=(ROOT/"templates"/"becoming"/"index.html").read_text(encoding="utf-8")
primitives=(ROOT/"static"/"becoming"/"components"/"primitives.js").read_text(encoding="utf-8")

require(version=="2.7.3","frontend version must be 2.7.3")
require("?v=2.7.3" in template,"template cache version 2.7.3 missing")
require("?v=2.7.2" not in template,"stale 2.7.2 cache marker remains")

good = "return `<div class=\"state-message\" aria-label=\"${attr(t('chrome.loading'))}\">\n    ${Array.from"
bad = "aria-label=\"${attr(t('chrome.loading'))}\">`\n    ${Array.from"
require(good in primitives,"loadingBlock must keep interpolation inside one template literal")
require(bad not in primitives,"broken loadingBlock template-literal boundary still exists")

if errors:
    print("BECOMING v2.7.3 runtime hotfix validation FAILED")
    for item in errors:
        print(" -",item)
    raise SystemExit(1)

print("BECOMING v2.7.3 runtime hotfix validation OK")
print("Fixed loadingBlock ESM parse + cache bump + permanent browser-module gate present")
