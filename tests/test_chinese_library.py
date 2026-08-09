from writing_coach.core.request_context import LANGUAGE_CODE_CTX
from writing_coach.languages.chinese.grammar_course import GRAMMAR_BY_ID, GRAMMAR_COURSE
from writing_coach.languages.chinese.profile import PROFILE
from writing_coach.languages.runtime import (
    active_grammar_by_id,
    active_grammar_course,
    grammar_level_names,
)


def test_chinese_library_profile_capabilities():
    assert PROFILE.enabled is True
    for capability in ("grammar", "vocabulary", "dictionary", "translation", "pinyin"):
        assert capability in PROFILE.capabilities


def test_chinese_course_shape():
    assert len(GRAMMAR_COURSE) == 56
    assert len(GRAMMAR_BY_ID) == 56
    assert [x["order"] for x in GRAMMAR_COURSE] == list(range(1, 57))


def test_runtime_selects_chinese_course():
    token = LANGUAGE_CODE_CTX.set("zh")
    try:
        assert active_grammar_course()[0]["level"] == "HSK1"
        assert active_grammar_by_id() is not None
        assert grammar_level_names()["HSK7-9"] == "Advanced mastery"
    finally:
        LANGUAGE_CODE_CTX.reset(token)
