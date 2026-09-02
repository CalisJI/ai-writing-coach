"""Explicit, resumable transcript fallback orchestration.

The registry is intentionally process-local: it lets a learner leave a screen
and resume a provider job later without a schema change. Cross-process/restart
durability remains a separate persistence decision and human gate.
"""

from __future__ import annotations

import hashlib
import secrets
import os
import threading
import time
from concurrent.futures import Executor, ThreadPoolExecutor
from dataclasses import dataclass, replace
from typing import Callable

from writing_coach.media_ingestion import MediaAcquisition
from writing_coach.media_learning import (
    MediaLearningObject,
    MediaProcessingState,
    MediaTranscript,
    TranscriptSegment,
)
from writing_coach.media_providers.supadata import (
    SupadataTranscript,
    SupadataTranscriptClient,
    SupadataTranscriptJob,
    SupadataTranscriptMalformed,
    SupadataTranscriptRequestFailed,
    SupadataTranscriptTimedOut,
)


@dataclass(frozen=True)
class MediaFallbackResult:
    status: str
    acquisition: MediaAcquisition
    job_id: str | None = None
    provider_state: str | None = None
    source: str | None = None
    failure_kind: str | None = None
    target_language: str | None = None
    include_translation: bool = True


# Job states. `provider_starting` is the one the learner sees first: the Orena
# job exists and playback already works, while the provider has not yet answered.
PROVIDER_STARTING = "provider_starting"
QUEUED = "queued"
PROCESSING = "processing"
COMPLETED = "completed"
FAILED = "failed"

# How many provider starts may be in flight at once.
PROVIDER_START_WORKERS_ENV = "MEDIA_FALLBACK_START_WORKERS"


@dataclass
class _JobRecord:
    public_job_id: str
    owner_key: str
    learning_language: str
    target_language: str
    acquisition: MediaAcquisition
    include_translation: bool
    created_at: float
    updated_at: float
    # Empty until the provider answers. The public handle exists from the first
    # moment so the learner is never blocked waiting for the provider to name
    # its own job.
    provider_job_id: str = ""
    state: str = PROVIDER_STARTING
    completed_acquisition: MediaAcquisition | None = None
    failure_kind: str | None = None


class MediaFallbackJobRegistry:
    """Small bounded in-memory registry for opaque learner resume handles.

    Thread-safe: provider startup now runs on a background worker, so a record
    can be mutated by that worker while a status request reads it. The lock is
    re-entrant because pruning happens inside other guarded operations.

    Durability limitation, deliberately unchanged here: this is process-local,
    so resume handles do not survive a restart or span replicas. Moving it to
    shared storage is a future architecture concern, not part of this batch.
    """

    def __init__(
        self,
        *,
        ttl_seconds: float = 6 * 60 * 60,
        max_jobs: int = 256,
        clock: Callable[[], float] = time.monotonic,
    ) -> None:
        if ttl_seconds <= 0 or max_jobs <= 0:
            raise ValueError("Media fallback registry limits must be positive.")
        self._ttl_seconds = float(ttl_seconds)
        self._max_jobs = int(max_jobs)
        self._clock = clock
        self._jobs: dict[str, _JobRecord] = {}
        self._lock = threading.RLock()

    def _prune(self) -> None:
        now = self._clock()
        expired = [
            job_id
            for job_id, record in self._jobs.items()
            if now - record.created_at > self._ttl_seconds
        ]
        for job_id in expired:
            self._jobs.pop(job_id, None)
        if len(self._jobs) <= self._max_jobs:
            return
        oldest = sorted(self._jobs.values(), key=lambda record: record.updated_at)
        for record in oldest[: len(self._jobs) - self._max_jobs]:
            self._jobs.pop(record.public_job_id, None)

    def create(
        self,
        *,
        owner_key: str,
        learning_language: str,
        target_language: str,
        acquisition: MediaAcquisition,
        include_translation: bool,
        provider_job_id: str = "",
        state: str = PROVIDER_STARTING,
    ) -> _JobRecord:
        with self._lock:
            self._prune()
            now = self._clock()
            public_job_id = secrets.token_urlsafe(24)
            record = _JobRecord(
                public_job_id=public_job_id,
                provider_job_id=provider_job_id,
                state=state,
                owner_key=owner_key,
                learning_language=learning_language,
                target_language=target_language,
                acquisition=acquisition,
                include_translation=include_translation,
                created_at=now,
                updated_at=now,
            )
            self._jobs[public_job_id] = record
            self._prune()
            return record

    def attach_provider_job(self, public_job_id: str, provider_job_id: str) -> None:
        """Record the provider's own job id once it finally answers."""

        with self._lock:
            record = self._jobs.get(public_job_id)
            if record is None:
                return
            record.provider_job_id = str(provider_job_id or "")
            record.state = QUEUED
            record.updated_at = self._clock()

    def mark_completed(self, public_job_id: str, acquisition: MediaAcquisition) -> None:
        with self._lock:
            record = self._jobs.get(public_job_id)
            if record is None:
                return
            record.completed_acquisition = acquisition
            record.state = COMPLETED
            record.updated_at = self._clock()

    def mark_failed(self, public_job_id: str, failure_kind: str) -> None:
        with self._lock:
            record = self._jobs.get(public_job_id)
            if record is None:
                return
            record.state = FAILED
            record.failure_kind = failure_kind
            record.updated_at = self._clock()

    def get(
        self,
        public_job_id: str,
        *,
        owner_key: str,
        learning_language: str,
    ) -> _JobRecord | None:
        with self._lock:
            self._prune()
            record = self._jobs.get(public_job_id)
            if record is None:
                return None
            if record.owner_key != owner_key or record.learning_language != learning_language:
                return None
            record.updated_at = self._clock()
            return record


