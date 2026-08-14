"""Language-wide learner skill release contract.

Release state belongs to the product capability, not to an individual
language. Language-specific modules implement linguistic behavior only.
"""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum


class SkillReleaseState(str, Enum):
    DEVELOPMENT = "development"
    BETA = "beta"
    PUBLIC = "public"
    HIDDEN = "hidden"


class SkillAudience(str, Enum):
    PUBLIC = "public"
    INTERNAL = "internal"


@dataclass(frozen=True)
class SkillCapability:
    key: str
    release_state: SkillReleaseState
    source_available: bool
    internal_available: bool

    def __post_init__(self) -> None:
        if self.internal_available and not self.source_available:
            raise ValueError("An internally available skill must exist in source.")
        if self.release_state is SkillReleaseState.PUBLIC and not (
            self.source_available and self.internal_available
        ):
            raise ValueError("A public skill must exist and be internally available.")

    def available_to(self, audience: SkillAudience) -> bool:
        if audience is SkillAudience.INTERNAL:
            return self.internal_available
        return self.release_state is SkillReleaseState.PUBLIC and self.source_available

    def public_dict(self) -> dict[str, object]:
        return {
            "key": self.key,
            "release_state": self.release_state.value,
            "source_available": self.source_available,
            "internal_available": self.internal_available,
            "public_available": self.available_to(SkillAudience.PUBLIC),
        }


_REGISTRY: tuple[SkillCapability, ...] = (
    SkillCapability(
        key="writing",
        release_state=SkillReleaseState.BETA,
        source_available=True,
        internal_available=True,
    ),
    SkillCapability(
        key="speaking",
        release_state=SkillReleaseState.DEVELOPMENT,
        source_available=False,
        internal_available=False,
    ),
    SkillCapability(
        key="reading",
        release_state=SkillReleaseState.DEVELOPMENT,
        source_available=True,
        internal_available=True,
    ),
    SkillCapability(
        key="listening",
        release_state=SkillReleaseState.DEVELOPMENT,
        source_available=True,
        internal_available=True,
    ),
)


def all_skills() -> tuple[SkillCapability, ...]:
    return _REGISTRY


def skill(key: str | None) -> SkillCapability | None:
    normalized = (key or "").strip().casefold()
    return next((item for item in _REGISTRY if item.key == normalized), None)


def skills_for(audience: SkillAudience) -> tuple[SkillCapability, ...]:
    return tuple(item for item in _REGISTRY if item.available_to(audience))
