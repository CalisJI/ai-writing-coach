"""On-demand linguistic interaction for the closed shared Media Learning foundation."""

from __future__ import annotations

from functools import lru_cache
import re
from typing import Any

from fastapi import APIRouter, HTTPException
import jieba.posseg as pseg
from pydantic import BaseModel, ConfigDict, Field, field_validator
from pypinyin import Style, lazy_pinyin

from writing_coach.ai.base import AICapabilityError, AIProviderError, AIProviderUnavailable
from writing_coach.ai.platform import generate_structured
from writing_coach.core.request_context import current_language_code
from writing_coach.core.support_languages import (
    UnsupportedSupportLanguage,
    normalize_support_language,
)


router = APIRouter()

_ALLOWED_POS = {
    "noun",
    "verb",
    "adjective",
    "adverb",
    "pronoun",
    "determiner",
    "preposition",
    "conjunction",
    "numeral",
    "particle",
    "auxiliary",
    "interjection",
    "classifier",
    "proper_noun",
    "other",
}
_SUPPORT_LANGUAGE_NAMES = {
    "vi": "Vietnamese",
    "en": "English",
    "zh": "Simplified Chinese",
}
_MAX_ANNOTATIONS = 160
_EN_DETERMINERS = {"a", "an", "the", "this", "that", "these", "those", "some", "any", "each", "every", "many", "much"}
_EN_PRONOUNS = {"i", "me", "you", "he", "him", "she", "her", "it", "we", "us", "they", "them", "my", "your", "his", "our", "their", "mine", "yours", "ours", "theirs", "who", "which", "what"}
_EN_PREPOSITIONS = {"at", "by", "for", "from", "in", "into", "of", "on", "over", "to", "under", "with", "without", "about", "after", "before", "between", "through"}
_EN_CONJUNCTIONS = {"and", "but", "or", "nor", "so", "yet", "because", "although", "if", "while", "when"}
_EN_AUXILIARIES = {"am", "are", "be", "been", "being", "can", "could", "did", "do", "does", "had", "has", "have", "is", "may", "might", "must", "shall", "should", "was", "were", "will", "would"}
_EN_VERBS = {"be", "become", "come", "eat", "feel", "find", "get", "give", "go", "have", "know", "learn", "like", "listen", "make", "play", "read", "say", "see", "speak", "study", "take", "think", "use", "walk", "want", "watch", "work", "write"}
_EN_ADJECTIVES = {"curious", "good", "great", "happy", "important", "new", "old", "small", "useful"}


class MediaAnnotateIn(BaseModel):
    """One visible transcript segment to annotate lazily."""

    model_config = ConfigDict(extra="forbid")

    text: str = Field(min_length=1, max_length=1200)
    source_language: str = Field(min_length=2, max_length=32)


class MediaExplainIn(BaseModel):
    """A selected transcript word, phrase, or sentence to explain on demand."""

    model_config = ConfigDict(extra="forbid")

    text: str = Field(min_length=1, max_length=1600)
    source_language: str = Field(min_length=2, max_length=32)
    target_language: str = Field(min_length=2, max_length=32)
    context: str = Field(default="", max_length=2400)

    @field_validator("target_language")
    @classmethod
    def normalize_target_language(cls, value: str) -> str:
        return value.strip().casefold()


def _primary_language(value: str) -> str:
    return str(value or "").strip().split("-", 1)[0].casefold()


def _validated_source_language(value: str) -> str:
    requested = _primary_language(value)
    current = _primary_language(current_language_code())
    if requested not in {"en", "zh"} or requested != current:
        raise HTTPException(
            409,
            "Transcript language must match the current learning language.",
        )
    return requested


def _support_language(value: str) -> str:
    try:
        return normalize_support_language(value)
    except UnsupportedSupportLanguage as exc:
        raise HTTPException(422, "Choose a valid support language.") from exc


