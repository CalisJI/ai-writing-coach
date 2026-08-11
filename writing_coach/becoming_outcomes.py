from __future__ import annotations

import json
import sqlite3
from typing import Any, Callable

from pydantic import BaseModel, Field


_db_factory: Callable[[], sqlite3.Connection] | None = None


class PracticeContextIn(BaseModel):
    intent: str = Field(default="baseline", pattern=r"^(repair|reinforce|transfer|baseline)$")
    focus_category: str = Field(default="expression", max_length=80)
    focus_label: str = Field(default="Expression", max_length=120)
    focus_family: str = Field(
        default="expression",
        pattern=r"^(grammar|vocabulary|coherence|task_achievement|naturalness|expression)$",
    )
    focus_status: str = Field(default="", max_length=40)
    task_type: str = Field(default="opinion", max_length=32)
    topic: str = Field(default="random", max_length=120)
    target_level: str = Field(default="", max_length=12)
    action_label: str = Field(default="", max_length=120)
    reason: str = Field(default="", max_length=1600)
    evidence: str = Field(default="", max_length=600)
    focus_instruction: str = Field(default="", max_length=1600)


def configure_becoming_outcomes(db_factory: Callable[[], sqlite3.Connection]) -> None:
    global _db_factory
    _db_factory = db_factory


def _db() -> sqlite3.Connection:
    if _db_factory is None:
        raise RuntimeError("BECOMING outcome database factory is not installed")
    return _db_factory()


def _safe_json(value: Any, fallback: Any) -> Any:
    try:
        parsed = json.loads(value or "")
    except Exception:
        return fallback
    return parsed


def _family(category: Any) -> str:
    value = str(category or "").casefold().replace("-", " ").replace("_", " ")
    if any(token in value for token in (
        "article", "verb", "tense", "grammar", "agreement", "preposition",
        "word order", "particle", "measure word", "classifier", "aspect",
        "sentence structure",
    )):
        return "grammar"
    if any(token in value for token in (
        "vocabulary", "word choice", "collocation", "lexical", "precision",
        "repetition",
    )):
        return "vocabulary"
    if any(token in value for token in (
        "coherence", "organization", "organisation", "linking", "transition",
        "paragraph", "logic", "flow",
    )):
        return "coherence"
    if any(token in value for token in (
        "task", "relevance", "support", "development", "detail",
    )):
        return "task_achievement"
    if any(token in value for token in (
        "natural", "awkward", "idiomatic", "tone", "register",
    )):
        return "naturalness"
    return "expression"


def _practice_context(row: sqlite3.Row) -> dict[str, Any] | None:
    module_data = _safe_json(row["module_data_json"], {})
    if not isinstance(module_data, dict):
        return None
    context = module_data.get("practice")
    return context if isinstance(context, dict) else None


def _category_key(value: Any) -> str:
    raw = str(value or "").casefold().replace("-", "_").replace(" ", "_")
    return "_".join(part for part in raw.split("_") if part)


def _matching_errors(
    row: sqlite3.Row,
    focus_category: str,
    focus_family: str,
) -> list[dict[str, Any]]:
    items = [
        item
        for item in _safe_json(row["errors_json"], [])
        if isinstance(item, dict)
    ]
    focus_key = _category_key(focus_category)

    broad = {
        "grammar", "vocabulary", "coherence",
        "task_achievement", "naturalness", "expression",
    }
    if focus_key in broad:
        return [
            item for item in items
            if _family(item.get("category")) == focus_family
        ]

    exactish = []
    for item in items:
        item_key = _category_key(item.get("category"))
        if not item_key:
            continue
        if (
            item_key == focus_key
            or item_key.startswith(focus_key + "_")
            or focus_key.startswith(item_key + "_")
        ):
            exactish.append(item)
    return exactish


def _matching_strengths(row: sqlite3.Row, focus_family: str) -> list[dict[str, Any]]:
    output = []
    for item in _safe_json(row["strength_evidence_json"], []):
        if not isinstance(item, dict):
            continue
        # Phase 4 strength evidence categories are stable rubric dimensions.
        family = str(item.get("category") or "")
        if family == focus_family or _family(family) == focus_family:
            output.append(item)
    return output


