"""Capability-centric AI administration without learner runtime activation."""

from __future__ import annotations

import re
from time import perf_counter
from typing import Any, Callable

from writing_coach.ai.base import (
    AICapabilityUnsupported,
    AICapabilityDisabled,
    AICapabilityNotConfigured,
    AIModelCatalogEmpty,
    AIModelUnavailable,
    AIProviderNotConfigured,
    AIProviderResponseInvalid,
)
from writing_coach.ai.capabilities import all_capabilities, require_capability
from writing_coach.ai.config import CapabilityConfig, validate_capability_config
from writing_coach.ai.providers import build_providers, provider_definitions
from writing_coach.persistence.platform_repository import PlatformRepository


_SUSPICIOUS_MODEL = re.compile(
    r"(?:^[a-z][a-z0-9+.-]*://|[?#]|(?:api[_-]?key|token|secret|password|authorization)\s*=)",
    re.IGNORECASE,
)


def safe_model_display(model: object) -> tuple[str, bool]:
    """Return an operator-safe model label without modifying persisted data."""

    value = str(model or "")
    if _SUSPICIOUS_MODEL.search(value):
        return "[redacted]", True
    return value, False


def _sanitized_config(config: CapabilityConfig) -> dict[str, Any]:
    value = config.to_dict()
    model, redacted = safe_model_display(config.model)
    value["model"] = model
    value["model_redacted"] = redacted
    return value


def _config_provenance(record: Any) -> dict[str, Any]:
    """Expose audit-safe saved-state metadata without the administrator identity."""

    if record is None:
        return {
            "saved": False,
            "updated_at": None,
            "updated_by_present": False,
        }
    updated_at = str(getattr(record, "updated_at", "") or "").strip() or None
    return {
        "saved": True,
        "updated_at": updated_at,
        "updated_by_present": bool(str(getattr(record, "updated_by", "") or "").strip()),
    }


class AIControlPlane:
    """Orchestrates static config administration and explicit live probes."""

    def __init__(
        self,
        repository: PlatformRepository,
        *,
        provider_factory: Callable[[], dict[str, Any]] = build_providers,
    ) -> None:
        self.repository = repository
        self.provider_factory = provider_factory

    def inspect(self) -> dict[str, Any]:
        """Build a sanitized, network-free view of the product capability catalog."""

        explicit = {
            row.capability_key: row
            for row in self.repository.list_capability_configs()
        }
        runtimes = self.provider_factory()
        capabilities = []
        for definition in all_capabilities():
            record = explicit.get(definition.key)
            config = record.config if record is not None else None
            capabilities.append(
                {
                    "key": definition.key,
                    "operation": definition.operation.value,
                    "implemented": definition.implemented,
                    "provider_backed": definition.provider_backed,
                    "configurable": definition.configurable,
                    "allowed_fallback_policies": sorted(
                        policy.value for policy in definition.allowed_fallback_policies
                    ),
                    "explicit_config_exists": config is not None,
                    "config": _sanitized_config(config) if config is not None else None,
                    "config_provenance": _config_provenance(record),
                }
            )

        providers = []
        for definition in provider_definitions():
            runtime = runtimes.get(definition.id)
            providers.append(
                {
                    "id": definition.id,
                    "name": definition.name,
                    "kind": definition.kind,
                    "secret_mode": definition.secret_mode,
                    "supported_operations": sorted(
                        operation.value for operation in definition.supported_operations
                    ),
                    "supported_config_options": sorted(definition.supported_option_keys),
                    "server_configured": bool(
                        runtime is not None and getattr(runtime, "configured", False)
                    ),
                }
            )

        return {
            "capabilities": capabilities,
            "providers": providers,
            "legacy_runtime": {
                "role": "live-global-routing-until-R2-activation",
                "selection_present": self.repository.get_ai_selection() is not None,
            },
            "policy": {
                "scope": "product-wide",
                "learner_runtime_uses_capability_config": False,
                "automatic_paid_failover": False,
                "secrets": "server-managed",
            },
        }

    def set_config(
        self,
        capability_key: str,
        config: CapabilityConfig,
        *,
        updated_by: str = "",
    ) -> dict[str, Any]:
        definition, _provider = validate_capability_config(capability_key, config)
        self.repository.set_capability_config(
            definition.key,
            config,
            updated_by=updated_by,
        )
        return {
            "capability": definition.key,
            "config": _sanitized_config(config),
        }

    def explicit_config(self, capability_key: str) -> CapabilityConfig:
        definition = require_capability(capability_key)
        if not definition.implemented or not definition.provider_backed or not definition.configurable:
            raise AICapabilityUnsupported(
                f"AI capability {definition.key!r} is not available for provider live testing."
            )
        row = self.repository.get_capability_config(definition.key)
        if row is None:
            raise AICapabilityNotConfigured(
                f"AI capability {definition.key!r} has no explicit configuration."
            )
        return row.config

    def live_test(self, capability_key: str) -> dict[str, Any]:
        """Run one small request against an explicitly configured capability."""

        definition = require_capability(capability_key)
        config = self.explicit_config(definition.key)
        if not config.enabled:
            raise AICapabilityDisabled(f"AI capability {definition.key!r} is disabled.")
        validate_capability_config(definition.key, config)

        runtime = self.provider_factory().get(config.provider)
        if runtime is None or not getattr(runtime, "configured", False):
            raise AIProviderNotConfigured("AI provider is not configured on the server.")

        models = runtime.discover_models_live()
        if not models:
            raise AIModelCatalogEmpty("AI provider returned an empty model catalog.")
        if config.model not in models:
            raise AIModelUnavailable("Configured AI model is not available.")

        schema = {
            "type": "object",
            "properties": {
                "ok": {"type": "boolean"},
                "capability": {"type": "string"},
            },
            "required": ["ok", "capability"],
            "additionalProperties": False,
        }
        started = perf_counter()
        generate_once = getattr(runtime, "generate_json_once", None)
        if generate_once is None:
            generate_once = runtime.generate_json
        result = generate_once(
            messages=[
                {
                    "role": "system",
                    "content": "Return only the requested tiny capability health JSON.",
                },
                {
                    "role": "user",
                    "content": f"Return ok=true and capability={definition.key!r}.",
                },
            ],
            schema=schema,
            model=config.model,
            max_output_tokens=40,
            temperature=config.temperature if config.temperature is not None else 0.0,
        )
        latency_ms = max(0, round((perf_counter() - started) * 1000))
        if (
            not isinstance(result.data, dict)
            or result.data.get("ok") is not True
            or result.data.get("capability") != definition.key
        ):
            raise AIProviderResponseInvalid("AI provider response failed capability validation.")

        model, redacted = safe_model_display(config.model)
        return {
            "ok": True,
            "capability": definition.key,
            "provider": config.provider,
            "model": model,
            "model_redacted": redacted,
            "latency_ms": latency_ms,
            "error_class": None,
        }

    def diagnostic_context(self, capability_key: str) -> dict[str, Any]:
        """Load only safe identifiers for a failed live-test response."""

        definition = require_capability(capability_key)
        row = self.repository.get_capability_config(definition.key)
        if row is None:
            return {"capability": definition.key, "provider": None, "model": None, "model_redacted": False}
        model, redacted = safe_model_display(row.config.model)
        return {
            "capability": definition.key,
            "provider": row.config.provider,
            "model": model,
            "model_redacted": redacted,
        }
