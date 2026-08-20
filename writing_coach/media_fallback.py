"""Explicit, resumable transcript fallback orchestration.

The registry is intentionally process-local: it lets a learner leave a screen
and resume a provider job later without a schema change. Cross-process/restart
durability remains a separate persistence decision and human gate.
"""

from __future__ import annotations

import hashlib
import secrets
import time
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


@dataclass
class _JobRecord:
    public_job_id: str
    provider_job_id: str
    owner_key: str
    learning_language: str
    target_language: str
    acquisition: MediaAcquisition
    created_at: float
    updated_at: float
    state: str = "queued"
    completed_acquisition: MediaAcquisition | None = None
    failure_kind: str | None = None


class MediaFallbackJobRegistry:
    """Small bounded in-memory registry for opaque learner resume handles."""

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

    def _prune(self) -> None:
        now = self._clock()
        expired = [
            job_id
            for job_id, record in self._jobs.items()
            if now - record.updated_at > self._ttl_seconds
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
        provider_job_id: str,
        owner_key: str,
        learning_language: str,
        target_language: str,
        acquisition: MediaAcquisition,
    ) -> _JobRecord:
        self._prune()
        now = self._clock()
        public_job_id = secrets.token_urlsafe(24)
        record = _JobRecord(
            public_job_id=public_job_id,
            provider_job_id=provider_job_id,
            owner_key=owner_key,
            learning_language=learning_language,
            target_language=target_language,
            acquisition=acquisition,
            created_at=now,
            updated_at=now,
        )
        self._jobs[public_job_id] = record
        self._prune()
        return record

    def get(
        self,
        public_job_id: str,
        *,
        owner_key: str,
        learning_language: str,
    ) -> _JobRecord | None:
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
    ) -> None:
        self._client = client
        self._registry = registry or MediaFallbackJobRegistry()

    def start(
        self,
        acquisition: MediaAcquisition,
        *,
        owner_key: str,
        learning_language: str,
        target_language: str,
    ) -> MediaFallbackResult:
        try:
            result = self._client.start(
                acquisition.media_object.asset.source_url,
                learning_language,
                mode="generate",
            )
        except SupadataTranscriptTimedOut:
            return MediaFallbackResult(
                status="failed",
                acquisition=acquisition,
                source=self.provider_id,
                failure_kind="provider_timeout",
                target_language=target_language,
            )
        except SupadataTranscriptMalformed:
            return MediaFallbackResult(
                status="failed",
                acquisition=acquisition,
                source=self.provider_id,
                failure_kind="malformed_transcript",
                target_language=target_language,
            )
        except SupadataTranscriptRequestFailed:
            return MediaFallbackResult(
                status="failed",
                acquisition=acquisition,
                source=self.provider_id,
                failure_kind="provider_failure",
                target_language=target_language,
            )

        if result is None:
            return MediaFallbackResult(
                status="unavailable",
                acquisition=acquisition,
                source=self.provider_id,
                failure_kind="transcript_unavailable",
                target_language=target_language,
            )
        if isinstance(result, SupadataTranscript):
            try:
                ready = _with_supadata_transcript(
                    acquisition,
                    result,
                    learning_language,
                )
            except SupadataTranscriptMalformed:
                return MediaFallbackResult(
                    status="failed",
                    acquisition=acquisition,
                    source=self.provider_id,
                    failure_kind="malformed_transcript",
                    target_language=target_language,
                )
            return MediaFallbackResult(
                status="ready",
                acquisition=ready,
                source=self.provider_id,
                provider_state="completed",
                target_language=target_language,
            )
        if not isinstance(result, SupadataTranscriptJob):
            return MediaFallbackResult(
                status="failed",
                acquisition=acquisition,
                source=self.provider_id,
                failure_kind="malformed_job",
                target_language=target_language,
            )

        record = self._registry.create(
            provider_job_id=result.job_id,
            owner_key=owner_key,
            learning_language=learning_language,
            target_language=target_language,
            acquisition=acquisition,
        )
        return MediaFallbackResult(
            status="processing",
            acquisition=acquisition,
            job_id=record.public_job_id,
            provider_state=result.status,
            source=self.provider_id,
            target_language=target_language,
        )

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

        if record.completed_acquisition is not None:
            return MediaFallbackResult(
                status="ready",
                acquisition=record.completed_acquisition,
                job_id=record.public_job_id,
                provider_state="completed",
                source=self.provider_id,
                target_language=record.target_language,
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
        except (SupadataTranscriptTimedOut, SupadataTranscriptRequestFailed):
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
