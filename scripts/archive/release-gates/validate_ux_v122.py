from pathlib import Path
import sys

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))

version=(ROOT/"VERSION").read_text(encoding="utf-8").strip()
index=(ROOT/"templates/index.html").read_text(encoding="utf-8")
css=(ROOT/"static/product-ux-v122.css").read_text(encoding="utf-8")
js=(ROOT/"static/product-ux-v122.js").read_text(encoding="utf-8")

errors=[]
def require(cond,msg):
    if not cond: errors.append(msg)

require(version=="1.2.2","VERSION must be 1.2.2")
require('/static/product-theme-v121.css?v=1.2.2' in index,"full-theme compatibility layer must stay loaded")
require('/static/product-ux-v122.css?v=1.2.2' in index,"v1.2.2 UX CSS must be loaded")
require('/static/product-ux-v122.js?v=1.2.2' in index,"v1.2.2 UX JS must be loaded")
require('z-index:2000!important' in css,"modal must sit above sticky topbar")
require('.modal .close' in css and 'position:sticky' in css,"modal close button must stay visible while scrolling")
require('product-user-chip' in css,"topbar user chip styles missing")
require("renderTopbarUser" in js,"topbar user identity rendering missing")
require("event.key!=='Escape'" in js,"Escape modal close behavior missing")
require("event.target===modal" in js,"backdrop click close behavior missing")

if errors:
    print("v1.2.2 UX validation FAILED:")
    for e in errors: print(" -",e)
    raise SystemExit(1)

print("v1.2.2 UX validation OK")
print("Modal layering, sticky close, backdrop/Escape close and topbar identity are present")
