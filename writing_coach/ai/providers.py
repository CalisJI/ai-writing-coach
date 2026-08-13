from __future__ import annotations

import json
import os
import re
from dataclasses import dataclass
from types import MappingProxyType
from typing import Any

import requests

from writing_coach.ai.base import (
    AIProviderError,
    AIProviderNotConfigured,
    AIProviderResponseInvalid,
    AIProviderUnavailable,
    AIResult,
    extract_json_object,
)
from writing_coach.ai.capabilities import AIOperation


@dataclass(frozen=True)
class ProviderDefinition:
    """Static provider metadata, independent of credentials or live status."""

    id: str
    name: str
    kind: str
    secret_mode: str
    supported_operations: frozenset[AIOperation]
    supported_option_keys: frozenset[str]

    def supports(self, operation: AIOperation) -> bool:
        return operation in self.supported_operations


_STRUCTURED_TEXT_OPERATIONS = frozenset({AIOperation.STRUCTURED_TEXT_GENERATION})
# generate_json() consumes temperature per request. Timeout is currently bound
# to each runtime instance from environment configuration, so capability config
# must not claim it is independently supported yet.
_TEXT_OPTION_KEYS = frozenset({"temperature"})
_PROVIDER_DEFINITIONS = (
    ProviderDefinition(
        id="ollama",
        name="Ollama",
        kind="local",
        secret_mode="none",
        supported_operations=_STRUCTURED_TEXT_OPERATIONS,
        supported_option_keys=_TEXT_OPTION_KEYS,
    ),
    ProviderDefinition(
        id="openai",
        name="OpenAI API",
        kind="cloud",
        secret_mode="server-managed",
        supported_operations=_STRUCTURED_TEXT_OPERATIONS,
        supported_option_keys=_TEXT_OPTION_KEYS,
    ),
    ProviderDefinition(
        id="deepseek",
        name="DeepSeek API",
        kind="cloud",
        secret_mode="server-managed",
        supported_operations=_STRUCTURED_TEXT_OPERATIONS,
        supported_option_keys=_TEXT_OPTION_KEYS,
    ),
)
_PROVIDER_CATALOG = MappingProxyType(
    {definition.id: definition for definition in _PROVIDER_DEFINITIONS}
)


def provider_definitions() -> tuple[ProviderDefinition, ...]:
    """Return static descriptors without instantiating or probing providers."""

    return _PROVIDER_DEFINITIONS


def get_provider_definition(provider_id: str) -> ProviderDefinition | None:
    """Look up a known provider descriptor without inspecting its environment."""

    return _PROVIDER_CATALOG.get(str(provider_id or "").strip().casefold())


def _schema_instruction(schema: dict[str, Any]) -> str:
    return (
        "\nReturn exactly one valid JSON object. It must follow this JSON Schema:\n"
        + json.dumps(schema, ensure_ascii=False, separators=(",", ":"))
    )


def _invalid_model_catalog() -> AIProviderResponseInvalid:
    return AIProviderResponseInvalid("AI provider returned an invalid model catalog.")


def _model_catalog(envelope: object, *, container_key: str, model_key: str) -> list[str]:
    if not isinstance(envelope, dict):
        raise _invalid_model_catalog()
    entries = envelope.get(container_key)
    if not isinstance(entries, list):
        raise _invalid_model_catalog()
    models: list[str] = []
    for entry in entries:
        if not isinstance(entry, dict):
            raise _invalid_model_catalog()
        model = entry.get(model_key)
        if not isinstance(model, str) or not model.strip():
            raise _invalid_model_catalog()
        models.append(model.strip())
    return models


def _openai_message_content(envelope: object) -> tuple[dict[str, Any], str]:
    if not isinstance(envelope, dict):
        raise AIProviderResponseInvalid("AI provider returned an invalid response.")
    choices = envelope.get("choices")
    if not isinstance(choices, list) or not choices or not isinstance(choices[0], dict):
        raise AIProviderResponseInvalid("AI provider returned an invalid response.")
    message = choices[0].get("message")
    if not isinstance(message, dict):
        raise AIProviderResponseInvalid("AI provider returned an invalid response.")
    content = message.get("content")
    if not isinstance(content, str) or not content.strip():
        raise AIProviderResponseInvalid("AI provider returned an invalid response.")
    return choices[0], content


