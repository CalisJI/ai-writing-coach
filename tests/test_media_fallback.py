from __future__ import annotations

from dataclasses import dataclass

import pytest

from writing_coach.media_fallback import (
    MediaFallbackJobRegistry,
    SupadataMediaFallbackService,
)
from writing_coach.media_ingestion import MediaAcquisition, MediaPlayback
from writing_coach.media_learning import (
    MediaLearningAsset,
    MediaLearningObject,
    MediaProcessingState,
)
from writing_coach.media_providers.supadata import (
    SupadataTranscript,
    SupadataTranscriptChunk,
    SupadataTranscriptJob,
    SupadataTranscriptJobResult,
    SupadataTranscriptTimedOut,
)


def base_acquisition() -> MediaAcquisition:
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


@dataclass
class FakeClient:
    started: object
    polled: object | None = None

    def __post_init__(self) -> None:
        self.start_calls: list[tuple[str, str, str]] = []
        self.poll_calls: list[tuple[str, str]] = []

    def start(self, source_url: str, preferred_language: str, *, mode: str):
        self.start_calls.append((source_url, preferred_language, mode))
        return self.started

    def poll(self, job_id: str, preferred_language: str):
        self.poll_calls.append((job_id, preferred_language))
        return self.polled


def completed_transcript(language: str = "en") -> SupadataTranscript:
    return SupadataTranscript(
        language=language,
        chunks=(
            SupadataTranscriptChunk(
                text="Generated transcript",
                offset_ms=200,
                duration_ms=900,
                language=language,
            ),
        ),
    )


def test_fallback_async_job_uses_opaque_owner_scoped_resume_handle() -> None:
    client = FakeClient(SupadataTranscriptJob("provider-job-123"))
    service = SupadataMediaFallbackService(client)  # type: ignore[arg-type]
    started = service.start(
        base_acquisition(),
        owner_key="learner-a",
        learning_language="en",
        target_language="vi",
    )
    assert started.status == "processing"
    assert started.job_id
    assert started.job_id != "provider-job-123"
    with pytest.raises(KeyError):
        service.poll(
            started.job_id,
            owner_key="learner-b",
            learning_language="en",
        )


def test_fallback_poll_completes_same_media_object_contract() -> None:
    client = FakeClient(
        SupadataTranscriptJob("provider-job-123"),
        SupadataTranscriptJobResult(
            status="completed",
            transcript=completed_transcript(),
        ),
    )
    service = SupadataMediaFallbackService(client)  # type: ignore[arg-type]
    started = service.start(
        base_acquisition(),
        owner_key="learner-a",
        learning_language="en",
        target_language="vi",
        include_translation=False,
    )
    completed = service.poll(
        started.job_id or "",
        owner_key="learner-a",
        learning_language="en",
    )
    assert completed.status == "ready"
    assert completed.target_language == "vi"
    assert completed.acquisition.media_object.asset.asset_id == "youtube:dQw4w9WgXcQ"
    transcript = completed.acquisition.media_object.transcript
    assert transcript is not None
    assert transcript.segments[0].original_text == "Generated transcript"
    assert transcript.segments[0].start_ms == 200
    assert transcript.segments[0].end_ms == 1100
    assert completed.include_translation is False


def test_immediate_fallback_transcript_never_creates_resume_job() -> None:
    client = FakeClient(completed_transcript("zh"))
    service = SupadataMediaFallbackService(client)  # type: ignore[arg-type]
    result = service.start(
        base_acquisition(),
        owner_key="learner-a",
        learning_language="zh",
        target_language="vi",
    )
    assert result.status == "ready"
    assert result.job_id is None
    assert result.acquisition.media_object.asset.source_language == "zh"


def test_registry_expiry_invalidates_old_resume_handle() -> None:
    now = [100.0]
    registry = MediaFallbackJobRegistry(ttl_seconds=10, clock=lambda: now[0])
    client = FakeClient(SupadataTranscriptJob("provider-job-123"))
    service = SupadataMediaFallbackService(
        client,  # type: ignore[arg-type]
        registry=registry,
    )
    started = service.start(
        base_acquisition(),
        owner_key="learner-a",
        learning_language="en",
        target_language="vi",
    )
    now[0] = 111.0
    with pytest.raises(KeyError):
        service.poll(
            started.job_id or "",
            owner_key="learner-a",
            learning_language="en",
        )


def test_polling_does_not_extend_the_resume_job_lifetime() -> None:
    now = [100.0]
    registry = MediaFallbackJobRegistry(ttl_seconds=10, clock=lambda: now[0])
    client = FakeClient(
        SupadataTranscriptJob("provider-job-123"),
        SupadataTranscriptJobResult(status="processing"),
    )
    service = SupadataMediaFallbackService(client, registry=registry)  # type: ignore[arg-type]
    started = service.start(
        base_acquisition(),
        owner_key="learner-a",
        learning_language="en",
        target_language="vi",
    )

    now[0] = 105.0
    assert service.poll(
        started.job_id or "",
        owner_key="learner-a",
        learning_language="en",
    ).status == "processing"
    now[0] = 111.0
    with pytest.raises(KeyError):
        service.poll(
            started.job_id or "",
            owner_key="learner-a",
            learning_language="en",
        )


