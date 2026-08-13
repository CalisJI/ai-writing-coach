from __future__ import annotations

import ast
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import pytest

import writing_coach.ai.platform as platform
from writing_coach.ai.base import (
    AICapabilityDisabled,
    AICapabilityNotConfigured,
    AICapabilityUnsupported,
    AIResult,
)
from writing_coach.ai.config import CapabilityConfig
from writing_coach.persistence.platform_repository import CapabilityConfigRecord


@dataclass
class Repository:
    config: CapabilityConfig | None = None

    def initialize(self) -> None:
        pass

    def get_capability_config(self, key: str) -> CapabilityConfigRecord | None:
        return CapabilityConfigRecord(key, self.config) if self.config else None


@dataclass
class Provider:
    configured: bool = True
    id: str = "openai"
    name: str = "OpenAI"

    def __post_init__(self) -> None:
        self.calls: list[dict[str, Any]] = []

    def generate_json_once(self, **kwargs: Any) -> AIResult:
        self.calls.append(kwargs)
        return AIResult(data={"ok": True}, provider=self.id, model=kwargs["model"], runtime={})

    generate_json = generate_json_once


def config(**overrides: Any) -> CapabilityConfig:
    values = {
        "enabled": True,
        "provider": "openai",
        "model": "capability-model",
        "temperature": 0.2,
        "fallback_policy": "none",
    }
    values.update(overrides)
    return CapabilityConfig(**values)


def install(monkeypatch: pytest.MonkeyPatch, repository: Repository, provider: Provider) -> None:
    monkeypatch.setattr(platform, "_platform_repository", repository)
    monkeypatch.setattr(platform, "providers", lambda: {"openai": provider})


def request(**kwargs: Any) -> AIResult:
    return platform.generate_structured(
        messages=[], schema={"type": "object"}, max_output_tokens=20, **kwargs
    )


def test_default_mode_remains_legacy(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("AI_RUNTIME_MODE", raising=False)
    legacy = Provider(id="legacy", name="Legacy")
    monkeypatch.setattr(platform, "active_selection", lambda: (legacy, "legacy-model"))

    result = request()

    assert result.model == "legacy-model"
    assert len(legacy.calls) == 1


def test_invalid_runtime_mode_fails_explicitly(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("AI_RUNTIME_MODE", "per_capability")

    with pytest.raises(platform.AICapabilityConfigInvalid):
        platform.runtime_mode()


def test_capability_mode_uses_only_exact_persisted_config(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("AI_RUNTIME_MODE", "capability")
    repository = Repository(config())
    selected = Provider()
    fallback = Provider(id="deepseek", name="DeepSeek")
    install(monkeypatch, repository, selected)
    monkeypatch.setattr(platform, "providers", lambda: {"openai": selected, "deepseek": fallback})
    monkeypatch.setattr(platform, "active_selection", lambda: pytest.fail("legacy routing used"))

    result = request(capability_key="writing_evaluator", temperature=0.9)

    assert result.model == "capability-model"
    assert selected.calls == [
        {
            "messages": [], "schema": {"type": "object"}, "model": "capability-model",
            "max_output_tokens": 20, "temperature": 0.2, "seed": None,
        }
    ]
    assert fallback.calls == []


@pytest.mark.parametrize(
    ("runtime_config", "capability_key", "error"),
    [
        (None, "writing_evaluator", AICapabilityNotConfigured),
        (config(enabled=False), "writing_evaluator", AICapabilityDisabled),
        (config(), "speech_asr", AICapabilityUnsupported),
        (config(), "unknown", AICapabilityUnsupported),
    ],
)
def test_capability_mode_fails_closed(
    monkeypatch: pytest.MonkeyPatch,
    runtime_config: CapabilityConfig | None,
    capability_key: str,
    error: type[Exception],
) -> None:
    monkeypatch.setenv("AI_RUNTIME_MODE", "capability")
    provider = Provider()
    install(monkeypatch, Repository(runtime_config), provider)
    monkeypatch.setattr(platform, "active_selection", lambda: pytest.fail("legacy routing used"))

    with pytest.raises(error):
        request(capability_key=capability_key)
    assert provider.calls == []


def test_workloads_pass_product_wide_explicit_capabilities() -> None:
    tree = ast.parse((Path(__file__).parents[1] / "app.py").read_text(encoding="utf-8"))
    values = {
        keyword.value.value
        for node in ast.walk(tree)
        if isinstance(node, ast.Call)
        and isinstance(node.func, ast.Name)
        and node.func.id in {"generate_structured", "ai_json"}
        for keyword in node.keywords
        if keyword.arg == "capability_key" and isinstance(keyword.value, ast.Constant)
    }
    assert values == {"writing_evaluator", "writing_task_generator"}
    assert not any(value.endswith(("_en", "_zh")) for value in values)

    ai_json_capabilities = {
        node.args[0].value
        for node in ast.walk(tree)
        if isinstance(node, ast.Call)
        and isinstance(node.func, ast.Name)
        and node.func.id == "ai_json"
        and node.args
        and isinstance(node.args[0], ast.Constant)
    }
    assert ai_json_capabilities == {
        "writing_improver", "learner_dictionary", "grammar_lesson_generator", "learner_translation"
    }
