# PostgreSQL cutover readiness (v1.3.6)

## Current state

SQLite is the active, authoritative runtime store. PostgreSQL is a migrated,
imported shadow only. This release does not select PostgreSQL repositories,
dual-write, reverse-sync, billing, or quota enforcement.

## Ownership and success criteria

Auth, platform, product, core learning, and specialized learning are
repository-bound. SQLite repositories are intentionally selected at runtime;
SQLite direct access in importers, parity tools, migrations, self-tests, and
rebuildable caches is intentional. Source discovery aborts if an orphan user
directory cannot be mapped to an auth identity. Success requires Alembic head,
two idempotent imports, auth/platform/product semantic parity, core and
specialized scoped parity, and no orphan sources.

## Rehearsal

With the explicit shadow service running, execute:

```powershell
docker compose run --rm --no-deps -v "${PWD}:/workspace:ro" -w /workspace `
  -e POSTGRES_SHADOW_URL=postgresql+psycopg://... writing-coach `
  python scripts/postgres_cutover_rehearsal.py --data-root /data
```

The command performs Alembic upgrade, import/parity twice, scoped core parity,
auth/platform/product semantic parity, and scoped specialized parity. It is idempotent and never changes app runtime
selection. Abort on any failed step, mismatch, unreachable database, invalid
credentials, or schema error.

## Before v1.4.0

Take and verify a SQLite backup while the authoritative application is stopped
or otherwise quiesced. Preserve the PostgreSQL volume; record Alembic head and
the cutover checkpoint timestamp. PostgreSQL backups are an operator
responsibility using `pg_dump` against the configured PostgreSQL service.
Do not use `docker compose down -v`.

## Abort criteria and future selector

Abort on orphan sources, semantic/count mismatch, Alembic failure, or a failed
second import. A future v1.4.0 central selector must choose all repository
families together; it must not introduce dual-write or automatic fallback.

## Future failure and rollback contract

v1.4.0 must select one repository family centrally and fail closed when its
configured PostgreSQL URL is invalid, unreachable, unauthenticated, behind
Alembic head, or parity is incomplete. It must not silently fall back to
SQLite. If PostgreSQL accepts writes after a future cutover, stop writes before
rollback and assess those writes. There is no reverse-sync in this release, so
zero-data-loss rollback after PostgreSQL-only writes is not claimed.
