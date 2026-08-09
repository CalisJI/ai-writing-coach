from writing_coach.languages.chinese.profile import PROFILE, score_to_level
from writing_coach.languages.runtime import writing_unit_count
from writing_coach.core.request_context import LANGUAGE_CODE_CTX


def test_chinese_profile_is_enabled_beta():
    assert PROFILE.code == "zh"
    assert PROFILE.enabled is True
    assert PROFILE.status == "beta"
    assert PROFILE.levels == ("HSK1","HSK2","HSK3","HSK4","HSK5","HSK6","HSK7-9")


def test_chinese_score_bands():
    assert score_to_level(0) == "HSK1"
    assert score_to_level(39.9) == "HSK2"
    assert score_to_level(54.9) == "HSK3"
    assert score_to_level(67.9) == "HSK4"
    assert score_to_level(79.9) == "HSK5"
    assert score_to_level(89.9) == "HSK6"
    assert score_to_level(90) == "HSK7-9"


def test_chinese_writing_unit_count():
    token = LANGUAGE_CODE_CTX.set("zh")
    try:
        assert writing_unit_count("我今天学习中文。") == 7
        assert writing_unit_count("我用AI学习中文123") == 7
    finally:
        LANGUAGE_CODE_CTX.reset(token)
