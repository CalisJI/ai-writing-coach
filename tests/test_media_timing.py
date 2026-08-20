from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from writing_coach.media_api import serialize_media_acquisition
from writing_coach.media_ingestion import MediaAcquisition, MediaPlayback
from writing_coach.media_learning import (
    MediaLearningAsset,
    MediaLearningObject,
    MediaProcessingState,
    MediaTranscript,
    TranscriptSegment,
)
from writing_coach.media_timing import (
    MediaAudioSource,
    MediaTimingService,
)
from writing_coach.speech_asr import (
    SpeechAsrPayloadTooLarge,
    SpeechAsrResult,
    SpeechAsrSegment,
    SpeechAsrWord,
)


def acquisition_with_transcript() -> MediaAcquisition:
    asset = MediaLearningAsset(
        asset_id="youtube:dQw4w9WgXcQ",
        source_url="https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        source_provider="youtube",
        source_type="external-video",
        title="Lesson",
        source_language="en",
        processing_state=MediaProcessingState.READY,
        transcript_available=True,
    )
    transcript = MediaTranscript(
        asset_id=asset.asset_id,
        source_language="en",
        segments=(
            TranscriptSegment(
                segment_id="youtube:dQw4w9WgXcQ:segment:a",
                order=0,
                start_ms=0,
                end_ms=1000,
                original_text="Hello world",
            ),
            TranscriptSegment(
                segment_id="youtube:dQw4w9WgXcQ:segment:b",
                order=1,
                start_ms=1000,
                end_ms=2200,
                original_text="Learn together",
            ),
        ),
    )
    return MediaAcquisition(
        media_object=MediaLearningObject(asset=asset, transcript=transcript),
        playback=MediaPlayback(
            provider="youtube",
            kind="embed",
            url="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
        ),
    )


def acquisition_without_transcript() -> MediaAcquisition:
    asset = MediaLearningAsset(
        asset_id="youtube:dQw4w9WgXcQ",
        source_url="https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        source_provider="youtube",
        source_type="external-video",
        title="Lesson",
        source_language="und",
        processing_state=MediaProcessingState.READY,
        transcript_available=False,
    )
    return MediaAcquisition(
        media_object=MediaLearningObject(asset=asset),
        playback=MediaPlayback(
            provider="youtube",
            kind="embed",
            url="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
        ),
    )


class FakeResolver:
    provider_id = "youtube"

    def __init__(self) -> None:
        self.calls: list[str] = []

    def resolve(self, source_url: str) -> MediaAudioSource:
        self.calls.append(source_url)
        return MediaAudioSource(
            url="https://media.example.test/audio.m4a?token=signed",
            provider="youtube",
            format_id="140",
        )


@dataclass
class FakeAsr:
    result: SpeechAsrResult
    provider_id: str = "groq"
    model: str = "whisper-large-v3-turbo"

    def __post_init__(self) -> None:
        self.calls: list[tuple[str, str | None]] = []

    def transcribe_url(
        self,
        audio_url: str,
        *,
        language: str | None,
    ) -> SpeechAsrResult:
        self.calls.append((audio_url, language))
        return self.result


def asr_result() -> SpeechAsrResult:
    return SpeechAsrResult(
        provider="groq",
        model="whisper-large-v3-turbo",
        language="en",
        text="Hello world Learn together",
        segments=(
            SpeechAsrSegment("Hello world", 0, 1000),
            SpeechAsrSegment("Learn together", 1000, 2200),
        ),
        words=(
            SpeechAsrWord("Hello", 0, 450),
            SpeechAsrWord("world", 500, 950),
            SpeechAsrWord("Learn", 1050, 1500),
            SpeechAsrWord("together", 1550, 2150),
        ),
    )


