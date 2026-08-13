"""Language-neutral structural validation for grammar lesson catalogs."""

from __future__ import annotations

from collections.abc import Mapping, Sequence
from typing import Any


class GrammarCatalogInvalid(ValueError):
    """Raised when a grammar catalog breaks the shared structural contract."""


_REQUIRED_FIELDS = ("id", "order", "level", "category", "title", "objective_vi")
_REQUIRED_TEXT_FIELDS = ("category", "title", "objective_vi")


def validate_grammar_catalog(
    course: Sequence[Mapping[str, Any]],
    language_levels: Sequence[str],
    grammar_by_id: Mapping[str, Mapping[str, Any]],
) -> None:
    """Validate a supplied grammar course, language levels, and lesson index.

    The contract is deliberately structural: it knows nothing about a language's
    level names, lesson-id prefixes, request context, storage, or AI providers.
    """
    if not isinstance(course, Sequence) or isinstance(course, (str, bytes)) or not course:
        raise GrammarCatalogInvalid("Grammar course must be a non-empty sequence.")

    allowed_levels = frozenset(language_levels)
    lesson_ids: set[str] = set()
    lesson_orders: set[int] = set()
    course_by_id: dict[str, Mapping[str, Any]] = {}

    for position, lesson in enumerate(course, start=1):
        if not isinstance(lesson, Mapping):
            raise GrammarCatalogInvalid(f"Grammar lesson at position {position} must be a mapping.")

        for field in _REQUIRED_FIELDS:
            if field not in lesson:
                raise GrammarCatalogInvalid(
                    f"Grammar lesson at position {position} is missing required field '{field}'."
                )

        lesson_id = lesson["id"]
        if not isinstance(lesson_id, str) or not lesson_id.strip() or lesson_id != lesson_id.strip():
            raise GrammarCatalogInvalid(
                f"Grammar lesson at position {position} must have a non-empty stable string id."
            )
        if lesson_id in lesson_ids:
            raise GrammarCatalogInvalid(f"Grammar course has duplicate lesson id '{lesson_id}'.")

        order = lesson["order"]
        if not isinstance(order, int) or isinstance(order, bool):
            raise GrammarCatalogInvalid(f"Grammar lesson '{lesson_id}' order must be an integer.")
        if order in lesson_orders:
            raise GrammarCatalogInvalid(f"Grammar course has duplicate lesson order {order}.")

        level = lesson["level"]
        if not isinstance(level, str) or level not in allowed_levels:
            raise GrammarCatalogInvalid(
                f"Grammar lesson '{lesson_id}' level must belong to the supplied language levels."
            )

        for field in _REQUIRED_TEXT_FIELDS:
            value = lesson[field]
            if not isinstance(value, str) or not value.strip():
                raise GrammarCatalogInvalid(
                    f"Grammar lesson '{lesson_id}' field '{field}' must be a non-empty string."
                )

        lesson_ids.add(lesson_id)
        lesson_orders.add(order)
        course_by_id[lesson_id] = lesson

    if sorted(lesson_orders) != list(range(1, len(course) + 1)):
        raise GrammarCatalogInvalid("Grammar course lesson orders must be contiguous beginning at 1.")

    if not isinstance(grammar_by_id, Mapping) or set(grammar_by_id) != set(course_by_id):
        raise GrammarCatalogInvalid("Grammar catalog index keys must match the course lesson ids.")

    for lesson_id, lesson in course_by_id.items():
        if grammar_by_id[lesson_id] != lesson:
            raise GrammarCatalogInvalid(
                f"Grammar catalog index entry for lesson id '{lesson_id}' does not match the course lesson."
            )
