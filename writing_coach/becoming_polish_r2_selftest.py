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

    # Simulate the passing schema-v10 learner profile: native_language exists,
    # theme_preset does not yet exist.
    conn.execute(
        """
        CREATE TABLE learner_profile(
            id INTEGER PRIMARY KEY CHECK (id = 1),
            goal TEXT NOT NULL DEFAULT 'everyday',
            style TEXT NOT NULL DEFAULT 'guided',
            pinyin TEXT NOT NULL DEFAULT 'auto',
            native_language TEXT NOT NULL DEFAULT 'vi',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
        """
    )
    conn.execute(
        """
        INSERT INTO learner_profile(
            id,goal,style,pinyin,native_language,created_at,updated_at
        ) VALUES(
            1,'work','deep','auto','zh',
            '2026-08-10T08:00:00+07:00','2026-08-10T08:00:00+07:00'
        )
        """
    )
    conn.commit()

    repository = SQLiteSpecializedLearningRepository(lambda: conn)
    repository.initialize()
    row = conn.execute(
        """
        SELECT goal,style,pinyin,native_language,theme_preset,created_at
        FROM learner_profile WHERE id=1
        """
    ).fetchone()
    assert row is not None
    assert row["goal"] == "work"
    assert row["style"] == "deep"
    assert row["pinyin"] == "auto"
    assert row["native_language"] == "zh"
    assert row["theme_preset"] == "editorial"
    assert row["created_at"] == "2026-08-10T08:00:00+07:00"

    repository.initialize()
    count = conn.execute(
        """
        SELECT COUNT(*) AS c
        FROM pragma_table_info('learner_profile')
        WHERE name='theme_preset'
        """
    ).fetchone()["c"]
    assert count == 1

    configure_becoming_memory(repository)
    saved = put_learner_profile(
        LearnerProfileIn(
            goal="work",
            style="deep",
            pinyin="on",
            native_language="zh",
            theme_preset="blueprint",
        )
    )
    assert saved["theme_preset"] == "blueprint"
    fetched = get_learner_profile()
    assert fetched["theme_preset"] == "blueprint"
    assert fetched["native_language"] == "zh"
    assert fetched["goal"] == "work"

    print("BECOMING v2.7.2 theme-preset migration self-test OK")


if __name__ == "__main__":
    main()
