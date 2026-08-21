"""Provider-neutral, cached shared-media translation."""

from __future__ import annotations

from collections import OrderedDict
from dataclasses import dataclass, replace
from enum import StrEnum
import hashlib
import re
from typing import Protocol

import requests

from writing_coach.core.support_languages import normalize_support_language
from writing_coach.media_ingestion import primary_language
from writing_coach.media_learning import (
    MediaLearningContractError,
    MediaLearningObject,
    SegmentTranslation,
    TranscriptSegment,
)

MAX_TRANSLATION_BATCH_SEGMENTS = 24
MAX_TRANSLATION_BATCH_CHARS = 6_000
MAX_TRANSLATION_BATCHES = 8
MAX_TRANSLATION_CACHE_ENTRIES = 128


class MediaTranslationStatus(StrEnum):
    READY = "ready"
    NOT_REQUIRED = "not_required"
    TRANSCRIPT_UNAVAILABLE = "transcript_unavailable"
    TOO_LARGE = "too_large"
    UNAVAILABLE = "unavailable"


class MediaTranslationFailureKind(StrEnum):
    EXECUTION_UNAVAILABLE = "execution_unavailable"
    MALFORMED_RESULT = "malformed_result"


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


class TranslationProviderError(RuntimeError):
    pass


TranslationBatch = tuple[TranscriptSegment, ...]


class TranslationProvider(Protocol):
    engine_id: str
    model_version: str

    def translate_batch(
        self,
        source_language: str,
        target_language: str,
        segments: TranslationBatch,
    ) -> dict[str, str]: ...


class LocalHttpTranslationProvider:
    """Small application-side adapter for the isolated local Marian service."""

    engine_id = "local_marian"
    model_version = "opus-mt-v1"

    def __init__(self, base_url: str, *, timeout_seconds: float = 90.0) -> None:
        self._url = base_url.rstrip("/") + "/translate"
        self._timeout = timeout_seconds

    def translate_batch(
        self,
        source_language: str,
        target_language: str,
        segments: TranslationBatch,
    ) -> dict[str, str]:
        payload = {
            "source_language": primary_language(source_language),
            "target_language": target_language,
            "segments": [
                {"segment_id": segment.segment_id, "text": segment.original_text}
                for segment in segments
            ],
        }
        try:
            response = requests.post(self._url, json=payload, timeout=self._timeout)
            response.raise_for_status()
            data = response.json()
        except (requests.RequestException, ValueError) as exc:
            raise TranslationProviderError("Local translation is unavailable.") from exc
        items = data.get("translations") if isinstance(data, dict) else None
        if not isinstance(items, list):
            raise TranslationProviderError("Local translation returned invalid data.")
        translated: dict[str, str] = {}
        for item in items:
            if not isinstance(item, dict):
                raise TranslationProviderError("Local translation returned invalid data.")
            segment_id = item.get("segment_id")
            meaning = item.get("translated_meaning")
            if not isinstance(segment_id, str) or segment_id in translated or not isinstance(meaning, str) or not meaning.strip():
                raise TranslationProviderError("Local translation returned invalid data.")
            translated[segment_id] = meaning.strip()
        return translated