def _previous_comparable(
    conn: sqlite3.Connection,
    row: sqlite3.Row,
    focus_family: str,
) -> sqlite3.Row | None:
    series_id = int(row["series_id"] or row["id"])
    revision_no = int(row["revision_no"] or 1)
    if revision_no <= 1:
        return None

    candidates = conn.execute(
        """
        SELECT id, series_id, revision_no, created_at, overall,
               errors_json, strength_evidence_json, module_data_json
        FROM essays
        WHERE series_id = ? AND revision_no < ?
        ORDER BY revision_no DESC
        """,
        (series_id, revision_no),
    ).fetchall()

    for candidate in candidates:
        context = _practice_context(candidate)
        if not context:
            continue
        if str(context.get("focus_family") or "") == focus_family:
            return candidate
    return None


def derive_practice_outcome(
    conn: sqlite3.Connection,
    row: sqlite3.Row,
) -> dict[str, Any] | None:
    context = _practice_context(row)
    if not context:
        return None

    focus_family = str(context.get("focus_family") or "expression")
    intent = str(context.get("intent") or "baseline")
    focus_category = str(context.get("focus_category") or "expression")
    errors = _matching_errors(row, focus_category, focus_family)
    strengths = _matching_strengths(row, focus_family)
    previous = _previous_comparable(conn, row, focus_family)
    previous_errors = _matching_errors(previous, focus_category, focus_family) if previous else []

    issue_count = len(errors)
    previous_issue_count = len(previous_errors) if previous else None
    strength_count = len(strengths)

    if intent == "transfer":
        if strength_count > 0 and issue_count == 0:
            status = "transferred"
        elif issue_count > 0:
            status = "needs_attention"
        else:
            status = "needs_more_evidence"
    elif previous is not None:
        if issue_count < len(previous_errors):
            status = "improved"
        elif issue_count > len(previous_errors):
            status = "needs_attention"
        elif issue_count == 0 and strength_count > 0:
            status = "held"
        elif issue_count == 0:
            status = "not_observed"
        else:
            status = "still_working"
    else:
        if issue_count == 0 and strength_count > 0:
            status = "held"
        elif issue_count == 0:
            status = "not_observed"
        else:
            status = "still_working"

    error_fragments = [
        str(item.get("fragment") or "")[:260]
        for item in errors[:3]
        if str(item.get("fragment") or "").strip()
    ]
    strength_fragments = [
        str(item.get("fragment") or "")[:260]
        for item in strengths[:3]
        if str(item.get("fragment") or "").strip()
    ]

    return {
        "essay_id": int(row["id"]),
        "series_id": int(row["series_id"] or row["id"]),
        "revision_no": int(row["revision_no"] or 1),
        "created_at": str(row["created_at"]),
        "overall": float(row["overall"]),
        "status": status,
        "intent": intent,
        "focus_family": focus_family,
        "focus_category": str(context.get("focus_category") or "expression"),
        "focus_label": str(context.get("focus_label") or "Expression"),
        "issue_count": issue_count,
        "previous_issue_count": previous_issue_count,
        "strength_count": strength_count,
        "error_evidence": error_fragments,
        "strength_evidence": strength_fragments,
        "practice": context,
    }


def get_practice_outcome(essay_id: int) -> dict[str, Any]:
    with _db() as conn:
        row = conn.execute(
            """
            SELECT id, series_id, revision_no, created_at, overall,
                   errors_json, strength_evidence_json, module_data_json
            FROM essays
            WHERE id = ?
            """,
            (essay_id,),
        ).fetchone()
        if not row:
            return {"found": False, "outcome": None}

        outcome = derive_practice_outcome(conn, row)
        return {"found": outcome is not None, "outcome": outcome}


def list_practice_outcomes(limit: int = 20) -> dict[str, Any]:
    limit = min(max(int(limit or 20), 1), 100)
    with _db() as conn:
        rows = conn.execute(
            """
            SELECT id, series_id, revision_no, created_at, overall,
                   errors_json, strength_evidence_json, module_data_json
            FROM essays
            WHERE module_data_json IS NOT NULL
              AND module_data_json != ''
              AND module_data_json != '{}'
            ORDER BY id DESC
            LIMIT ?
            """,
            (max(limit * 3, 30),),
        ).fetchall()

        outcomes: list[dict[str, Any]] = []
        for row in rows:
            outcome = derive_practice_outcome(conn, row)
            if outcome:
                outcomes.append(outcome)
            if len(outcomes) >= limit:
                break

    return {
        "items": outcomes,
        "latest": outcomes[0] if outcomes else None,
    }
