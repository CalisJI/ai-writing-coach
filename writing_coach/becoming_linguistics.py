from __future__ import annotations

import hashlib
import json
from datetime import datetime
from typing import Any, Callable


from writing_coach.persistence.specialized_repository import SpecializedLearningRepository

_repository: SpecializedLearningRepository | None = None
_ai_generate: Callable[..., Any] | None = None
WRITING_LINGUISTIC_CAPABILITY = "writing_linguistic"

ALLOWED_POS = {
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
    "other",
}

MAX_ANNOTATED_CHARS = 6000
MAX_ANNOTATIONS = 220
CACHE_KEY = "linguistic_annotations_v1"


def configure_becoming_linguistics(repository: SpecializedLearningRepository, ai_generate: Callable[..., Any]) -> None:
    global _repository, _ai_generate
    _repository = repository
    _ai_generate = ai_generate


def _repo() -> SpecializedLearningRepository:
    if _repository is None:
        raise RuntimeError("BECOMING linguistics repository is not installed")
    return _repository

def _now() -> str:
    return datetime.now().astimezone().isoformat(timespec="seconds")


def _hash_text(language: str, text: str) -> str:
    payload = f"{language}\0{text}".encode("utf-8")
    return hashlib.sha256(payload).hexdigest()


def _safe_module_data(raw: Any) -> dict[str, Any]:
    try:
        value = json.loads(raw or "{}")
    except Exception:
        return {}
    return value if isinstance(value, dict) else {}


def _schema() -> dict[str, Any]:
    return {
        "type": "object",
        "properties": {
            "annotations": {
                "type": "array",
                "maxItems": MAX_ANNOTATIONS,
                "items": {
                    "type": "object",
                    "properties": {
                        "fragment": {"type": "string"},
                        "pos": {
                            "type": "string",
                            "enum": sorted(ALLOWED_POS),
                        },
                    },
                    "required": ["fragment", "pos"],
                },
            },
        },
        "required": ["annotations"],
    }


def _prompt(language: str, text: str) -> tuple[str, str]:
    language_name = "Simplified Chinese" if language == "zh" else "English"
    segmentation = (
        "For Chinese, segment into meaningful learner-facing words or particles. "
        "Do not annotate punctuation."
        if language == "zh"
        else
        "For English, annotate lexical words and meaningful function words. "
        "Do not annotate punctuation or whitespace."
    )

    system = (
        "You are a linguistic annotation service for a language-learning product. "
        "Return exact text spans only. Never rewrite the learner's text. "
        "Every annotation fragment must be copied literally from the learner text. "
        "Return annotations in the same order the fragments appear in the text. "
        "Use only these POS labels: noun, verb, adjective, adverb, pronoun, "
        "determiner, preposition, conjunction, numeral, particle, other. "
        "If a token is ambiguous, choose the role it performs in this sentence. "
        + segmentation
    )
    user = (
        f"LANGUAGE: {language_name}\n"
        f"TEXT LENGTH: {len(text)} characters\n\n"
        "TEXT:\n"
        f"{text}\n\n"
        "Annotate the text for a visual parts-of-speech learning lens. "
        "Prefer useful coverage over microscopic tokenization. "
        "Fragments must match the supplied text exactly; do not return character offsets."
    )
    return system, user


def _validated_annotations(
    source: str,
    raw: Any,
) -> list[dict[str, Any]]:
    if not isinstance(raw, list):
        return []

    output: list[dict[str, Any]] = []
    cursor = 0

    for item in raw[:MAX_ANNOTATIONS]:
        if not isinstance(item, dict):
            continue

        fragment = str(item.get("fragment") or "")
        pos = str(item.get("pos") or "other").strip().lower()

        if pos not in ALLOWED_POS:
            pos = "other"
        if not fragment or fragment.isspace():
            continue

        # Cached payloads already contain validated offsets. Re-check them first.
        try:
            cached_start = int(item.get("start"))
            cached_end = int(item.get("end"))
        except (TypeError, ValueError):
            cached_start = -1
            cached_end = -1

        if (
            cached_start >= cursor
            and cached_end > cached_start
            and cached_end <= len(source)
            and source[cached_start:cached_end] == fragment
        ):
            start = cached_start
            end = cached_end
        else:
            # Generation returns ordered literal fragments; the service owns offsets.
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
            }
        )
        cursor = end

    return output


def _public_payload(
    essay_id: int,
    *,
    language: str,
    annotations: list[dict[str, Any]],
    cached: bool,
    truncated: bool,
) -> dict[str, Any]:
    return {
        "found": True,
        "essay_id": essay_id,
        "language_code": language,
        "annotations": annotations,
        "cached": cached,
        "truncated": truncated,
        "claim": "parts_of_speech_learning_aid",
    }


def linguistic_annotations_for_essay(essay_id: int) -> dict[str, Any]:
    if _ai_generate is None:
        raise RuntimeError("BECOMING linguistics AI generator is not installed")

    row = _repo().get_linguistic_essay(essay_id)
    if not row:
        return {"found": False, "essay_id": essay_id, "annotations": []}
    full_text = str(row["text"] or ""); language = str(row["language_code"] or "en")
    source = full_text[:MAX_ANNOTATED_CHARS]; truncated = len(full_text) > len(source); digest = _hash_text(language, source)
    module_data = _safe_module_data(row["module_data_json"]); cached = module_data.get(CACHE_KEY)
    if isinstance(cached, dict) and cached.get("hash") == digest and cached.get("language_code") == language and isinstance(cached.get("annotations"), list):
        annotations = _validated_annotations(source, cached.get("annotations"))
        return _public_payload(essay_id, language=language, annotations=annotations, cached=True, truncated=bool(cached.get("truncated", truncated)))

    system, user = _prompt(language, source)
    result = _ai_generate(
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        schema=_schema(),
        max_output_tokens=2800,
        temperature=0.0,
        seed=42,
        capability_key=WRITING_LINGUISTIC_CAPABILITY,
    )
    data = getattr(result, "data", result)
    raw_annotations = data.get("annotations", []) if isinstance(data, dict) else []
    annotations = _validated_annotations(source, raw_annotations)

    cache_payload = {
        "hash": digest,
        "language_code": language,
        "annotations": annotations,
        "truncated": truncated,
        "generated_at": _now(),
    }

    current = _repo().get_linguistic_essay(essay_id)
    if current:
        module_data = _safe_module_data(current["module_data_json"]); module_data[CACHE_KEY] = cache_payload
        _repo().update_essay_module_data(essay_id, module_data)


    return _public_payload(
        essay_id,
        language=language,
        annotations=annotations,
        cached=False,
        truncated=truncated,
    )
