import sqlite3

from writing_coach.persistence.specialized_repository import SQLiteSpecializedLearningRepository

from writing_coach.becoming_reading import (
    ReadingAnswerIn,
    ReadingGenerateIn,
    configure_becoming_reading,
    create_reading_session,
    get_reading_session,
    list_reading_sessions,
    submit_reading_answers,
)


class Result:
    def __init__(self, data):
        self.data = data


def fake_generate(**kwargs):
    passage = (
        "A small team changed its weekly meeting after noticing that most updates "
        "could be read before the call. The manager now sends a short written summary "
        "in advance. During the meeting, the group discusses only decisions that need "
        "several viewpoints. The change did not remove meetings completely, but it gave "
        "people more uninterrupted time for focused work."
    )
    return Result(
        {
            "title": "A Shorter Weekly Meeting",
            "passage": passage,
            "questions": [
                {
                    "question": "Why did the team change its meeting?",
                    "options": [
                        "Most updates could be read first.",
                        "Nobody worked there anymore.",
                        "The office closed.",
                        "The manager wanted longer calls.",
                    ],
                    "correct_index": 0,
                    "explanation_vi": "Phần lớn cập nhật có thể đọc trước.",
                    "evidence_fragment": "most updates could be read before the call",
                },
                {
                    "question": "What does the manager send in advance?",
                    "options": [
                        "A video",
                        "A short written summary",
                        "A contract",
                        "A calendar",
                    ],
                    "correct_index": 1,
                    "explanation_vi": "Người quản lý gửi bản tóm tắt ngắn.",
                    "evidence_fragment": "The manager now sends a short written summary in advance.",
                },
                {
                    "question": "What is discussed during the meeting?",
                    "options": [
                        "Every small update",
                        "Only personal plans",
                        "Decisions needing several viewpoints",
                        "Lunch choices",
                    ],
                    "correct_index": 2,
                    "explanation_vi": "Cuộc họp tập trung vào quyết định cần nhiều góc nhìn.",
                    "evidence_fragment": "the group discusses only decisions that need several viewpoints",
                },
                {
                    "question": "What benefit did the change create?",
                    "options": [
                        "More uninterrupted focus time",
                        "More meetings",
                        "No written communication",
                        "Longer calls",
                    ],
                    "correct_index": 0,
                    "explanation_vi": "Thay đổi tạo thêm thời gian làm việc tập trung.",
                    "evidence_fragment": "it gave people more uninterrupted time for focused work",
                },
            ],
        }
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
    conn.execute(
        """
        CREATE TABLE vocabulary_learning(
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
    conn.execute(
        "INSERT INTO saved_words VALUES(?,?,?,?,?,?)",
        (
            "focused work",
            "",
            "phrase",
            "work without distraction",
            "2026-08-10T07:00:00+07:00",
            "công việc tập trung",
        ),
    )
    conn.execute(
        "INSERT INTO vocabulary_learning(word,review_stage,next_review_at,updated_at) VALUES(?,?,?,?)",
        ("focused work", 1, "2026-08-10T06:00:00+07:00", "2026-08-10T07:00:00+07:00"),
    )
    conn.commit()

    repository = SQLiteSpecializedLearningRepository(lambda: conn)
    configure_becoming_reading(repository, fake_generate)
    repository.initialize()

    session = create_reading_session(
        ReadingGenerateIn(
            topic="work",
            target_level="B2",
            recycle_library=True,
        ),
        language_code="en",
        target_level="B2",
        learner_profile={"goal": "work"},
    )
    assert session["id"] == 1
    assert session["generation_mode"] == "generated"
    assert session["recycled_words"] == ["focused work"]

    # Quiz integrity: correct answers are not exposed before submission.
    assert "correct_index" not in session["questions"][0]
    assert "explanation_vi" not in session["questions"][0]

    answer = submit_reading_answers(
        1,
        ReadingAnswerIn(answers=[0, 1, 2, 3]),
    )
    assert answer["found"] is True
    assert answer["valid"] is True
    assert answer["correct_count"] == 3
    assert answer["total"] == 4
    assert answer["claim"] == "comprehension_check_only"
    assert answer["results"][0]["evidence_fragment"] in session["passage"]

    invalid = submit_reading_answers(
        1,
        ReadingAnswerIn(answers=[0, 1, 2, 4]),
    )
    assert invalid["valid"] is False

    configure_becoming_reading(
        repository,
        lambda **kwargs: (_ for _ in ()).throw(RuntimeError("offline")),
    )
    fallback = create_reading_session(
        ReadingGenerateIn(
            topic="daily_life",
            target_level="B2",
            recycle_library=False,
        ),
        language_code="en",
        target_level="B2",
        learner_profile={"goal": "everyday"},
    )
    assert fallback["generation_mode"] == "built-in"
    assert "correct_index" not in fallback["questions"][0]
    assert fallback["language_code"] == "en"

    # The same persisted contract is language-scoped; Chinese gets its own
    # passage/questions and keeps evidence grounded in that passage.
    zh_fallback = create_reading_session(
        ReadingGenerateIn(
            topic="daily_life",
            target_level="HSK3",
            recycle_library=False,
        ),
        language_code="zh",
        target_level="HSK3",
        learner_profile={"goal": "everyday"},
    )
    assert zh_fallback["id"] == 3
    assert zh_fallback["language_code"] == "zh"
    assert "correct_index" not in zh_fallback["questions"][0]
    assert zh_fallback["questions"][0]["question"]
    zh_answer = submit_reading_answers(3, ReadingAnswerIn(answers=[1, 2, 0, 2]))
    assert zh_answer["valid"] is True
    assert zh_answer["results"][0]["evidence_fragment"] in zh_fallback["passage"]

    fetched = get_reading_session(1)
    assert fetched["found"] is True
    assert fetched["session"]["latest_attempt"]["correct_count"] == 3

    listing = list_reading_sessions(5)
    assert len(listing["items"]) == 3
    generated_item = next(item for item in listing["items"] if item["id"] == 1)
    assert generated_item["latest_attempt"]["total"] == 4

    print("BECOMING Phase 8 reading-studio self-test OK")


if __name__ == "__main__":
    main()