def _validated_annotations(source: str, raw: Any) -> list[dict[str, Any]]:
    if not isinstance(raw, list):
        return []

    output: list[dict[str, Any]] = []
    cursor = 0
    for item in raw[:_MAX_ANNOTATIONS]:
        if not isinstance(item, dict):
            continue
        fragment = str(item.get("fragment") or "")
        pos = str(item.get("pos") or "other").strip().casefold()
        pronunciation = re.sub(r"\s+", " ", str(item.get("pronunciation") or "")).strip()
        lemma = re.sub(r"\s+", " ", str(item.get("lemma") or "")).strip()

        if not fragment or fragment.isspace():
            continue
        if pos not in _ALLOWED_POS:
            pos = "other"

        start = source.find(fragment, cursor)
        if start < 0:
            continue
        end = start + len(fragment)
        output.append(
            {
                "fragment": fragment,
                "start": start,
                "end": end,
                "pos": pos,
                "pronunciation": pronunciation[:120],
                "lemma": lemma[:160],
            }
        )
        cursor = end
    return output


def _english_pos(word: str) -> str:
    lower = word.casefold()
    if lower in _EN_DETERMINERS:
        return "determiner"
    if lower in _EN_PRONOUNS:
        return "pronoun"
    if lower in _EN_PREPOSITIONS:
        return "preposition"
    if lower in _EN_CONJUNCTIONS:
        return "conjunction"
    if lower in _EN_AUXILIARIES:
        return "auxiliary"
    if lower.isdigit():
        return "numeral"
    if lower in _EN_VERBS or lower.endswith(("ing", "ed", "ize", "ise")):
        return "verb"
    if lower.endswith("ly"):
        return "adverb"
    if lower in _EN_ADJECTIVES or lower.endswith(("ful", "ous", "ive", "able", "ible", "al", "ic")):
        return "adjective"
    return "proper_noun" if word[:1].isupper() else "noun"


def _english_lemma(word: str) -> str:
    lower = word.casefold()
    if lower.endswith("ies") and len(lower) > 3:
        return lower[:-3] + "y"
    if lower.endswith("s") and len(lower) > 3 and not lower.endswith("ss"):
        return lower[:-1]
    return lower


def _english_annotations(source: str) -> list[dict[str, Any]]:
    return [
        {
            "fragment": match.group(),
            "start": match.start(),
            "end": match.end(),
            "pos": _english_pos(match.group()),
            "pronunciation": "",
            "lemma": _english_lemma(match.group()),
        }
        for match in re.finditer(r"[A-Za-z]+(?:'[A-Za-z]+)?|\d+(?:[.,]\d+)?", source)
    ][:_MAX_ANNOTATIONS]


def _chinese_pos(tag: str) -> str:
    if tag.startswith(("nr", "ns", "nt", "nz")):
        return "proper_noun"
    if tag.startswith("n"):
        return "noun"
    if tag.startswith("v"):
        return "verb"
    if tag.startswith("a"):
        return "adjective"
    if tag.startswith("d"):
        return "adverb"
    if tag.startswith("r"):
        return "pronoun"
    if tag.startswith("m"):
        return "numeral"
    if tag.startswith("q"):
        return "classifier"
    if tag.startswith("p"):
        return "preposition"
    if tag.startswith("c"):
        return "conjunction"
    if tag.startswith(("u", "y")):
        return "particle"
    if tag.startswith("e"):
        return "interjection"
    return "other"


def _chinese_annotations(source: str) -> list[dict[str, Any]]:
    output: list[dict[str, Any]] = []
    cursor = 0
    for item in pseg.cut(source):
        word = str(item.word)
        if not word or word.isspace() or not re.search(r"[\u3400-\u9fffA-Za-z0-9]", word):
            continue
        start = source.find(word, cursor)
        if start < 0:
            continue
        end = start + len(word)
        output.append(
            {
                "fragment": word,
                "start": start,
                "end": end,
                "pos": _chinese_pos(str(item.flag)),
                "pronunciation": " ".join(lazy_pinyin(word, style=Style.TONE)),
                "lemma": word,
            }
        )
        cursor = end
        if len(output) == _MAX_ANNOTATIONS:
            break
    return output


@lru_cache(maxsize=512)
def _local_annotations(language: str, source: str) -> tuple[dict[str, Any], ...]:
    annotations = _chinese_annotations(source) if language == "zh" else _english_annotations(source)
    return tuple(annotations)