def _ollama_message_content(envelope: object) -> tuple[dict[str, Any], str]:
    if not isinstance(envelope, dict):
        raise AIProviderResponseInvalid("AI provider returned an invalid response.")
    message = envelope.get("message")
    if not isinstance(message, dict):
        raise AIProviderResponseInvalid("AI provider returned an invalid response.")
    content = message.get("content")
    if not isinstance(content, str) or not content.strip():
        raise AIProviderResponseInvalid("AI provider returned an invalid response.")
    return envelope, content


class OllamaProvider:
    id = "ollama"
    name = "Ollama"
    kind = "local"
    secret_mode = "none"

    def __init__(self) -> None:
        self.base_url = os.getenv("OLLAMA_URL", "http://127.0.0.1:11434").rstrip("/")
        self.default_model = os.getenv("OLLAMA_MODEL", "qwen3:8b").strip()
        self.timeout = int(os.getenv("OLLAMA_TIMEOUT", "180"))

    @property
    def configured(self) -> bool:
        return True

    def list_models(self) -> list[str]:
        try:
            response = requests.get(f"{self.base_url}/api/tags", timeout=3)
            response.raise_for_status()
            return sorted(
                {
                    str(item.get("name") or "").strip()
                    for item in response.json().get("models", [])
                    if str(item.get("name") or "").strip()
                }
            )
        except Exception:
            return []

    def discover_models_live(self) -> list[str]:
        """Discover models without collapsing transport failures into an empty list."""

        try:
            response = requests.get(f"{self.base_url}/api/tags", timeout=3)
            response.raise_for_status()
            envelope = response.json()
        except requests.ConnectionError as exc:
            raise AIProviderUnavailable("Ollama is not reachable.") from exc
        except requests.Timeout as exc:
            raise AIProviderUnavailable("Ollama timed out.") from exc
        except requests.HTTPError as exc:
            status = exc.response.status_code if exc.response is not None else "?"
            raise AIProviderError(f"Ollama returned HTTP {status} during model discovery.") from exc
        except ValueError as exc:
            raise AIProviderError("Ollama returned an invalid model catalog.") from exc
        return sorted(set(_model_catalog(envelope, container_key="models", model_key="name")))

    def generate_json_once(self, **kwargs: Any) -> AIResult:
        """Execute one live-test request; Ollama has no compatibility retry."""

        return self.generate_json(**kwargs)

    def generate_json(
        self,
        *,
        messages: list[dict[str, str]],
        schema: dict[str, Any],
        model: str,
        max_output_tokens: int,
        temperature: float,
        seed: int | None = None,
    ) -> AIResult:
        if not model:
            raise AIProviderUnavailable("No Ollama model is selected.")

        options: dict[str, Any] = {
            "temperature": temperature,
            "num_ctx": 4096,
            "num_predict": max_output_tokens,
        }
        if seed is not None:
            options["seed"] = seed

        body = {
            "model": model,
            "stream": False,
            "think": False,
            "keep_alive": "30m",
            "format": schema,
            "options": options,
            "messages": messages,
        }

        try:
            response = requests.post(
                f"{self.base_url}/api/chat",
                json=body,
                timeout=self.timeout,
            )
            response.raise_for_status()
            envelope = response.json()
        except requests.ConnectionError as exc:
            raise AIProviderUnavailable("Ollama is not reachable.") from exc
        except requests.Timeout as exc:
            raise AIProviderUnavailable("Ollama timed out.") from exc
        except requests.HTTPError as exc:
            status = exc.response.status_code if exc.response is not None else "?"
            raise AIProviderError(f"Ollama returned HTTP {status}.") from exc
        except ValueError as exc:
            raise AIProviderError("Ollama returned a non-JSON HTTP response.") from exc

        envelope, content = _ollama_message_content(envelope)

        return AIResult(
            data=extract_json_object(content),
            provider=self.id,
            model=model,
            runtime={
                "done_reason": envelope.get("done_reason"),
                "total_duration_ns": envelope.get("total_duration"),
                "load_duration_ns": envelope.get("load_duration"),
                "prompt_eval_count": envelope.get("prompt_eval_count"),
                "eval_count": envelope.get("eval_count"),
                "eval_duration_ns": envelope.get("eval_duration"),
            },
        )


