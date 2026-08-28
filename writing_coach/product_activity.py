"""Privacy-bounded aggregation for the Admin activity view.

Inputs are already scoped repository facts; output deliberately contains no
learner identifiers, text, URLs, or per-event rows.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

SKILLS = ("writing", "reading", "listening", "speaking")


def _when(value: Any) -> datetime | None:
    if not isinstance(value, str) or not value.strip():
        return None
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None
    return parsed.replace(tzinfo=timezone.utc) if parsed.tzinfo is None else parsed.astimezone(timezone.utc)


def aggregate_product_activity(rows: Any, *, window_days: int = 7, now: datetime | None = None) -> dict[str, Any]:
    days = max(1, min(int(window_days or 7), 30))
    end = (now or datetime.now(timezone.utc)).astimezone(timezone.utc)
    # The window is the current calendar day plus the preceding days-1 days;
    # this keeps every in-window event represented by exactly one bucket.
    start = datetime.combine(end.date() - timedelta(days=days - 1), datetime.min.time(), tzinfo=timezone.utc)
    buckets = {(start.date() + timedelta(days=i)).isoformat(): {"activities": 0, "completions": 0} for i in range(days)}
    by_skill = {skill: {"skill": skill, "activities": 0, "completions": 0, "days": {key: {"activities": 0, "completions": 0} for key in buckets}} for skill in SKILLS}
    learners: set[str] = set()
    for row in rows if isinstance(rows, list) else []:
        if not isinstance(row, dict):
            continue
        skill = row.get("skill")
        occurred = _when(row.get("occurred_at"))
        learner = row.get("learner_key")
        if skill not in by_skill or occurred is None or not (start <= occurred <= end) or not isinstance(learner, str) or not learner:
            continue
        day = occurred.date().isoformat()
        if day not in buckets:
            continue
        completed = row.get("completed") is True
        learners.add(learner)
        buckets[day]["activities"] += 1
        buckets[day]["completions"] += int(completed)
        by_skill[skill]["activities"] += 1
        by_skill[skill]["completions"] += int(completed)
        by_skill[skill]["days"][day]["activities"] += 1
        by_skill[skill]["days"][day]["completions"] += int(completed)
    skills = []
    for skill in SKILLS:
        row = by_skill[skill]
        row["days"] = [{"date": key, **value} for key, value in row["days"].items()]
        row["completion_rate_percent"] = round(row["completions"] * 100 / row["activities"], 1) if row["activities"] else None
        skills.append(row)
    total = sum(item["activities"] for item in skills)
    return {"available": True, "data_state": "ready" if total else "insufficient_data", "has_data": bool(total), "window_days": days, "window_start": start.isoformat(), "window_end": end.isoformat(), "active_learners": len(learners) if total else None, "total_activities": total, "total_completions": sum(item["completions"] for item in skills), "skills": skills}


if __name__ == "__main__":
    result = aggregate_product_activity([{"learner_key": "u1", "skill": "writing", "occurred_at": "2026-01-02T12:00:00+00:00", "completed": True}], now=datetime(2026, 1, 3, tzinfo=timezone.utc), window_days=7)
    assert result["active_learners"] == 1 and result["skills"][0]["completions"] == 1
    assert "learner_key" not in result and "text" not in result
    print("product activity selftest: PASS")
