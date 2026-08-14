"""Atomic shared-media translation orchestration."""

from __future__ import annotations

import json
import re
from dataclasses import dataclass, replace
from enum import StrEnum
from typing import Any, Protocol

from writing_coach.ai.base import (
    AICapabilityError,
    AIProviderError,
    AIProviderResponseInvalid,
    AIResult,
)
from writing_coach.core.support_languages import (
    normalize_support_language,
    support_language,
)
from writing_coach.media_ingestion import primary_language
from writing_coach.media_learning import (
    MediaLearningContractError,
    MediaLearningObject,
    SegmentTranslation,
    TranscriptSegment,
)


LEARNER_TRANSLATION_CAPABILITY = "learner_translation"
MAX_TRANSLATION_BATCH_SEGMENTS = 24
MAX_TRANSLATION_BATCH_CHARS = 6_000
MAX_TRANSLATION_BATCHES = 8
MAX_TRANSLATION_OUTPUT_TOKENS = 4_000


class MediaTranslationStatus(StrEnum):
    READY = "ready"
    NOT_REQUIRED = "not_required"
    TRANSCRIPT_UNAVAILABLE = "transcript_unavailable"
    TOO_LARGE = "too_large"
    UNAVAILABLE = "unavailable"


class MediaTranslationFailureKind(StrEnum):
    EXECUTION_UNAVAILABLE = "execution_unavailable"
    MALFORMED_RESULT = "malformed_result"
    INCONSISTENT_PROVENANCE = "inconsistent_provenance"


@dataclass(frozen=True)
class MediaTranslationProvenance:
    capability_key: str
    provider: str | None
    model: str | None
    request_count: int


@dataclass(frozen=True)
class MediaTranslationResult:
    media_object: MediaLearningObject
    status: MediaTranslationStatus
    target_language: str
    provenance: MediaTranslationProvenance | None = None
    failure_kind: MediaTranslationFailureKind | None = None


class TranslationGenerator(Protocol):
    def __call__(
        self,
        *,
        messages: list[dict[str, str]],
        schema: dict[str, Any],
        max_output_tokens: int,
        temperature: float,
        seed: int | None,
        capability_key: str,
    ) -> AIResult: ...


class _MalformedTranslationResult(ValueError):
    pass


TranslationBatch = tuple[TranscriptSegment, ...]


class MediaTranslationService:
    """Add one complete support-language translation without mutating source media."""

    def __init__(self, generator: TranslationGenerator) -> None:
        self._generator = generator

    def translate(
        self,
        media_object: MediaLearningObject,
        target_language: str,
    ) -> MediaTranslationResult:
        canonical_target = normalize_support_language(target_language)
        transcript = media_object.transcript
        if transcript is None:
            return MediaTranslationResult(
                media_object=media_object,
                status=MediaTranslationStatus.TRANSCRIPT_UNAVAILABLE,
                target_language=canonical_target,
            )
        if primary_language(transcript.source_language) == canonical_target:
            return MediaTranslationResult(
                media_object=media_object,
                status=MediaTranslationStatus.NOT_REQUIRED,
                target_language=canonical_target,
            )

        batches = build_translation_batches(transcript.segments)
        if batches is None:
            return MediaTranslationResult(
                media_object=media_object,
                status=MediaTranslationStatus.TOO_LARGE,
                target_language=canonical_target,
            )

        generated: dict[str, str] = {}
        results: list[AIResult] = []
        expected_provenance: tuple[str, str] | None = None
        request_count = 0
        for batch in batches:
            request_count += 1
            try:
                ai_result = self._generator(
                    messages=build_translation_messages(
                        transcript.source_language,
                        canonical_target,
                        batch,
                    ),
                    schema=build_translation_schema(batch),
                    max_output_tokens=MAX_TRANSLATION_OUTPUT_TOKENS,
                    temperature=0.0,
                    seed=42,
                    capability_key=LEARNER_TRANSLATION_CAPABILITY,
                )
            except AIProviderResponseInvalid:
                return self._unavailable(
                    media_object,
                    canonical_target,
                    MediaTranslationFailureKind.MALFORMED_RESULT,
                    results,
                    request_count,
                )
            except (AICapabilityError, AIProviderError):
                return self._unavailable(
                    media_object,
                    canonical_target,
                    MediaTranslationFailureKind.EXECUTION_UNAVAILABLE,
                    results,
                    request_count,
                )

            results.append(ai_result)
            current_provenance = (ai_result.provider, ai_result.model)
            if expected_provenance is None:
                expected_provenance = current_provenance
            elif current_provenance != expected_provenance:
                return MediaTranslationResult(
                    media_object=media_object,
                    status=MediaTranslationStatus.UNAVAILABLE,
                    target_language=canonical_target,
                    provenance=_provenance([], request_count),
                    failure_kind=MediaTranslationFailureKind.INCONSISTENT_PROVENANCE,
                )
            try:
                generated.update(validate_translation_batch(ai_result.data, batch))
            except _MalformedTranslationResult:
                return self._unavailable(
                    media_object,
                    canonical_target,
                    MediaTranslationFailureKind.MALFORMED_RESULT,
                    results,
                    request_count,
                )

        canonical_ids = [segment.segment_id for segment in transcript.segments]
        if set(generated) != set(canonical_ids):
            return self._unavailable(
                media_object,
                canonical_target,
                MediaTranslationFailureKind.MALFORMED_RESULT,
                results,
                request_count,
            )
        translations = tuple(
            SegmentTranslation(
                segment_id=segment_id,
                target_language=canonical_target,
                translated_meaning=generated[segment_id],
            )
            for segment_id in canonical_ids
        )
        try:
            translated_media = MediaLearningObject(
                asset=replace(media_object.asset, translation_available=True),
                transcript=transcript,
                translations=translations,
            )
        except MediaLearningContractError:
            return self._unavailable(
                media_object,
                canonical_target,
                MediaTranslationFailureKind.MALFORMED_RESULT,
                results,
                request_count,
            )
        return MediaTranslationResult(
            media_object=translated_media,
            status=MediaTranslationStatus.READY,
            target_language=canonical_target,
            provenance=_provenance(results, request_count),
        )

    @staticmethod
    def _unavailable(
        media_object: MediaLearningObject,
        target_language: str,
        failure_kind: MediaTranslationFailureKind,
        results: list[AIResult],
        request_count: int,
    ) -> MediaTranslationResult:
        return MediaTranslationResult(
            media_object=media_object,
            status=MediaTranslationStatus.UNAVAILABLE,
            target_language=target_language,
            provenance=_provenance(results, request_count),
            failure_kind=failure_kind,
        )


