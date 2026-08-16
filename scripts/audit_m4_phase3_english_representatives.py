from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from writing_coach.grammar_knowledge import validate_grammar_knowledge
from writing_coach.languages.english.grammar_course import GRAMMAR_COURSE
from writing_coach.languages.english.grammar_knowledge_base import (
    GRAMMAR_KNOWLEDGE,
    GRAMMAR_KNOWLEDGE_BY_ID,
)

TARGETS = {
    "a1-be-am-is-are",
    "a2-present-perfect-vs-past-simple",
    "b1-passive-voice-present-and-past",
}
COMMON = {
    "scene", "common_mistake", "exception", "personal_practice",
    "recall", "memory_hook", "skill_transfer",
}
SPECIFIC = {
    "a1-be-am-is-are": {"formula", "semantic_sentence", "transformation", "contrast", "micro_practice"},
    "a2-present-perfect-vs-past-simple": {"formula", "timeline", "contrast", "micro_practice"},
    "b1-passive-voice-present-and-past": {"formula", "semantic_sentence", "transformation", "contrast", "sentence_builder", "micro_practice"},
}

validate_grammar_knowledge(GRAMMAR_COURSE, GRAMMAR_KNOWLEDGE)

curated = {
    item["id"] for item in GRAMMAR_KNOWLEDGE
    if item["source"]["content_status"] == "curated"
}
if curated != TARGETS:
    raise SystemExit(
        "PHASE3_CURATED_SCOPE_FAIL expected="
        + repr(sorted(TARGETS)) + " actual=" + repr(sorted(curated))
    )

for grammar_id in sorted(TARGETS):
    item = GRAMMAR_KNOWLEDGE_BY_ID[grammar_id]
    model = item["learning_model"]
    types = {block["type"] for block in model["blocks"]}
    missing = (COMMON | SPECIFIC[grammar_id]) - types
    if missing:
        raise SystemExit(f"PHASE3_BLOCKS_FAIL {grammar_id}: {sorted(missing)}")
    if model["completion"]["required_stages"] != ["apply", "recall", "transfer"]:
        raise SystemExit(f"PHASE3_COMPLETION_FAIL {grammar_id}")
    if item["source"]["runtime_ai"] is not False:
        raise SystemExit(f"PHASE3_RUNTIME_AI_FAIL {grammar_id}")

print("M4_PHASE3_ENGLISH_REPRESENTATIVES_AUDIT=PASS")
print("CURATED_IDS=" + ",".join(sorted(TARGETS)))
print("EN_CURATED=3")
print("EN_FOUNDATION=" + str(len(GRAMMAR_KNOWLEDGE) - 3))
print("VISUAL_APPROVAL=PENDING")
