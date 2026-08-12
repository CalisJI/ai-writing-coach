# PostgreSQL runtime activation (Phase B)

The deployed default remains `PERSISTENCE_BACKEND=sqlite`; SQLite remains the
authoritative production store until Phase C approval.

Phase B adds a dormant runtime capability only. A future operator may request
`PERSISTENCE_BACKEND=postgresql` with `POSTGRES_RUNTIME_URL` using
`postgresql+psycopg://`. The runtime uses one shared engine, verifies
connectivity and that PostgreSQL is already at the repository Alembic head.

There is no automatic migration, import, fallback, dual-write, or reverse
sync. `POSTGRES_SHADOW_URL` remains exclusively for shadow import, rehearsal,
and parity verification. Phase C is required before operational cutover.