def _run_structured(
    capability_key: str,
    *,
    messages: list[dict[str, str]],
    schema: dict[str, Any],
    max_output_tokens: int,
) -> dict[str, Any]:
    try:
        result = generate_structured(
            messages=messages,
            schema=schema,
            max_output_tokens=max_output_tokens,
            temperature=0.0,
            seed=42,
            capability_key=capability_key,
        )
        return result.data if isinstance(result.data, dict) else {}
    except (AIProviderUnavailable, AICapabilityError) as exc:
        raise HTTPException(503, "AI language assistance is not configured right now.") from exc
    except AIProviderError as exc:
        raise HTTPException(502, "AI language assistance returned an invalid response.") from exc


@router.post("/annotate")
def annotate_media_text(payload: MediaAnnotateIn) -> dict[str, Any]:
    """Annotate a visible transcript segment without persisting media/learner state."""
    language = _validated_source_language(payload.source_language)
    source = payload.text.strip()
    if not source:
        raise HTTPException(422, "Transcript text is required.")

    return {
        "source_language": language,
        "text": source,
        "annotations": list(_local_annotations(language, source)),
        "reading_aid": "pinyin" if language == "zh" else None,
        "annotation_version": 1,
        "claim": "interactive_transcript_learning_aid",
    }


def _explanation_schema() -> dict[str, Any]:
    return {
        "type": "object",
        "properties": {
            "summary": {"type": "string"},
            "natural_translation": {"type": "string"},
            "grammar_notes": {
                "type": "array",
                "maxItems": 5,
                "items": {"type": "string"},
            },
            "vocabulary": {
                "type": "array",
                "maxItems": 8,
                "items": {
                    "type": "object",
                    "properties": {
                        "fragment": {"type": "string"},
                        "meaning": {"type": "string"},
                        "pos": {"type": "string"},
                        "pronunciation": {"type": "string"},
                    },
                    "required": ["fragment", "meaning", "pos", "pronunciation"],
                },
            },
            "usage_note": {"type": "string"},
        },
        "required": [
            "summary",
            "natural_translation",
            "grammar_notes",
            "vocabulary",
            "usage_note",
        ],
    }


@router.post("/explain")
def explain_media_text(payload: MediaExplainIn) -> dict[str, Any]:
    """Explain selected transcript text in learner-selected support language."""
    language = _validated_source_language(payload.source_language)
    target = _support_language(payload.target_language)
    target_name = _SUPPORT_LANGUAGE_NAMES.get(target, target)
    source_name = "Simplified Chinese" if language == "zh" else "English"
    source = payload.text.strip()
    context = payload.context.strip()

    language_specific = (
        "For Chinese, include contextual tone-mark pinyin for vocabulary and explain useful "
        "particles, measure words, word order, or idiomatic usage when relevant."
        if language == "zh"
        else
        "For English, focus on the actual contextual meaning, grammar, collocation, and register."
    )
    system = (
        "You are an interactive language tutor inside a transcript. "
        f"The learner is studying {source_name}. Explain in {target_name}. "
        "Be concise, concrete, and tied to the supplied context. "
        "Do not invent cultural claims or grammar rules. "
        + language_specific
    )
    user = (
        f"SELECTED TEXT:\n{source}\n\n"
        f"CONTEXT:\n{context or source}\n\n"
        "Explain what the selected text means here, why it is phrased this way, "
        "and the most useful vocabulary/grammar to notice."
    )
    raw = _run_structured(
        "learner_dictionary",
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        schema=_explanation_schema(),
        max_output_tokens=1500,
    )
    return {
        "source_language": language,
        "target_language": target,
        "selected_text": source,
        "summary": str(raw.get("summary") or "").strip()[:2400],
        "natural_translation": str(raw.get("natural_translation") or "").strip()[:2400],
        "grammar_notes": [
            str(item).strip()[:600]
            for item in raw.get("grammar_notes", [])
            if str(item).strip()
        ][:5],
        "vocabulary": [
            {
                "fragment": str(item.get("fragment") or "").strip()[:160],
                "meaning": str(item.get("meaning") or "").strip()[:600],
                "pos": str(item.get("pos") or "").strip()[:80],
                "pronunciation": str(item.get("pronunciation") or "").strip()[:120],
            }
            for item in raw.get("vocabulary", [])
            if isinstance(item, dict) and str(item.get("fragment") or "").strip()
        ][:8],
        "usage_note": str(raw.get("usage_note") or "").strip()[:1600],
        "claim": "contextual_ai_explanation",
    }
