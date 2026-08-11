from __future__ import annotations

import sqlite3
from datetime import datetime, timedelta
from typing import Any, Callable

from pydantic import BaseModel, Field


_db_factory: Callable[[], sqlite3.Connection] | None = None

STAGE_LABELS = {
    0: "New",
    1: "Learning",
    2: "Reinforcing",
    3: "Available",
    4: "Available",
}


class LibraryVocabularyIn(BaseModel):
    word: str = Field(min_length=1, max_length=180)
    phonetic: str = Field(default="", max_length=180)
    part_of_speech: str = Field(default="", max_length=120)
    definition: str = Field(default="", max_length=2400)
    translation_vi: str = Field(default="", max_length=2400)
    source_essay_id: int | None = Field(default=None, ge=1)
    source_fragment: str = Field(default="", max_length=1200)
    source_kind: str = Field(
        default="manual",
        pattern=r"^(manual|dictionary|feedback|strength)$",
    )
    focus_note: str = Field(default="", max_length=2400)


class VocabularyReviewIn(BaseModel):
    result: str = Field(pattern=r"^(again|got_it)$")


def configure_becoming_library(db_factory: Callable[[], sqlite3.Connection]) -> None:
    global _db_factory
    _db_factory = db_factory


def _db() -> sqlite3.Connection:
    if _db_factory is None:
        raise RuntimeError("BECOMING library database factory is not installed")
    return _db_factory()


def _now() -> datetime:
    return datetime.now().astimezone()


def _iso(value: datetime) -> str:
    return value.isoformat(timespec="seconds")


def _clean_term(value: str) -> str:
    return " ".join(str(value or "").strip().split())