def test_existing_canonical_caption_text_is_preserved_while_groq_adds_word_timing() -> None:
    original = acquisition_with_transcript()
    resolver = FakeResolver()
    asr = FakeAsr(asr_result())
    timing = MediaTimingService(resolver, asr).enrich(original, "en")

    assert timing.status == "ready"
    assert timing.acquisition.media_object is original.media_object
    assert timing.acquisition.media_object.transcript is original.media_object.transcript
    assert [word.segment_id for word in timing.words] == [
        "youtube:dQw4w9WgXcQ:segment:a",
        "youtube:dQw4w9WgXcQ:segment:a",
        "youtube:dQw4w9WgXcQ:segment:b",
        "youtube:dQw4w9WgXcQ:segment:b",
    ]

    payload = serialize_media_acquisition(original, timing=timing)
    first = payload["transcript"]["segments"][0]
    assert first["original_text"] == "Hello world"
    assert first["words"] == [
        {"text": "Hello", "start_ms": 0, "end_ms": 450},
        {"text": "world", "start_ms": 500, "end_ms": 950},
    ]
    assert payload["word_timing"]["status"] == "ready"
    assert payload["word_timing"]["source"] == "groq"


def test_groq_segments_can_fill_a_missing_transcript_without_creating_parallel_media() -> None:
    original = acquisition_without_transcript()
    timing = MediaTimingService(FakeResolver(), FakeAsr(asr_result())).enrich(
        original,
        "en",
    )

    assert timing.status == "ready"
    media_object = timing.acquisition.media_object
    assert media_object.asset.asset_id == original.media_object.asset.asset_id
    assert media_object.asset.source_provider == "youtube"
    assert media_object.asset.source_language == "en"
    assert media_object.asset.transcript_available is True
    assert media_object.transcript is not None
    assert [segment.original_text for segment in media_object.transcript.segments] == [
        "Hello world",
        "Learn together",
    ]
    assert timing.acquisition.playback == original.playback
    assert timing.transcript_generated is True
    assert serialize_media_acquisition(
        timing.acquisition,
        timing=timing,
    )["transcript_generation"] == {"status": "generated", "source": "groq"}


def test_oversized_remote_media_degrades_with_a_deterministic_failure_kind() -> None:
    class OversizedAsr:
        provider_id = "groq"
        model = "whisper-large-v3-turbo"

        def transcribe_url(self, *_args: Any, **_kwargs: Any) -> SpeechAsrResult:
            raise SpeechAsrPayloadTooLarge()

    timing = MediaTimingService(FakeResolver(), OversizedAsr()).enrich(
        acquisition_without_transcript(),
        "en",
    )

    assert timing.status == "unavailable"
    assert timing.failure_kind == "asr_payload_too_large"


def test_language_mismatch_does_not_replace_the_canonical_media_object() -> None:
    result = asr_result()
    mismatched = SpeechAsrResult(
        provider=result.provider,
        model=result.model,
        language="zh",
        text=result.text,
        segments=result.segments,
        words=result.words,
    )
    original = acquisition_without_transcript()
    timing = MediaTimingService(FakeResolver(), FakeAsr(mismatched)).enrich(
        original,
        "en",
    )

    assert timing.status == "unavailable"
    assert timing.failure_kind == "language_mismatch"
    assert timing.acquisition is original

class SegmentOnlyResolver:
    provider_id = "youtube"
    delivery_mode = "segment_only"

    def resolve(self, source_url: str) -> MediaAudioSource:
        raise AssertionError("segment-only policy must not resolve provider audio")


def test_segment_only_policy_preserves_canonical_transcript_without_audio_fetch() -> None:
    original = acquisition_with_transcript()
    timing = MediaTimingService(SegmentOnlyResolver(), FakeAsr(asr_result())).enrich(original, "en")
    assert timing.status == "segment_only"
    assert timing.failure_kind == "word_timing_transport_unavailable"
    assert timing.words == ()
    assert timing.acquisition is original


def test_segment_only_policy_without_transcript_stays_unavailable() -> None:
    original = acquisition_without_transcript()
    timing = MediaTimingService(SegmentOnlyResolver(), FakeAsr(asr_result())).enrich(original, "en")
    assert timing.status == "unavailable"
    assert timing.failure_kind == "word_timing_transport_unavailable"
    assert timing.words == ()
    assert timing.acquisition is original
