from __future__ import annotations

import json
import sqlite3
from pathlib import Path

from sqlalchemy import create_engine

from writing_coach.persistence.importer import discover_sources, import_to_engine, source_counts
from writing_coach.persistence.models import Base
from writing_coach.persistence.product_repository import PostgresProductRepository
from writing_coach.persistence.verification import verify_shadow


def _learning_db(path: Path):
    path.parent.mkdir(parents=True, exist_ok=True)
    conn=sqlite3.connect(path)
    conn.executescript('''
    CREATE TABLE essays(
      id INTEGER PRIMARY KEY, created_at TEXT, prompt TEXT, text TEXT, word_count INTEGER,
      target_cefr TEXT, grammar REAL, vocabulary REAL, coherence REAL,
      task_achievement REAL, naturalness REAL, overall REAL, cefr_estimate TEXT,
      evaluator TEXT, summary_vi TEXT, strengths_json TEXT, priorities_json TEXT,
      errors_json TEXT, series_id INTEGER, revision_no INTEGER, parent_id INTEGER,
      language_code TEXT, target_level TEXT, level_estimate TEXT,
      module_data_json TEXT, strength_evidence_json TEXT
    );
    CREATE TABLE saved_words(word TEXT PRIMARY KEY, phonetic TEXT, part_of_speech TEXT,
      definition TEXT, added_at TEXT, translation_vi TEXT);
    CREATE TABLE vocabulary_learning(word TEXT PRIMARY KEY, source_essay_id INTEGER,
      source_fragment TEXT, source_kind TEXT, focus_note TEXT, review_stage INTEGER,
      successful_recalls INTEGER, lapse_count INTEGER, last_reviewed_at TEXT,
      next_review_at TEXT, updated_at TEXT);
    CREATE TABLE grammar_progress(lesson_id TEXT PRIMARY KEY, completed_at TEXT);
    CREATE TABLE learner_profile(id INTEGER PRIMARY KEY, goal TEXT, style TEXT, pinyin TEXT,
      native_language TEXT, theme_preset TEXT, created_at TEXT, updated_at TEXT);
    CREATE TABLE reading_sessions(id INTEGER PRIMARY KEY, created_at TEXT, language_code TEXT,
      target_level TEXT, topic TEXT, learner_goal TEXT, title TEXT, passage TEXT,
      questions_json TEXT, recycled_words_json TEXT, generation_mode TEXT);
    CREATE TABLE reading_attempts(id INTEGER PRIMARY KEY, session_id INTEGER, created_at TEXT,
      answers_json TEXT, correct_count INTEGER, total INTEGER);
    ''')
    conn.execute("INSERT INTO learner_profile VALUES(1,'work','guided','auto','vi','editorial','2026-01-01T00:00:00+00:00','2026-01-01T00:00:00+00:00')")
    conn.execute("INSERT INTO essays VALUES(1,'2026-01-01T00:00:00+00:00','p','hello world',2,'B2',80,81,82,83,84,82,'B2','test','ok','[]','[]',?,1,1,NULL,'en','B2','B2','{}','[]')", (json.dumps([{'category':'grammar','fragment':'hello','suggestion':'Hello'}]),))
    conn.execute("INSERT INTO saved_words VALUES('hello','','noun','greeting','2026-01-01T00:00:00+00:00','xin chao')")
    conn.execute("INSERT INTO vocabulary_learning VALUES('hello',1,'hello','feedback','',1,2,0,'','2026-01-02T00:00:00+00:00','2026-01-01T00:00:00+00:00')")
    conn.execute("INSERT INTO grammar_progress VALUES('g1','2026-01-01T00:00:00+00:00')")
    conn.execute("INSERT INTO reading_sessions VALUES(1,'2026-01-01T00:00:00+00:00','en','B2','work','','t','passage','[]','[]','practice')")
    conn.execute("INSERT INTO reading_attempts VALUES(1,1,'2026-01-01T00:00:00+00:00','[0]',1,1)")
    conn.commit(); conn.close()


def test_shadow_import_is_idempotent_and_verified(tmp_path):
    data=tmp_path/'data'
    _learning_db(data/'writing.db')
    discovery=discover_sources(data)
    assert source_counts(discovery).essays == 1

    engine=create_engine('sqlite+pysqlite:///:memory:', future=True)
    Base.metadata.create_all(engine)
    first=import_to_engine(engine,discovery)
    second=import_to_engine(engine,discovery)
    assert first.as_dict() == second.as_dict()
    result=verify_shadow(engine,discovery)
    assert result.ok, result.mismatches
    assert result.target['essays'] == 1
    assert result.target['writing_errors'] == 1


def test_postgres_product_repository_matches_contract_on_test_engine():
    engine=create_engine('sqlite+pysqlite:///:memory:', future=True)
    Base.metadata.create_all(engine)
    repo=PostgresProductRepository(engine=engine)
    repo.record_usage(user_key='u1',feature='writing.evaluate',amount=2,request_id='r1')
    assert repo.monthly_usage(user_key='u1',feature='writing.evaluate') == 2
    assert repo.get_subscription('u1') is None
