# BECOMING PostgreSQL Foundation — No-Cutover Contract

## Status

This milestone adds a **shadow PostgreSQL data foundation**. It does not switch
application reads or writes away from the existing SQLite stores.

Current production/local behavior remains:

- learning data: SQLite per user + language;
- authentication data: `auth.db`;
- platform AI config: `platform.db`;
- product/subscription usage: `product.db`.

The PostgreSQL path is opt-in and is used only by migration/verification tools.

## Added foundation

- SQLAlchemy 2 declarative models;
- Alembic initial schema;
- Psycopg 3 PostgreSQL driver dependency;
- PostgreSQL implementation of the existing `ProductRepository` contract;
- SQLite source discovery for legacy + authenticated per-language data;
- idempotent SQLite → PostgreSQL shadow importer;
- source/target count verification;
- optional Docker Compose PostgreSQL profile.

## Deliberately not changed

- `ProductService` still defaults to `SQLiteProductRepository`;
- `app.py` still uses the existing SQLite `db()` factory;
- BECOMING frontend is unchanged;
- no billing enforcement is activated;
- no SQLite file is deleted, renamed or rewritten;
- no automatic startup migration exists.

## Shadow workflow

Plan only (no PostgreSQL connection):

```bash
python -m scripts.postgres_shadow plan --data-root /data
```

With the optional Compose profile:

```bash
docker compose --profile postgres up -d postgres
```

Then run migration/verification from the application image on the same Compose
network, explicitly passing the shadow URL:

```bash
docker compose run --rm \
  -e POSTGRES_SHADOW_URL=postgresql+psycopg://becoming:becoming-local-dev@postgres:5432/becoming \
  writing-coach python scripts/postgres_shadow.py migrate --data-root /data
```

The command applies Alembic, imports idempotently, compares persistent source
and target counts, and refuses to claim success on mismatch.

## Cutover gate for a later milestone

A future cutover is allowed only after:

1. repeated import is idempotent;
2. source/target verification passes on real data;
3. authenticated user/language isolation is verified;
4. shadow PostgreSQL reads are compared to SQLite behavior;
5. rollback remains possible without deleting SQLite;
6. an explicit architecture decision approves changing runtime reads/writes.