def _primary_language(value: str) -> str:
    return str(value or "").split("-", 1)[0].casefold()


def _with_supadata_transcript(
    acquisition: MediaAcquisition,
    transcript: SupadataTranscript,
    expected_language: str,
) -> MediaAcquisition:
    if _primary_language(transcript.language) != _primary_language(expected_language):
        raise SupadataTranscriptMalformed()

    asset = acquisition.media_object.asset
    ordered = sorted(
        enumerate(transcript.chunks),
        key=lambda item: (
            item[1].offset_ms,
            item[1].duration_ms,
            item[0],
        ),
    )
    occurrences: dict[str, int] = {}
    segments: list[TranscriptSegment] = []
    for _provider_order, chunk in ordered:
        text = " ".join(chunk.text.split())
        if not text or chunk.offset_ms < 0 or chunk.duration_ms <= 0:
            continue
        start_ms = chunk.offset_ms
        end_ms = start_ms + chunk.duration_ms
        fingerprint = hashlib.sha256(
            f"{start_ms}\0{end_ms}\0{text}".encode("utf-8")
        ).hexdigest()
        occurrence = occurrences.get(fingerprint, 0)
        occurrences[fingerprint] = occurrence + 1
        segments.append(
            TranscriptSegment(
                segment_id=f"{asset.asset_id}:segment:{fingerprint}:{occurrence:06d}",
                order=len(segments),
                start_ms=start_ms,
                end_ms=end_ms,
                original_text=text,
            )
        )
    if not segments:
        raise SupadataTranscriptMalformed()

    media_transcript = MediaTranscript(
        asset_id=asset.asset_id,
        source_language=transcript.language,
        segments=tuple(segments),
    )
    media_object = MediaLearningObject(
        asset=replace(
            asset,
            source_language=transcript.language,
            processing_state=MediaProcessingState.READY,
            transcript_available=True,
            translation_available=False,
        ),
        transcript=media_transcript,
    )
    return MediaAcquisition(
        media_object=media_object,
        playback=acquisition.playback,
    )


