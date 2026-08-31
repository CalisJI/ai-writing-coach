from pathlib import Path
import sys

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))

version=(ROOT/"VERSION").read_text(encoding="utf-8").strip()
index=(ROOT/"templates/index.html").read_text(encoding="utf-8")
css=(ROOT/"static/product-design-v123.css").read_text(encoding="utf-8")
js=(ROOT/"static/product-design-v123.js").read_text(encoding="utf-8")

errors=[]
def require(cond,msg):
    if not cond: errors.append(msg)

require(version=="1.2.3","VERSION must be 1.2.3")
require('/static/product-design-v123.css?v=1.2.3' in index,"design CSS missing")
require('/static/product-design-v123.js?v=1.2.3' in index,"design JS missing")
require('--ui-nav-height:46px' in css,"navigation geometry token missing")
require('Segoe UI Variable Text' in css,"readability font stack missing")
require('grid-template-columns:24px minmax(0,1fr)' in css,"nav alignment grid missing")
require("option.textContent='English'" in js,"English option cleanup missing")
require("option.textContent='中文'" in js,"Chinese option cleanup missing")
require("ICONS" in js and "svg" in js,"aligned SVG navigation icons missing")

if errors:
    print("v1.2.3 design validation FAILED:")
    for e in errors: print(" -",e)
    raise SystemExit(1)

print("v1.2.3 design validation OK")
print("Language selector, navigation alignment, typography and readability polish present")
