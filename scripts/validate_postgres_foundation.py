from __future__ import annotations

from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from writing_coach.persistence.models import Base

errors=[]

def req(cond,msg):
    if not cond: errors.append(msg)

req((ROOT/'VERSION').read_text(encoding='utf-8').strip() == '1.4.0', 'VERSION must be v1.4.0')
req((ROOT/'BECOMING_FRONTEND_VERSION').read_text(encoding='utf-8').strip() == '2.15.7', 'frontend must remain 2.15.7')

requirements=(ROOT/'requirements.txt').read_text(encoding='utf-8')
for token in ['SQLAlchemy>=2.0,<3','alembic>=1.13,<2','psycopg[binary]>=3.1,<4']:
    req(token in requirements, f'missing dependency: {token}')

compose=(ROOT/'compose.yaml').read_text(encoding='utf-8')
req('profiles: ["postgres"]' in compose, 'postgres service must remain opt-in')
req('POSTGRES_SHADOW_URL: ${POSTGRES_SHADOW_URL:-}' in compose, 'shadow URL env missing')
req('depends_on:' not in compose.split('  postgres:',1)[0] or '- postgres' not in compose.split('  postgres:',1)[0], 'writing-coach must not depend on postgres before cutover')

expected={
    'users','user_language_profiles','essays','essay_revisions','writing_errors',
    'saved_words','grammar_progress','reading_sessions','reading_attempts',
    'subscriptions','plans','plan_entitlements','usage_events','platform_settings','audit_logs'
}
req(expected <= set(Base.metadata.tables), 'PostgreSQL model domain set incomplete')

service=(ROOT/'writing_coach/product/service.py').read_text(encoding='utf-8')
req('SQLiteProductRepository' in service, 'ProductService SQLite default removed before cutover')
req('PostgresProductRepository' not in service, 'ProductService must not activate PostgreSQL yet')

app=(ROOT/'app.py').read_text(encoding='utf-8')
req(('sqlite3.connect(path)' in app) or ('SQLiteLearningRepository' in app and 'PostgresLearningRepository' not in app), 'current SQLite learning runtime was changed')
req('create_shadow_engine' not in app, 'app.py must not activate shadow engine')

migration=(ROOT/'migrations/versions/20260811_0001_postgres_foundation.py').read_text(encoding='utf-8')
for table in expected:
    req(f'"{table}"' in migration, f'migration missing table: {table}')

for path in [
    'writing_coach/persistence/config.py',
    'writing_coach/persistence/models.py',
    'writing_coach/persistence/importer.py',
    'writing_coach/persistence/product_repository.py',
    'writing_coach/persistence/verification.py',
    'scripts/postgres_shadow.py',
    'docs/POSTGRES_FOUNDATION.md',
    'alembic.ini',
    'migrations/env.py',
]:
    req((ROOT/path).exists(), f'missing foundation path: {path}')

if errors:
    print('PostgreSQL foundation validation FAILED')
    for e in errors: print(' -',e)
    raise SystemExit(1)
print('PostgreSQL foundation validation OK')
print('Runtime SQLite cutover guard: PASS')
print('PostgreSQL shadow schema/repository/importer: PRESENT')
