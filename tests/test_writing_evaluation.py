from __future__ import annotations

from collections.abc import Callable
from typing import Any

import pytest

from writing_coach.languages.chinese.profile import ERROR_CATEGORIES as CHINESE_ERROR_CATEGORIES
from writing_coach.languages.english.profile import ERROR_CATEGORIES as ENGLISH_ERROR_CATEGORIES
from writing_coach.writing_evaluation import normalize_writing_evaluation


RUBRIC_WEIGHTS = {"grammar": 0.6, "vocabulary": 0.4}
LEARNER_TEXT = "I has a dog."


def _en_level(score: float) -> str:
    return "B2" if score >= 60 else "A1"


def _zh_level(score: float) -> str:
    return "HSK4" if score >= 60 else "HSK1"


def _normalize(
    raw: dict[str, Any],
    *,
    allowed_levels: tuple[str, ...] = ("A1", "B2"),
    score_to_level: Callable[[float], str] = _en_level,
    error_categories: tuple[str, ...] = ENGLISH_ERROR_CATEGORIES,
    allow_cjk: bool = False,
    learner_text: str = LEARNER_TEXT,
) -> dict[str, Any]:
    return normalize_writing_evaluation(
        raw,
        rubric_weights=RUBRIC_WEIGHTS,
        allowed_levels=allowed_levels,
        score_to_level=score_to_level,
        error_categories=error_categories,
        allow_cjk=allow_cjk,
        learner_text=learner_text,
    )


def _strength(**overrides: Any) -> dict[str, Any]:
    item = {
        "category": "grammar",
        "fragment": "I has a dog.",
        "explanation_vi": "Cau nay the hien y ro rang.",
        "confidence": 0.8,
    }
    item.update(overrides)
    return item


def _error(**overrides: Any) -> dict[str, Any]:
    item = {
        "category": "agreement",
        "fragment": "I has a dog.",
        "explanation_vi": "Dong tu can phu hop voi chu ngu.",
        "suggestion": "I have a dog.",
        "mini_rule_vi": "I di voi have.",
        "confidence": 0.8,
    }
    item.update(overrides)
    return item


def test_valid_scores_and_weighted_overall_are_preserved_deterministically() -> None:
    result = _normalize({"grammar": 80, "vocabulary": 50, "cefr_estimate": "B2"})

    assert result["grammar"] == 80.0
    assert result["vocabulary"] == 50.0
    assert result["cefr_estimate"] == "B2"
    assert result["grammar"] * 0.6 + result["vocabulary"] * 0.4 == 68.0


def test_numeric_strings_clamp_and_malformed_scores_normalize_safely() -> None:
    result = _normalize({"grammar": "100.06", "vocabulary": "not-a-number"})
    assert result["grammar"] == 100.0
    assert result["vocabulary"] == 0.0

    clamped = _normalize({"grammar": -2, "vocabulary": 150})
    assert clamped["grammar"] == 0.0
    assert clamped["vocabulary"] == 100.0

    malformed = _normalize({"grammar": True, "vocabulary": None})
    assert malformed["grammar"] == 0.0
    assert malformed["vocabulary"] == 0.0


def test_valid_and_invalid_english_levels_use_the_supplied_policy() -> None:
    assert _normalize({"grammar": 70, "vocabulary": 70, "cefr_estimate": "A1"})["cefr_estimate"] == "A1"
    assert _normalize({"grammar": 70, "vocabulary": 70, "cefr_estimate": "not-a-level"})["cefr_estimate"] == "B2"


def test_valid_and_invalid_chinese_levels_use_the_same_shared_implementation() -> None:
    options = {"allowed_levels": ("HSK1", "HSK4"), "score_to_level": _zh_level, "allow_cjk": True}
    assert _normalize({"grammar": 70, "vocabulary": 70, "cefr_estimate": "HSK1"}, **options)["cefr_estimate"] == "HSK1"
    assert _normalize({"grammar": 70, "vocabulary": 70, "cefr_estimate": "invalid"}, **options)["cefr_estimate"] == "HSK4"


def test_strength_evidence_requires_exact_fragment_category_and_confidence() -> None:
    accepted = _normalize({"strength_evidence": [_strength()]})
    assert accepted["strength_evidence"][0]["category"] == "grammar"
    assert accepted["strength_evidence"][0]["fragment"] == LEARNER_TEXT
    assert accepted["strength_evidence"][0]["span"] == {"start": 0, "end": len(LEARNER_TEXT)}

    rejected = _normalize(
        {
            "strength_evidence": [
                _strength(fragment="invented fragment"),
                _strength(confidence=0.74),
                _strength(confidence=0.749),
                _strength(category="unknown"),
                "not-an-object",
            ]
        }
    )
    assert rejected["strength_evidence"] == []