def build_translation_batches(
    segments: tuple[TranscriptSegment, ...],
) -> tuple[TranslationBatch, ...] | None:
    """Precompute deterministic request batches before any provider call."""
    batches: list[TranslationBatch] = []
    current: list[TranscriptSegment] = []
    current_chars = 0
    for segment in segments:
        segment_chars = len(segment.segment_id) + len(segment.original_text)
        if segment_chars > MAX_TRANSLATION_BATCH_CHARS:
            return None
        if current and (
            len(current) >= MAX_TRANSLATION_BATCH_SEGMENTS
            or current_chars + segment_chars > MAX_TRANSLATION_BATCH_CHARS
        ):
            batches.append(tuple(current))
            current = []
            current_chars = 0
        current.append(segment)
        current_chars += segment_chars
    if current:
        batches.append(tuple(current))
    if not batches or len(batches) > MAX_TRANSLATION_BATCHES:
        return None
    return tuple(batches)


def build_translation_messages(
    source_language: str,
    target_language: str,
    batch: TranslationBatch,
) -> list[dict[str, str]]:
    target = support_language(target_language)
    if target is None:  # Service normalization makes this a programming invariant.
        raise ValueError("Unsupported target language.")
    system = (
        "Translate media transcript meaning into natural "
        f"{target.translation_label}. Preserve the original meaning, names, and "
        "numbers. Do not add information, explanations, grammar notes, Pinyin, or "
        "summaries. Translate each complete segment meaning and return every exact "
        "segment_id exactly once."
    )
    payload = {
        "source_language": source_language,
        "target_language": target.code,
        "segments": [
            {
                "segment_id": segment.segment_id,
                "original_text": segment.original_text,
            }
            for segment in batch
        ],
    }
    return [
        {"role": "system", "content": system},
        {"role": "user", "content": json.dumps(payload, ensure_ascii=False)},
    ]


def build_translation_schema(batch: TranslationBatch) -> dict[str, Any]:
    segment_ids = [segment.segment_id for segment in batch]
    return {
        "type": "object",
        "additionalProperties": False,
        "properties": {
            "translations": {
                "type": "array",
                "minItems": len(batch),
                "maxItems": len(batch),
                "items": {
                    "type": "object",
                    "additionalProperties": False,
                    "properties": {
                        "segment_id": {"type": "string", "enum": segment_ids},
                        "translated_meaning": {"type": "string", "minLength": 1},
                    },
                    "required": ["segment_id", "translated_meaning"],
                },
            }
        },
        "required": ["translations"],
    }


def validate_translation_batch(
    data: object,
    batch: TranslationBatch,
) -> dict[str, str]:
    if not isinstance(data, dict) or set(data) != {"translations"}:
        raise _MalformedTranslationResult()
    items = data.get("translations")
    if not isinstance(items, list):
        raise _MalformedTranslationResult()
    requested_ids = {segment.segment_id for segment in batch}
    translated: dict[str, str] = {}
    for item in items:
        if not isinstance(item, dict) or set(item) != {
            "segment_id",
            "translated_meaning",
        }:
            raise _MalformedTranslationResult()
        segment_id = item.get("segment_id")
        meaning = item.get("translated_meaning")
        if (
            not isinstance(segment_id, str)
            or segment_id not in requested_ids
            or segment_id in translated
            or not isinstance(meaning, str)
            or not meaning
            or meaning != meaning.strip()
        ):
            raise _MalformedTranslationResult()
        translated[segment_id] = meaning
    if set(translated) != requested_ids:
        raise _MalformedTranslationResult()
    return translated


def _provenance(
    results: list[AIResult],
    request_count: int,
) -> MediaTranslationProvenance | None:
    if not results:
        return MediaTranslationProvenance(
            capability_key=LEARNER_TRANSLATION_CAPABILITY,
            provider=None,
            model=None,
            request_count=request_count,
        )
    provider, model = results[0].provider, results[0].model
    if any((result.provider, result.model) != (provider, model) for result in results):
        return None
    return MediaTranslationProvenance(
        capability_key=LEARNER_TRANSLATION_CAPABILITY,
        provider=provider,
        model=model,
        request_count=request_count,
    )


_SAFE_PROVIDER_ID = re.compile(r"^[a-z][a-z0-9_-]{0,39}$")


def safe_translation_source(
    provenance: MediaTranslationProvenance | None,
) -> dict[str, Any] | None:
    """Return learner-safe operation metadata without model/runtime disclosure."""
    if provenance is None:
        return None
    provider = (provenance.provider or "").strip().casefold()
    safe_provider = (
        provider
        if _SAFE_PROVIDER_ID.fullmatch(provider)
        else "redacted" if provenance.provider is not None else None
    )
    return {
        "capability_key": provenance.capability_key,
        "provider": safe_provider,
        "request_count": provenance.request_count,
    }