class OpenAICompatibleProvider:
    kind = "cloud"
    secret_mode = "server-managed"

    def __init__(
        self,
        *,
        provider_id: str,
        name: str,
        api_key_env: str,
        base_url_env: str,
        default_base_url: str,
        models_env: str,
        default_models: tuple[str, ...] = (),
        model_filter: str = "",
    ) -> None:
        self.id = provider_id
        self.name = name
        self.api_key = os.getenv(api_key_env, "").strip()
        self.base_url = os.getenv(base_url_env, default_base_url).strip().rstrip("/")
        self.allowed_models = [
            value.strip()
            for value in os.getenv(models_env, "").split(",")
            if value.strip()
        ]
        self.default_models = list(default_models)
        self.model_filter = model_filter
        self.timeout = int(os.getenv("CLOUD_AI_TIMEOUT", "180"))

    @property
    def configured(self) -> bool:
        return bool(self.api_key and self.base_url)

    @property
    def default_model(self) -> str:
        models = self.list_models()
        return models[0] if models else ""

    def _headers(self) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

    def _accept_model(self, model: str) -> bool:
        if not model:
            return False
        if self.model_filter == "openai-text":
            lowered = model.casefold()
            blocked = (
                "audio", "realtime", "transcribe", "tts", "image",
                "embedding", "moderation", "dall-e", "search-preview",
                "computer-use", "sora", "whisper", "codex",
            )
            if any(word in lowered for word in blocked):
                return False
            return bool(lowered.startswith("gpt-") or re.match(r"^o\d", lowered))
        return True

    def list_models(self) -> list[str]:
        if not self.configured:
            return []
        if self.allowed_models:
            return sorted(dict.fromkeys(self.allowed_models))
        if self.default_models:
            return list(self.default_models)

        try:
            response = requests.get(
                f"{self.base_url}/models",
                headers=self._headers(),
                timeout=10,
            )
            response.raise_for_status()
            return sorted(
                {
                    str(item.get("id") or "").strip()
                    for item in response.json().get("data", [])
                    if self._accept_model(str(item.get("id") or "").strip())
                }
            )
        except Exception:
            return []

    def discover_models_live(self) -> list[str]:
        """Return an authoritative catalog or a typed live-discovery failure."""

        if not self.configured:
            raise AIProviderNotConfigured(f"{self.name} is not configured on the server.")
        if self.allowed_models:
            return sorted(dict.fromkeys(self.allowed_models))

        try:
            response = requests.get(
                f"{self.base_url}/models",
                headers=self._headers(),
                timeout=10,
            )
            response.raise_for_status()
            envelope = response.json()
        except requests.ConnectionError as exc:
            raise AIProviderUnavailable(f"{self.name} is not reachable.") from exc
        except requests.Timeout as exc:
            raise AIProviderUnavailable(f"{self.name} timed out.") from exc
        except requests.HTTPError as exc:
            status = exc.response.status_code if exc.response is not None else "?"
            raise AIProviderError(
                f"{self.name} returned HTTP {status} during model discovery."
            ) from exc
        except ValueError as exc:
            raise AIProviderError(f"{self.name} returned an invalid model catalog.") from exc
        return sorted(
            model
            for model in set(_model_catalog(envelope, container_key="data", model_key="id"))
            if self._accept_model(model)
        )

    def _post_chat(self, body: dict[str, Any]) -> dict[str, Any]:
        response = requests.post(
            f"{self.base_url}/chat/completions",
            headers=self._headers(),
            json=body,
            timeout=self.timeout,
        )
        if response.status_code >= 400:
            detail = ""
            try:
                detail = str(response.json().get("error", {}).get("message") or "")
            except Exception:
                pass
            raise AIProviderError(
                f"{self.name} returned HTTP {response.status_code}. {detail[:300]}".strip()
            )
        try:
            return response.json()
        except ValueError as exc:
            raise AIProviderError(f"{self.name} returned a non-JSON HTTP response.") from exc

    def generate_json(
        self,
        *,
        messages: list[dict[str, str]],
        schema: dict[str, Any],
        model: str,
        max_output_tokens: int,
        temperature: float,
        seed: int | None = None,
    ) -> AIResult:
        if not self.configured:
            raise AIProviderUnavailable(f"{self.name} is not configured on the server.")
        if not model:
            raise AIProviderUnavailable(f"No model is selected for {self.name}.")

        enriched = [dict(message) for message in messages]
        if enriched and enriched[0].get("role") == "system":
            enriched[0]["content"] = str(enriched[0].get("content") or "") + _schema_instruction(schema)
        else:
            enriched.insert(0, {"role": "system", "content": _schema_instruction(schema).strip()})

        body: dict[str, Any] = {
            "model": model,
            "messages": enriched,
            "stream": False,
            "max_tokens": max_output_tokens,
            "response_format": {"type": "json_object"},
            "temperature": temperature,
        }
        if seed is not None:
            body["seed"] = seed

        try:
            envelope = self._post_chat(body)
        except AIProviderError as first_error:
            retry = dict(body)
            retry.pop("temperature", None)
            retry.pop("seed", None)
            try:
                envelope = self._post_chat(retry)
            except AIProviderError:
                raise first_error

        first_choice, content = _openai_message_content(envelope)

        usage = envelope.get("usage") if isinstance(envelope.get("usage"), dict) else {}
        return AIResult(
            data=extract_json_object(content),
            provider=self.id,
            model=model,
            runtime={
                "finish_reason": first_choice.get("finish_reason"),
                "prompt_tokens": usage.get("prompt_tokens"),
                "completion_tokens": usage.get("completion_tokens"),
                "total_tokens": usage.get("total_tokens"),
            },
        )

    def generate_json_once(
        self,
        *,
        messages: list[dict[str, str]],
        schema: dict[str, Any],
        model: str,
        max_output_tokens: int,
        temperature: float,
        seed: int | None = None,
    ) -> AIResult:
        """Execute one structured request without the legacy compatibility retry."""

        if not self.configured:
            raise AIProviderNotConfigured(f"{self.name} is not configured on the server.")
        if not model:
            raise AIProviderUnavailable(f"No model is selected for {self.name}.")

        enriched = [dict(message) for message in messages]
        if enriched and enriched[0].get("role") == "system":
            enriched[0]["content"] = str(enriched[0].get("content") or "") + _schema_instruction(schema)
        else:
            enriched.insert(0, {"role": "system", "content": _schema_instruction(schema).strip()})

        body: dict[str, Any] = {
            "model": model,
            "messages": enriched,
            "stream": False,
            "max_tokens": max_output_tokens,
            "response_format": {"type": "json_object"},
            "temperature": temperature,
        }
        if seed is not None:
            body["seed"] = seed
        try:
            envelope = self._post_chat(body)
        except requests.ConnectionError as exc:
            raise AIProviderUnavailable(f"{self.name} is not reachable.") from exc
        except requests.Timeout as exc:
            raise AIProviderUnavailable(f"{self.name} timed out.") from exc

        first_choice, content = _openai_message_content(envelope)
        usage = envelope.get("usage") if isinstance(envelope.get("usage"), dict) else {}
        return AIResult(
            data=extract_json_object(content),
            provider=self.id,
            model=model,
            runtime={
                "finish_reason": first_choice.get("finish_reason"),
                "prompt_tokens": usage.get("prompt_tokens"),
                "completion_tokens": usage.get("completion_tokens"),
                "total_tokens": usage.get("total_tokens"),
            },
        )


def build_providers() -> dict[str, Any]:
    return {
        "ollama": OllamaProvider(),
        "openai": OpenAICompatibleProvider(
            provider_id="openai",
            name="OpenAI API",
            api_key_env="OPENAI_API_KEY",
            base_url_env="OPENAI_BASE_URL",
            default_base_url="https://api.openai.com/v1",
            models_env="OPENAI_MODELS",
            default_models=(),
            model_filter="openai-text",
        ),
        "deepseek": OpenAICompatibleProvider(
            provider_id="deepseek",
            name="DeepSeek API",
            api_key_env="DEEPSEEK_API_KEY",
            base_url_env="DEEPSEEK_BASE_URL",
            default_base_url="https://api.deepseek.com",
            models_env="DEEPSEEK_MODELS",
            default_models=("deepseek-v4-flash", "deepseek-v4-pro"),
        ),
    }