def test_strength_evidence_is_bounded() -> None:
    fragments = [f"good {index}" for index in range(8)]
    result = _normalize(
        {"strength_evidence": [_strength(fragment=fragment) for fragment in fragments]},
        learner_text=" ".join(fragments),
    )
    assert len(result["strength_evidence"]) == 6


def test_errors_require_exact_evidence_meaningful_suggestion_and_confidence() -> None:
    accepted = _normalize({"errors": [_error()]})
    assert accepted["errors"][0]["category"] == "agreement"
    assert accepted["errors"][0]["span"] == {"start": 0, "end": len(LEARNER_TEXT)}
    assert accepted["issues"][0]["id"] == accepted["errors"][0]["id"]

    rejected = _normalize(
        {
            "errors": [
                _error(fragment="invented fragment"),
                _error(confidence=0.74),
                _error(confidence=0.749),
                _error(suggestion=""),
                _error(suggestion="  i   has a dog.  "),
                "not-an-object",
            ]
        }
    )
    assert rejected["errors"] == []


def test_error_categories_follow_exact_active_language_taxonomy() -> None:
    english = _normalize(
        {
            "errors": [
                _error(category="article"),
                _error(category="word_order"),
                _error(category="unknown"),
                _error(category=""),
                _error(category=" article "),
                _error(category="other"),
                _error(category="Article"),
                _error(category=["article"]),
                {key: value for key, value in _error().items() if key != "category"},
            ]
        }
    )
    assert [item["category"] for item in english["errors"]] == ["article", "other"]

    chinese = _normalize(
        {"errors": [_error(category="word_order"), _error(category="article"), _error(category="other")]},
        error_categories=CHINESE_ERROR_CATEGORIES,
        allow_cjk=True,
    )
    assert [item["category"] for item in chinese["errors"]] == ["word_order", "other"]


def test_error_duplicates_collapse_by_exact_category_and_fragment_in_first_valid_order() -> None:
    first = _error(category="agreement", explanation_vi="first")
    result = _normalize(
        {
            "errors": [
                first,
                _error(category="agreement", explanation_vi="duplicate"),
                _error(category="article", explanation_vi="different category"),
            ]
        }
    )
    assert [(item["category"], item["fragment"], item["explanation_vi"]) for item in result["errors"]] == [
        ("agreement", LEARNER_TEXT, "first"),
        ("article", LEARNER_TEXT, "different category"),
    ]


def test_errors_are_prioritized_by_confidence_with_stable_ties() -> None:
    result = _normalize(
        {
            "errors": [
                _error(category="agreement", fragment="I has", confidence=0.8),
                _error(category="article", fragment="a dog", confidence=0.95),
                _error(category="word_order", fragment="I has a dog.", confidence=0.95),
            ]
        },
        learner_text=LEARNER_TEXT,
    )

    assert [(item["category"], item["confidence"]) for item in result["errors"]] == [
        ("article", 0.95),
        ("word_order", 0.95),
        ("agreement", 0.8),
    ]


def test_strength_duplicates_collapse_by_exact_category_and_fragment_in_first_valid_order() -> None:
    first = _strength(explanation_vi="first")
    result = _normalize(
        {
            "strength_evidence": [
                first,
                _strength(explanation_vi="duplicate"),
                _strength(category="vocabulary", explanation_vi="different category"),
            ]
        }
    )
    assert [(item["category"], item["fragment"], item["explanation_vi"]) for item in result["strength_evidence"]] == [
        ("grammar", LEARNER_TEXT, "first"),
        ("vocabulary", LEARNER_TEXT, "different category"),
    ]


def test_errors_are_bounded_to_schema_limit_and_confidence_is_clamped_and_rounded() -> None:
    fragments = [f"error {index}" for index in range(32)]
    items = [
        _error(fragment=fragment, suggestion=f"fix {index}", confidence=1.6)
        for index, fragment in enumerate(fragments)
    ]
    result = _normalize({"errors": items}, learner_text=" ".join(fragments))
    assert len(result["errors"]) == 20
    assert result["errors"][0]["confidence"] == 1.0


