from __future__ import annotations

from writing_coach.languages.base import LanguageProfile
from writing_coach.languages.chinese.profile import PROFILE as CHINESE
from writing_coach.languages.english.profile import PROFILE as ENGLISH

DEFAULT_LANGUAGE = "en"

_REGISTRY: dict[str, LanguageProfile] = {
    ENGLISH.code: ENGLISH,
    CHINESE.code: CHINESE,
}


def all_languages() -> tuple[LanguageProfile, ...]:
    return tuple(_REGISTRY.values())


def language(code: str | None) -> LanguageProfile | None:
    return _REGISTRY.get((code or "").strip().casefold())


def enabled_language(code: str | None) -> LanguageProfile:
    candidate = language(code)
    if candidate and candidate.enabled:
        return candidate
    return _REGISTRY[DEFAULT_LANGUAGE]


def is_enabled(code: str | None) -> bool:
    candidate = language(code)
    return bool(candidate and candidate.enabled)
