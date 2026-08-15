"""HTTP boundary for speech ASR."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from writing_coach.speech_asr import (
    SpeechAsrMalformed,
    SpeechAsrPayloadTooLarge,
    SpeechAsrProvider,
    SpeechAsrRequestFailed,
    SpeechAsrTimedOut,
)


router = APIRouter(prefix="/api/speech", tags=["speech"])
_speech_asr_provider: SpeechAsrProvider | None = None


def configure_speech_asr(provider: SpeechAsrProvider | None) -> None:
    global _speech_asr_provider
    _speech_asr_provider = provider


def _provider() -> SpeechAsrProvider:
    if _speech_asr_provider is None:
        raise HTTPException(503, "Speech ASR is not configured.")
    return _speech_asr_provider


@router.get("/status")
def speech_status() -> dict[str, Any]:
    provider = _speech_asr_provider
    if provider is None:
        return {"configured": False, "provider": None, "model": None}
    return {
        "configured": True,
        "provider": getattr(provider, "provider_id", "unknown"),
        "model": getattr(provider, "model", None),
    }


@router.post("/transcribe")
async def transcribe_speech(
    file: UploadFile = File(...),
    language: str = Form(default=""),
) -> dict[str, Any]:
    normalized_language = language.strip().casefold() or None
    if normalized_language is not None and normalized_language not in {"en", "zh"}:
        raise HTTPException(422, "Unsupported speech language.")

    data = await file.read()
    try:
        result = _provider().transcribe_bytes(
            data,
            filename=file.filename or "recording.webm",
            content_type=file.content_type or "application/octet-stream",
            language=normalized_language,
        )
    except SpeechAsrPayloadTooLarge as exc:
        raise HTTPException(413, "Audio recording is too large.") from exc
    except SpeechAsrTimedOut as exc:
        raise HTTPException(504, "Speech transcription timed out.") from exc
    except SpeechAsrMalformed as exc:
        raise HTTPException(502, "Speech provider returned an unusable transcript.") from exc
    except SpeechAsrRequestFailed as exc:
        provider_status = getattr(exc, "status_code", None)
        category = {
            400: "speech_asr_invalid_request",
            401: "speech_asr_auth",
            403: "speech_asr_forbidden",
            422: "speech_asr_unprocessable_audio",
            429: "speech_asr_rate_limited",
            498: "speech_asr_capacity",
        }.get(provider_status, "speech_asr_provider_failure")
        public_message = {
            "speech_asr_invalid_request": "The speech provider rejected the audio request.",
            "speech_asr_auth": "Speech recognition credentials were rejected.",
            "speech_asr_forbidden": "Speech recognition is not permitted for this API key.",
            "speech_asr_unprocessable_audio": "The speech provider could not process this audio.",
            "speech_asr_rate_limited": "Speech recognition rate limit reached. Try again shortly.",
            "speech_asr_capacity": "Speech recognition capacity is temporarily unavailable.",
        }.get(category, "Speech recognition provider failed.")
        raise HTTPException(
            502,
            detail={
                "category": category,
                "message": public_message,
                "provider_status": provider_status,
            },
        ) from exc

    return {
        "provider": result.provider,
        "model": result.model,
        "language": result.language,
        "text": result.text,
        "segments": [
            {"start_ms": x.start_ms, "end_ms": x.end_ms, "text": x.text}
            for x in result.segments
        ],
        "words": [
            {"start_ms": x.start_ms, "end_ms": x.end_ms, "word": x.word}
            for x in result.words
        ],
    }
