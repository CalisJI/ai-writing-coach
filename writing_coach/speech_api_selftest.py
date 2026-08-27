"""Focused contract checks for canonical speech-route failures."""

from __future__ import annotations

import asyncio
import io

from fastapi import HTTPException, UploadFile

from writing_coach.speech_api import (
    _provider,
    _pronunciation_provider,
    assess_pronunciation,
    configure_speech_asr,
    configure_speech_pronunciation,
    transcribe_speech,
)


def _assert_error(error: HTTPException, category: str, status: int) -> None:
    assert error.status_code == status
    assert isinstance(error.detail, dict)
    assert error.detail["category"] == category
    assert isinstance(error.detail["message"], str) and error.detail["message"]
    assert isinstance(error.detail["retryable"], bool)
    assert isinstance(error.detail["context"], dict)


class _PronunciationProvider:
    max_bytes = 1024
    max_reference_chars = 1200


async def _main() -> None:
    configure_speech_asr(None)
    try:
        _provider()
    except HTTPException as error:
        _assert_error(error, "speech_asr_unconfigured", 503)
    else:
        raise AssertionError("unconfigured ASR must use the canonical envelope")

    configure_speech_asr(object())
    try:
        await transcribe_speech(UploadFile(file=io.BytesIO(b"audio"), filename="take.webm"), "fr")
    except HTTPException as error:
        _assert_error(error, "speech_asr_invalid_language", 422)
    else:
        raise AssertionError("unsupported ASR language must use the canonical envelope")

    configure_speech_pronunciation(None)
    try:
        _pronunciation_provider()
    except HTTPException as error:
        _assert_error(error, "pronunciation_unconfigured", 503)
    else:
        raise AssertionError("unconfigured pronunciation must use the canonical envelope")

    configure_speech_pronunciation(_PronunciationProvider())
    try:
        await assess_pronunciation(
            UploadFile(file=io.BytesIO(b"audio"), filename="take.webm"),
            "en",
            "",
        )
    except HTTPException as error:
        _assert_error(error, "pronunciation_reference_invalid", 422)
    else:
        raise AssertionError("invalid pronunciation reference must use the canonical envelope")

    configure_speech_asr(None)
    configure_speech_pronunciation(None)
    print("Speech API canonical error envelope self-test OK")


if __name__ == "__main__":
    asyncio.run(_main())
