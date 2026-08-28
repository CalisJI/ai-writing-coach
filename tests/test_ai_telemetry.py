from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import pytest

import writing_coach.ai.platform as platform
from writing_coach.ai.base import AICapabilityUnsupported, AIProviderError, AIResult
from writing_coach.ai.config import CapabilityConfig
from writing_coach.ai.control_plane import AIControlPlane
from writing_coach.persistence.platform_repository import CapabilityConfigRecord


@dataclass
class Repository:
    config: CapabilityConfig | None

    def get_capability_config(self, key: str) -> CapabilityConfigRecord | None:
        return CapabilityConfigRecord(key, self.config) if self.config is not None else None


class Provider:
    id = "openai"
    name = "OpenAI API"
    configured = True

    def __init__(self, *, runtime: dict[str, Any] | None = None, error: Exception | None = None):
        self.runtime = runtime or {}
        self.error = error

    def discover_models_live(self) -> list[str]:
        return ["telemetry-model"]

    def generate_json_once(self, **kwargs: Any) -> AIResult:
        if self.error is not None:
            raise self.error
        return AIResult(
            data={"ok": True, "capability": "writing_evaluator"},
            provider=self.id,
            model=kwargs["model"],
            runtime=dict(self.runtime),
        )


def config(**overrides: Any) -> CapabilityConfig:
    values: dict[str, Any] = {
        "enabled": True,
        "provider": "openai",
        "model": "telemetry-model",
        "temperature": 0.1,
        "fallback_policy": "none",
    }
    values.update(overrides)
    return CapabilityConfig(**values)


def invoke(monkeypatch: pytest.MonkeyPatch, provider: Provider, capability_config: CapabilityConfig) -> AIResult:
    monkeypatch.setenv("AI_RUNTIME_MODE", "capability")
    monkeypatch.setattr(platform, "_platform_repository", Repository(capability_config))
    monkeypatch.setattr(platform, "providers", lambda: {"openai": provider})
    return platform.generate_structured(
        messages=[],
        schema={"type": "object"},
        max_output_tokens=20,
        capability_key="writing_evaluator",
    )


def test_success_telemetry_keeps_capability_provider_model_and_reported_usage(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    result = invoke(
        monkeypatch,
        Provider(runtime={"prompt_tokens": 7, "completion_tokens": 5, "total_tokens": 12}),
        config(),
    )

    assert result.runtime["telemetry"] == {
        "capability": "writing_evaluator",
        "provider": "openai",
        "model": "telemetry-model",
        "model_redacted": False,
        "outcome": "success",
        "error_class": None,
        "latency_ms": result.runtime["telemetry"]["latency_ms"],
        "usage": {"prompt_tokens": 7, "completion_tokens": 5, "total_tokens": 12},
        "quota_available": "unknown",
    }
    assert isinstance(result.runtime["telemetry"]["latency_ms"], int)
    assert result.runtime["telemetry"]["latency_ms"] >= 0
    assert "cost" not in result.runtime["telemetry"]


def test_absent_or_malformed_usage_remains_unknown(monkeypatch: pytest.MonkeyPatch) -> None:
    result = invoke(
        monkeypatch,
        Provider(runtime={"prompt_tokens": "7", "completion_tokens": -1, "total_tokens": None}),
        config(),
    )

    assert result.runtime["telemetry"]["usage"] == {
        "prompt_tokens": None,
        "completion_tokens": None,
        "total_tokens": None,
    }
    assert result.runtime["telemetry"]["quota_available"] == "unknown"


def test_failure_telemetry_is_typed_and_redacts_suspicious_model(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    provider = Provider(error=AIProviderError("provider secret=do-not-leak"))
    with pytest.raises(AIProviderError) as caught:
        invoke(monkeypatch, provider, config(model="https://provider.invalid/model"))

    assert caught.value.telemetry == {
        "capability": "writing_evaluator",
        "provider": "openai",
        "model": "[redacted]",
        "model_redacted": True,
        "outcome": "failure",
        "error_class": "provider_error",
        "latency_ms": caught.value.telemetry["latency_ms"],
        "usage": {"prompt_tokens": None, "completion_tokens": None, "total_tokens": None},
        "quota_available": "unknown",
    }
    assert "do-not-leak" not in repr(caught.value.telemetry)


def test_capability_failure_has_same_shape_without_provider_activation(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    provider = Provider()
    monkeypatch.setenv("AI_RUNTIME_MODE", "capability")
    monkeypatch.setattr(platform, "_platform_repository", Repository(config(enabled=False)))
    monkeypatch.setattr(platform, "providers", lambda: {"openai": provider})

    with pytest.raises(platform.AICapabilityDisabled) as caught:
        platform.generate_structured(
            messages=[], schema={"type": "object"}, max_output_tokens=20,
            capability_key="writing_evaluator",
        )

    assert caught.value.telemetry["error_class"] == "capability_disabled"
    assert caught.value.telemetry["outcome"] == "failure"
    assert caught.value.telemetry["capability"] == "writing_evaluator"
    assert provider.error is None


def test_control_plane_success_uses_the_same_telemetry_contract() -> None:
    provider = Provider(
        runtime={"prompt_tokens": 4, "completion_tokens": 3, "total_tokens": 7}
    )
    plane = AIControlPlane(Repository(config()), provider_factory=lambda: {"openai": provider})

    result = plane.live_test("writing_evaluator")

    assert result["telemetry"] == {
        "capability": "writing_evaluator",
        "provider": "openai",
        "model": "telemetry-model",
        "model_redacted": False,
        "outcome": "success",
        "error_class": None,
        "latency_ms": result["telemetry"]["latency_ms"],
        "usage": {"prompt_tokens": 4, "completion_tokens": 3, "total_tokens": 7},
        "quota_available": "unknown",
    }


def test_control_plane_provider_failure_carries_typed_telemetry() -> None:
    provider = Provider(error=AIProviderError("provider failure"))
    plane = AIControlPlane(Repository(config()), provider_factory=lambda: {"openai": provider})

    with pytest.raises(AIProviderError) as caught:
        plane.live_test("writing_evaluator")

    assert caught.value.telemetry["capability"] == "writing_evaluator"
    assert caught.value.telemetry["outcome"] == "failure"
    assert caught.value.telemetry["error_class"] == "provider_error"
    assert caught.value.telemetry["quota_available"] == "unknown"


def test_invalid_capability_key_is_redacted_in_failure_telemetry() -> None:
    plane = AIControlPlane(Repository(config()), provider_factory=lambda: {})

    with pytest.raises(AICapabilityUnsupported) as caught:
        plane.live_test("unknown?token=do-not-leak")

    assert caught.value.telemetry["capability"] == "[invalid]"
    assert "do-not-leak" not in repr(caught.value.telemetry)
