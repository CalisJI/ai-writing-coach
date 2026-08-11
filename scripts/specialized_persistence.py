from __future__ import annotations
import argparse, json
from pathlib import Path
import sys
ROOT=Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path: sys.path.insert(0,str(ROOT))
from writing_coach.persistence.config import create_shadow_engine
from writing_coach.persistence.importer import discover_sources
from writing_coach.persistence.specialized_repository import SQLiteSpecializedLearningRepository, PostgresSpecializedLearningRepository
import sqlite3

def sqlite_factory(path: Path):
    def factory():
        c=sqlite3.connect(path); c.row_factory=sqlite3.Row; return c
    return factory

def _canonical_json(raw):
    try:
        value=json.loads(raw or '{}')
    except Exception:
        value={}
    return json.dumps(value,ensure_ascii=False,sort_keys=True,separators=(',',':'))

def signature(repo):
    profile=repo.get_profile_record() or {}
    essays=repo.memory_essay_rows()
    library=repo.list_library_records()
    reading=repo.list_reading_session_records(1000)
    return {
      'profile': {k:profile.get(k) for k in ('goal','style','pinyin','native_language','theme_preset')},
      'essays': [(int(x['id']),int(x.get('series_id') or x['id']),int(x.get('revision_no') or 1),_canonical_json(x.get('module_data_json'))) for x in essays],
      'library': [(str(x['word']).casefold(),int(x.get('review_stage') or 0),int(x.get('successful_recalls') or 0),int(x.get('lapse_count') or 0)) for x in library],
      'reading': [(int(x['id']), int(x['last_correct']) if x.get('last_correct') is not None else None, int(x['last_total']) if x.get('last_total') is not None else None) for x in reading],
    }

def main():
    ap=argparse.ArgumentParser(); ap.add_argument('command',choices=['shadow-compare']); ap.add_argument('--data-root',default='/data'); ap.add_argument('--url',default='')
    args=ap.parse_args(); discovery=discover_sources(Path(args.data_root)); engine=create_shadow_engine(args.url or None); mismatches=[]; scopes=[]
    for source in discovery.learning_sources:
        sr=SQLiteSpecializedLearningRepository(sqlite_factory(source.path))
        pr=PostgresSpecializedLearningRepository(engine,user_key_provider=lambda k=source.user_key:k,language_provider=lambda l=source.language_code:l)
        a=signature(sr); b=signature(pr); scopes.append({'user':source.user_key,'language':source.language_code,'path':str(source.path)})
        if a!=b: mismatches.append({'user':source.user_key,'language':source.language_code,'sqlite':a,'postgres':b})
    print(json.dumps({'scopes':scopes,'mismatch_count':len(mismatches),'mismatches':mismatches},ensure_ascii=False,indent=2))
    if mismatches: raise SystemExit('Specialized persistence parity FAILED')
    print('Specialized BECOMING SQLite/PostgreSQL scoped parity: PASS')
if __name__=='__main__': main()
