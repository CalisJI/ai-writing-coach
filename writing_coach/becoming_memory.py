from __future__ import annotations

import json
import sqlite3
from collections import defaultdict
from datetime import datetime
from typing import Any, Callable

from pydantic import BaseModel, Field

from writing_coach.languages.runtime import active_profile


_db_factory: Callable[[], sqlite3.Connection] | None = None


class LearnerProfileIn(BaseModel):
    goal: str = Field(default="everyday", pattern=r"^(everyday|work|exam|voice)$")
    style: str = Field(default="guided", pattern=r"^(guided|examples|concise|deep)$")
    pinyin: str = Field(default="auto", pattern=r"^(auto|on|off)$")
    native_language: str = Field(default="vi", pattern=r"^(vi|en|zh)$")
    theme_preset: str = Field(
        default="editorial",
        pattern=r"^(editorial|sage|clay|blueprint)$",
    )


def configure_becoming_memory(db_factory: Callable[[], sqlite3.Connection]) -> None:
    global _db_factory
    _db_factory = db_factory


def _db() -> sqlite3.Connection:
    if _db_factory is None:
        raise RuntimeError("BECOMING memory database factory is not installed")
    return _db_factory()


def ensure_becoming_schema(conn: sqlite3.Connection) -> None:
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS learner_profile (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            goal TEXT NOT NULL DEFAULT 'everyday',
            style TEXT NOT NULL DEFAULT 'guided',
            pinyin TEXT NOT NULL DEFAULT 'auto',
            native_language TEXT NOT NULL DEFAULT 'vi',
            theme_preset TEXT NOT NULL DEFAULT 'editorial',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
        """
    )
    profile_columns = {
        str(row["name"])
        for row in conn.execute("PRAGMA table_info(learner_profile)").fetchall()
    }
    if "native_language" not in profile_columns:
        conn.execute(
            "ALTER TABLE learner_profile "
            "ADD COLUMN native_language TEXT NOT NULL DEFAULT 'vi'"
        )
    if "theme_preset" not in profile_columns:
        conn.execute(
            "ALTER TABLE learner_profile "
            "ADD COLUMN theme_preset TEXT NOT NULL DEFAULT 'editorial'"
        )
    conn.commit()


def _safe_json(value: Any, fallback: Any) -> Any:
    try:
        parsed = json.loads(value or "")
    except Exception:
        return fallback
    return parsed


def _normalized_category(value: Any) -> str:
    raw = str(value or "other").strip().lower()
    raw = "_".join(part for part in raw.replace("-", " ").split() if part)
    return raw[:80] or "other"


def _profile_defaults() -> dict[str, Any]:
    return {
        "exists": False,
        "language": active_profile().code,
        "goal": "everyday",
        "style": "guided",
        "pinyin": "auto",
        "native_language": "vi",
        "theme_preset": "editorial",
        "updated_at": "",
    }


def get_learner_profile() -> dict[str, Any]:
    with _db() as conn:
        ensure_becoming_schema(conn)
        row = conn.execute(
            "SELECT goal, style, pinyin, native_language, theme_preset, updated_at "
            "FROM learner_profile WHERE id = 1"
        ).fetchone()

    if not row:
        return _profile_defaults()

    return {
        "exists": True,
        "language": active_profile().code,
        "goal": str(row["goal"]),
        "style": str(row["style"]),
        "pinyin": str(row["pinyin"]),
        "native_language": str(row["native_language"] or "vi"),
        "theme_preset": str(row["theme_preset"] or "editorial"),
        "updated_at": str(row["updated_at"]),
    }


def put_learner_profile(payload: LearnerProfileIn) -> dict[str, Any]:
    now = datetime.now().astimezone().isoformat(timespec="seconds")
    with _db() as conn:
        ensure_becoming_schema(conn)
        existing = conn.execute("SELECT created_at FROM learner_profile WHERE id = 1").fetchone()
        created_at = str(existing["created_at"]) if existing else now
        conn.execute(
            """
            INSERT INTO learner_profile(
              id, goal, style, pinyin, native_language, theme_preset, created_at, updated_at
            )
            VALUES (1, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              goal = excluded.goal,
              style = excluded.style,
              pinyin = excluded.pinyin,
              native_language = excluded.native_language,
              theme_preset = excluded.theme_preset,
              updated_at = excluded.updated_at
            """,
            (
                payload.goal,
                payload.style,
                payload.pinyin,
                payload.native_language,
                payload.theme_preset,
                created_at,
                now,
            ),
        )
        conn.commit()

    return {
        "exists": True,
        "language": active_profile().code,
        "goal": payload.goal,
        "style": payload.style,
        "pinyin": payload.pinyin,
        "native_language": payload.native_language,
        "theme_preset": payload.theme_preset,
        "updated_at": now,
    }


def _essay_rows(conn: sqlite3.Connection) -> list[sqlite3.Row]:
    return conn.execute(
        """
        SELECT
          id, series_id, revision_no, created_at, overall,
          errors_json, strengths_json,
          COALESCE(strength_evidence_json, '[]') AS strength_evidence_json
        FROM essays
        ORDER BY id ASC
        """
    ).fetchall()


def _error_patterns(rows: list[sqlite3.Row]) -> list[dict[str, Any]]:
    if not rows:
        return []

    by_cat: dict[str, dict[str, Any]] = {}
    midpoint = max(1, len(rows) // 2)
    newer_ids = {int(row["id"]) for row in rows[midpoint:]}
    older_ids = {int(row["id"]) for row in rows[:midpoint]}

    for row in rows:
        rid = int(row["id"])
        for err in _safe_json(row["errors_json"], []):
            if not isinstance(err, dict):
                continue
            cat = _normalized_category(err.get("category"))
            item = by_cat.setdefault(
                cat,
                {
                    "category": cat,
                    "total": 0,
                    "older": 0,
                    "newer": 0,
                    "series": set(),
                    "last_seen": "",
                    "example": "",
                    "suggestion": "",
                },
            )
            item["total"] += 1
            item["series"].add(int(row["series_id"] or row["id"]))
            item["last_seen"] = str(row["created_at"])
            if rid in older_ids:
                item["older"] += 1
            if rid in newer_ids:
                item["newer"] += 1
            if not item["example"] and err.get("fragment"):
                item["example"] = str(err.get("fragment"))[:240]
            if not item["suggestion"] and err.get("suggestion"):
                item["suggestion"] = str(err.get("suggestion"))[:320]

    output: list[dict[str, Any]] = []
    for item in by_cat.values():
        if item["newer"] == 0 and item["older"] > 0:
            status = "historical"
        elif item["older"] > 0 and item["newer"] < item["older"]:
            status = "improving"
        elif item["older"] == 0 and item["newer"] > 0:
            status = "new"
        elif item["total"] >= 3:
            status = "recurring"
        else:
            status = "watch"

        output.append(
            {
                "category": item["category"],
                "status": status,
                "total": item["total"],
                "older": item["older"],
                "newer": item["newer"],
                "series_count": len(item["series"]),
                "last_seen": item["last_seen"],
                "example": item["example"],
                "suggestion": item["suggestion"],
            }
        )

    priority = {"recurring": 0, "new": 1, "watch": 2, "improving": 3, "historical": 4}
    output.sort(key=lambda x: (priority.get(x["status"], 9), -int(x["total"])))
    return output


def _strength_patterns(rows: list[sqlite3.Row], error_patterns: list[dict[str, Any]]) -> list[dict[str, Any]]:
    by_cat: dict[str, dict[str, Any]] = {}
    recent_rows = rows[-5:]
    recent_ids = {int(row["id"]) for row in recent_rows}
    recent_error_categories = {
        item["category"]
        for item in error_patterns
        if item["status"] in {"recurring", "new", "watch"}
    }

    for row in rows:
        rid = int(row["id"])
        series_id = int(row["series_id"] or row["id"])
        evidence = _safe_json(row["strength_evidence_json"], [])
        for item in evidence:
            if not isinstance(item, dict):
                continue
            cat = _normalized_category(item.get("category"))
            fragment = str(item.get("fragment") or "").strip()
            if not fragment:
                continue

            record = by_cat.setdefault(
                cat,
                {
                    "category": cat,
                    "evidence_count": 0,
                    "recent_count": 0,
                    "series": set(),
                    "last_seen": "",
                    "example": "",
                    "explanation": "",
                },
            )
            record["evidence_count"] += 1
            record["series"].add(series_id)
            record["last_seen"] = str(row["created_at"])
            if rid in recent_ids:
                record["recent_count"] += 1
            if not record["example"]:
                record["example"] = fragment[:240]
            if not record["explanation"] and item.get("explanation_vi"):
                record["explanation"] = str(item.get("explanation_vi"))[:500]

    output: list[dict[str, Any]] = []
    for record in by_cat.values():
        count = int(record["evidence_count"])
        series_count = len(record["series"])

        if count >= 5 and series_count >= 4 and record["recent_count"] >= 1:
            stage = "Mastered"
        elif count >= 3 and series_count >= 2:
            stage = "Stable"
        elif count >= 2:
            stage = "Developing"
        else:
            stage = "Emerging"

        # Exact-category negative evidence caps automatic mastery. This is deliberately
        # conservative: absence of errors alone never creates mastery.
        if record["category"] in recent_error_categories and stage in {"Stable", "Mastered"}:
            stage = "Developing"

        output.append(
            {
                "category": record["category"],
                "stage": stage,
                "evidence_count": count,
                "series_count": series_count,
                "recent_count": int(record["recent_count"]),
                "last_seen": record["last_seen"],
                "example": record["example"],
                "explanation": record["explanation"],
            }
        )

    stage_rank = {"Mastered": 0, "Stable": 1, "Developing": 2, "Emerging": 3}
    output.sort(
        key=lambda x: (
            stage_rank.get(x["stage"], 9),
            -int(x["evidence_count"]),
        )
    )
    return output


def _revision_wins(rows: list[sqlite3.Row]) -> list[dict[str, Any]]:
    by_series: dict[int, list[sqlite3.Row]] = defaultdict(list)
    for row in rows:
        by_series[int(row["series_id"] or row["id"])].append(row)

    wins: list[dict[str, Any]] = []
    for series_id, series_rows in by_series.items():
        ordered = sorted(series_rows, key=lambda row: int(row["revision_no"] or 1))
        if len(ordered) < 2:
            continue
        first = ordered[0]
        latest = ordered[-1]
        delta = round(float(latest["overall"]) - float(first["overall"]), 1)

        first_errors = len(_safe_json(first["errors_json"], []))
        latest_errors = len(_safe_json(latest["errors_json"], []))
        error_delta = latest_errors - first_errors

        if delta <= 0 and error_delta >= 0:
            continue

        wins.append(
            {
                "series_id": series_id,
                "revisions": len(ordered),
                "overall_delta": delta,
                "error_delta": error_delta,
                "latest_id": int(latest["id"]),
                "latest_date": str(latest["created_at"]),
            }
        )

    wins.sort(
        key=lambda item: (
            item["latest_date"],
            item["overall_delta"],
            -item["error_delta"],
        ),
        reverse=True,
    )
    return wins


def get_learning_memory() -> dict[str, Any]:
    with _db() as conn:
        ensure_becoming_schema(conn)
        rows = _essay_rows(conn)

    patterns = _error_patterns(rows)
    strengths = _strength_patterns(rows, patterns)
    wins = _revision_wins(rows)

    active_focus = next(
        (item for item in patterns if item["status"] in {"recurring", "new", "watch", "improving"}),
        None,
    )

    return {
        "language": active_profile().code,
        "essay_count": len({int(row["series_id"] or row["id"]) for row in rows}),
        "revision_count": len(rows),
        "focus": active_focus,
        "patterns": patterns[:12],
        "strengths": strengths[:12],
        "revision_wins": wins[:8],
        "mastery_vocabulary": ["Emerging", "Developing", "Stable", "Mastered"],
        "mastery_note": (
            "Internal practice stability derived from repeated evidence. "
            "It is not a CEFR, TOEIC, IELTS or HSK equivalence."
        ),
    }
