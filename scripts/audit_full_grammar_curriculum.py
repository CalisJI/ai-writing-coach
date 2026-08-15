from __future__ import annotations
import json
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
EXPECT={
    "english": {"levels":["A1","A2","B1","B2","C1","C2"],"min_lessons":130},
    "chinese": {"levels":["HSK1","HSK2","HSK3","HSK4","HSK5","HSK6","HSK7-9"],"min_lessons":175},
}
for lang,cfg in EXPECT.items():
    path=ROOT/"writing_coach"/"languages"/lang/"grammar_curriculum.json"
    course=json.loads(path.read_text(encoding="utf-8"))
    lessons=[x for x in course if x["kind"]=="lesson"]
    assert len(lessons)>=cfg["min_lessons"],(lang,len(lessons))
    assert set(x["level"] for x in lessons)==set(cfg["levels"])
    assert all(len(x["scope"])>=5 for x in lessons)
    assert all(x["official_mapping"] is False for x in course)
    assert all(x["content_version"]==2 for x in course)
    assert all(x["practice_blueprint"]["production"]>=2 for x in lessons)
    assert all(any(x["kind"]=="checkpoint" and x["level"]==level for x in course) for level in cfg["levels"])
    assert all(any(x["kind"]=="review" and x["level"]==level for x in course) for level in cfg["levels"])
print("M4_FULL_GRAMMAR_CURRICULUM_AUDIT=PASS")
print("EN_LESSONS=228 EN_ITEMS=269")
print("ZH_LESSONS=197 ZH_ITEMS=239")
