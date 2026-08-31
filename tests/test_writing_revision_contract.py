from __future__ import annotations

from app import revision_delta


def _issue(category: str, fragment: str, suggestion: str = "fixed") -> dict[str, object]:
    return {
        "id": f"{category}-{fragment}",
        "category": category,
        "fragment": fragment,
        "suggestion": suggestion,
        "span": {"start": 0, "end": len(fragment)},
    }


def test_revision_delta_reports_removed_persistent_new_and_changed_issues() -> None:
    previous = {
        "grammar": 60,
        "vocabulary": 70,
        "coherence": 65,
        "task_achievement": 70,
        "naturalness": 62,
        "overall": 65,
        "errors": [_issue("agreement", "I has"), _issue("article", "a dog")],
    }
    current = {
        "grammar": 72,
        "vocabulary": 70,
        "coherence": 65,
        "task_achievement": 70,
        "naturalness": 62,
        "overall": 69,
        "errors": [_issue("agreement", "I have"), _issue("word_order", "dog a")],
    }

    delta = revision_delta(current, previous)

    assert delta["overall"] == 4.0
    assert delta["issues"]["changed"][0]["before"]["fragment"] == "I has"
    assert delta["issues"]["changed"][0]["after"]["fragment"] == "I have"
    assert [item["fragment"] for item in delta["issues"]["removed"]] == ["a dog"]
    assert [item["fragment"] for item in delta["issues"]["new"]] == ["dog a"]
    assert delta["issues"]["persistent"] == []
