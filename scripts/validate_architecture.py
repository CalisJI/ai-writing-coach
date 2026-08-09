from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
errors = []


def require(condition, message):
    if not condition:
        errors.append(message)


version = (ROOT / "VERSION").read_text(encoding="utf-8").strip()
dockerfile = (ROOT / "Dockerfile").read_text(encoding="utf-8")
index = (ROOT / "templates" / "index.html").read_text(encoding="utf-8")
app = (ROOT / "app.py").read_text(encoding="utf-8")
auth = (ROOT / "auth_support.py").read_text(encoding="utf-8")

require(version.startswith("1.0."), "VERSION must be v1.0.x")
require("COPY writing_coach ./writing_coach" in dockerfile, "Dockerfile must copy writing_coach package")
require('app.mount("/static"' in app, "StaticFiles mount is required")
require("writing_coach.languages.runtime" in app, "Language evaluator runtime must be modular")
require("GRAMMAR_LIBRARY = [" not in app, "Dead embedded GRAMMAR_LIBRARY must not return")
require('translation_vi = excluded.translation_vi,\n              translation_vi' not in app, "Duplicate vocabulary SQL assignment exists")
require("<script>\nconst $=" not in index, "Large inline app JavaScript must stay extracted")
require('/static/app.js?v=' in index, "index.html must load static/app.js")
require('/static/language.js?v=' in index, "index.html must load language.js")
require('/static/chinese.js?v=' in index, "index.html must load chinese.js")
require("LANGUAGE_CODE_CTX" in auth, "Auth middleware must set language context")
require("resolve_language_db_path" in auth, "Auth must resolve DB by user + language")

sys.path.insert(0, str(ROOT))
from writing_coach.core.language_registry import all_languages

langs = {x.code: x for x in all_languages()}
require("en" in langs and langs["en"].enabled, "English must be enabled")
require("zh" in langs and langs["zh"].enabled, "Chinese must be enabled in v1.0")

if errors:
    print("Architecture validation FAILED:")
    for item in errors:
        print(" -", item)
    raise SystemExit(1)

print("Architecture validation OK")
print("Version:", version)
print("Languages:", ", ".join(f"{x.code}:{x.status}" for x in all_languages()))
