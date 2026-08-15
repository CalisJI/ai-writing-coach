from __future__ import annotations
from writing_coach.grammar_catalog import validate_grammar_catalog
from writing_coach.languages.english.grammar_course import GRAMMAR_COURSE as EN, GRAMMAR_BY_ID as EN_IDX
from writing_coach.languages.english.profile import PROFILE as EN_PROFILE
from writing_coach.languages.chinese.grammar_course import GRAMMAR_COURSE as ZH, GRAMMAR_BY_ID as ZH_IDX
from writing_coach.languages.chinese.profile import PROFILE as ZH_PROFILE

def test_full_english_curriculum_contract():
    validate_grammar_catalog(EN, EN_PROFILE.levels, EN_IDX)
    lessons=[x for x in EN if x["kind"]=="lesson"]
    assert len(lessons)>=130
    assert {x["level"] for x in lessons}==set(EN_PROFILE.levels)
    assert all(len(x["scope"])>=5 for x in lessons)
    assert all(x["practice_blueprint"]["production"]>=2 for x in lessons)
    assert all(x["official_mapping"] is False for x in EN)

def test_full_chinese_curriculum_contract():
    validate_grammar_catalog(ZH, ZH_PROFILE.levels, ZH_IDX)
    lessons=[x for x in ZH if x["kind"]=="lesson"]
    assert len(lessons)>=175
    assert {x["level"] for x in lessons}==set(ZH_PROFILE.levels)
    assert all(len(x["scope"])>=5 for x in lessons)
    assert all(x["practice_blueprint"]["production"]>=2 for x in lessons)
    assert all(x["official_mapping"] is False for x in ZH)

def test_every_level_has_review_and_checkpoint():
    for course,levels in ((EN,EN_PROFILE.levels),(ZH,ZH_PROFILE.levels)):
        for level in levels:
            assert any(x["level"]==level and x["kind"]=="review" for x in course)
            assert any(x["level"]==level and x["kind"]=="checkpoint" for x in course)


def test_curriculum_has_authored_module_boundaries_not_placeholder_scope():
    generic=("Form and structure:","Meaning and communicative function of","Typical sentence position")
    for course in (EN,ZH):
        assert all(len(item["module_scope"]) >= 4 for item in course)
        assert all(
            not any(str(scope).startswith(prefix) for scope in item["scope"] for prefix in generic)
            for item in course
        )
