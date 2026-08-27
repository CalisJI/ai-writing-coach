"""HTTP boundary for speech ASR."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from pydantic import BaseModel

from writing_coach.core.errors import orena_http_error

from writing_coach.speech_pronunciation import (
    SpeechPronunciationConversionFailed,
    SpeechPronunciationMalformed,
    SpeechPronunciationPayloadTooLarge,
    SpeechPronunciationProvider,
    SpeechPronunciationRequestFailed,
    SpeechPronunciationTimedOut,
)

from writing_coach.speech_asr import (
    SpeechAsrMalformed,
    SpeechAsrPayloadTooLarge,
    SpeechAsrProvider,
    SpeechAsrRequestFailed,
    SpeechAsrTimedOut,
)
from writing_coach.speaking_evaluator import (
    SpeakingEvaluationInvalid,
    build_speaking_evaluation,
)


router = APIRouter(prefix="/api/speech", tags=["speech"])
_speech_asr_provider: SpeechAsrProvider | None = None
_speech_pronunciation_provider: SpeechPronunciationProvider | None = None


def configure_speech_asr(provider: SpeechAsrProvider | None) -> None:
    global _speech_asr_provider
    _speech_asr_provider = provider


def configure_speech_pronunciation(provider: SpeechPronunciationProvider | None) -> None:
    global _speech_pronunciation_provider
    _speech_pronunciation_provider = provider


def _provider() -> SpeechAsrProvider:
    if _speech_asr_provider is None:
        raise orena_http_error(
            503,
            "speech_asr_unconfigured",
            "Speech recognition is not configured.",
        )
    return _speech_asr_provider


def _pronunciation_provider() -> SpeechPronunciationProvider:
    if _speech_pronunciation_provider is None:
        raise orena_http_error(
            503,
            "pronunciation_unconfigured",
            "Pronunciation assessment is not configured.",
        )
    return _speech_pronunciation_provider


_UPLOAD_READ_CHUNK_BYTES = 1024 * 1024
_DEFAULT_ASR_MAX_BYTES = 24 * 1024 * 1024


class SpeakingEvaluationIn(BaseModel):
    """Transient evidence envelope for the internal R7 evaluator boundary."""

    # Keep raw values until build_speaking_evaluation so every invalid field,
    # including over-limit text, uses the canonical speech error envelope.
    language: Any = ""
    reference_text: Any = ""
    transcript_text: Any = ""
    content_match: Any = None
    pronunciation: Any = None
    transcription_confidence: Any = None


async def _read_upload_limited(file: UploadFile, *, max_bytes: int) -> bytes:
    if max_bytes <= 0:
        raise SpeechAsrPayloadTooLarge()
    chunks: list[bytes] = []
    total = 0
    while True:
        remaining = max_bytes - total + 1
        chunk = await file.read(min(_UPLOAD_READ_CHUNK_BYTES, remaining))
        if not chunk:
            break
        total += len(chunk)
        if total > max_bytes:
            raise SpeechAsrPayloadTooLarge()
        chunks.append(chunk)
    return b"".join(chunks)


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
        raise orena_http_error(
            422,
            "speech_asr_invalid_language",
            "Unsupported speech language.",
        )

    provider = _provider()
    max_bytes = int(getattr(provider, "max_bytes", _DEFAULT_ASR_MAX_BYTES))
    try:
        data = await _read_upload_limited(file, max_bytes=max_bytes)
        result = provider.transcribe_bytes(
            data,
            filename=file.filename or "recording.webm",
            content_type=file.content_type or "application/octet-stream",
            language=normalized_language,
        )
    except SpeechAsrPayloadTooLarge as exc:
        raise orena_http_error(
            413,
            "speech_asr_payload_too_large",
            "Audio recording is too large.",
        ) from exc
    except SpeechAsrTimedOut as exc:
        raise orena_http_error(
            504,
            "speech_asr_timeout",
            "Speech transcription timed out.",
            retryable=True,
        ) from exc
    except SpeechAsrMalformed as exc:
        raise orena_http_error(
            502,
            "speech_asr_provider_malformed",
            "Speech provider returned an unusable transcript.",
        ) from exc
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
        raise orena_http_error(
            502,
            category,
            public_message,
            context={"provider_status": provider_status},
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


@router.post("/evaluation")
def evaluate_speaking(payload: SpeakingEvaluationIn) -> dict[str, Any]:
    """Normalize one transient Speaking take without persisting audio or scores."""

    values = payload.model_dump() if hasattr(payload, "model_dump") else payload.dict()
    try:
        return build_speaking_evaluation(**values)
    except SpeakingEvaluationInvalid as exc:
        raise orena_http_error(
            422,
            "speaking_evaluation_invalid",
            str(exc),
        ) from exc

_DEFAULT_PRONUNCIATION_MAX_BYTES = 8 * 1024 * 1024


async def _read_pronunciation_upload_limited(
    file: UploadFile,
    *,
    max_bytes: int,
) -> bytes:
    if max_bytes <= 0:
        raise SpeechPronunciationPayloadTooLarge()
    chunks: list[bytes] = []
    total = 0
    while True:
        remaining = max_bytes - total + 1
        chunk = await file.read(min(_UPLOAD_READ_CHUNK_BYTES, remaining))
        if not chunk:
            break
        total += len(chunk)
        if total > max_bytes:
            raise SpeechPronunciationPayloadTooLarge()
        chunks.append(chunk)
    return b"".join(chunks)


@router.post("/pronunciation")
async def assess_pronunciation(
    file: UploadFile = File(...),
    language: str = Form(default=""),
    reference_text: str = Form(default=""),
) -> dict[str, Any]:
    normalized_language = language.strip().casefold()
    if normalized_language not in {"en", "zh"}:
        raise orena_http_error(
            422,
            "pronunciation_invalid_language",
            "Unsupported pronunciation language.",
        )

    provider = _pronunciation_provider()
    reference = reference_text.strip()
    max_reference_chars = int(getattr(provider, "max_reference_chars", 1200))
    if not reference or len(reference) > max_reference_chars:
        raise orena_http_error(
            422,
            "pronunciation_reference_invalid",
            "Pronunciation reference text is invalid.",
        )

    max_bytes = int(getattr(provider, "max_bytes", _DEFAULT_PRONUNCIATION_MAX_BYTES))
    try:
        data = await _read_pronunciation_upload_limited(file, max_bytes=max_bytes)
        result = provider.assess_bytes(
            data,
            filename=file.filename or "recording.webm",
            content_type=file.content_type or "application/octet-stream",
            language=normalized_language,
            reference_text=reference,
        )
    except SpeechPronunciationPayloadTooLarge as exc:
        raise orena_http_error(
            413,
            "pronunciation_payload_too_large",
            "Audio recording is too large.",
        ) from exc
    except SpeechPronunciationTimedOut as exc:
        raise orena_http_error(
            504,
            "pronunciation_timeout",
            "Pronunciation assessment timed out.",
        ) from exc
    except SpeechPronunciationConversionFailed as exc:
        raise orena_http_error(
            422,
            "pronunciation_audio_unsupported",
            "The recorded audio could not be prepared for pronunciation assessment.",
        ) from exc
    except SpeechPronunciationMalformed as exc:
        raise orena_http_error(
            502,
            "pronunciation_provider_malformed",
            "Pronunciation provider returned an unusable result.",
        ) from exc
    except SpeechPronunciationRequestFailed as exc:
        provider_status = getattr(exc, "status_code", None)
        category = {
            400: "pronunciation_invalid_request",
            401: "pronunciation_auth",
            403: "pronunciation_forbidden",
            429: "pronunciation_rate_limited",
        }.get(provider_status, "pronunciation_provider_failure")
        public_message = {
            "pronunciation_invalid_request": "The pronunciation provider rejected this request.",
            "pronunciation_auth": "Pronunciation credentials were rejected.",
            "pronunciation_forbidden": "Pronunciation assessment is not permitted for this resource.",
            "pronunciation_rate_limited": "Pronunciation assessment rate limit reached. Try again shortly.",
        }.get(category, "Pronunciation assessment provider failed.")
        raise orena_http_error(
            502,
            category,
            public_message,
            context={"provider_status": provider_status},
        ) from exc

    return {
        "provider": result.provider,
        "score_kind": result.score_kind,
        "locale": result.locale,
        "recognized_text": result.recognized_text,
        "pron_score": result.pron_score,
        "accuracy_score": result.accuracy_score,
        "fluency_score": result.fluency_score,
        "completeness_score": result.completeness_score,
        "prosody_score": result.prosody_score,
        "words": [
            {
                "word": word.word,
                "accuracy_score": word.accuracy_score,
                "error_type": word.error_type,
                "phonemes": [
                    {
                        "phoneme": phoneme.phoneme,
                        "accuracy_score": phoneme.accuracy_score,
                    }
                    for phoneme in word.phonemes
                ],
            }
            for word in result.words
        ],
    }
