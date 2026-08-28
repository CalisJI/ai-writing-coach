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
        {"learner_key": "u5", "skill": "writing", "occurred_at": "2026-01-01T11:00:00+00:00", "completed": True},
        {"learner_key": "u5", "skill": "writing", "occurred_at": "2026-01-08T09:00:00+00:00", "completed": True},
        {"learner_key": "u6", "skill": "writing", "occurred_at": "2026-01-08T08:00:00+00:00", "completed": True},
        {"learner_key": "u6", "skill": "reading", "occurred_at": "2026-01-08T08:30:00+00:00", "completed": True},
        {"learner_key": "u3", "skill": "listening", "occurred_at": "2025-12-01T11:00:00+00:00", "completed": True},
        {"learner_key": "u4", "skill": "writing", "occurred_at": "not-a-date", "completed": True},
        {"learner_key": "u1", "skill": "writing", "occurred_at": "2026-01-07T10:00:00+00:00", "funnel_stage": "attempted", "funnel_key": "essay-1", "funnel_only": True},
        {"learner_key": "u1", "skill": "writing", "occurred_at": "2026-01-07T10:00:00+00:00", "funnel_stage": "completed", "funnel_key": "essay-1", "funnel_only": True},
        {"learner_key": "u1", "skill": "reading", "occurred_at": "2026-01-07T11:00:00+00:00", "funnel_stage": "started", "funnel_key": "session-1", "funnel_only": True},
        {"learner_key": "u1", "skill": "reading", "occurred_at": "2026-01-07T11:00:00+00:00", "funnel_stage": "attempted", "funnel_key": "session-1", "funnel_only": True},
        {"learner_key": "u1", "skill": "reading", "occurred_at": "2026-01-07T11:00:00+00:00", "funnel_stage": "completed", "funnel_key": "session-1", "funnel_only": True},
        {"learner_key": "u1", "skill": "listening", "occurred_at": "2026-01-08T11:00:00+00:00", "funnel_stage": "attempted", "funnel_key": "asset-1:seg-1", "funnel_only": True},
        {"learner_key": "u1", "skill": "listening", "occurred_at": "2026-01-08T11:00:00+00:00", "funnel_stage": "completed", "funnel_key": "asset-1:seg-1", "funnel_only": True},
        {"learner_key": "u1", "skill": "speaking", "occurred_at": "2026-01-06T11:00:00+00:00", "funnel_stage": "completed", "funnel_key": "take-1", "funnel_only": True},
    ]
    result = aggregate_product_activity(rows, window_days=7, now=now)
    assert result["active_learners"] == 4
    assert result["total_activities"] == 7
    assert result["total_completions"] == 6
    assert result["returning_learners"] == 2
    assert result["repeat_practice_learners"] == 2
    assert result["cross_skill_returning_learners"] == 1
    assert result["return_windows"][0] == {"days": 1, "eligible_learners": 3, "returned_learners": 2, "return_rate_percent": 66.7}
    assert result["return_windows"][2] == {"days": 7, "eligible_learners": 1, "returned_learners": 1, "return_rate_percent": 100.0}
    assert result["cross_skill_returning_learners"] == 1
    assert result["daily_returning"][-1] == {"date": "2026-01-08", "returning_learners": 2}
    assert all("learner_key" not in item and "text" not in item for item in result["skills"])
    assert result["skills"][0]["days"][-1]["date"] == "2026-01-08"
    assert result["skills"][0]["funnel"]["stages"][0]["available"] is False
    assert result["skills"][0]["funnel"]["stages"][1]["count"] == 1
    assert result["skills"][1]["funnel"]["stages"][0]["count"] == 1
    assert result["skills"][1]["funnel"]["stages"][2]["rate_percent"] == 100.0
    assert result["skills"][2]["funnel"]["stages"][0]["available"] is False
    assert result["skills"][3]["funnel"]["stages"][1]["available"] is False
    assert result["skills"][3]["funnel"]["stages"][2]["count"] == 1
    misaligned = aggregate_product_activity([
        {"learner_key": "u7", "skill": "reading", "occurred_at": "2026-01-01T10:00:00+00:00", "funnel_stage": "started", "funnel_key": "old-session", "funnel_only": True},
        {"learner_key": "u7", "skill": "reading", "occurred_at": "2026-01-03T10:00:00+00:00", "funnel_stage": "attempted", "funnel_key": "old-session", "funnel_only": True},
        {"learner_key": "u7", "skill": "reading", "occurred_at": "2026-01-04T10:00:00+00:00", "funnel_stage": "attempted", "funnel_key": "old-session", "funnel_only": True},
        {"learner_key": "u7", "skill": "reading", "occurred_at": "2026-01-03T10:00:00+00:00", "funnel_stage": "completed", "funnel_key": "old-session", "funnel_only": True},
        {"learner_key": "u8", "skill": "reading", "occurred_at": "2026-01-03T09:00:00+00:00", "funnel_stage": "started", "funnel_key": "new-session", "funnel_only": True},
        {"learner_key": "u8", "skill": "reading", "occurred_at": "2026-01-03T09:30:00+00:00", "funnel_stage": "attempted", "funnel_key": "old-a", "funnel_only": True},
        {"learner_key": "u8", "skill": "reading", "occurred_at": "2026-01-03T09:45:00+00:00", "funnel_stage": "attempted", "funnel_key": "old-b", "funnel_only": True},
    ], now=now)
    misaligned_stages = misaligned["skills"][1]["funnel"]["stages"]
    assert misaligned_stages[0]["count"] == 1 and misaligned_stages[1]["count"] == 3 and misaligned_stages[1]["rate_percent"] == 0.0
    assert all(stage["rate_percent"] is None or 0 <= stage["rate_percent"] <= 100 for stage in misaligned_stages)


def test_empty_is_explicit():
    result = aggregate_product_activity([], now=datetime(2026, 1, 8, tzinfo=timezone.utc))
    assert result["available"] is True and result["data_state"] == "insufficient_data" and result["active_learners"] is None
    assert result["returning_learners"] is None and result["return_windows"][0]["eligible_learners"] == 0


def test_admin_endpoint_guard_redaction_and_unavailable():
    rows = [{"learner_key": "private-user", "skill": "writing", "occurred_at": "2026-01-08T11:00:00+00:00", "completed": True, "text": "private"}]
    class Repo:
        def list_product_activity_events(self, since):
            assert since.isoformat() == "2025-12-26T00:00:00+00:00"
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
