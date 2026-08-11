from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from writing_coach.product.catalog import PLANS, FREE, PREMIUM

version = (ROOT / "VERSION").read_text(encoding="utf-8").strip()
index = (ROOT / "templates" / "index.html").read_text(encoding="utf-8")
app = (ROOT / "app.py").read_text(encoding="utf-8")
compose = (ROOT / "compose.yaml").read_text(encoding="utf-8")
login = (ROOT / "templates" / "login.html").read_text(encoding="utf-8")

errors = []

def require(condition, message):
    if not condition:
        errors.append(message)

require(version == "1.2.0", "VERSION must be 1.2.0")
require(set(PLANS) >= {"free", "premium"}, "Free and Premium plans must exist")
require(FREE.entitlement_map()["analytics.advanced"].enabled is False, "Free advanced analytics must stay locked")
require(PREMIUM.entitlement_map()["analytics.advanced"].enabled is True, "Premium advanced analytics must be enabled")
require("writing_coach.product.api" in app, "app.py must install product API")
require("app.include_router(product_router)" in app, "product router must be included")
require("PRODUCT_DB: /data/product.db" in compose, "compose must configure centralized product DB")
require("Data stays in local SQLite." not in index, "learner UI must not expose SQLite implementation")
require("/static/product-shell.js?v=1.2.0" in index, "product shell JS must be loaded")
require("/static/product-v120.css?v=1.2.0" in index, "product CSS must be loaded")
require("Local Ollama writing evaluation" not in login, "login must not expose Ollama implementation")
require("productTopbarLanguage" in index, "product topbar must exist")

if errors:
    print("Product foundation validation FAILED:")
    for item in errors:
        print(" -", item)
    raise SystemExit(1)

print("Product foundation validation OK")
print("Plans:", ", ".join(PLANS))
