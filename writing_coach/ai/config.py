"""Typed AI capability configuration and offline/static validation."""

from __future__ import annotations

import math
import re
from dataclasses import dataclass
from typing import Any, Mapping

from writing_coach.ai.base import (
    AICapabilityConfigInvalid,
    AICapabilityUnsupported,
    AIProviderUnsupportedOperation,
)
from writing_coach.ai.capabilities import (
    AICapabilityDefinition,
    AIFallbackPolicy,
    require_capability,
)
from writing_coach.ai.providers import ProviderDefinition, get_provider_definition


CONFIG_VERSION = 1
CAPABILITY_SETTING_PREFIX = "ai.capability."
_CONFIG_FIELDS = frozenset(
    {
        "config_version",
        "enabled",
        "provider",
        "model",
        "timeout_seconds",
        "temperature",
        "fallback_policy",
    }
)
_PROVIDER_ID = re.compile(r"^[a-z][a-z0-9_-]{0,39}$")
_MODEL_ID = re.compile(r"^[^\s\x00-\x1f\x7f]{1,160}$")


def _invalid(message: str) -> AICapabilityConfigInvalid:
    return AICapabilityConfigInvalid(message)


@dataclass(frozen=True)
class CapabilityConfig:
    """Secret-free operator configuration stored in platform_settings JSON."""

    enabled: bool
    provider: str
    model: str
    timeout_seconds: int | None = None
    temperature: float | None = None
    fallback_policy: AIFallbackPolicy = AIFallbackPolicy.NONE
    config_version: int = CONFIG_VERSION

    def __post_init__(self) -> None:
        if type(self.config_version) is not int or self.config_version != CONFIG_VERSION:
            raise _invalid(f"Unsupported capability config_version: {self.config_version!r}.")
        if type(self.enabled) is not bool:
            raise _invalid("Capability enabled must be a boolean.")

        provider = str(self.provider or "").strip().casefold()
        model = str(self.model or "").strip()
        if not _PROVIDER_ID.fullmatch(provider):
            raise _invalid("Capability provider is not a valid provider identifier.")
        if not _MODEL_ID.fullmatch(model):
            raise _invalid("Capability model must be a non-empty sanitized identifier.")
        object.__setattr__(self, "provider", provider)
        object.__setattr__(self, "model", model)

        if self.timeout_seconds is not None:
            if type(self.timeout_seconds) is not int or not 1 <= self.timeout_seconds <= 600:
                raise _invalid("Capability timeout_seconds must be an integer from 1 to 600.")
        if self.temperature is not None:
            if type(self.temperature) not in {int, float}:
                raise _invalid("Capability temperature must be numeric.")
            temperature = float(self.temperature)
            if not math.isfinite(temperature) or not 0.0 <= temperature <= 2.0:
                raise _invalid("Capability temperature must be from 0.0 to 2.0.")
            object.__setattr__(self, "temperature", temperature)

        try:
            fallback = AIFallbackPolicy(self.fallback_policy)
        except (TypeError, ValueError) as exc:
            raise _invalid("Capability fallback_policy is unknown.") from exc
        object.__setattr__(self, "fallback_policy", fallback)

    def to_dict(self) -> dict[str, Any]:
        return {
            "config_version": self.config_version,
            "enabled": self.enabled,
            "provider": self.provider,
            "model": self.model,
            "timeout_seconds": self.timeout_seconds,
            "temperature": self.temperature,
            "fallback_policy": self.fallback_policy.value,
        }

    @classmethod
    def from_dict(cls, raw: Mapping[str, Any] | object) -> "CapabilityConfig":
        if not isinstance(raw, Mapping):
            raise _invalid("Capability config must be a JSON object.")
        unknown = set(raw) - _CONFIG_FIELDS
        missing = {"config_version", "enabled", "provider", "model", "fallback_policy"} - set(raw)
        if unknown:
            raise _invalid(f"Capability config contains unknown fields: {sorted(unknown)!r}.")
        if missing:
            raise _invalid(f"Capability config is missing fields: {sorted(missing)!r}.")
        return cls(
            config_version=raw["config_version"],
            enabled=raw["enabled"],
            provider=raw["provider"],
            model=raw["model"],
            timeout_seconds=raw.get("timeout_seconds"),
            temperature=raw.get("temperature"),
            fallback_policy=raw["fallback_policy"],
        )


def capability_setting_key(capability_key: str) -> str:
    return CAPABILITY_SETTING_PREFIX + require_capability(capability_key).key


def capability_key_from_setting(setting_key: str) -> str | None:
    if not str(setting_key).startswith(CAPABILITY_SETTING_PREFIX):
        return None
    return str(setting_key)[len(CAPABILITY_SETTING_PREFIX) :]


def validate_capability_config(
    capability_key: str,
    config: CapabilityConfig,
) -> tuple[AICapabilityDefinition, ProviderDefinition]:
    """Validate using code-owned metadata only; no runtime provider is built."""

    definition = require_capability(capability_key)
    if not definition.implemented or not definition.provider_backed or not definition.configurable:
        raise AICapabilityUnsupported(
            f"AI capability {definition.key!r} is not provider-configurable."
        )

    provider = get_provider_definition(config.provider)
    if provider is None:
        raise AICapabilityUnsupported(f"Unknown AI provider: {config.provider!r}.")
    if not provider.supports(definition.operation):
        raise AIProviderUnsupportedOperation(
            f"AI provider {provider.id!r} does not support {definition.operation.value!r}."
        )

    requested_options = {
        key
        for key, value in {
            "timeout_seconds": config.timeout_seconds,
            "temperature": config.temperature,
        }.items()
        if value is not None
    }
    unsupported = requested_options - provider.supported_option_keys
    if unsupported:
        raise AIProviderUnsupportedOperation(
            f"AI provider {provider.id!r} does not support options: {sorted(unsupported)!r}."
        )
    if config.fallback_policy not in definition.allowed_fallback_policies:
        raise AICapabilityConfigInvalid(
            f"Fallback policy {config.fallback_policy.value!r} is not allowed for {definition.key!r}."
        )
    return definition, provider
