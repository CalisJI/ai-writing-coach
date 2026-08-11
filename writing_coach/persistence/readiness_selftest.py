from __future__ import annotations

import sqlite3
import tempfile
from pathlib import Path

from sqlalchemy import create_engine

from writing_coach.persistence.auth_repository import PostgresAuthRepository, SQLiteAuthRepository
from writing_coach.persistence.importer import discover_sources, import_to_engine
from writing_coach.persistence.models import Base
from writing_coach.persistence.platform_repository import PostgresPlatformRepository, SQLitePlatformRepository
from writing_coach.persistence.read_compare import compare_scoped_reads


def _learning_db(path: Path) -> None:
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
            now, "prompt", "text", 10, "B2", 80, 80, 80, 80, 80, 80,
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


def main() -> None:
    with tempfile.TemporaryDirectory() as raw:
        root = Path(raw)
        admins = {"owner@example.com"}
        info = {"sub": "user-1", "email": "owner@example.com", "name": "Owner", "picture": "p"}

        auth_sqlite = SQLiteAuthRepository(root / "auth.db")
        auth_sqlite.initialize(admins)
        assert auth_sqlite.upsert_user(info, admins)["role"] == "admin"

        platform_sqlite = SQLitePlatformRepository(root / "platform.db")
        platform_sqlite.initialize()
        platform_sqlite.set_ai_selection(provider="ollama", model="qwen", updated_by="admin")
        assert platform_sqlite.get_ai_selection().model == "qwen"

        contract_engine = create_engine("sqlite+pysqlite:///:memory:")
        Base.metadata.create_all(contract_engine)
        auth_pg = PostgresAuthRepository(contract_engine)
        assert auth_pg.upsert_user(info, admins)["role"] == "admin"
        platform_pg = PostgresPlatformRepository(contract_engine)
        platform_pg.set_ai_selection(provider="ollama", model="qwen", updated_by="admin")
        assert platform_pg.get_ai_selection().provider == "ollama"

        data = root / "data"
        _learning_db(data / "writing.db")
        _learning_db(data / "languages" / "zh" / "writing.db")
        discovery = discover_sources(data)
        shadow_engine = create_engine("sqlite+pysqlite:///:memory:")
        Base.metadata.create_all(shadow_engine)
        import_to_engine(shadow_engine, discovery)
        report = compare_scoped_reads(shadow_engine, discovery)
        assert report["ok"] is True and report["scope_count"] == 2

    print("BECOMING persistence runtime readiness self-test OK")
    print("Auth repository parity: PASS")
    print("Platform repository parity: PASS")
    print("Scoped user/language shadow read parity: PASS")
    print("Runtime cutover: NOT ENABLED")


if __name__ == "__main__":
    main()
