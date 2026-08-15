from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from writing_coach.grammar_knowledge import validate_grammar_knowledge
from writing_coach.languages.english.grammar_course import GRAMMAR_COURSE as EN_COURSE
from writing_coach.languages.english.grammar_knowledge_base import GRAMMAR_KNOWLEDGE as EN_KNOWLEDGE
from writing_coach.languages.chinese.grammar_course import GRAMMAR_COURSE as ZH_COURSE
from writing_coach.languages.chinese.grammar_knowledge_base import GRAMMAR_KNOWLEDGE as ZH_KNOWLEDGE


def report(label, course, knowledge):
    validate_grammar_knowledge(course, knowledge)
    curated = sum(1 for item in knowledge if item["source"]["content_status"] == "curated")
    foundation = len(knowledge) - curated
    annotatable = sum(1 for item in knowledge if item["cross_skill"]["annotatable"])
    print(
        f"{label}: total={len(knowledge)} foundation={foundation} "
        f"curated={curated} annotatable={annotatable}"
    )


report("EN", EN_COURSE, EN_KNOWLEDGE)
report("ZH", ZH_COURSE, ZH_KNOWLEDGE)
print("STATIC_GRAMMAR_KB_AUDIT=PASS")
