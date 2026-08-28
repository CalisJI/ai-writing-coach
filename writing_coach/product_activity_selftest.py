from datetime import datetime, timezone

from writing_coach.product_activity import aggregate_product_activity
from writing_coach.product_activity_api import product_activity_response


def test_window_and_redaction():
    now = datetime(2026, 1, 8, 12, tzinfo=timezone.utc)
    rows = [
        {"learner_key": "u1", "skill": "writing", "occurred_at": "2026-01-07T10:00:00+00:00", "completed": True, "text": "secret"},
        {"learner_key": "u1", "skill": "writing", "occurred_at": "2026-01-08T11:00:00+00:00", "completed": True},
        {"learner_key": "u1", "skill": "reading", "occurred_at": "2026-01-07T11:00:00+00:00", "completed": True},
        {"learner_key": "u2", "skill": "speaking", "occurred_at": "2026-01-06T11:00:00+00:00", "completed": False},
        {"learner_key": "u3", "skill": "listening", "occurred_at": "2025-12-01T11:00:00+00:00", "completed": True},
        {"learner_key": "u4", "skill": "writing", "occurred_at": "not-a-date", "completed": True},
    ]
    result = aggregate_product_activity(rows, window_days=7, now=now)
    assert result["active_learners"] == 2
    assert result["total_activities"] == 4
    assert result["total_completions"] == 3
    assert all("learner_key" not in item and "text" not in item for item in result["skills"])
    assert result["skills"][0]["days"][-1]["date"] == "2026-01-08"


def test_empty_is_explicit():
    result = aggregate_product_activity([], now=datetime(2026, 1, 8, tzinfo=timezone.utc))
    assert result["available"] is True and result["data_state"] == "insufficient_data" and result["active_learners"] is None


def test_admin_endpoint_guard_redaction_and_unavailable():
    rows = [{"learner_key": "private-user", "skill": "writing", "occurred_at": "2026-01-08T11:00:00+00:00", "completed": True, "text": "private"}]
    class Repo:
        def list_product_activity_events(self, since):
            assert since.isoformat() == "2026-01-02T00:00:00+00:00"
            return rows
    calls=[]
    def guard(request):
        calls.append(request)
        if request == "not-admin": raise PermissionError("admin required")
        return {"is_admin": True}
    result = product_activity_response("admin", Repo(), guard, window_days=7, now=datetime(2026, 1, 8, 12, tzinfo=timezone.utc))
    assert result["active_learners"] == 1 and "private-user" not in str(result) and "private" not in str(result)
    try: product_activity_response("not-admin", Repo(), guard)
    except PermissionError: pass
    else: raise AssertionError("non-admin request was accepted")
    class Down:
        def list_product_activity_events(self, since): raise RuntimeError("postgres unavailable")
    unavailable = product_activity_response("admin", Down(), guard)
    assert unavailable["available"] is False and unavailable["data_state"] == "unavailable"


if __name__ == "__main__":
    test_window_and_redaction()
    test_empty_is_explicit()
    test_admin_endpoint_guard_redaction_and_unavailable()
    print("product activity selftest: PASS")
