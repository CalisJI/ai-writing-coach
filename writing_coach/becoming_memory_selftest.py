from __future__ import annotations

import json
import sqlite3

from writing_coach.becoming_memory import (
    _error_patterns,
    _review_cue_from_outcome,
    _review_cue,
    _revision_wins,
    _strength_patterns,
    configure_becoming_memory,
    get_learning_memory,
    get_review_cue,
)
from writing_coach.persistence.specialized_repository import SQLiteSpecializedLearningRepository


def row(conn: sqlite3.Connection, sql: str, params=()):
    return conn.execute(sql, params).fetchone()


def main() -> None:
    conn = sqlite3.connect(":memory:")
    conn.row_factory = sqlite3.Row
    conn.execute(
        """
        CREATE TABLE essays (
          id INTEGER PRIMARY KEY,
          series_id INTEGER,
          revision_no INTEGER,
          created_at TEXT,
          overall REAL,
          errors_json TEXT,
          strengths_json TEXT,
          strength_evidence_json TEXT
        )
        """
    )
    conn.execute("CREATE TABLE saved_words(word TEXT PRIMARY KEY, added_at TEXT NOT NULL)")
    repository = SQLiteSpecializedLearningRepository(lambda: conn)
    repository.initialize()
    configure_becoming_memory(repository)

    profile_cols = {
        str(r["name"])
        for r in conn.execute("PRAGMA table_info(learner_profile)").fetchall()
    }
    assert {
        "goal", "style", "pinyin", "native_language", "theme_preset", "created_at", "updated_at"
    } <= profile_cols

    rows = [
        (
            1, 1, 1, "2026-08-01T10:00:00+07:00", 60.0,
            json.dumps([{"category": "article", "fragment": "a apple", "suggestion": "an apple"}]),
            "[]",
            json.dumps([{"category": "coherence", "fragment": "I believe this matters.", "explanation_vi": "Ý chính rõ.", "confidence": .9}]),
        ),
        (
            2, 1, 2, "2026-08-02T10:00:00+07:00", 66.0,
            json.dumps([]),
            "[]",
            json.dumps([{"category": "coherence", "fragment": "I think this change helps.", "explanation_vi": "Ý chính rõ.", "confidence": .9}]),
        ),
        (
            3, 3, 1, "2026-08-03T10:00:00+07:00", 68.0,
            json.dumps([{"category": "article", "fragment": "a orange", "suggestion": "an orange"}]),
            "[]",
            json.dumps([{"category": "coherence", "fragment": "My main reason is simple.", "explanation_vi": "Mở ý rõ.", "confidence": .9}]),
        ),
    ]
    conn.executemany(
        """
        INSERT INTO essays(
          id, series_id, revision_no, created_at, overall,
          errors_json, strengths_json, strength_evidence_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        rows,
    )
    conn.commit()

    essay_rows = conn.execute("SELECT * FROM essays ORDER BY id").fetchall()
    patterns = _error_patterns(essay_rows)
    strengths = _strength_patterns(essay_rows, patterns)
    wins = _revision_wins(essay_rows)

    assert patterns and patterns[0]["category"] == "article"
    assert patterns[0]["latest_essay_id"] == 3
    assert patterns[0]["example_essay_id"] == 1
    assert strengths and strengths[0]["category"] == "coherence"
    assert strengths[0]["stage"] in {"Developing", "Stable"}
    assert wins and wins[0]["series_id"] == 1
    assert wins[0]["overall_delta"] == 6.0

    cue = _review_cue(essay_rows, patterns)
    assert cue["available"] is True
    assert cue["source"] == "error_memory"
    assert cue["state"] == "unresolved"
    assert cue["status"] == "watch"
    assert cue["evidence"] == "a apple"
    assert cue["essay_id"] == 1

    memory = get_learning_memory()
    assert memory["review_cue"]["evidence"] == "a apple"
    assert get_review_cue(essay_id=1)["essay_id"] == 1
    assert get_review_cue(essay_id=3)["available"] is False
    assert _review_cue_from_outcome({
        "status": "needs_attention", "essay_id": 3, "error_evidence": "raw audio"
    }) is None

    empty = _review_cue([], [])
    assert empty["available"] is False and empty["state"] == "none"

    print("BECOMING Phase 4 learning-memory self-test OK")


if __name__ == "__main__":
    main()
