from __future__ import annotations

import json
import math
import re
from dataclasses import dataclass
from typing import Any


class AIProviderError(RuntimeError):
    """Provider failure carrying optional normalized operation telemetry."""

    telemetry: dict[str, Any] | None = None


class AIProviderUnavailable(AIProviderError):
    pass


class AIProviderNotConfigured(AIProviderUnavailable):
    """The server lacks the credentials or endpoint configuration for a provider."""


class AIModelCatalogEmpty(AIProviderUnavailable):
    """Live discovery succeeded but returned no usable models."""


class AIModelUnavailable(AIProviderUnavailable):
    """The selected model cannot currently satisfy a provider request."""


class AIProviderResponseInvalid(AIProviderError):
    """A provider response did not satisfy the requested capability schema."""


class AICapabilityError(RuntimeError):
    """Base error for capability configuration and routing contracts."""

    telemetry: dict[str, Any] | None = None


class AICapabilityDisabled(AICapabilityError):
    pass


class AICapabilityNotConfigured(AICapabilityError):
    pass


class AICapabilityConfigInvalid(AICapabilityError):
    """Persisted or proposed capability configuration is malformed."""


class AICapabilityUnsupported(AICapabilityError):
    pass


class AIProviderUnsupportedOperation(AICapabilityUnsupported):
    """A known provider cannot perform a capability's declared operation."""


@dataclass
class AIResult:
    data: dict[str, Any]
    provider: str
    model: str
    runtime: dict[str, Any]

    @property
    def label(self) -> str:
        return f"{self.provider}:{self.model}"


def normalized_usage(runtime: object) -> dict[str, int | None]:
    """Keep provider usage honest: malformed or absent counts remain unknown."""

    source = runtime if isinstance(runtime, dict) else {}
    result: dict[str, int | None] = {}
    for key in ("prompt_tokens", "completion_tokens", "total_tokens"):
        value = source.get(key)
        if type(value) is int and value >= 0:
            result[key] = value
        else:
            result[key] = None
    return result


def normalized_latency(value: object) -> int | None:
    """Return a non-negative elapsed duration or unknown."""

    if type(value) not in {int, float} or not math.isfinite(float(value)):
        return None
    return max(0, round(float(value)))


def telemetry_error_class(error: BaseException) -> str:
    """Map typed provider/capability failures to a stable, non-secret label."""

    names = {
        AICapabilityDisabled: "capability_disabled",
        AICapabilityNotConfigured: "capability_not_configured",
        AICapabilityConfigInvalid: "capability_invalid",
        AICapabilityUnsupported: "capability_unsupported",
        AIProviderNotConfigured: "provider_not_configured",
        AIModelCatalogEmpty: "model_catalog_empty",
        AIModelUnavailable: "model_unavailable",
        AIProviderResponseInvalid: "provider_response_invalid",
        AIProviderUnavailable: "provider_unavailable",
        AIProviderError: "provider_error",
    }
    for error_type, label in names.items():
        if isinstance(error, error_type):
            return label
    return "operation_failed"


def extract_json_object(text: str) -> dict[str, Any]:
    text = (text or "").strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```$", "", text)

    try:
        value = json.loads(text)
        if isinstance(value, dict):
            return value
    except json.JSONDecodeError:
        pass

    decoder = json.JSONDecoder()
    for pos, char in enumerate(text):
        if char != "{":
            continue
        try:
            value, _ = decoder.raw_decode(text[pos:])
        except json.JSONDecodeError:
            continue
        if isinstance(value, dict):
            return value

    raise AIProviderResponseInvalid("AI provider did not return a complete JSON object.")