class MediaTranslationService:
    """Translate canonical segments through a free local provider and bounded cache."""

    def __init__(self, provider: TranslationProvider) -> None:
        self._provider = provider
        self._cache: OrderedDict[str, tuple[SegmentTranslation, ...]] = OrderedDict()

    def translate(self, media_object: MediaLearningObject, target_language: str) -> MediaTranslationResult:
        canonical_target = normalize_support_language(target_language)
        transcript = media_object.transcript
        if transcript is None:
            return MediaTranslationResult(media_object, MediaTranslationStatus.TRANSCRIPT_UNAVAILABLE, canonical_target)
        source_language = primary_language(transcript.source_language)
        if source_language == canonical_target:
            return MediaTranslationResult(media_object, MediaTranslationStatus.NOT_REQUIRED, canonical_target)

        batches = build_translation_batches(transcript.segments)
        if batches is None:
            return MediaTranslationResult(media_object, MediaTranslationStatus.TOO_LARGE, canonical_target)

        cache_key = self._cache_key(source_language, canonical_target, transcript.segments)
        cached = self._cache.get(cache_key)
        if cached is not None:
            self._cache.move_to_end(cache_key)
            return self._ready(media_object, canonical_target, cached, request_count=0)

        generated: dict[str, str] = {}
        request_count = 0
        try:
            for batch in batches:
                request_count += 1
                translated = self._provider.translate_batch(source_language, canonical_target, batch)
                expected = {segment.segment_id for segment in batch}
                if set(translated) != expected or any(not value.strip() for value in translated.values()):
                    return self._unavailable(media_object, canonical_target, MediaTranslationFailureKind.MALFORMED_RESULT, request_count)
                generated.update(translated)
        except TranslationProviderError:
            return self._unavailable(media_object, canonical_target, MediaTranslationFailureKind.EXECUTION_UNAVAILABLE, request_count)

        translations = tuple(
            SegmentTranslation(segment.segment_id, canonical_target, generated[segment.segment_id])
            for segment in transcript.segments
        )
        self._cache[cache_key] = translations
        self._cache.move_to_end(cache_key)
        while len(self._cache) > MAX_TRANSLATION_CACHE_ENTRIES:
            self._cache.popitem(last=False)
        return self._ready(media_object, canonical_target, translations, request_count=request_count)

    def _cache_key(self, source: str, target: str, segments: tuple[TranscriptSegment, ...]) -> str:
        digest = hashlib.sha256()
        for segment in segments:
            digest.update(segment.segment_id.encode())
            digest.update(b"\0")
            digest.update(segment.original_text.encode())
            digest.update(b"\0")
        return f"{self._provider.engine_id}:{self._provider.model_version}:{source}:{target}:{digest.hexdigest()}"

    def _ready(self, media_object: MediaLearningObject, target: str, translations: tuple[SegmentTranslation, ...], *, request_count: int) -> MediaTranslationResult:
        try:
            translated_media = MediaLearningObject(
                asset=replace(media_object.asset, translation_available=True),
                transcript=media_object.transcript,
                translations=translations,
            )
        except MediaLearningContractError:
            return self._unavailable(media_object, target, MediaTranslationFailureKind.MALFORMED_RESULT, request_count)
        return MediaTranslationResult(
            translated_media,
            MediaTranslationStatus.READY,
            target,
            MediaTranslationProvenance("local_translation", self._provider.engine_id, self._provider.model_version, request_count),
        )

    def _unavailable(self, media_object: MediaLearningObject, target: str, failure: MediaTranslationFailureKind, request_count: int) -> MediaTranslationResult:
        return MediaTranslationResult(
            media_object,
            MediaTranslationStatus.UNAVAILABLE,
            target,
            MediaTranslationProvenance("local_translation", self._provider.engine_id, self._provider.model_version, request_count),
            failure,
        )


def build_translation_batches(segments: tuple[TranscriptSegment, ...]) -> tuple[TranslationBatch, ...] | None:
    batches: list[TranslationBatch] = []
    current: list[TranscriptSegment] = []
    current_chars = 0
    for segment in segments:
        size = len(segment.segment_id) + len(segment.original_text)
        if size > MAX_TRANSLATION_BATCH_CHARS:
            return None
        if current and (len(current) >= MAX_TRANSLATION_BATCH_SEGMENTS or current_chars + size > MAX_TRANSLATION_BATCH_CHARS):
            batches.append(tuple(current))
            current, current_chars = [], 0
        current.append(segment)
        current_chars += size
    if current:
        batches.append(tuple(current))
    if not batches or len(batches) > MAX_TRANSLATION_BATCHES:
        return None
    return tuple(batches)


_SAFE_PROVIDER_ID = re.compile(r"^[a-z][a-z0-9_-]{0,39}$")


def safe_translation_source(provenance: MediaTranslationProvenance | None) -> dict[str, object] | None:
    if provenance is None:
        return None
    provider = provenance.provider if provenance.provider and _SAFE_PROVIDER_ID.fullmatch(provenance.provider) else None
    model = provenance.model if provenance.model and len(provenance.model) <= 80 else None
    return {
        "capability_key": provenance.capability_key,
        "provider": provider,
        "model": model,
        "request_count": provenance.request_count,
    }
