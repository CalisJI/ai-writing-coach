"""Pure normalization contract for learner-facing Writing evaluations."""

from __future__ import annotations

import math
import re
from collections.abc import Callable, Mapping, Sequence
from typing import Any


_CJK_RE = re.compile(r"[\u3400-\u4DBF\u4E00-\u9FFF\u3040-\u30FF\uAC00-\uD7AF]")
CONFIDENCE_THRESHOLD = 0.75
MAX_LEARNER_LIST_ITEMS = 6
MAX_STRENGTH_EVIDENCE_ITEMS = 6
MAX_ERROR_ITEMS = 20


def contains_cjk(text: str) -> bool:
    """Return whether learner-facing text contains CJK writing systems."""
    return bool(_CJK_RE.search(text or ""))


def calculate_weighted_overall(
    result: Mapping[str, Any],
    rubric_weights: Mapping[str, float],
) -> float:
    """Calculate the bounded, one-decimal overall score for supplied rubric data."""
    score = sum(float(result[key]) * weight for key, weight in rubric_weights.items())
    return round(max(0.0, min(100.0, score)), 1)


def normalize_writing_evaluation(
    raw: Mapping[str, Any],
    *,
    rubric_weights: Mapping[str, float],
    allowed_levels: Sequence[str],
    score_to_level: Callable[[float], str],
    error_categories: Sequence[str],
    allow_cjk: bool,
    learner_text: str,
) -> dict[str, Any]:
    """Normalize untrusted evaluator output using supplied language policy.

    This function deliberately owns no language selection, request state, AI
    routing, persistence, or web-framework behavior.  The caller supplies the
    current rubric, proficiency policy, and learner text explicitly.
    """
    result: dict[str, Any] = {}
    for key in rubric_weights:
        result[key] = _normalized_score(raw.get(key, 0))

    overall = calculate_weighted_overall(result, rubric_weights)
    allowed_level_set = set(allowed_levels)
    default_level = allowed_levels[0] if allowed_levels else ""
    estimate = str(raw.get("cefr_estimate", default_level))
    result["cefr_estimate"] = estimate if estimate in allowed_level_set else score_to_level(overall)

    summary = _bounded_text(raw.get("summary_vi", ""), 4000)
    result["summary_vi"] = summary if allow_cjk or not contains_cjk(summary) else ""
    result["strengths_vi"] = _clean_learner_list(raw.get("strengths_vi", []), allow_cjk=allow_cjk)
    result["priorities_vi"] = _clean_learner_list(raw.get("priorities_vi", []), allow_cjk=allow_cjk)
    result["strength_evidence"] = _normalize_strength_evidence(
        raw.get("strength_evidence", []),
        rubric_categories=set(rubric_weights),
        allow_cjk=allow_cjk,
        learner_text=learner_text,
    )
    result["errors"] = _normalize_errors(
        raw.get("errors", []),
        error_categories=set(error_categories),
        allow_cjk=allow_cjk,
        learner_text=learner_text,
    )
    return result


def _normalized_score(value: Any) -> float:
    if isinstance(value, bool):
        return 0.0
    try:
        score = float(value)
    except (TypeError, ValueError):
        return 0.0
    if not math.isfinite(score):
        return 0.0
    return round(max(0.0, min(100.0, score)), 1)


def _normalized_confidence(value: Any) -> float:
    if isinstance(value, bool):
        return 0.0
    try:
        confidence = float(value)
    except (TypeError, ValueError):
        confidence = 0.0
    if not math.isfinite(confidence):
        confidence = 0.0
    return max(0.0, min(1.0, confidence))


def _bounded_text(value: Any, limit: int) -> str:
    return str(value)[:limit].strip()


def _clean_learner_list(
    items: Any,
    *,
    limit: int = MAX_LEARNER_LIST_ITEMS,
    allow_cjk: bool,
) -> list[str]:
    if not isinstance(items, list):
        return []
    output: list[str] = []
    for item in items:
        value = _bounded_text(item, 1000)
        if value and (allow_cjk or not contains_cjk(value)):
            output.append(value)
        if len(output) >= limit:
            break
    return output


def _normalize_strength_evidence(
    items: Any,
    *,
    rubric_categories: set[str],
    allow_cjk: bool,
    learner_text: str,
) -> list[dict[str, Any]]:
    if not isinstance(items, list):
        return []
    output: list[dict[str, Any]] = []
    seen: set[tuple[str, str]] = set()
    for item in items[:MAX_STRENGTH_EVIDENCE_ITEMS]:
        if not isinstance(item, Mapping):
            continue
        category = _bounded_text(item.get("category", ""), 1000)
        fragment = _bounded_text(item.get("fragment", ""), 500)
        explanation = _bounded_text(item.get("explanation_vi", ""), 1500)
        confidence = _normalized_confidence(item.get("confidence", 1.0))
        if category not in rubric_categories or confidence < CONFIDENCE_THRESHOLD:
            continue
        if not fragment or fragment not in learner_text:
            continue
        if not allow_cjk and contains_cjk(explanation):
            continue
        identity = (category, fragment)
        if identity in seen:
            continue
        seen.add(identity)
        output.append(
            {
                "category": category,
                "fragment": fragment,
                "explanation_vi": explanation,
                "confidence": round(confidence, 2),
            }
        )
    return output


def _normalize_errors(
    items: Any,
    *,
    error_categories: set[str],
    allow_cjk: bool,
    learner_text: str,
) -> list[dict[str, Any]]:
    if not isinstance(items, list):
        return []
    output: list[dict[str, Any]] = []
    seen: set[tuple[str, str]] = set()
    for item in items[:MAX_ERROR_ITEMS]:
        if not isinstance(item, Mapping):
            continue
        category = item.get("category")
        if not isinstance(category, str) or category not in error_categories:
            continue
        fragment = _bounded_text(item.get("fragment", ""), 500)
        explanation = _bounded_text(item.get("explanation_vi", ""), 2000)
        suggestion = _bounded_text(item.get("suggestion", ""), 1000)
        rule = _bounded_text(item.get("mini_rule_vi", ""), 1500)
        confidence = _normalized_confidence(item.get("confidence", 1.0))
        if confidence < CONFIDENCE_THRESHOLD or not fragment or fragment not in learner_text:
            continue
        if not allow_cjk and (contains_cjk(explanation) or contains_cjk(rule)):
            continue
        if not suggestion or _normalize_text(suggestion) == _normalize_text(fragment):
            continue
        identity = (category, fragment)
        if identity in seen:
            continue
        seen.add(identity)
        output.append(
            {
                "category": category,
                "fragment": fragment,
                "explanation_vi": explanation,
                "suggestion": suggestion,
                "mini_rule_vi": rule,
                "confidence": round(confidence, 2),
            }
        )
    return output


def _normalize_text(value: str) -> str:
    return re.sub(r"\s+", " ", value.strip()).casefold()
