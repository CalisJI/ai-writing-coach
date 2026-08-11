from __future__ import annotations

import sqlite3

from writing_coach.persistence.specialized_repository import SQLiteSpecializedLearningRepository

from writing_coach.becoming_memory import (
    LearnerProfileIn,
    configure_becoming_memory,
    get_learner_profile,
    put_learner_profile,
)


def main() -> None:
    conn = sqlite3.connect(":memory:")
    conn.row_factory = sqlite3.Row
    conn.execute("CREATE TABLE saved_words(word TEXT PRIMARY KEY, added_at TEXT NOT NULL)")

    # Simulate an existing v9 learner_profile before this polish.
    conn.execute(
        """
        CREATE TABLE learner_profile(
            id INTEGER PRIMARY KEY CHECK (id = 1),
            goal TEXT NOT NULL DEFAULT 'everyday',
            style TEXT NOT NULL DEFAULT 'guided',
            pinyin TEXT NOT NULL DEFAULT 'auto',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
        """
    )
    conn.execute(
        """
        INSERT INTO learner_profile(id,goal,style,pinyin,created_at,updated_at)
        VALUES(1,'work','examples','on','2026-08-01T00:00:00+07:00','2026-08-01T00:00:00+07:00')
        """
    )
    conn.commit()

    repository = SQLiteSpecializedLearningRepository(lambda: conn)
    repository.initialize()
    columns = {
        str(row["name"])
        for row in conn.execute("PRAGMA table_info(learner_profile)").fetchall()
    }
    assert "native_language" in columns
    assert "theme_preset" in columns

    row = conn.execute(
        """
        SELECT goal,style,pinyin,native_language,theme_preset,created_at
        FROM learner_profile WHERE id=1
        """
    ).fetchone()
    assert row is not None
    assert row["goal"] == "work"
    assert row["style"] == "examples"
    assert row["pinyin"] == "on"
    assert row["native_language"] == "vi"
    assert row["theme_preset"] == "editorial"
    assert row["created_at"] == "2026-08-01T00:00:00+07:00"

    # Re-running the migration must be idempotent.
    repository.initialize()
    count = conn.execute(
        """
        SELECT COUNT(*) AS c
        FROM pragma_table_info('learner_profile')
        WHERE name='native_language'
        """
    ).fetchone()["c"]
    assert count == 1

    configure_becoming_memory(repository)
    saved = put_learner_profile(
        LearnerProfileIn(
            goal="work",
            style="examples",
            pinyin="on",
            native_language="en",
            theme_preset="sage",
        )
    )
    assert saved["native_language"] == "en"
    assert saved["theme_preset"] == "sage"
    fetched = get_learner_profile()
    assert fetched["native_language"] == "en"
    assert fetched["theme_preset"] == "sage"
    assert fetched["goal"] == "work"

    print("BECOMING UI/UX polish native-language migration self-test OK")


if __name__ == "__main__":
    main()
