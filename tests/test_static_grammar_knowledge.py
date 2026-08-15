from pathlib import Path

from writing_coach.grammar_knowledge import validate_grammar_knowledge
from writing_coach.languages.english.grammar_course import GRAMMAR_COURSE as EN_COURSE
from writing_coach.languages.english.grammar_knowledge_base import (
    GRAMMAR_KNOWLEDGE as EN_KNOWLEDGE,
    GRAMMAR_KNOWLEDGE_BY_ID as EN_BY_ID,
)
from writing_coach.languages.chinese.grammar_course import GRAMMAR_COURSE as ZH_COURSE
from writing_coach.languages.chinese.grammar_knowledge_base import (
    GRAMMAR_KNOWLEDGE as ZH_KNOWLEDGE,
    GRAMMAR_KNOWLEDGE_BY_ID as ZH_BY_ID,
)


def test_static_knowledge_covers_every_curriculum_item():
    validate_grammar_knowledge(EN_COURSE, EN_KNOWLEDGE)
    validate_grammar_knowledge(ZH_COURSE, ZH_KNOWLEDGE)
    assert set(EN_BY_ID) == {item["id"] for item in EN_COURSE}
    assert set(ZH_BY_ID) == {item["id"] for item in ZH_COURSE}


def test_static_knowledge_is_safe_for_cross_skill_lookup():
    for course, by_id in ((EN_COURSE, EN_BY_ID), (ZH_COURSE, ZH_BY_ID)):
        for item in course:
            kb = by_id[item["id"]]
            assert kb["source"]["runtime_ai"] is False
            assert kb["source"]["official_mapping"] is False
            assert kb["quick_reference"]["summary_vi"]
            assert kb["cross_skill"]["grammar_id"] == item["id"]
            assert kb["cross_skill"]["annotatable"] is (item["kind"] == "lesson")


def test_runtime_grammar_endpoint_cannot_generate_with_ai_or_wait_on_cache():
    app = Path("app.py").read_text(encoding="utf-8")
    assert "def generate_grammar_lesson(" not in app
    assert "grammar_lesson_generator" not in app
    assert "grammar_lesson_prompts" not in app
    start = app.index('@app.get("/api/library/grammar/{lesson_id}/reference")')
    end = app.index('@app.post("/api/library/grammar/{lesson_id}/complete")', start)
    block = app[start:end]
    for forbidden in (
        "ai_json(",
        "_learning_cache.get_grammar_lesson",
        "_learning_cache.put_grammar_lesson",
        "generate_grammar_lesson(",
    ):
        assert forbidden not in block
    assert '"source": "static-grammar-kb"' in block


def test_static_reference_route_exists_for_future_cross_skill_inspector():
    app = Path("app.py").read_text(encoding="utf-8")
    assert '@app.get("/api/library/grammar/{lesson_id}/reference")' in app
    assert "api_grammar_reference" in app
    assert '"quick_reference"' in app
    assert '"cross_skill"' in app
