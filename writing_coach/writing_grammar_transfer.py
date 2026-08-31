"""Deterministic bridge from Writing findings to the static R5 curriculum."""
from __future__ import annotations

from collections.abc import Mapping, Sequence
from typing import Any


# These are category-level signals, not replacements for authored Grammar IDs.
# A lesson is linked only when one of its own lookup tags/title contains a
# signal, so an uncertain finding remains unlinked for later review.
CATEGORY_SIGNALS: dict[str, tuple[str, ...]] = {
    "agreement": ("agreement", "subject verb", "subject-verb", "verb agreement"),
    "article": ("article", "determiner"),
    "tense": ("tense", "past", "present", "future"),
    "preposition": ("preposition",),
    "word_order": ("word order", "word-order", "sentence structure", "svo"),
    "sentence_structure": ("sentence structure", "word order", "sentence foundation"),
    "punctuation": ("punctuation",),
    "coherence": ("cohesion", "coherence", "linking", "connector"),
    # Chinese grammar categories use the shared R5 curriculum's bilingual
    # lookup tags. Keep these signals narrow so lexical findings do not get
    # sent to an unrelated grammar lesson.
    "particle": ("particle", "aspect particle", "sentence-final particle", "scope/focus", "stance particle"),
    "aspect": ("aspect interaction", "written aspect", "aspect/viewpoint", "\u8fc7/\u4e86/\u7740", "\u4e86/\u8fc7/\u7740"),
    "complement": ("complement", "b\u1ed5 ng\u1eef", "result complement", "directional complement"),
    "measure_word": ("measure word", "measure-word", "classifier", "l\u01b0\u1ee3ng t\u1eeb"),
    "ba_sentence": ("ba sentence", "\u628a\u5b57\u53e5", "\u628a + object"),
    "bei_sentence": ("bei sentence", "\u88ab\u5b57\u53e5", "\u88ab + agent"),
    "conjunction": ("conjunction", "connector", "li\u00ean t\u1eeb", "\u8854\u63a5"),
}

_LEVEL_ORDERS: tuple[tuple[str, ...], ...] = (
    ("A1", "A2", "B1", "B2", "C1", "C2"),
    ("HSK1", "HSK2", "HSK3", "HSK4", "HSK5", "HSK6", "HSK7-9"),
)


def _haystack(lesson: Mapping[str, Any]) -> str:
    quick = lesson.get("quick_reference")
    tags: list[Any] = []
    if isinstance(quick, Mapping):
        tags.extend(quick.get("lookup_tags") or [])
        tags.extend(quick.get("aliases") or [])
    tags.extend((lesson.get("title"), lesson.get("category")))
    return " ".join(str(item).casefold() for item in tags if item).strip()


def _level_distance(target_level: str | None, lesson_level: Any) -> tuple[int, int]:
    """Rank a lesson by proximity to the learner's requested level.

    A missing target keeps the historical signal-first ordering. When a target
    exists, exact-level lessons must outrank a stronger lexical match at a
    distant level; otherwise a beginner can be sent to an advanced review just
    because its title contains a longer lookup tag.
    """
    target = target_level.strip().upper() if isinstance(target_level, str) else ""
    level = lesson_level.strip().upper() if isinstance(lesson_level, str) else ""
    if not target:
        return (0, 0)
    for order in _LEVEL_ORDERS:
        if target in order:
            if level in order:
                return (abs(order.index(level) - order.index(target)), order.index(level))
            return (len(order), len(order))
    return (0 if level == target else len(_LEVEL_ORDERS[0]) + len(_LEVEL_ORDERS[1]), 0)


def grammar_links_for_issues(
    issues: Sequence[Mapping[str, Any]],
    knowledge_by_id: Mapping[str, Mapping[str, Any]],
    *,
    limit_per_issue: int = 2,
    target_level: str | None = None,
) -> list[dict[str, Any]]:
    """Return conservative lesson recommendations for categorized findings."""
    links: list[dict[str, Any]] = []
    # A lesson may match several findings in the same essay; recommend it once
    # and let the lesson itself cover the shared pattern.
    seen_grammar_ids: set[str] = set()
    for issue in issues:
        category = str(issue.get("category") or "").casefold().strip()
        signals = CATEGORY_SIGNALS.get(category, ())
        if not signals:
            continue
        matches: list[tuple[int, str, Mapping[str, Any]]] = []
        for grammar_id, lesson in knowledge_by_id.items():
            haystack = _haystack(lesson)
            matched = [signal for signal in signals if signal in haystack]
            if matched:
                # Prefer exact category/title matches over broad lookup tags.
                score = max(len(signal) for signal in matched)
                matches.append((score, str(grammar_id), lesson))
        for _, grammar_id, lesson in sorted(
            matches,
            key=lambda item: (*_level_distance(target_level, item[2].get("level")), -item[0], item[1]),
        )[:limit_per_issue]:
            if grammar_id in seen_grammar_ids:
                continue
            seen_grammar_ids.add(grammar_id)
            links.append({
                "issue_id": issue.get("id"),
                "category": category,
                "grammar_id": grammar_id,
                "title": lesson.get("title", ""),
                "level": lesson.get("level", ""),
                "reason": f"Writing finding category: {category}",
                "evidence": (
                    issue.get("fragment").strip()
                    if isinstance(issue.get("fragment"), str) and issue.get("fragment").strip()
                    else issue.get("quote").strip()
                    if isinstance(issue.get("quote"), str) and issue.get("quote").strip()
                    else ""
                ),
                "source": "static-grammar-kb",
            })
    return links
