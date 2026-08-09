from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from writing_coach.languages.chinese.grammar_course import GRAMMAR_COURSE, GRAMMAR_BY_ID
from writing_coach.languages.chinese.profile import PROFILE

EXPECTED_LEVELS = ("HSK1","HSK2","HSK3","HSK4","HSK5","HSK6","HSK7-9")

assert PROFILE.enabled, "Chinese profile must remain enabled"
assert PROFILE.levels == EXPECTED_LEVELS
assert len(GRAMMAR_COURSE) == 56, f"expected 56 Chinese grammar lessons, got {len(GRAMMAR_COURSE)}"
assert len(GRAMMAR_BY_ID) == len(GRAMMAR_COURSE), "Chinese grammar lesson IDs must be unique"
assert [x["order"] for x in GRAMMAR_COURSE] == list(range(1, 57)), "lesson order must be contiguous"

for level in EXPECTED_LEVELS:
    rows = [x for x in GRAMMAR_COURSE if x["level"] == level]
    assert len(rows) == 8, f"{level} should contain 8 lessons"
    assert all(x["title"] and x["objective_vi"] for x in rows)

print("Chinese library validation OK")
print("Lessons:", len(GRAMMAR_COURSE))
print("Levels:", ", ".join(EXPECTED_LEVELS))
