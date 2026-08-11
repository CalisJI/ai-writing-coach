from __future__ import annotations
import json, sqlite3
from pathlib import Path
from tempfile import TemporaryDirectory
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from writing_coach.persistence.ids import stable_uuid
from writing_coach.persistence.models import Base, User
from writing_coach.persistence.learning_repository import SQLiteLearningRepository
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

def _columns(conn, table):
    return {str(row['name']) for row in conn.execute(f'PRAGMA table_info({table})')}

def _defaults(conn, table):
    return {str(row['name']): str(row['dflt_value']).strip("'") for row in conn.execute(f'PRAGMA table_info({table})')}

def _indexes(conn, table):
    return {str(row['name']) for row in conn.execute(f'PRAGMA index_list({table})')}

def _initialize_compatibility_cases() -> None:
    with TemporaryDirectory() as tmp:
        path = Path(tmp) / 'writing.db'
        core = SQLiteLearningRepository(lambda: path)
        specialized = SQLiteSpecializedLearningRepository(core.connect)
        core.initialize(schema_version=11)
        specialized.initialize()
        specialized.initialize()
        with core.connect() as conn:
            assert {'native_language', 'theme_preset'} <= _columns(conn, 'learner_profile')
            assert _columns(conn, 'vocabulary_learning')
            assert _columns(conn, 'reading_sessions')
            assert _columns(conn, 'reading_attempts')
            assert _defaults(conn, 'learner_profile')['native_language'] == 'vi'
            assert _defaults(conn, 'learner_profile')['theme_preset'] == 'editorial'
            assert _defaults(conn, 'vocabulary_learning')['source_kind'] == 'manual'
            assert _defaults(conn, 'vocabulary_learning')['review_stage'] == '0'
            assert 'idx_reading_sessions_created' in _indexes(conn, 'reading_sessions')
            assert 'idx_reading_attempts_session' in _indexes(conn, 'reading_attempts')
            conn.execute("INSERT INTO vocabulary_learning VALUES('existing',NULL,'','manual','',3,4,0,'','2026-08-01T00:00:00+00:00','2026-08-01T00:00:00+00:00')")
            conn.commit()
        specialized.initialize()
        with core.connect() as conn:
            row = conn.execute("SELECT review_stage, successful_recalls FROM vocabulary_learning WHERE word='existing'").fetchone()
            assert tuple(row) == (3, 4)

    with TemporaryDirectory() as tmp:
        path = Path(tmp) / 'legacy.db'
        conn = sqlite3.connect(path); conn.row_factory = sqlite3.Row
        conn.executescript('''
        CREATE TABLE saved_words(word TEXT PRIMARY KEY, phonetic TEXT, part_of_speech TEXT, definition TEXT, added_at TEXT, translation_vi TEXT);
        INSERT INTO saved_words VALUES('legacy word','','noun','definition','2026-08-01T00:00:00+00:00','nghia');
        CREATE TABLE learner_profile(id INTEGER PRIMARY KEY, goal TEXT, style TEXT, pinyin TEXT, created_at TEXT, updated_at TEXT);
        INSERT INTO learner_profile VALUES(1,'work','guided','auto','2026-08-01T00:00:00+00:00','2026-08-01T00:00:00+00:00');
        CREATE TABLE reading_sessions(id INTEGER PRIMARY KEY AUTOINCREMENT, created_at TEXT NOT NULL, language_code TEXT NOT NULL, target_level TEXT NOT NULL, topic TEXT NOT NULL, learner_goal TEXT NOT NULL DEFAULT '', title TEXT NOT NULL, passage TEXT NOT NULL, questions_json TEXT NOT NULL, recycled_words_json TEXT NOT NULL DEFAULT '[]', generation_mode TEXT NOT NULL DEFAULT 'practice');
        INSERT INTO reading_sessions(created_at,language_code,target_level,topic,learner_goal,title,passage,questions_json,recycled_words_json,generation_mode) VALUES('2026-08-01T00:00:00+00:00','en','B2','work','','title','passage','[]','[]','practice');
        ''')
        conn.commit(); conn.close()
        core = SQLiteLearningRepository(lambda: path)
        specialized = SQLiteSpecializedLearningRepository(core.connect)
        core.initialize(schema_version=11)
        specialized.initialize()
        specialized.initialize()
        with core.connect() as conn:
            assert {'native_language', 'theme_preset'} <= _columns(conn, 'learner_profile')
            row = conn.execute("SELECT word, review_stage, source_kind FROM vocabulary_learning WHERE word='legacy word'").fetchone()
            assert tuple(row) == ('legacy word', 0, 'manual')
            assert conn.execute('SELECT COUNT(*) FROM vocabulary_learning').fetchone()[0] == 1
            assert conn.execute('SELECT COUNT(*) FROM reading_attempts').fetchone()[0] == 0
            assert conn.execute('SELECT COUNT(*) FROM reading_sessions').fetchone()[0] == 1

    with TemporaryDirectory() as tmp:
        root = Path(tmp)
        # Request scoping supplies separate paths for each user/language pair;
        # initialization must remain path-local for English and Chinese alike.
        for user, language in [('user-a', 'en'), ('user-a', 'zh'), ('user-b', 'en')]:
            path = root / user / language / 'writing.db'
            core = SQLiteLearningRepository(lambda path=path: path)
            core.initialize(schema_version=11)
            with core.connect() as conn:
                conn.execute("INSERT INTO saved_words VALUES(?,?,?,?,?,?)", (f'{user}-{language}', '', '', '', '2026-08-01T00:00:00+00:00', ''))
                conn.commit()
            specialized = SQLiteSpecializedLearningRepository(core.connect)
            specialized.initialize()
            with core.connect() as conn:
                words = [row[0] for row in conn.execute('SELECT word FROM vocabulary_learning')]
                assert words == [f'{user}-{language}']

def main():
    _initialize_compatibility_cases()
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
