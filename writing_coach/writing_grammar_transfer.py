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
}


def _haystack(lesson: Mapping[str, Any]) -> str:
    quick = lesson.get("quick_reference")
    tags: list[Any] = []
    if isinstance(quick, Mapping):
        tags.extend(quick.get("lookup_tags") or [])
        tags.extend(quick.get("aliases") or [])
    tags.extend((lesson.get("title"), lesson.get("category")))
    return " ".join(str(item).casefold() for item in tags if item).strip()


def grammar_links_for_issues(
    issues: Sequence[Mapping[str, Any]],
    knowledge_by_id: Mapping[str, Mapping[str, Any]],
    *,
    limit_per_issue: int = 2,
) -> list[dict[str, Any]]:
    """Return conservative lesson recommendations for categorized findings."""
    links: list[dict[str, Any]] = []
    seen: set[tuple[str, str]] = set()
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
        for _, grammar_id, lesson in sorted(matches, key=lambda item: (-item[0], item[1]))[:limit_per_issue]:
            key = (str(issue.get("id") or issue.get("quote") or ""), grammar_id)
            if key in seen:
                continue
            seen.add(key)
            links.append({
                "issue_id": issue.get("id"),
                "grammar_id": grammar_id,
                "title": lesson.get("title", ""),
                "level": lesson.get("level", ""),
                "reason": f"Writing finding category: {category}",
                "source": "static-grammar-kb",
            })
    return links
