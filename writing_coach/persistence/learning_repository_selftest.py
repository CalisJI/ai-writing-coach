from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
from tempfile import TemporaryDirectory

from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from writing_coach.persistence.ids import stable_uuid
from writing_coach.persistence.learning_repository import PostgresLearningRepository, SQLiteLearningRepository
from writing_coach.persistence.models import Base, User


def _essay_values(*, parent_id=None, series_id=None, revision_no=1, overall=75.0):
    now = datetime.now(timezone.utc).isoformat()
    return {
        "created_at": now,
        "prompt": "Write about learning.",
        "text": "I learn English every day because practice helps me improve.",
        "word_count": 11,
        "target_cefr": "B2",
        "grammar": 76.0,
        "vocabulary": 74.0,
        "coherence": 75.0,
        "task_achievement": 77.0,
        "naturalness": 73.0,
        "overall": overall,
        "cefr_estimate": "B2",
        "evaluator": "selftest",
        "summary_vi": "Ổn",
        "strengths_json": '["clear"]',
        "strength_evidence_json": '[]',
        "priorities_json": '["detail"]',
        "errors_json": '[]',
        "series_id": series_id,
        "revision_no": revision_no,
        "parent_id": parent_id,
        "practice_context": {"focus_family": "grammar"},
    }


def _exercise(repo) -> None:
    one = repo.create_essay(_essay_values())
    assert one == {"id": 1, "series_id": 1, "revision_no": 1}
    row = repo.get_essay(1)
    assert row and row["series_id"] == 1 and row["revision_no"] == 1
    assert repo.next_revision_no(1) == 2

    two = repo.create_essay(_essay_values(parent_id=1, series_id=1, revision_no=2, overall=81.0))
    assert two["id"] == 2 and two["series_id"] == 1 and two["revision_no"] == 2
    assert len(repo.list_series_revisions(1)) == 2
    prev = repo.previous_revision(1, 2)
    assert prev and prev["id"] == 1
    latest = repo.list_latest_series()
    assert len(latest) == 1 and latest[0]["id"] == 2

    now = datetime.now(timezone.utc).isoformat()
    repo.set_grammar_completed("g1", now)
    assert repo.grammar_completed("g1")
    assert repo.completed_grammar_ids() == {"g1"}
    assert repo.unset_grammar_completed("g1")
    assert not repo.grammar_completed("g1")

    repo.upsert_saved_word({
        "word": "Improve", "phonetic": "", "part_of_speech": "verb",
        "definition": "make better", "added_at": now, "translation_vi": "cải thiện",
    })
    words = repo.list_saved_words()
    assert len(words) == 1 and words[0]["word"] == "Improve"
    assert repo.delete_saved_word("improve")
    assert repo.list_saved_words() == []

    assert repo.delete_series_for_essay(2)
    assert repo.list_essays(0) == []


def main() -> None:
    with TemporaryDirectory() as tmp:
        path = Path(tmp) / "writing.db"
        sqlite_repo = SQLiteLearningRepository(lambda: path)
        sqlite_repo.initialize(schema_version=11)
        _exercise(sqlite_repo)

    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    now = datetime.now(timezone.utc)
    with Session(engine) as session, session.begin():
        session.add(User(
            id=stable_uuid("user", "legacy"), user_key="legacy", email="", name="Legacy",
            picture="", role="user", created_at=now, last_login=None,
        ))
    pg_repo = PostgresLearningRepository(
        engine,
        user_key_provider=lambda: "legacy",
        language_provider=lambda: "en",
    )
    _exercise(pg_repo)

    print("BECOMING learning core repository self-test OK")
    print("SQLite core contract: PASS")
    print("SQLAlchemy/PostgreSQL core contract: PASS")
    print("Runtime cutover: NOT ENABLED")


if __name__ == "__main__":
    main()