def ensure_becoming_library_schema(conn: sqlite3.Connection) -> None:
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS vocabulary_learning (
            word TEXT PRIMARY KEY COLLATE NOCASE,
            source_essay_id INTEGER,
            source_fragment TEXT NOT NULL DEFAULT '',
            source_kind TEXT NOT NULL DEFAULT 'manual',
            focus_note TEXT NOT NULL DEFAULT '',
            review_stage INTEGER NOT NULL DEFAULT 0,
            successful_recalls INTEGER NOT NULL DEFAULT 0,
            lapse_count INTEGER NOT NULL DEFAULT 0,
            last_reviewed_at TEXT NOT NULL DEFAULT '',
            next_review_at TEXT NOT NULL DEFAULT '',
            updated_at TEXT NOT NULL
        )
        """
    )

    # Existing legacy saved words become reviewable without rewriting their content.
    # They start as "New" and are due now/at their original added time.
    conn.execute(
        """
        INSERT OR IGNORE INTO vocabulary_learning(
            word, source_kind, review_stage, successful_recalls,
            lapse_count, last_reviewed_at, next_review_at, updated_at
        )
        SELECT
            word, 'manual', 0, 0, 0, '',
            COALESCE(NULLIF(added_at, ''), ?),
            COALESCE(NULLIF(added_at, ''), ?)
        FROM saved_words
        """,
        (_iso(_now()), _iso(_now())),
    )
    conn.commit()


def _parse_time(value: str) -> datetime | None:
    try:
        return datetime.fromisoformat(str(value or ""))
    except Exception:
        return None


def _due(value: str) -> bool:
    parsed = _parse_time(value)
    return parsed is None or parsed <= _now()


def _stage_label(stage: int) -> str:
    return STAGE_LABELS.get(max(0, min(4, int(stage or 0))), "New")


def _row_to_item(row: sqlite3.Row) -> dict[str, Any]:
    stage = int(row["review_stage"] or 0)
    return {
        "word": str(row["word"]),
        "phonetic": str(row["phonetic"] or ""),
        "part_of_speech": str(row["part_of_speech"] or ""),
        "definition": str(row["definition"] or ""),
        "translation_vi": str(row["translation_vi"] or ""),
        "added_at": str(row["added_at"] or ""),
        "source_essay_id": row["source_essay_id"],
        "source_fragment": str(row["source_fragment"] or ""),
        "source_kind": str(row["source_kind"] or "manual"),
        "focus_note": str(row["focus_note"] or ""),
        "review_stage": stage,
        "stage_label": _stage_label(stage),
        "successful_recalls": int(row["successful_recalls"] or 0),
        "lapse_count": int(row["lapse_count"] or 0),
        "last_reviewed_at": str(row["last_reviewed_at"] or ""),
        "next_review_at": str(row["next_review_at"] or ""),
        "due": _due(str(row["next_review_at"] or "")),
    }


def list_library_vocabulary() -> dict[str, Any]:
    with _db() as conn:
        ensure_becoming_library_schema(conn)
        rows = conn.execute(
            """
            SELECT
              s.word, s.phonetic, s.part_of_speech, s.definition,
              s.translation_vi, s.added_at,
              v.source_essay_id, v.source_fragment, v.source_kind,
              v.focus_note, v.review_stage, v.successful_recalls,
              v.lapse_count, v.last_reviewed_at, v.next_review_at
            FROM saved_words AS s
            LEFT JOIN vocabulary_learning AS v
              ON lower(v.word) = lower(s.word)
            ORDER BY s.added_at DESC
            """
        ).fetchall()

    items = [_row_to_item(row) for row in rows]
    items.sort(
        key=lambda item: (
            0 if item["due"] else 1,
            item["next_review_at"] or item["added_at"],
            item["word"].casefold(),
        )
    )
    return {
        "items": items,
        "summary": {
            "total": len(items),
            "due": sum(1 for item in items if item["due"]),
            "available": sum(1 for item in items if item["review_stage"] >= 3),
        },
    }


def save_library_vocabulary(payload: LibraryVocabularyIn) -> dict[str, Any]:
    term = _clean_term(payload.word)
    if not term:
        raise ValueError("Vocabulary item cannot be empty.")

    now = _iso(_now())

    with _db() as conn:
        ensure_becoming_library_schema(conn)

        existing = conn.execute(
            "SELECT word FROM saved_words WHERE lower(word) = lower(?) LIMIT 1",
            (term,),
        ).fetchone()
        canonical = str(existing["word"]) if existing else term

        if existing:
            conn.execute(
                """
                UPDATE saved_words
                SET
                  phonetic = CASE WHEN ? != '' THEN ? ELSE phonetic END,
                  part_of_speech = CASE WHEN ? != '' THEN ? ELSE part_of_speech END,
                  definition = CASE WHEN ? != '' THEN ? ELSE definition END,
                  translation_vi = CASE WHEN ? != '' THEN ? ELSE translation_vi END
                WHERE lower(word) = lower(?)
                """,
                (
                    payload.phonetic, payload.phonetic,
                    payload.part_of_speech, payload.part_of_speech,
                    payload.definition, payload.definition,
                    payload.translation_vi, payload.translation_vi,
                    canonical,
                ),
            )
        else:
            conn.execute(
                """
                INSERT INTO saved_words(
                    word, phonetic, part_of_speech, definition,
                    added_at, translation_vi
                )
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    canonical,
                    payload.phonetic,
                    payload.part_of_speech,
                    payload.definition,
                    now,
                    payload.translation_vi,
                ),
            )

        learning = conn.execute(
            "SELECT word FROM vocabulary_learning WHERE lower(word) = lower(?) LIMIT 1",
            (canonical,),
        ).fetchone()

        if learning:
            if existing:
                conn.execute(
                    """
                    UPDATE vocabulary_learning
                    SET
                      source_essay_id = COALESCE(?, source_essay_id),
                      source_fragment = CASE WHEN ? != '' THEN ? ELSE source_fragment END,
                      source_kind = CASE WHEN ? != '' THEN ? ELSE source_kind END,
                      focus_note = CASE WHEN ? != '' THEN ? ELSE focus_note END,
                      updated_at = ?
                    WHERE lower(word) = lower(?)
                    """,
                    (
                        payload.source_essay_id,
                        payload.source_fragment, payload.source_fragment,
                        payload.source_kind, payload.source_kind,
                        payload.focus_note, payload.focus_note,
                        now,
                        canonical,
                    ),
                )
            else:
                # A legacy /api/vocabulary delete can leave only the companion
                # metadata row. Re-adding the term must start a fresh recall lane.
                conn.execute(
                    """
                    UPDATE vocabulary_learning
                    SET
                      word = ?,
                      source_essay_id = ?,
                      source_fragment = ?,
                      source_kind = ?,
                      focus_note = ?,
                      review_stage = 0,
                      successful_recalls = 0,
                      lapse_count = 0,
                      last_reviewed_at = '',
                      next_review_at = ?,
                      updated_at = ?
                    WHERE lower(word) = lower(?)
                    """,
                    (
                        canonical,
                        payload.source_essay_id,
                        payload.source_fragment,
                        payload.source_kind,
                        payload.focus_note,
                        now,
                        now,
                        canonical,
                    ),
                )
        else:
            conn.execute(
                """
                INSERT INTO vocabulary_learning(
                    word, source_essay_id, source_fragment, source_kind,
                    focus_note, review_stage, successful_recalls, lapse_count,
                    last_reviewed_at, next_review_at, updated_at
                )
                VALUES (?, ?, ?, ?, ?, 0, 0, 0, '', ?, ?)
                """,
                (
                    canonical,
                    payload.source_essay_id,
                    payload.source_fragment,
                    payload.source_kind,
                    payload.focus_note,
                    now,
                    now,
                ),
            )

        conn.commit()

        row = conn.execute(
            """
            SELECT
              s.word, s.phonetic, s.part_of_speech, s.definition,
              s.translation_vi, s.added_at,
              v.source_essay_id, v.source_fragment, v.source_kind,
              v.focus_note, v.review_stage, v.successful_recalls,
              v.lapse_count, v.last_reviewed_at, v.next_review_at
            FROM saved_words s
            JOIN vocabulary_learning v
              ON lower(v.word) = lower(s.word)
            WHERE lower(s.word) = lower(?)
            LIMIT 1
            """,
            (canonical,),
        ).fetchone()

    return {"saved": True, "item": _row_to_item(row)}


