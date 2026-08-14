"""Backend contract for learner support-language output."""

from __future__ import annotations

from dataclasses import dataclass
from types import MappingProxyType
from typing import Mapping


class UnsupportedSupportLanguage(ValueError):
    """Raised when a requested support language is outside the product contract."""


@dataclass(frozen=True)
class SupportLanguageDefinition:
    """Prompt-safe metadata for one supported learner-facing language."""

    code: str
    translation_label: str


_DEFINITIONS = (
    SupportLanguageDefinition("vi", "Vietnamese"),
    SupportLanguageDefinition("en", "English"),
    SupportLanguageDefinition("zh", "Simplified Chinese"),
)

SUPPORT_LANGUAGES: Mapping[str, SupportLanguageDefinition] = MappingProxyType(
    {definition.code: definition for definition in _DEFINITIONS}
)


def all_support_languages() -> tuple[SupportLanguageDefinition, ...]:
    return _DEFINITIONS


def support_language(code: str | None) -> SupportLanguageDefinition | None:
    normalized = str(code or "").strip().casefold()
    return SUPPORT_LANGUAGES.get(normalized)


def normalize_support_language(code: str | None) -> str:
    definition = support_language(code)
    if definition is None:
        raise UnsupportedSupportLanguage("Choose a valid support language.")
    return definition.code
