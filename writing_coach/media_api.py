"""Learner API DTO boundary for shared Media Learning imports."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, ConfigDict, Field, field_validator

from writing_coach.core.request_context import current_language_code
from writing_coach.media_ingestion import (
    MediaAcquisition,
    MediaImportCategory,
    MediaImportError,
    MediaIngestionService,
)
from writing_coach.media_learning import MediaLearningObject, MediaTranscript
from writing_coach.media_interaction import router as media_interaction_router
from writing_coach.media_timing import (
    MediaTimingEnrichment,
    MediaTimingService,
)
from writing_coach.media_translation import (
    MediaTranslationResult,
    MediaTranslationService,
    safe_translation_source,
)


router = APIRouter(prefix="/api/media-learning", tags=["media-learning"])
router.include_router(media_interaction_router)
_media_ingestion_service: MediaIngestionService | None = None
_media_translation_service: MediaTranslationService | None = None
_media_timing_service: MediaTimingService | None = None


class MediaImportIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    source_url: str = Field(min_length=1, max_length=2048)
    target_language: str = Field(min_length=2, max_length=32)
    include_word_timing: bool = False

    @field_validator("target_language")
    @classmethod
    def normalize_target_language(cls, value: str) -> str:
        return value.strip().casefold()


def configure_media_ingestion(service: MediaIngestionService) -> None:
    global _media_ingestion_service
    _media_ingestion_service = service


def configure_media_translation(service: MediaTranslationService) -> None:
    global _media_translation_service
    _media_translation_service = service


def configure_media_timing(service: MediaTimingService | None) -> None:
    global _media_timing_service
    _media_timing_service = service


def _installed_media_ingestion() -> MediaIngestionService:
    if _media_ingestion_service is None:
        raise HTTPException(503, "Media Learning ingestion is not installed.")
    return _media_ingestion_service


def _installed_media_translation() -> MediaTranslationService:
    if _media_translation_service is None:
        raise HTTPException(503, "Media Learning translation is not installed.")
    return _media_translation_service


_STATUS_BY_CATEGORY = {
    MediaImportCategory.MALFORMED_URL: 422,
    MediaImportCategory.UNSUPPORTED_PROVIDER: 422,
    MediaImportCategory.MEDIA_UNAVAILABLE: 404,
    MediaImportCategory.PROVIDER_TIMEOUT: 504,
    MediaImportCategory.PROVIDER_FAILURE: 502,
    MediaImportCategory.MALFORMED_TRANSCRIPT: 502,
    MediaImportCategory.UNSUPPORTED_SOURCE_LANGUAGE: 409,
    MediaImportCategory.INVALID_TARGET_LANGUAGE: 422,
}


@router.post("/import")
def import_media(payload: MediaImportIn) -> dict[str, Any]:
    """Acquire shared media content; learner authentication is enforced by middleware."""
    try:
        acquisition = _installed_media_ingestion().import_media(
            payload.source_url,
            payload.target_language,
            current_language_code(),
        )
    except MediaImportError as exc:
        raise HTTPException(
            _STATUS_BY_CATEGORY[exc.category],
            {
                "category": exc.category.value,
                "message": exc.learner_message,
            },
        ) from exc
    timing: MediaTimingEnrichment | None = None
    if payload.include_word_timing and _media_timing_service is not None:
        timing = _media_timing_service.enrich(
            acquisition,
            current_language_code(),
        )
        acquisition = timing.acquisition
    translation = _installed_media_translation().translate(
        acquisition.media_object,
        payload.target_language,
    )
    return serialize_media_acquisition(acquisition, translation, timing)


def serialize_media_acquisition(
    acquisition: MediaAcquisition,
    translation: MediaTranslationResult | None = None,
    timing: MediaTimingEnrichment | None = None,
) -> dict[str, Any]:
    """Serialize M1.1 objects without changing their domain representation."""
    media_object = (
        translation.media_object
        if translation is not None
        else acquisition.media_object
    )
    response = {
        "asset": _serialize_asset(media_object),
        "playback": {
            "provider": acquisition.playback.provider,
            "kind": acquisition.playback.kind,
            "url": acquisition.playback.url,
        },
        "transcript": _serialize_transcript(media_object.transcript, timing),
        "translations": [
            {
                "segment_id": translation.segment_id,
                "target_language": translation.target_language,
                "translated_meaning": translation.translated_meaning,
            }
            for translation in media_object.translations
        ],
    }
    if timing is not None:
        response["word_timing"] = {
            "status": timing.status,
            "source": timing.source,
            "model": timing.model,
            "failure_kind": timing.failure_kind,
        }
    if translation is not None:
        response["translation"] = {
            "status": translation.status.value,
            "target_language": translation.target_language,
            "source": safe_translation_source(translation.provenance),
            "failure_kind": (
                translation.failure_kind.value
                if translation.failure_kind is not None
                else None
            ),
        }
    return response


def _serialize_asset(media_object: MediaLearningObject) -> dict[str, Any]:
    asset = media_object.asset
    return {
        "asset_id": asset.asset_id,
        "source_url": asset.source_url,
        "source_provider": asset.source_provider,
        "source_type": asset.source_type,
        "title": asset.title,
        "source_language": asset.source_language,
        "processing_state": asset.processing_state.value,
        "duration_ms": asset.duration_ms,
        "transcript_available": asset.transcript_available,
        "translation_available": asset.translation_available,
    }


def _serialize_transcript(
    transcript: MediaTranscript | None,
    timing: MediaTimingEnrichment | None = None,
) -> dict[str, Any] | None:
    if transcript is None:
        return None
    words_by_segment: dict[str, list[dict[str, Any]]] = {}
    for word in timing.words if timing is not None else ():
        words_by_segment.setdefault(word.segment_id, []).append(
            {"text": word.text, "start_ms": word.start_ms, "end_ms": word.end_ms}
        )
    return {
        "asset_id": transcript.asset_id,
        "source_language": transcript.source_language,
        "segments": [
            {
                "segment_id": segment.segment_id,
                "order": segment.order,
                "start_ms": segment.start_ms,
                "end_ms": segment.end_ms,
                "original_text": segment.original_text,
                "words": words_by_segment.get(segment.segment_id, []),
            }
            for segment in transcript.segments
        ],
    }