def review_library_vocabulary(
    word: str,
    payload: VocabularyReviewIn,
) -> dict[str, Any]:
    clean = _clean_term(word)
    now_dt = _now()
    now = _iso(now_dt)

    with _db() as conn:
        ensure_becoming_library_schema(conn)
        row = conn.execute(
            """
            SELECT review_stage, successful_recalls, lapse_count
            FROM vocabulary_learning
            WHERE lower(word) = lower(?)
            LIMIT 1
            """,
            (clean,),
        ).fetchone()
        if not row:
            return {"found": False}

        stage = int(row["review_stage"] or 0)
        success = int(row["successful_recalls"] or 0)
        lapses = int(row["lapse_count"] or 0)

        if payload.result == "got_it":
            next_stage = min(4, stage + 1)
            success += 1
            intervals = {1: 1, 2: 3, 3: 7, 4: 21}
            next_dt = now_dt + timedelta(days=intervals[next_stage])
        else:
            next_stage = max(0, stage - 1)
            lapses += 1
            next_dt = now_dt + timedelta(minutes=10)

        conn.execute(
            """
            UPDATE vocabulary_learning
            SET
              review_stage = ?,
              successful_recalls = ?,
              lapse_count = ?,
              last_reviewed_at = ?,
              next_review_at = ?,
              updated_at = ?
            WHERE lower(word) = lower(?)
            """,
            (
                next_stage,
                success,
                lapses,
                now,
                _iso(next_dt),
                now,
                clean,
            ),
        )
        conn.commit()

        updated = conn.execute(
            """
            SELECT
              s.word, s.phonetic, s.part_of_speech, s.definition,
              s.translation_vi, s.added_at,
              v.source_essay_id, v.source_fragment, v.source_kind,
              v.focus_note, v.review_stage, v.successful_recalls,
              v.lapse_count, v.last_reviewed_at, v.next_review_at
            FROM saved_words s
            JOIN vocabulary_learning v
              ON lower(v.word) = lower(s.word)
            WHERE lower(s.word) = lower(?)
            LIMIT 1
            """,
            (clean,),
        ).fetchone()

    return {"found": True, "item": _row_to_item(updated)}


def delete_library_vocabulary(word: str) -> dict[str, Any]:
    clean = _clean_term(word)
    with _db() as conn:
        ensure_becoming_library_schema(conn)
        conn.execute(
            "DELETE FROM vocabulary_learning WHERE lower(word) = lower(?)",
            (clean,),
        )
        cur = conn.execute(
            "DELETE FROM saved_words WHERE lower(word) = lower(?)",
            (clean,),
        )
        conn.commit()
    return {"deleted": cur.rowcount > 0}
