from writing_coach.readiness_summary import build_readiness_summary


def test_states_and_redaction():
    result = build_readiness_summary(
        {"capabilities": [{"key": "writing_evaluator", "implemented": True, "provider_backed": True, "configurable": True, "explicit_config_exists": True, "config": {"provider": "openai", "enabled": True}}], "providers": [{"id": "openai", "server_configured": True}]},
        {"available": True, "has_data": True, "by_capability": [{"health_state": "provider_failure"}]},
        {"available": True, "has_data": False, "learner_impact_failures": {"available": True, "data_state": "insufficient_data"}},
    )
    assert result["state"] == "degraded"
    assert result["evidence_state"] == "degraded"
    assert result["approval_state"] == "not_granted"
    assert {item["state"] for item in result["indicators"]} == {"ready", "degraded", "insufficient", "deferred"}
    assert "private-user" not in str(result) and "api-key-value" not in str(result)
    empty = build_readiness_summary({"capabilities": [{"implemented": True, "provider_backed": True, "configurable": True, "explicit_config_exists": False}], "providers": [{"id": "openai", "server_configured": False}]}, {"available": True, "has_data": False}, {"available": True, "has_data": False})
    assert next(item for item in empty["indicators"] if item["name"] == "capability_configuration")["state"] == "insufficient"
    configured = next(item for item in result["indicators"] if item["name"] == "capability_configuration")
    assert configured["state"] == "ready"
    unavailable = build_readiness_summary(None, {"available": False}, {"available": False})
    assert unavailable["state"] == "unavailable"
    deferred = build_readiness_summary({"capabilities": [{"implemented": True, "provider_backed": True, "configurable": True, "explicit_config_exists": True, "config": {"provider": "openai", "enabled": True}}], "providers": [{"id": "openai", "server_configured": True}]}, {"available": True, "has_data": True, "by_capability": []}, {"available": True, "has_data": True, "learner_impact_failures": {"available": True, "data_state": "ready"}})
    assert deferred["state"] == "deferred" and deferred["evidence_state"] == "ready"


if __name__ == "__main__":
    test_states_and_redaction()
    print("readiness summary selftest: PASS")