def test_english_language_safety_rejects_unexpected_cjk_learner_explanations() -> None:
    result = _normalize(
        {
            "summary_vi": "\u4e2d\u6587",
            "strengths_vi": ["\u4e2d\u6587"],
            "priorities_vi": ["\u4e2d\u6587"],
            "strength_evidence": [_strength(explanation_vi="\u4e2d\u6587")],
            "errors": [_error(explanation_vi="\u4e2d\u6587")],
        }
    )
    assert result["summary_vi"] == ""
    assert result["strengths_vi"] == []
    assert result["priorities_vi"] == []
    assert result["strength_evidence"] == []
    assert result["errors"] == []


def test_chinese_policy_allows_cjk_learner_facing_content() -> None:
    result = _normalize(
        {
            "summary_vi": "\u4e2d\u6587",
            "strengths_vi": ["\u4e2d\u6587"],
            "priorities_vi": ["\u4e2d\u6587"],
            "strength_evidence": [_strength(explanation_vi="\u4e2d\u6587")],
            "errors": [_error(explanation_vi="\u4e2d\u6587", mini_rule_vi="\u4e2d\u6587")],
        },
        allow_cjk=True,
    )
    assert result["summary_vi"] == "\u4e2d\u6587"
    assert result["strengths_vi"] == ["\u4e2d\u6587"]
    assert result["priorities_vi"] == ["\u4e2d\u6587"]
    assert len(result["strength_evidence"]) == 1
    assert len(result["errors"]) == 1


def test_response_shape_is_backward_compatible_and_excludes_internal_learner_text() -> None:
    result = _normalize({"__learner_text": "must not appear"})
    assert set(result) >= {
        "grammar",
        "vocabulary",
        "cefr_estimate",
        "summary_vi",
        "strengths_vi",
        "priorities_vi",
        "strength_evidence",
        "errors",
        "schema_version",
        "text_hash",
        "summary",
        "dimensions",
        "issues",
        "strengths",
        "next_actions",
    }
    assert "__learner_text" not in result


def test_app_validate_result_delegates_to_the_extracted_contract(monkeypatch: pytest.MonkeyPatch) -> None:
    import app

    expected = {"grammar": 1.0}
    captured: dict[str, Any] = {}

    def normalize(raw: dict[str, Any], **kwargs: Any) -> dict[str, Any]:
        captured["raw"] = raw
        captured.update(kwargs)
        return expected

    monkeypatch.setattr(app, "normalize_writing_evaluation", normalize)
    monkeypatch.setattr(app, "active_rubric_weights", lambda: {"grammar": 1.0})
    monkeypatch.setattr(app, "active_levels", lambda: ("A1",))
    monkeypatch.setattr(app, "active_score_to_level", lambda score: "A1")
    monkeypatch.setattr(app, "active_error_categories", lambda: ("agreement", "other"))
    monkeypatch.setattr(app, "is_chinese", lambda: False)

    raw = {"grammar": 1, "__learner_text": LEARNER_TEXT}
    assert app.validate_result(raw) is expected
    assert captured["raw"] is raw
    assert captured["learner_text"] == LEARNER_TEXT
    assert captured["allow_cjk"] is False
    assert captured["error_categories"] == ("agreement", "other")


def test_app_writing_evaluator_path_keeps_its_capability_identity(monkeypatch: pytest.MonkeyPatch) -> None:
    import app
    from writing_coach.ai.base import AIResult

    captured: dict[str, Any] = {}

    def generate_structured(**kwargs: Any) -> AIResult:
        captured.update(kwargs)
        return AIResult(
            data={"grammar": 80, "vocabulary": 50, "cefr_estimate": "B2"},
            provider="test-provider",
            model="test-model",
            runtime={"mode": "test"},
        )

    monkeypatch.setattr(app, "generate_structured", generate_structured)
    result = app.evaluate_with_ai(app.EssayIn(text=LEARNER_TEXT, prompt="Test prompt"))

    assert captured["capability_key"] == "writing_evaluator"
    assert result["grammar"] == 80.0
    assert result["strength_evidence"] == []
    assert result["errors"] == []
    assert result["_ai_provider"] == "test-provider"


def test_heuristic_fallback_keeps_high_confidence_feedback_and_v2_envelope(monkeypatch: pytest.MonkeyPatch) -> None:
    import app

    monkeypatch.setattr(app, "is_chinese", lambda: False)
    result = app.heuristic_fallback(app.EssayIn(text="I has a dog."))

    assert result["schema_version"] == "writing-evaluation-v2"
    assert result["errors"][0]["fragment"] == "I has"
    assert result["errors"][0]["suggestion"] == "I have"
    assert result["issues"][0]["span"] == {"start": 0, "end": 5}
