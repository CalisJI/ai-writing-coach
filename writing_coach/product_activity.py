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


def aggregate_product_activity(rows: Any, *, window_days: int = 7, now: datetime | None = None, cohort_start: datetime | None = None) -> dict[str, Any]:
    days = max(1, min(int(window_days or 7), 30))
    end = (now or datetime.now(timezone.utc)).astimezone(timezone.utc)
    # The window is the current calendar day plus the preceding days-1 days;
    # this keeps every in-window event represented by exactly one bucket.
    start = datetime.combine(end.date() - timedelta(days=days - 1), datetime.min.time(), tzinfo=timezone.utc)
    cohort_floor = (cohort_start or (start - timedelta(days=7))).astimezone(timezone.utc)
    buckets = {(start.date() + timedelta(days=i)).isoformat(): {"activities": 0, "completions": 0} for i in range(days)}
    by_skill = {skill: {"skill": skill, "activities": 0, "completions": 0, "days": {key: {"activities": 0, "completions": 0} for key in buckets}} for skill in SKILLS}
    learners: set[str] = set()
    cohort_days: dict[str, set[str]] = {}
    cohort_skills: dict[str, set[str]] = {}
    learner_days: dict[str, set[str]] = {}
    learner_completed: dict[str, int] = {}
    learner_skills: dict[str, set[str]] = {}
    for row in rows if isinstance(rows, list) else []:
        if not isinstance(row, dict):
            continue
        skill = row.get("skill")
        occurred = _when(row.get("occurred_at"))
        learner = row.get("learner_key")
        if skill not in by_skill or occurred is None or not (cohort_floor <= occurred <= end) or not isinstance(learner, str) or not learner:
            continue
        day = occurred.date().isoformat()
        cohort_days.setdefault(learner, set()).add(day)
        cohort_skills.setdefault(learner, set()).add(skill)
        if not (start <= occurred <= end) or day not in buckets:
            continue
        completed = row.get("completed") is True
        learners.add(learner)
        learner_days.setdefault(learner, set()).add(day)
        learner_completed[learner] = learner_completed.get(learner, 0) + int(completed)
        learner_skills.setdefault(learner, set()).add(skill)
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
    return_days = [1, 3, 7]
    return_windows = []
    for offset in return_days:
        eligible = 0
        returned = 0
        for active_days in cohort_days.values():
            first = min(active_days)
            first_date = datetime.fromisoformat(first).date()
            if first_date + timedelta(days=offset) > end.date():
                continue
            eligible += 1
            if any(datetime.fromisoformat(day).date() >= first_date + timedelta(days=offset) for day in active_days):
                returned += 1
        return_windows.append({"days": offset, "eligible_learners": eligible, "returned_learners": returned, "return_rate_percent": round(returned * 100 / eligible, 1) if eligible else None})
    daily_returning = []
    for key in buckets:
        current = {learner for learner, active_days in cohort_days.items() if key in active_days}
        returning = sum(1 for learner in current if any(day < key for day in cohort_days[learner]))
        daily_returning.append({"date": key, "returning_learners": returning})
    return {"available": True, "data_state": "ready" if total else "insufficient_data", "has_data": bool(total), "window_days": days, "window_start": start.isoformat(), "window_end": end.isoformat(), "active_learners": len(learners) if total else None, "returning_learners": sum(1 for active_days in cohort_days.values() if len(active_days) >= 2) if total else None, "repeat_practice_learners": sum(1 for count in learner_completed.values() if count >= 2) if total else None, "cross_skill_returning_learners": sum(1 for learner, skills_seen in cohort_skills.items() if len(skills_seen) >= 2 and len(cohort_days.get(learner, set())) >= 2) if total else None, "return_windows": return_windows, "daily_returning": daily_returning, "total_activities": total, "total_completions": sum(item["completions"] for item in skills), "skills": skills}


if __name__ == "__main__":
    result = aggregate_product_activity([{"learner_key": "u1", "skill": "writing", "occurred_at": "2026-01-02T12:00:00+00:00", "completed": True}], now=datetime(2026, 1, 3, tzinfo=timezone.utc), window_days=7)
    assert result["active_learners"] == 1 and result["skills"][0]["completions"] == 1
    assert "learner_key" not in result and "text" not in result
    print("product activity selftest: PASS")