def test_poll_timeout_remains_distinct_from_a_provider_failure() -> None:
    class TimeoutClient(FakeClient):
        def poll(self, job_id: str, preferred_language: str):
            raise SupadataTranscriptTimedOut()

    service = SupadataMediaFallbackService(
        TimeoutClient(SupadataTranscriptJob("provider-job-123"))  # type: ignore[arg-type]
    )
    started = service.start(
        base_acquisition(),
        owner_key="learner-a",
        learning_language="en",
        target_language="vi",
    )

    result = service.poll(
        started.job_id or "",
        owner_key="learner-a",
        learning_language="en",
    )
    assert result.status == "failed"
    assert result.failure_kind == "provider_timeout"


class SequencedClient(FakeClient):
    """Answers each poll with the next state, so a real progression can be walked."""

    def __init__(self, started: object, states: list[object]) -> None:
        super().__init__(started)
        self._states = list(states)

    def poll(self, job_id: str, preferred_language: str):
        self.poll_calls.append((job_id, preferred_language))
        return self._states.pop(0) if self._states else self._states


def test_async_recovery_walks_start_queued_processing_completed() -> None:
    """The whole contract as one progression, not four separate states.

    Individually each state is covered elsewhere; this is the sequence a learner
    actually experiences, and the point is that the same resume handle carries
    through it and ends at a canonical transcript.
    """

    client = SequencedClient(
        SupadataTranscriptJob("provider-job-seq", status="queued"),
        [
            SupadataTranscriptJobResult(status="queued"),
            SupadataTranscriptJobResult(status="processing"),
            SupadataTranscriptJobResult(status="completed", transcript=completed_transcript("en")),
        ],
    )
    service = SupadataMediaFallbackService(client)

    started = service.start(
        base_acquisition(), owner_key="learner-a",
        learning_language="en", target_language="ja",
    )
    assert started.status == "processing"
    handle = started.job_id
    assert handle and handle != "provider-job-seq", "the provider id must not leak"
    # Playback survives the whole wait: the video was never rejected.
    assert started.acquisition.playback.kind == "embed"
    assert started.acquisition.media_object.transcript is None

    seen = []
    for _ in range(3):
        outcome = service.poll(handle, owner_key="learner-a", learning_language="en")
        seen.append(outcome.status)
        if outcome.status == "ready":
            break

    assert seen == ["processing", "processing", "ready"]
    assert outcome.provider_state == "completed"
    assert outcome.source == "supadata"
    # A canonical, timestamped transcript - not a blob of text.
    transcript = outcome.acquisition.media_object.transcript
    assert transcript is not None and len(transcript.segments) == 1
    segment = transcript.segments[0]
    assert (segment.start_ms, segment.end_ms) == (200, 1100)
    assert segment.original_text == "Generated transcript"
    # The target language chosen at start is carried to the end.
    assert outcome.target_language == "ja"


def test_a_resume_handle_belongs_to_one_learner() -> None:
    """Another learner's handle must not resume someone else's job."""

    client = FakeClient(
        SupadataTranscriptJob("provider-job-scope"),
        SupadataTranscriptJobResult(status="completed", transcript=completed_transcript()),
    )
    service = SupadataMediaFallbackService(client)
    started = service.start(
        base_acquisition(), owner_key="learner-a",
        learning_language="en", target_language="vi",
    )

    with pytest.raises(KeyError):
        service.poll(started.job_id, owner_key="learner-b", learning_language="en")
    # And a handle that never existed is refused the same way.
    with pytest.raises(KeyError):
        service.poll("never-issued", owner_key="learner-a", learning_language="en")
    # The rightful owner still resumes it.
    assert service.poll(
        started.job_id, owner_key="learner-a", learning_language="en"
    ).status == "ready"


def test_a_malformed_provider_result_is_a_truthful_failure() -> None:
    """A completed job with no usable transcript must not fake success."""

    client = FakeClient(
        SupadataTranscriptJob("provider-job-malformed"),
        SupadataTranscriptJobResult(status="completed", transcript=None),
    )
    service = SupadataMediaFallbackService(client)
    started = service.start(
        base_acquisition(), owner_key="learner-a",
        learning_language="en", target_language="vi",
    )
    outcome = service.poll(started.job_id, owner_key="learner-a", learning_language="en")

    assert outcome.status != "ready"
    # Whatever it is called, it must not claim a transcript exists.
    assert outcome.acquisition.media_object.transcript is None
