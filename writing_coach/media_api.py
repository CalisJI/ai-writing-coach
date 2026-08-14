"""Learner API DTO boundary for shared Media Learning imports."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, ConfigDict, Field, field_validator

from writing_coach.media_ingestion import (
    MediaAcquisition,
    MediaImportCategory,
    MediaImportError,
    MediaIngestionService,
)
from writing_coach.media_learning import MediaLearningObject, MediaTranscript


router = APIRouter(prefix="/api/media-learning", tags=["media-learning"])
_media_ingestion_service: MediaIngestionService | None = None


class MediaImportIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    source_url: str = Field(min_length=1, max_length=2048)
    target_language: str = Field(min_length=2, max_length=32)

    @field_validator("target_language")
    @classmethod
    def normalize_target_language(cls, value: str) -> str:
        return value.strip()


def configure_media_ingestion(service: MediaIngestionService) -> None:
    global _media_ingestion_service
    _media_ingestion_service = service


def _installed_media_ingestion() -> MediaIngestionService:
    if _media_ingestion_service is None:
        raise HTTPException(503, "Media Learning ingestion is not installed.")
    return _media_ingestion_service


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
        )
    except MediaImportError as exc:
        raise HTTPException(
            _STATUS_BY_CATEGORY[exc.category],
            {
                "category": exc.category.value,
                "message": exc.learner_message,
            },
        ) from exc
    return serialize_media_acquisition(acquisition)


def serialize_media_acquisition(acquisition: MediaAcquisition) -> dict[str, Any]:
    """Serialize M1.1 objects without changing their domain representation."""
    media_object = acquisition.media_object
    return {
        "asset": _serialize_asset(media_object),
        "playback": {
            "provider": acquisition.playback.provider,
            "kind": acquisition.playback.kind,
            "url": acquisition.playback.url,
        },
        "transcript": _serialize_transcript(media_object.transcript),
        "translations": [
            {
                "segment_id": translation.segment_id,
                "target_language": translation.target_language,
                "translated_meaning": translation.translated_meaning,
            }
            for translation in media_object.translations
        ],
    }


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


def _serialize_transcript(transcript: MediaTranscript | None) -> dict[str, Any] | None:
    if transcript is None:
        return None
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
            }
            for segment in transcript.segments
        ],
    }
