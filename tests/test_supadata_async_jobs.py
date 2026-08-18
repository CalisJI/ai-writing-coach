from __future__ import annotations

from typing import Any

import pytest

from writing_coach.media_providers.supadata import (
    SupadataTranscript,
    SupadataTranscriptClient,
    SupadataTranscriptJob,
)


class FakeResponse:
    def __init__(self, status_code: int, payload: dict[str, Any]) -> None:
        self.status_code = status_code
        self._payload = payload

    def json(self) -> dict[str, Any]:
        return self._payload


class FakeSession:
    def __init__(self, responses: list[FakeResponse]) -> None:
        self._responses = list(responses)
        self.calls: list[dict[str, Any]] = []

    def get(self, url: str, **kwargs: Any) -> FakeResponse:
        self.calls.append({"url": url, **kwargs})
        if not self._responses:
            raise AssertionError("Unexpected extra Supadata request")
        return self._responses.pop(0)


def client_for(*responses: FakeResponse) -> tuple[SupadataTranscriptClient, FakeSession]:
    session = FakeSession(list(responses))
    client = SupadataTranscriptClient(
        "test-key",
        request_timeout_seconds=5,
        max_wait_seconds=30,
        poll_interval_seconds=0.01,
        session=session,  # type: ignore[arg-type]
    )
    return client, session


def test_start_returns_provider_job_without_blocking_poll_loop() -> None:
    client, session = client_for(
        FakeResponse(202, {"jobId": "transcript-job-123"})
    )

    result = client.start(
        "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        "en",
        mode="auto",
    )

    assert result == SupadataTranscriptJob(
        job_id="transcript-job-123",
        status="queued",
    )
    assert len(session.calls) == 1
    assert session.calls[0]["params"]["text"] == "false"
    assert session.calls[0]["params"]["mode"] == "auto"


def test_start_keeps_immediate_timestamped_transcript_path() -> None:
    client, session = client_for(
        FakeResponse(
            200,
            {
                "lang": "en",
                "content": [
                    {
                        "text": "Immediate transcript",
                        "offset": 250,
                        "duration": 900,
                        "lang": "en",
                    }
                ],
            },
        )
    )

    result = client.start("https://youtu.be/dQw4w9WgXcQ", "en")

    assert isinstance(result, SupadataTranscript)
    assert result.chunks[0].text == "Immediate transcript"
    assert result.chunks[0].offset_ms == 250
    assert result.chunks[0].duration_ms == 900
    assert len(session.calls) == 1


@pytest.mark.parametrize("status", ("queued", "active"))
def test_poll_reports_in_progress_state_without_sleeping(status: str) -> None:
    client, session = client_for(FakeResponse(200, {"status": status}))

    result = client.poll("job_abc-123", "en")

    assert result.status == status
    assert result.transcript is None
    assert len(session.calls) == 1
    assert session.calls[0]["url"].endswith("/transcript/job_abc-123")


def test_poll_completed_returns_timestamped_transcript() -> None:
    client, _session = client_for(
        FakeResponse(
            200,
            {
                "status": "completed",
                "lang": "zh",
                "content": [
                    {
                        "text": "这是生成的字幕。",
                        "offset": 1200,
                        "duration": 1600,
                        "lang": "zh",
                    }
                ],
            },
        )
    )

    result = client.poll("job.zh:456", "zh")

    assert result.status == "completed"
    assert result.transcript is not None
    assert result.transcript.language == "zh"
    assert result.transcript.chunks[0].offset_ms == 1200
    assert result.transcript.chunks[0].duration_ms == 1600


def test_poll_failed_is_a_truthful_terminal_state() -> None:
    client, _session = client_for(
        FakeResponse(200, {"status": "failed", "error": {"message": "failed"}})
    )

    result = client.poll("job-failed", "en")

    assert result.status == "failed"
    assert result.transcript is None


@pytest.mark.parametrize("job_id", ("", "../escape", "job id with spaces"))
def test_poll_rejects_untrusted_job_identifiers(job_id: str) -> None:
    client, session = client_for(FakeResponse(200, {"status": "queued"}))

    with pytest.raises(ValueError):
        client.poll(job_id, "en")

    assert session.calls == []
