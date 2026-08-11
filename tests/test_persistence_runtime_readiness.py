from __future__ import annotations

import sqlite3
from pathlib import Path

from sqlalchemy import create_engine

from writing_coach.persistence.auth_repository import PostgresAuthRepository, SQLiteAuthRepository
from writing_coach.persistence.importer import discover_sources, import_to_engine
from writing_coach.persistence.models import Base
from writing_coach.persistence.platform_repository import PostgresPlatformRepository, SQLitePlatformRepository
from writing_coach.persistence.read_compare import compare_scoped_reads


def test_auth_repository_contract_sqlite_and_sqlalchemy(tmp_path: Path) -> None:
    info = {"sub": "user-1", "email": "owner@example.com", "name": "Owner", "picture": "p"}
    admins = {"owner@example.com"}

    sqlite_repo = SQLiteAuthRepository(tmp_path / "auth.db")
    sqlite_repo.initialize(admins)
    row = sqlite_repo.upsert_user(info, admins)
    assert row["google_sub"] == "user-1"
    assert row["role"] == "admin"
    assert sqlite_repo.get_user("user-1")["email"] == "owner@example.com"

    engine = create_engine("sqlite+pysqlite:///:memory:")
    Base.metadata.create_all(engine)
    pg_repo = PostgresAuthRepository(engine)
    pg_repo.initialize(admins)
    row = pg_repo.upsert_user(info, admins)
    assert row["google_sub"] == "user-1"
    assert row["role"] == "admin"
    assert pg_repo.get_user("user-1")["email"] == "owner@example.com"


def test_platform_repository_contract_sqlite_and_sqlalchemy(tmp_path: Path) -> None:
    sqlite_repo = SQLitePlatformRepository(tmp_path / "platform.db")
    sqlite_repo.initialize()
    assert sqlite_repo.get_ai_selection() is None
    sqlite_repo.set_ai_selection(provider="ollama", model="qwen", updated_by="admin")
    row = sqlite_repo.get_ai_selection()
    assert row and (row.provider, row.model, row.updated_by) == ("ollama", "qwen", "admin")

    engine = create_engine("sqlite+pysqlite:///:memory:")
    Base.metadata.create_all(engine)
    pg_repo = PostgresPlatformRepository(engine)
    pg_repo.initialize()
    assert pg_repo.get_ai_selection() is None
    pg_repo.set_ai_selection(provider="ollama", model="qwen", updated_by="admin")
    row = pg_repo.get_ai_selection()
    assert row and (row.provider, row.model, row.updated_by) == ("ollama", "qwen", "admin")


def _learning_db(path: Path, language: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(path)
    conn.executescript(
        """
        CREATE TABLE learner_profile(
          id INTEGER PRIMARY KEY, goal TEXT, style TEXT, pinyin TEXT,
          native_language TEXT, theme_preset TEXT, created_at TEXT, updated_at TEXT
        );
        CREATE TABLE essays(
          id INTEGER PRIMARY KEY, created_at TEXT, prompt TEXT, text TEXT, word_count INTEGER,
          target_cefr TEXT, grammar REAL, vocabulary REAL, coherence REAL, task_achievement REAL,
          naturalness REAL, overall REAL, cefr_estimate TEXT, evaluator TEXT, summary_vi TEXT,
          strengths_json TEXT, priorities_json TEXT, errors_json TEXT,
          series_id INTEGER, revision_no INTEGER, parent_id INTEGER,
          language_code TEXT, target_level TEXT, level_estimate TEXT,
          module_data_json TEXT, strength_evidence_json TEXT
        );
        CREATE TABLE saved_words(
          word TEXT PRIMARY KEY, phonetic TEXT, part_of_speech TEXT, definition TEXT,
          added_at TEXT, translation_vi TEXT
        );
        CREATE TABLE grammar_progress(lesson_id TEXT PRIMARY KEY, completed_at TEXT);
        CREATE TABLE reading_sessions(
          id INTEGER PRIMARY KEY, created_at TEXT, language_code TEXT, target_level TEXT,
          topic TEXT, learner_goal TEXT, title TEXT, passage TEXT, questions_json TEXT,
          recycled_words_json TEXT, generation_mode TEXT
        );
        CREATE TABLE reading_attempts(
          id INTEGER PRIMARY KEY, session_id INTEGER, created_at TEXT, answers_json TEXT,
          correct_count INTEGER, total INTEGER
        );
        """
    )
    now = "2026-08-11T00:00:00+00:00"
    conn.execute(
        "INSERT INTO learner_profile VALUES(1,'everyday','guided','auto','vi','editorial',?,?)",
        (now, now),
    )
    # Deliberately stale embedded language metadata: source path is authoritative.
    conn.execute(
        """
        INSERT INTO essays(
          id, created_at, prompt, text, word_count, target_cefr, grammar, vocabulary,
          coherence, task_achievement, naturalness, overall, cefr_estimate, evaluator,
          summary_vi, strengths_json, priorities_json, errors_json, series_id, revision_no,
          parent_id, language_code, target_level, level_estimate, module_data_json,
          strength_evidence_json
        ) VALUES(1,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        """,
        (
            now, "prompt", f"text-{language}", 10, "B2", 80, 80, 80, 80, 80, 80,
            "B2", "test", "ok", "[]", "[]", '[{"category":"grammar"}]',
            1, 1, None, "en", "B2", "B2", "{}", "[]",
        ),
    )
    conn.execute("INSERT INTO saved_words VALUES('Word','','','definition',?,'nghia')", (now,))
    conn.execute("INSERT INTO grammar_progress VALUES('lesson-1',?)", (now,))
    conn.execute(
        "INSERT INTO reading_sessions VALUES(1,?,?,?,?,?,?,?,?,?,?)",
        (now, "en", "B2", "topic", "goal", "title", "passage", "[]", "[]", "practice"),
    )
    conn.execute("INSERT INTO reading_attempts VALUES(1,1,?,'[]',1,1)", (now,))
    conn.commit()
    conn.close()


def test_scoped_shadow_read_parity_keeps_language_isolation(tmp_path: Path) -> None:
    data = tmp_path / "data"
    _learning_db(data / "writing.db", "en")
    _learning_db(data / "languages" / "zh" / "writing.db", "zh")
    discovery = discover_sources(data)

    engine = create_engine("sqlite+pysqlite:///:memory:")
    Base.metadata.create_all(engine)
    import_to_engine(engine, discovery)

    report = compare_scoped_reads(engine, discovery)
    assert report["ok"] is True
    assert report["scope_count"] == 2
    assert {(x["user_key"], x["language_code"]) for x in report["scopes"]} == {
        ("legacy", "en"), ("legacy", "zh")
    }
