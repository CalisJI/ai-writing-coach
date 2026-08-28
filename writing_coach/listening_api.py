"""Authenticated, audio-free Active Listening progress boundary."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Literal

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from writing_coach.core.errors import orena_http_error
from writing_coach.persistence.specialized_repository import SpecializedLearningRepository


router = APIRouter(prefix="/api/listening", tags=["listening"])
_repository: SpecializedLearningRepository | None = None


class ListeningProgressIn(BaseModel):
    asset_id: str = Field(min_length=1, max_length=255)
    segment_id: str = Field(min_length=1, max_length=255)
    presentation: Literal["prompt", "checked", "revealed"] = "prompt"
    revealed: bool = False
    checked_attempt_count: int = Field(default=0, ge=0, le=1000)
    best_accuracy_percent: int | None = Field(default=None, ge=0, le=100)
    best_exact: bool = False
    last_answer: str = Field(default="", max_length=2000)


def configure_listening_progress(repository: SpecializedLearningRepository | None) -> None:
    global _repository
    _repository = repository


def _installed() -> SpecializedLearningRepository:
    if _repository is None:
        raise orena_http_error(
            503,
            "listening_progress_unconfigured",
            "Active Listening progress is not configured on this environment.",
        )
    return _repository


def _clean_identity(value: str, field: str) -> str:
    cleaned = value.strip()
    if not cleaned:
        raise orena_http_error(422, "listening_progress_invalid", f"{field} must not be empty.")
    return cleaned


@router.get("/progress")
def list_listening_progress(
    asset_id: str = Query(..., min_length=1, max_length=255),
) -> dict[str, Any]:
    repository = _installed()
    asset = _clean_identity(asset_id, "asset_id")
    try:
        return {"items": repository.list_listening_progress_records(asset)}
    except RuntimeError as exc:
        raise orena_http_error(503, "listening_progress_unavailable", str(exc)) from exc


@router.post("/progress")
def save_listening_progress(payload: ListeningProgressIn) -> dict[str, Any]:
    repository = _installed()
    values = payload.model_dump() if hasattr(payload, "model_dump") else payload.dict()
    values["asset_id"] = _clean_identity(values["asset_id"], "asset_id")
    values["segment_id"] = _clean_identity(values["segment_id"], "segment_id")
    if values["presentation"] == "revealed":
        values["revealed"] = True
    if values["revealed"] and values["presentation"] == "prompt":
        values["presentation"] = "revealed"
    values["updated_at"] = datetime.now(timezone.utc).isoformat()
    try:
        item = repository.save_listening_progress_record(values)
    except (RuntimeError, ValueError) as exc:
        category = "listening_progress_unavailable" if isinstance(exc, RuntimeError) else "listening_progress_invalid"
        raise orena_http_error(503 if isinstance(exc, RuntimeError) else 422, category, str(exc)) from exc
    return {"item": item}
