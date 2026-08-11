import sqlite3

from writing_coach.persistence.specialized_repository import SQLiteSpecializedLearningRepository

from writing_coach.becoming_library import (
    LibraryVocabularyIn,
    VocabularyReviewIn,
    configure_becoming_library,
    delete_library_vocabulary,
    ensure_becoming_library_schema,
    list_library_vocabulary,
    review_library_vocabulary,
    save_library_vocabulary,
)


def main() -> None:
    conn = sqlite3.connect(":memory:")
    conn.row_factory = sqlite3.Row
    conn.execute(
        """
        CREATE TABLE saved_words(
            word TEXT PRIMARY KEY,
            phonetic TEXT NOT NULL DEFAULT '',
            part_of_speech TEXT NOT NULL DEFAULT '',
            definition TEXT NOT NULL DEFAULT '',
            added_at TEXT NOT NULL,
            translation_vi TEXT NOT NULL DEFAULT ''
        )
        """
    )
    configure_becoming_library(SQLiteSpecializedLearningRepository(lambda: conn))
    ensure_becoming_library_schema(conn)

    saved = save_library_vocabulary(
        LibraryVocabularyIn(
            word="take responsibility",
            part_of_speech="phrase",
            definition="accept responsibility for something",
            source_essay_id=8,
            source_fragment="take the responsibility",
            source_kind="feedback",
            focus_note="Prefer the natural collocation.",
        )
    )
    assert saved["saved"] is True
    assert saved["item"]["due"] is True
    assert saved["item"]["stage_label"] == "New"

    got = review_library_vocabulary(
        "take responsibility",
        VocabularyReviewIn(result="got_it"),
    )
    assert got["found"] is True
    assert got["item"]["review_stage"] == 1
    assert got["item"]["stage_label"] == "Learning"
    assert got["item"]["due"] is False

    again = review_library_vocabulary(
        "take responsibility",
        VocabularyReviewIn(result="again"),
    )
    assert again["item"]["review_stage"] == 0
    assert again["item"]["lapse_count"] == 1

    listing = list_library_vocabulary()
    assert listing["summary"]["total"] == 1

    deleted = delete_library_vocabulary("take responsibility")
    assert deleted["deleted"] is True
    assert list_library_vocabulary()["summary"]["total"] == 0

    print("BECOMING Phase 7 vocabulary-library self-test OK")


if __name__ == "__main__":
    main()