class SupadataMediaFallbackService:
    """Explicit fallback after native captions and Groq ASR have been tried."""

    provider_id = "supadata"

    def __init__(
        self,
        client: SupadataTranscriptClient,
        *,
        registry: MediaFallbackJobRegistry | None = None,
        executor: Executor | None = None,
    ) -> None:
        self._client = client
        self._registry = registry or MediaFallbackJobRegistry()
        # Bounded: a provider start can occupy a worker for 90+ seconds, so the
        # pool is capped rather than growing a thread per learner request.
        self._executor = executor or ThreadPoolExecutor(
            max_workers=max(1, int(os.getenv(PROVIDER_START_WORKERS_ENV, "4") or 4)),
            thread_name_prefix="media-fallback-start",
        )

    def start(
        self,
        acquisition: MediaAcquisition,
        *,
        owner_key: str,
        learning_language: str,
        target_language: str,
        include_translation: bool = True,
    ) -> MediaFallbackResult:
        """Create the Orena job first, then start the provider in the background.

        The provider was measured answering `mode=generate` with HTTP 202 and a
        job id after roughly 93 seconds. Starting it inline meant the learner's
        request timed out before Orena ever received that id, so the poll path
        that already existed never got a chance to run.

        The public handle is therefore minted before the provider is contacted.
        The learner gets PROCESSING immediately, keeps playback, and resumes
        through the same opaque handle; the long wait happens on a bounded
        worker instead of in the request.
        """

        record = self._registry.create(
            owner_key=owner_key,
            learning_language=learning_language,
            target_language=target_language,
            acquisition=acquisition,
            include_translation=include_translation,
        )
        self._executor.submit(
            self._start_provider,
            record.public_job_id,
            acquisition,
            learning_language,
        )
        return MediaFallbackResult(
            status="processing",
            acquisition=acquisition,
            job_id=record.public_job_id,
            provider_state=PROVIDER_STARTING,
            source=self.provider_id,
            target_language=target_language,
        )

    def _start_provider(
        self,
        public_job_id: str,
        acquisition: MediaAcquisition,
        learning_language: str,
    ) -> None:
        """The bounded provider-start, run off the request worker.

        Every outcome ends on the record, so a status request always finds a
        truthful state rather than a job stuck in `provider_starting` forever.
        """

        try:
            result = self._client.start(
                acquisition.media_object.asset.source_url,
                learning_language,
                mode="generate",
            )
        except SupadataTranscriptTimedOut:
            self._registry.mark_failed(public_job_id, "provider_timeout")
            return
        except SupadataTranscriptMalformed:
            self._registry.mark_failed(public_job_id, "malformed_transcript")
            return
        except SupadataTranscriptRequestFailed:
            self._registry.mark_failed(public_job_id, "provider_failure")
            return
        except Exception:
            # A background worker must never die silently and strand the job.
            self._registry.mark_failed(public_job_id, "provider_failure")
            return

        if result is None:
            self._registry.mark_failed(public_job_id, "transcript_unavailable")
            return
        if isinstance(result, SupadataTranscript):
            # The provider answered with the transcript directly; no job to poll.
            try:
                ready = _with_supadata_transcript(acquisition, result, learning_language)
            except SupadataTranscriptMalformed:
                self._registry.mark_failed(public_job_id, "malformed_transcript")
                return
            self._registry.mark_completed(public_job_id, ready)
            return
        if not isinstance(result, SupadataTranscriptJob):
            self._registry.mark_failed(public_job_id, "malformed_job")
            return
        self._registry.attach_provider_job(public_job_id, result.job_id)

    def poll(
        self,
        public_job_id: str,
        *,
        owner_key: str,
        learning_language: str,
    ) -> MediaFallbackResult:
        record = self._registry.get(
            public_job_id,
            owner_key=owner_key,
            learning_language=learning_language,
        )
        if record is None:
            raise KeyError("Media import job is unavailable or expired.")

        if record.state == PROVIDER_STARTING:
            # The provider has not named its job yet. Report the truth rather
            # than polling an id that does not exist, and never restart the
            # provider from a status request - repeated polling must not
            # multiply provider calls.
            return MediaFallbackResult(
                status="processing",
                acquisition=record.acquisition,
                job_id=record.public_job_id,
                provider_state=PROVIDER_STARTING,
                source=self.provider_id,
                target_language=record.target_language,
                include_translation=record.include_translation,
            )
        if record.state == FAILED:
            return MediaFallbackResult(
                status="failed",
                acquisition=record.acquisition,
                job_id=record.public_job_id,
                provider_state=FAILED,
                source=self.provider_id,
                failure_kind=record.failure_kind or "provider_failure",
                target_language=record.target_language,
                include_translation=record.include_translation,
            )

        if record.completed_acquisition is not None:
            return MediaFallbackResult(
                status="ready",
                acquisition=record.completed_acquisition,
                job_id=record.public_job_id,
                provider_state="completed",
                source=self.provider_id,
                target_language=record.target_language,
                include_translation=record.include_translation,
            )
        if record.state == "failed":
            return MediaFallbackResult(
                status="failed",
                acquisition=record.acquisition,
                job_id=record.public_job_id,
                provider_state="failed",
                source=self.provider_id,
                failure_kind=record.failure_kind or "provider_failure",
                target_language=record.target_language,
            )

        try:
            result = self._client.poll(
                record.provider_job_id,
                record.learning_language,
            )
        except SupadataTranscriptTimedOut:
            record.state = "failed"
            record.failure_kind = "provider_timeout"
        except SupadataTranscriptRequestFailed:
            record.state = "failed"
            record.failure_kind = "provider_failure"
        except (SupadataTranscriptMalformed, ValueError):
            record.state = "failed"
            record.failure_kind = "malformed_transcript"
        else:
            record.state = result.status
            if result.status in {"queued", "active", "processing", "pending"}:
                return MediaFallbackResult(
                    status="processing",
                    acquisition=record.acquisition,
                    job_id=record.public_job_id,
                    provider_state=result.status,
                    source=self.provider_id,
                    target_language=record.target_language,
                )
            if result.status == "failed":
                record.failure_kind = "provider_failure"
            elif result.status == "completed" and result.transcript is not None:
                try:
                    completed = _with_supadata_transcript(
                        record.acquisition,
                        result.transcript,
                        record.learning_language,
                    )
                except SupadataTranscriptMalformed:
                    record.state = "failed"
                    record.failure_kind = "malformed_transcript"
                else:
                    record.completed_acquisition = completed
                    return MediaFallbackResult(
                        status="ready",
                        acquisition=completed,
                        job_id=record.public_job_id,
                        provider_state="completed",
                        source=self.provider_id,
                        target_language=record.target_language,
                        include_translation=record.include_translation,
                    )
            else:
                record.state = "failed"
                record.failure_kind = "malformed_transcript"

        return MediaFallbackResult(
            status="failed",
            acquisition=record.acquisition,
            job_id=record.public_job_id,
            provider_state="failed",
            source=self.provider_id,
            failure_kind=record.failure_kind or "provider_failure",
            target_language=record.target_language,
        )
