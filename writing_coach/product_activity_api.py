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
    try:
        rows = repository.list_product_activity_events(since)
    except Exception:
        return {"available": False, "data_state": "unavailable", "has_data": False, "window_days": bounded, "skills": []}
    return aggregate_product_activity(rows, window_days=bounded, now=end)
