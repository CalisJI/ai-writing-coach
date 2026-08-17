from __future__ import annotations

from dataclasses import dataclass
from typing import Mapping

from writing_coach.languages.chinese.grammar_course import (
    GRAMMAR_BY_ID as CHINESE_GRAMMAR_BY_ID,
    GRAMMAR_COURSE as CHINESE_GRAMMAR_COURSE,
)
from writing_coach.languages.chinese.grammar_knowledge_base import (
    GRAMMAR_KNOWLEDGE_BY_ID as CHINESE_GRAMMAR_KNOWLEDGE_BY_ID,
)
from writing_coach.languages.english.grammar_course import (
    GRAMMAR_BY_ID as ENGLISH_GRAMMAR_BY_ID,
    GRAMMAR_COURSE as ENGLISH_GRAMMAR_COURSE,
)
from writing_coach.languages.english.grammar_knowledge_base import (
    GRAMMAR_KNOWLEDGE_BY_ID as ENGLISH_GRAMMAR_KNOWLEDGE_BY_ID,
)


class GrammarProviderUnavailable(LookupError):
    pass


@dataclass(frozen=True)
class GrammarProvider:
    code: str
    module_name: str
    course: list[dict]
    by_id: dict[str, dict]
    knowledge_by_id: dict[str, dict]
    level_names: Mapping[str, str]
    mechanisms: tuple[str, ...]


_REGISTRY: dict[str, GrammarProvider] = {
    "en": GrammarProvider(
        code="en",
        module_name="english",
        course=ENGLISH_GRAMMAR_COURSE,
        by_id=ENGLISH_GRAMMAR_BY_ID,
        knowledge_by_id=ENGLISH_GRAMMAR_KNOWLEDGE_BY_ID,
        level_names={
            "A1": "Foundation",
            "A2": "Core",
            "B1": "Intermediate",
            "B2": "Upper-intermediate",
            "C1": "Advanced",
            "C2": "Mastery",
        },
        mechanisms=(
            "word-order",
            "auxiliary",
            "agreement",
            "tense",
            "aspect",
            "article",
            "modal",
            "comparison",
            "transformation",
        ),
    ),
    "zh": GrammarProvider(
        code="zh",
        module_name="chinese",
        course=CHINESE_GRAMMAR_COURSE,
        by_id=CHINESE_GRAMMAR_BY_ID,
        knowledge_by_id=CHINESE_GRAMMAR_KNOWLEDGE_BY_ID,
        level_names={
            "HSK1": "Foundation",
            "HSK2": "Basic",
            "HSK3": "Lower-intermediate",
            "HSK4": "Intermediate",
            "HSK5": "Upper-intermediate",
            "HSK6": "Advanced",
            "HSK7-9": "Advanced mastery",
        },
        mechanisms=(
            "word-order",
            "particle",
            "aspect",
            "classifier",
            "complement",
            "comparison",
            "insertion",
            "context-scene",
            "reading-aid",
        ),
    ),
}


def grammar_provider(code: str | None) -> GrammarProvider:
    key = (code or "").strip().casefold()
    provider = _REGISTRY.get(key)
    if provider is None:
        raise GrammarProviderUnavailable(
            f"Grammar provider '{key or '<blank>'}' is not registered."
        )
    return provider


def grammar_provider_codes() -> tuple[str, ...]:
    return tuple(_REGISTRY)


def all_grammar_providers() -> tuple[GrammarProvider, ...]:
    return tuple(_REGISTRY.values())
