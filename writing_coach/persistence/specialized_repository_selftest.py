from __future__ import annotations
import json, sqlite3
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from writing_coach.persistence.ids import stable_uuid
from writing_coach.persistence.models import Base, User
from writing_coach.persistence.specialized_repository import SQLiteSpecializedLearningRepository, PostgresSpecializedLearningRepository
from datetime import datetime, timezone

def sqlite_repo():
    c=sqlite3.connect(':memory:'); c.row_factory=sqlite3.Row
    c.executescript('''
    CREATE TABLE learner_profile(id INTEGER PRIMARY KEY,goal TEXT,style TEXT,pinyin TEXT,native_language TEXT,theme_preset TEXT,created_at TEXT,updated_at TEXT);
    CREATE TABLE essays(id INTEGER PRIMARY KEY,series_id INTEGER,revision_no INTEGER,created_at TEXT,overall REAL,errors_json TEXT,strengths_json TEXT,strength_evidence_json TEXT,module_data_json TEXT,text TEXT,language_code TEXT);
    CREATE TABLE saved_words(word TEXT PRIMARY KEY,phonetic TEXT,part_of_speech TEXT,definition TEXT,added_at TEXT,translation_vi TEXT);
    CREATE TABLE vocabulary_learning(word TEXT PRIMARY KEY,source_essay_id INTEGER,source_fragment TEXT,source_kind TEXT,focus_note TEXT,review_stage INTEGER,successful_recalls INTEGER,lapse_count INTEGER,last_reviewed_at TEXT,next_review_at TEXT,updated_at TEXT);
    CREATE TABLE reading_sessions(id INTEGER PRIMARY KEY AUTOINCREMENT,created_at TEXT,language_code TEXT,target_level TEXT,topic TEXT,learner_goal TEXT,title TEXT,passage TEXT,questions_json TEXT,recycled_words_json TEXT,generation_mode TEXT);
    CREATE TABLE reading_attempts(id INTEGER PRIMARY KEY AUTOINCREMENT,session_id INTEGER,created_at TEXT,answers_json TEXT,correct_count INTEGER,total INTEGER);
    ''')
    return c, SQLiteSpecializedLearningRepository(lambda:c)

def main():
    c,sr=sqlite_repo(); now='2026-08-11T10:00:00+00:00'
    sr.upsert_profile_record({'goal':'work','style':'guided','pinyin':'auto','native_language':'vi','theme_preset':'editorial','created_at':now,'updated_at':now})
    assert sr.get_profile_record()['goal']=='work'
    item=sr.save_library_record({'word':'focused work','phonetic':'','part_of_speech':'phrase','definition':'x','translation_vi':'y','source_essay_id':None,'source_fragment':'','source_kind':'manual','focus_note':'','now':now})
    assert item['review_stage']==0
    session=sr.create_reading_session_record({'created_at':now,'language_code':'en','target_level':'B2','topic':'work','learner_goal':'work','title':'T','passage':'P','questions':[],'recycled_words':['focused work'],'generation_mode':'built-in'})
    sr.create_reading_attempt_record(session['id'],{'created_at':now,'answers':[],'correct_count':0,'total':0})
    assert sr.latest_reading_attempt(session['id'])['total']==0

    # Real-data regression: older language DBs can contain saved_words but have
    # never initialized Active Recall / Reading optional tables.
    legacy=sqlite3.connect(':memory:'); legacy.row_factory=sqlite3.Row
    legacy.executescript("""
    CREATE TABLE saved_words(
        word TEXT PRIMARY KEY,
        phonetic TEXT,
        part_of_speech TEXT,
        definition TEXT,
        added_at TEXT,
        translation_vi TEXT
    );
    INSERT INTO saved_words VALUES(
        'legacy word','','noun','definition',
        '2026-08-01T00:00:00+00:00','từ cũ'
    );
    """)
    legacy_repo=SQLiteSpecializedLearningRepository(lambda:legacy)
    legacy_items=legacy_repo.list_library_records()
    assert len(legacy_items)==1
    assert legacy_items[0]['word']=='legacy word'
    assert legacy_items[0]['review_stage']==0
    assert legacy_items[0]['successful_recalls']==0
    assert legacy_items[0]['source_kind']=='manual'
    assert legacy_repo.select_library_terms(3)==['legacy word']
    assert legacy_repo.list_reading_session_records(10)==[]

    empty=sqlite3.connect(':memory:'); empty.row_factory=sqlite3.Row
    empty_repo=SQLiteSpecializedLearningRepository(lambda:empty)
    assert empty_repo.list_library_records()==[]
    assert empty_repo.select_library_terms(3)==[]
    assert empty_repo.list_reading_session_records(10)==[]

    engine=create_engine('sqlite+pysqlite:///:memory:'); Base.metadata.create_all(engine); uid=stable_uuid('user','u')
    with Session(engine) as db, db.begin(): db.add(User(id=uid,user_key='u',email='',name='',picture='',role='user',created_at=datetime.now(timezone.utc),last_login=None))
    pr=PostgresSpecializedLearningRepository(engine,user_key_provider=lambda:'u',language_provider=lambda:'en')
    pr.upsert_profile_record({'goal':'work','style':'guided','pinyin':'auto','native_language':'vi','theme_preset':'editorial','created_at':now,'updated_at':now})
    assert pr.get_profile_record()['goal']=='work'
    pitem=pr.save_library_record({'word':'focused work','phonetic':'','part_of_speech':'phrase','definition':'x','translation_vi':'y','source_essay_id':None,'source_fragment':'','source_kind':'manual','focus_note':'','now':now})
    assert pitem['review_stage']==0
    ps=pr.create_reading_session_record({'created_at':now,'language_code':'en','target_level':'B2','topic':'work','learner_goal':'work','title':'T','passage':'P','questions':[],'recycled_words':['focused work'],'generation_mode':'built-in'})
    pr.create_reading_attempt_record(ps['id'],{'created_at':now,'answers':[],'correct_count':0,'total':0})
    assert pr.latest_reading_attempt(ps['id'])['total']==0
    print('BECOMING specialized persistence repository self-test OK')
if __name__=='__main__': main()
