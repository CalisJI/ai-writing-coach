from __future__ import annotations

from pathlib import Path

from writing_coach.media_learning import (
    MediaLearningAsset,
    MediaLearningObject,
    MediaProcessingState,
    MediaTranscript,
    TranscriptSegment,
)
from writing_coach.media_translation import (
    MAX_TRANSLATION_BATCH_SEGMENTS,
    MediaTranslationFailureKind,
    MediaTranslationService,
    MediaTranslationStatus,
    TranslationProviderError,
)


def media(source: str = "en", count: int = 3) -> MediaLearningObject:
    asset_id = "media:test"
    segments = tuple(
        TranscriptSegment(f"segment-{index}", index, index * 1000, (index + 1) * 1000, f"source {index}")
        for index in range(count)
    )
    return MediaLearningObject(
        MediaLearningAsset(asset_id, "https://example.invalid/video", "test", "external-video", "Test", source, MediaProcessingState.READY, count * 1000, True, False),
        MediaTranscript(asset_id, source, segments),
    )


class FakeProvider:
    engine_id = "local_test"
    model_version = "v1"

    def __init__(self, *, unavailable: bool = False) -> None:
        self.unavailable = unavailable
        self.calls = []

    def translate_batch(self, source_language, target_language, segments):
        self.calls.append((source_language, target_language, segments))
        if self.unavailable:
            raise TranslationProviderError("offline")
        return {segment.segment_id: f"meaning {segment.segment_id}" for segment in reversed(segments)}


def test_local_provider_maps_ids_without_mutating_source() -> None:
    provider = FakeProvider()
    original = media()
    transcript = original.transcript

    result = MediaTranslationService(provider).translate(original, "vi")

    assert result.status is MediaTranslationStatus.READY
    assert result.media_object.transcript is transcript
    assert [item.segment_id for item in result.media_object.translations] == [item.segment_id for item in transcript.segments]
    assert original.translations == ()
    assert result.provenance.capability_key == "local_translation"


def test_translation_batches_and_cache_avoid_repeat_provider_calls() -> None:
    provider = FakeProvider()
    service = MediaTranslationService(provider)
    original = media(count=MAX_TRANSLATION_BATCH_SEGMENTS + 1)

    first = service.translate(original, "vi")
    second = service.translate(original, "vi")

    assert first.status is second.status is MediaTranslationStatus.READY
    assert len(provider.calls) == 2
    assert [len(call[2]) for call in provider.calls] == [MAX_TRANSLATION_BATCH_SEGMENTS, 1]
    assert second.provenance.request_count == 0


def test_target_language_is_part_of_cache_identity() -> None:
    provider = FakeProvider()
    service = MediaTranslationService(provider)
    original = media()

    service.translate(original, "vi")
    service.translate(original, "zh")

    assert [call[1] for call in provider.calls] == ["vi", "zh"]


def test_provider_unavailable_preserves_playable_canonical_media() -> None:
    original = media()
    result = MediaTranslationService(FakeProvider(unavailable=True)).translate(original, "vi")

    assert result.status is MediaTranslationStatus.UNAVAILABLE
    assert result.failure_kind is MediaTranslationFailureKind.EXECUTION_UNAVAILABLE
    assert result.media_object is original
    assert result.media_object.transcript is original.transcript
    assert result.media_object.translations == ()


def test_same_language_requires_no_provider_call() -> None:
    provider = FakeProvider()
    result = MediaTranslationService(provider).translate(media("en"), "en")
    assert result.status is MediaTranslationStatus.NOT_REQUIRED
    assert provider.calls == []


def test_media_translation_has_no_generic_ai_dependency() -> None:
    source = Path("writing_coach/media_translation.py").read_text()
    assert "generate_structured" not in source
    assert "learner_translation" not in source
    assert "AIResult" not in source
