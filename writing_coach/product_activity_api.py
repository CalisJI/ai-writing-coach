from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any, Callable

from writing_coach.product_activity import aggregate_product_activity


def product_activity_response(
    request: Any,
    repository: Any,
    require_admin: Callable[[Any], Any],
    *,
    window_days: int = 7,
    now: datetime | None = None,
) -> dict[str, Any]:
    """Build the Admin response after the caller's admin guard succeeds."""
    require_admin(request)
    bounded = max(1, min(int(window_days or 7), 30))
    end = (now or datetime.now(timezone.utc)).astimezone(timezone.utc)
    since = datetime.combine(end.date() - timedelta(days=bounded - 1), datetime.min.time(), tzinfo=timezone.utc)
    cohort_since = since - timedelta(days=7)
    try:
        rows = repository.list_product_activity_events(cohort_since)
    except Exception:
        return {"available": False, "data_state": "unavailable", "has_data": False, "window_days": bounded, "active_learners": None, "returning_learners": None, "repeat_practice_learners": None, "cross_skill_returning_learners": None, "return_windows": [], "daily_returning": [], "skills": []}
    return aggregate_product_activity(rows, window_days=bounded, now=end, cohort_start=cohort_since)
