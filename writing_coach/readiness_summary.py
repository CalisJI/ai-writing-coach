"""Privacy-safe aggregation of existing operational readiness evidence."""
from __future__ import annotations

from typing import Any


def _indicator(name: str, state: str, source: str, *, detail: str | None = None) -> dict[str, Any]:
    value = {"name": name, "state": state, "source": source}
    if detail:
        value["detail"] = detail
    return value


def build_readiness_summary(config: Any, operations: Any, product_activity: Any) -> dict[str, Any]:
    """Return bounded evidence states without secrets, IDs, or event rows."""
    indicators: list[dict[str, Any]] = []
    capabilities = config.get("capabilities") if isinstance(config, dict) else None
    providers = {item.get("id"): item for item in config.get("providers", []) if isinstance(item, dict)} if isinstance(config, dict) and isinstance(config.get("providers"), list) else {}
    usable = False
    if isinstance(capabilities, list):
        for item in capabilities:
            if not isinstance(item, dict) or not item.get("implemented") or not item.get("provider_backed") or not item.get("configurable") or item.get("explicit_config_exists") is not True:
                continue
            setting = item.get("config")
            provider_id = setting.get("provider") if isinstance(setting, dict) else None
            if isinstance(setting, dict) and setting.get("enabled") is not False and providers.get(provider_id, {}).get("server_configured") is True:
                usable = True
                break
    if usable:
        indicators.append(_indicator("capability_configuration", "ready", "AI capability configuration"))
    elif isinstance(capabilities, list):
        indicators.append(_indicator("capability_configuration", "insufficient", "AI capability configuration", detail="No enabled explicit capability configuration is backed by a configured provider."))
    else:
        indicators.append(_indicator("capability_configuration", "unavailable", "AI capability configuration"))

    if not isinstance(operations, dict) or operations.get("available") is False:
        indicators.append(_indicator("capability_health", "unavailable", "AI operation telemetry"))
    elif operations.get("has_data") is not True:
        indicators.append(_indicator("capability_health", "insufficient", "AI operation telemetry"))
    else:
        states = {item.get("health_state") for item in operations.get("by_capability", []) if isinstance(item, dict)}
        state = "degraded" if states & {"degraded", "provider_failure"} else "ready"
        indicators.append(_indicator("capability_health", state, "AI operation telemetry"))

    if not isinstance(product_activity, dict) or product_activity.get("available") is False:
        indicators.append(_indicator("product_observability", "unavailable", "Admin product activity aggregates"))
    elif product_activity.get("has_data") is not True:
        indicators.append(_indicator("product_observability", "insufficient", "Admin product activity aggregates"))
    else:
        indicators.append(_indicator("product_observability", "ready", "Admin product activity aggregates"))

    impact = product_activity.get("learner_impact_failures") if isinstance(product_activity, dict) else None
    if not isinstance(impact, dict) or impact.get("available") is False:
        indicators.append(_indicator("learner_impact_evidence", "unavailable", "Validated learner-origin telemetry"))
    elif impact.get("data_state") != "ready":
        indicators.append(_indicator("learner_impact_evidence", "insufficient", "Validated learner-origin telemetry"))
    else:
        indicators.append(_indicator("learner_impact_evidence", "ready", "Validated learner-origin telemetry"))

    indicators.append(_indicator("runtime_activation", "deferred", "Human activation policy", detail="Activation and live validation remain human-gated."))
    states = {item["state"] for item in indicators}
    evidence_state = "unavailable" if "unavailable" in states else "degraded" if states & {"degraded", "insufficient"} else "ready"
    overall = "deferred" if evidence_state == "ready" else evidence_state
    return {
        "available": True,
        "state": overall,
        "evidence_state": evidence_state,
        "approval_state": "not_granted",
        "indicators": indicators,
        "redaction": "aggregate-only; no secrets, learner records, text, URLs, or event rows",
    }
