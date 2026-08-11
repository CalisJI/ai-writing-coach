from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def req(ok,msg):
    if not ok: raise SystemExit('Specialized persistence boundary validation FAILED: '+msg)
def text(rel): return (ROOT/rel).read_text(encoding='utf-8')
req((ROOT/'VERSION').read_text().strip()=='1.3.3','VERSION must be 1.3.3')
req((ROOT/'BECOMING_FRONTEND_VERSION').read_text().strip()=='2.15.7','frontend must remain 2.15.7')
app=text('app.py'); repo=text('writing_coach/persistence/specialized_repository.py')
for name in ['becoming_memory.py','becoming_outcomes.py','becoming_library.py','becoming_reading.py','becoming_linguistics.py']:
    src=text('writing_coach/'+name)
    req('_repo()' in src or '_repository' in src, name+' must use repository boundary')
    # Runtime service logic must not own connection factories anymore.
    req('_db_factory' not in src and 'def _db()' not in src, name+' still owns DB factory')
req('SQLiteSpecializedLearningRepository(_learning_repository.connect)' in app,'SQLite specialized repository must remain active')
req('PostgresSpecializedLearningRepository' in repo,'PostgreSQL specialized repository implementation missing')
req('create_shadow_engine' in repo,'PostgreSQL specialized repository is not SQLAlchemy-backed')
req('configure_becoming_memory(_specialized_learning_repository)' in app,'memory not wired to repository')
req('configure_becoming_outcomes(_specialized_learning_repository)' in app,'outcomes not wired to repository')
req('configure_becoming_library(_specialized_learning_repository)' in app,'library not wired to repository')
req('configure_becoming_reading(_specialized_learning_repository, generate_structured)' in app,'reading not wired to repository')
req('configure_becoming_linguistics(_specialized_learning_repository, generate_structured)' in app,'linguistics not wired to repository')
req((ROOT/'docs/SPECIALIZED_PERSISTENCE_BOUNDARY.md').exists(),'missing boundary doc')
print('BECOMING specialized persistence boundary validation OK')
print('Memory / Outcomes / Active Recall / Reading / Linguistics: repository-bound')
print('SQLite specialized repository: ACTIVE')
print('PostgreSQL specialized repository: READY / NOT SELECTED')
print('Runtime cutover: NOT ENABLED')
