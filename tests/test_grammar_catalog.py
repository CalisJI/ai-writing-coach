from __future__ import annotations

from copy import deepcopy

import pytest

from writing_coach.grammar_catalog import GrammarCatalogInvalid, validate_grammar_catalog
from writing_coach.languages.chinese.grammar_course import (
    GRAMMAR_BY_ID as CHINESE_GRAMMAR_BY_ID,
    GRAMMAR_COURSE as CHINESE_GRAMMAR_COURSE,
)
from writing_coach.languages.chinese.profile import PROFILE as CHINESE_PROFILE
from writing_coach.languages.english.grammar_course import (
    GRAMMAR_BY_ID as ENGLISH_GRAMMAR_BY_ID,
    GRAMMAR_COURSE as ENGLISH_GRAMMAR_COURSE,
)
from writing_coach.languages.english.profile import PROFILE as ENGLISH_PROFILE


def _lesson(
    lesson_id: str = "shared-topic",
    order: int = 1,
    level: str = "starter",
    **overrides: object,
) -> dict[str, object]:
    lesson = {
        "id": lesson_id,
        "order": order,
        "level": level,
        "category": "Structure",
        "title": "A reusable lesson",
        "objective_vi": "Ap dung cau truc vao bai viet.",
    }
    lesson.update(overrides)
    return lesson


def _index(course: list[dict[str, object]]) -> dict[str, dict[str, object]]:
    return {lesson["id"]: lesson for lesson in course}  # type: ignore[dict-item]


def test_current_english_grammar_catalog_passes_shared_contract() -> None:
    assert (
        validate_grammar_catalog(
            ENGLISH_GRAMMAR_COURSE,
            ENGLISH_PROFILE.levels,
            ENGLISH_GRAMMAR_BY_ID,
        )
        is None
    )


def test_current_chinese_grammar_catalog_passes_shared_contract() -> None:
    assert (
        validate_grammar_catalog(
            CHINESE_GRAMMAR_COURSE,
            CHINESE_PROFILE.levels,
            CHINESE_GRAMMAR_BY_ID,
        )
        is None
    )


def test_validator_accepts_language_neutral_levels_and_lesson_ids() -> None:
    course = [_lesson("topic/one", 1, "starter"), _lesson("topic/two", 2, "mastery")]

    validate_grammar_catalog(course, ("starter", "mastery"), _index(course))


def test_duplicate_lesson_id_fails() -> None:
    course = [_lesson("topic", 1), _lesson("topic", 2)]

    with pytest.raises(GrammarCatalogInvalid, match="duplicate lesson id"):
        validate_grammar_catalog(course, ("starter",), _index(course))


def test_duplicate_lesson_order_fails() -> None:
    course = [_lesson("topic-one", 1), _lesson("topic-two", 1)]

    with pytest.raises(GrammarCatalogInvalid, match="duplicate lesson order"):
        validate_grammar_catalog(course, ("starter",), _index(course))


def test_missing_required_field_fails() -> None:
    course = [_lesson()]
    del course[0]["category"]

    with pytest.raises(GrammarCatalogInvalid, match="missing required field 'category'"):
        validate_grammar_catalog(course, ("starter",), _index(course))


@pytest.mark.parametrize("field", ("title", "objective_vi"))
def test_empty_required_text_fields_fail(field: str) -> None:
    course = [_lesson(**{field: "  "})]

    with pytest.raises(GrammarCatalogInvalid, match=f"field '{field}' must be a non-empty string"):
        validate_grammar_catalog(course, ("starter",), _index(course))


def test_invalid_level_fails() -> None:
    course = [_lesson(level="outside-profile")]

    with pytest.raises(GrammarCatalogInvalid, match="must belong to the supplied language levels"):
        validate_grammar_catalog(course, ("starter",), _index(course))


def test_non_contiguous_ordering_fails() -> None:
    course = [_lesson("topic-one", 1), _lesson("topic-two", 3)]

    with pytest.raises(GrammarCatalogInvalid, match="orders must be contiguous beginning at 1"):
        validate_grammar_catalog(course, ("starter",), _index(course))


def test_malformed_lesson_object_fails() -> None:
    with pytest.raises(GrammarCatalogInvalid, match="position 1 must be a mapping"):
        validate_grammar_catalog(["not-a-lesson"], ("starter",), {})  # type: ignore[list-item]


def test_mismatched_grammar_by_id_index_fails() -> None:
    course = [_lesson()]
    index = deepcopy(_index(course))
    index["shared-topic"]["title"] = "A different lesson"

    with pytest.raises(GrammarCatalogInvalid, match="does not match the course lesson"):
        validate_grammar_catalog(course, ("starter",), index)
