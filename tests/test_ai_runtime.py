from __future__ import annotations

import ast
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import pytest

import writing_coach.ai.platform as platform
from writing_coach.becoming_linguistics import (
    configure_becoming_linguistics,
    linguistic_annotations_for_essay,
)
from writing_coach.becoming_reading import (
    ReadingGenerateIn,
    configure_becoming_reading,
    create_reading_session,
)
from writing_coach.ai.base import (
    AICapabilityError,
    AICapabilityConfigInvalid,
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


def test_malformed_persisted_config_fails_without_legacy_routing(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    class MalformedRepository(Repository):
        def get_capability_config(self, key: str) -> CapabilityConfigRecord | None:
            raise AICapabilityConfigInvalid("malformed persisted config")

    monkeypatch.setenv("AI_RUNTIME_MODE", "capability")
    provider = Provider()
    install(monkeypatch, MalformedRepository(), provider)
    monkeypatch.setattr(platform, "active_selection", lambda: pytest.fail("legacy routing used"))

    with pytest.raises(AICapabilityConfigInvalid, match="malformed persisted config"):
        request(capability_key="writing_evaluator")
    assert provider.calls == []


class SpecializedRepository:
    def __init__(self, language_code: str = "en") -> None:
        self.language_code = language_code

    def select_library_terms(self, limit: int) -> list[str]:
        return []

    def create_reading_session_record(self, record: dict[str, Any]) -> dict[str, Any]:
        return {
            "id": 1,
            **record,
            "questions_json": record["questions"],
            "recycled_words_json": [],
        }

    def get_linguistic_essay(self, essay_id: int) -> dict[str, Any] | None:
        if essay_id != 1:
            return None
        return {
            "text": "I write." if self.language_code == "en" else "我写。",
            "language_code": self.language_code,
            "module_data_json": "{}",
        }

    def update_essay_module_data(self, essay_id: int, value: dict[str, Any]) -> None:
        self.module_data = value


def test_reading_injected_generator_binds_the_shared_capability_key() -> None:
    calls: list[dict[str, Any]] = []

    def generate(**kwargs: Any) -> dict[str, Any]:
        calls.append(kwargs)
        return {"title": "invalid"}

    configure_becoming_reading(SpecializedRepository(), generate)
    session = create_reading_session(
        ReadingGenerateIn(), language_code="en", target_level="B1"
    )

    assert calls[0]["capability_key"] == "reading_generator"
    assert session["generation_mode"] == "built-in"


@pytest.mark.parametrize(
    "error",
    [
        AICapabilityNotConfigured,
        AICapabilityDisabled,
        AICapabilityConfigInvalid,
        AICapabilityUnsupported,
    ],
)
def test_reading_capability_errors_do_not_use_builtin_fallback(
    error: type[AICapabilityError],
) -> None:
    def generate(**kwargs: Any) -> None:
        raise error("capability configuration failure")

    configure_becoming_reading(SpecializedRepository(), generate)

    with pytest.raises(error):
        create_reading_session(ReadingGenerateIn(), language_code="zh", target_level="HSK3")


@pytest.mark.parametrize("language_code", ["en", "zh"])
def test_linguistics_injected_generator_binds_the_shared_capability_key(
    language_code: str,
) -> None:
    calls: list[dict[str, Any]] = []

    def generate(**kwargs: Any) -> dict[str, Any]:
        calls.append(kwargs)
        fragment = "I" if language_code == "en" else "我"
        return {"annotations": [{"fragment": fragment, "pos": "pronoun"}]}

    configure_becoming_linguistics(SpecializedRepository(language_code), generate)
    result = linguistic_annotations_for_essay(1)

    assert calls[0]["capability_key"] == "writing_linguistic"
    assert result["language_code"] == language_code


@pytest.mark.parametrize(
    ("language_code", "target_level"), [("en", "B1"), ("zh", "HSK3")]
)
def test_reading_uses_capability_runtime_without_legacy_selection(
    monkeypatch: pytest.MonkeyPatch, language_code: str, target_level: str
) -> None:
    monkeypatch.setenv("AI_RUNTIME_MODE", "capability")
    provider = Provider()
    install(monkeypatch, Repository(config()), provider)
    monkeypatch.setattr(platform, "active_selection", lambda: pytest.fail("legacy routing used"))
    configure_becoming_reading(SpecializedRepository(), platform.generate_structured)

    create_reading_session(ReadingGenerateIn(), language_code=language_code, target_level=target_level)

    assert provider.calls[0]["model"] == "capability-model"


def test_linguistics_uses_capability_runtime_without_legacy_selection(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("AI_RUNTIME_MODE", "capability")
    provider = Provider()
    install(monkeypatch, Repository(config()), provider)
    monkeypatch.setattr(platform, "active_selection", lambda: pytest.fail("legacy routing used"))
    configure_becoming_linguistics(SpecializedRepository(), platform.generate_structured)

    linguistic_annotations_for_essay(1)

    assert provider.calls[0]["model"] == "capability-model"


@pytest.mark.parametrize("runtime_config", [None, config(enabled=False)])
def test_reading_capability_runtime_fails_closed(
    monkeypatch: pytest.MonkeyPatch, runtime_config: CapabilityConfig | None
) -> None:
    monkeypatch.setenv("AI_RUNTIME_MODE", "capability")
    provider = Provider()
    install(monkeypatch, Repository(runtime_config), provider)
    monkeypatch.setattr(platform, "active_selection", lambda: pytest.fail("legacy routing used"))
    configure_becoming_reading(SpecializedRepository(), platform.generate_structured)

    with pytest.raises((AICapabilityNotConfigured, AICapabilityDisabled)):
        create_reading_session(ReadingGenerateIn(), language_code="en", target_level="B1")
    assert provider.calls == []


def test_switching_to_legacy_restores_global_routing_without_deleting_config(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    repository = Repository(config())
    capability = Provider()
    legacy = Provider(id="legacy", name="Legacy")
    install(monkeypatch, repository, capability)
    monkeypatch.setattr(platform, "active_selection", lambda: (legacy, "legacy-model"))
    monkeypatch.setenv("AI_RUNTIME_MODE", "capability")
    request(capability_key="writing_evaluator")

    monkeypatch.setenv("AI_RUNTIME_MODE", "legacy")
    result = request(capability_key="writing_evaluator")

    assert result.model == "legacy-model"
    assert repository.get_capability_config("writing_evaluator") is not None


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
    assert values | ai_json_capabilities | {"reading_generator", "writing_linguistic"} == {
        "writing_evaluator", "writing_linguistic", "reading_generator",
        "writing_task_generator", "writing_improver", "learner_dictionary",
        "learner_translation", "grammar_lesson_generator",
    }
