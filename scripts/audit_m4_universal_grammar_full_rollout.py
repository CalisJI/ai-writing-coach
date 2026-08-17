from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from writing_coach.grammar_knowledge import validate_grammar_knowledge
from writing_coach.languages.english.grammar_course import GRAMMAR_COURSE as EN_COURSE
from writing_coach.languages.english.grammar_knowledge_base import GRAMMAR_KNOWLEDGE as EN_KB
from writing_coach.languages.chinese.grammar_course import GRAMMAR_COURSE as ZH_COURSE
from writing_coach.languages.chinese.grammar_knowledge_base import GRAMMAR_KNOWLEDGE as ZH_KB

REPRESENTATIVES = {
    "a1-be-am-is-are",
    "a2-present-perfect-vs-past-simple",
    "b1-passive-voice-present-and-past",
}

validate_grammar_knowledge(EN_COURSE, EN_KB)
validate_grammar_knowledge(ZH_COURSE, ZH_KB)

if len(EN_KB) != 269 or len(ZH_KB) != 239 or len(EN_KB) + len(ZH_KB) != 508:
    raise SystemExit("Grammar coverage changed from EN269/ZH239/total508.")

for language, knowledge in (("en", EN_KB), ("zh", ZH_KB)):
    for item in knowledge:
        grammar_id = item["id"]
        model = item.get("learning_model")
        if not isinstance(model, dict) or model.get("schema_version") != 2:
            raise SystemExit(f"{language}:{grammar_id}: schema-v2 model missing")
        if model.get("language_policy", {}).get("target_language") != language:
            raise SystemExit(f"{language}:{grammar_id}: target-language mismatch")
        if item["source"].get("runtime_ai") is not False:
            raise SystemExit(f"{language}:{grammar_id}: runtime AI forbidden")
        status = item["source"].get("universal_model_status")
        if language == "en" and grammar_id in REPRESENTATIVES:
            if status != "representative-curated-v1":
                raise SystemExit(f"{grammar_id}: representative status lost")
        elif status != "source-adapted-v1":
            raise SystemExit(f"{language}:{grammar_id}: source-adapted marker missing")

source_adapted = sum(
    1
    for item in [*EN_KB, *ZH_KB]
    if item["source"].get("universal_model_status") == "source-adapted-v1"
)
if source_adapted != 505:
    raise SystemExit(f"Expected 505 source-adapted entries, got {source_adapted}.")

print("M4_UNIVERSAL_GRAMMAR_FULL_ROLLOUT_AUDIT=PASS")
print("EN_SCHEMA2=269/269")
print("ZH_SCHEMA2=239/239")
print("TOTAL_SCHEMA2=508/508")
print("HUMAN_REVIEWED_REPRESENTATIVES=3")
print("SOURCE_ADAPTED_FOUNDATION=505")
print("RUNTIME_AI=0")
