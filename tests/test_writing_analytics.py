from __future__ import annotations

import json
from datetime import datetime
from typing import Any

import pytest

from writing_coach.languages.chinese.profile import ERROR_CATEGORIES as CHINESE_ERROR_CATEGORIES
from writing_coach.languages.english.profile import ERROR_CATEGORIES as ENGLISH_ERROR_CATEGORIES
from writing_coach.writing_analytics import parse_persisted_error_events


def _event(category: Any = "article", fragment: Any = "the cat", **extra: Any) -> dict[str, Any]:
    return {"category": category, "fragment": fragment, **extra}


def _raw(*events: Any) -> str:
    return json.dumps(events)


def _row(row_id: int, *events: Any) -> dict[str, Any]:
    return {
        "id": row_id,
        "created_at": datetime.now().astimezone().isoformat(),
        "errors_json": _raw(*events),
    }


def test_parser_applies_exact_english_and_chinese_taxonomies() -> None:
    events = _raw(
        _event("article"),
        _event("word_order"),
        _event("unknown", "unknown fragment"),
        _event("", "blank fragment"),
        _event("other", "other fragment"),
        _event(" article ", "spaced category"),
        _event("Article", "case-folded category"),
        _event(["article"], "non-string category"),
        {"fragment": "missing category"},
    )

    english = parse_persisted_error_events(events, error_categories=ENGLISH_ERROR_CATEGORIES)
    chinese = parse_persisted_error_events(events, error_categories=CHINESE_ERROR_CATEGORIES)

    assert [event["category"] for event in english] == ["article", "other"]
    assert [event["category"] for event in chinese] == ["word_order", "other"]


@pytest.mark.parametrize("raw", ["not-json", "{}", '"text"', "null", None])
def test_parser_fails_safe_for_malformed_or_non_list_json(raw: Any) -> None:
    assert parse_persisted_error_events(raw, error_categories=ENGLISH_ERROR_CATEGORIES) == []


def test_parser_ignores_non_objects_and_invalid_fragments() -> None:
    raw = _raw(
        "not-an-object",
        1,
        None,
        _event(fragment=""),
        _event(fragment=None),
        _event(fragment=12),
    )

    assert parse_persisted_error_events(raw, error_categories=ENGLISH_ERROR_CATEGORIES) == []


def test_parser_deduplicates_exact_identity_per_revision_in_first_valid_order() -> None:
    first = _event(note="first")
    raw = _raw(
        first,
        _event(note="duplicate"),
        _event("agreement"),
        _event("article", "The cat"),
    )

    assert parse_persisted_error_events(raw, error_categories=ENGLISH_ERROR_CATEGORIES) == [
        first,
        _event("agreement"),
        _event("article", "The cat"),
    ]


def test_error_memory_aggregates_only_valid_events_and_deduplicates_per_revision() -> None:
    import app

    rows = [
        _row(1, _event(), _event(note="duplicate"), _event("word_order")),
        _row(2, _event(), _event("unknown", "bad")),
    ]

    items = app.error_memory(rows, ENGLISH_ERROR_CATEGORIES)

    assert len(items) == 1
    assert items[0]["category"] == "article"
    assert items[0]["total"] == 2


def test_dashboard_and_error_memory_share_validated_events_and_response_shape(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    import app

    latest = {
        **_row(1, _event(), _event(note="duplicate"), _event("word_order")),
        "series_id": 1,
        "revision_no": 1,
        "overall": 60,
        "grammar": 60,
    }
    monkeypatch.setattr(app._learning_repository, "list_essays", lambda *args, **kwargs: [latest])
    monkeypatch.setattr(app._learning_repository, "list_latest_series", lambda: [latest])
    monkeypatch.setattr(app, "active_error_categories", lambda: ENGLISH_ERROR_CATEGORIES)
    monkeypatch.setattr(app, "active_rubric_weights", lambda: {"grammar": 1.0})
    monkeypatch.setattr(app, "progress_bands", lambda: [])

    memory_response = app.api_error_memory()
    dashboard_response = app.dashboard()

    assert set(memory_response) == {"items", "revision_count"}
    assert dashboard_response["error_counts"] == {"article": 1}
    assert [item["category"] for item in dashboard_response["error_memory"]] == ["article"]
    assert {
        "essay_count",
        "revision_count",
        "skill_score",
        "cefr",
        "streak",
        "recent_average",
        "trend",
        "metrics",
        "error_counts",
        "error_memory",
        "next_level",
        "version",
    } == set(dashboard_response)
