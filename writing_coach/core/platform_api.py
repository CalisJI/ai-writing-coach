from __future__ import annotations

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

from writing_coach.core.language_registry import (
    DEFAULT_LANGUAGE,
    all_languages,
    enabled_language,
    is_enabled,
)
from writing_coach.core.request_context import current_language_code

router = APIRouter()


class LanguageSelectIn(BaseModel):
    language: str = Field(min_length=2, max_length=12)


@router.get("/api/platform/languages")
def api_platform_languages(request: Request) -> dict[str, object]:
    active = enabled_language(
        request.session.get("language") or current_language_code() or DEFAULT_LANGUAGE
    ).code
    return {
        "api_version": 1,
        "active": active,
        "data_isolation": "user+language",
        "languages": [item.public_dict() for item in all_languages()],
    }


@router.post("/api/platform/language")
def api_platform_language(payload: LanguageSelectIn, request: Request) -> dict[str, object]:
    code = payload.language.strip().casefold()
    if not is_enabled(code):
        raise HTTPException(409, f"Language module '{code}' is not enabled yet.")
    request.session["language"] = code
    return {"ok": True, "active": code}
