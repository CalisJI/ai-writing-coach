# Archived release gates

Each script here was written to gate one specific release, and hard-pins the
`VERSION` or `BECOMING_FRONTEND_VERSION` it shipped with — for example
`validate_v124.py` requires `VERSION == 1.2.4`, `validate_trusted_ui_v213.py`
requires frontend `2.13.0`.

That makes them permanently red from the moment the next version ships. By the
time this directory was created, 35 of the 42 validators in `scripts/` were
failing, essentially all of them for this reason. A permanently red check is
worse than no check: a genuine regression cannot be seen among them, and
`becoming_release_gate` style "run everything" flows stop meaning anything.

They are archived rather than deleted. AGENTS.md §14 keeps historical release
and migration records as evidence of the state at the time they were written,
and these are exactly that: each one documents what a given release was
required to satisfy. They must not be rewritten to look like they always
described the current codebase.

**Do not add new scripts here, and do not wire these into CI.**

A validator that pins a version number is a one-shot gate by construction.
When a new contract needs enforcing, assert the *contract* — the module
boundary, the route ownership, the invariant — never the version string that
happened to be current when it was written. `scripts/validate_architecture.py`
is the model: it is the only validator in CI, and it has survived every version
bump because it asserts structure rather than numbers.

## Also archived here

`validate_persistence_readiness.py`, `validate_postgres_foundation.py` — both
validated readiness *for* the PostgreSQL cutover, and assert the pre-cutover
world: that PostgreSQL must **not** be active, that the postgres service must
remain opt-in, that SQLite must remain the selected backend. The v1.4.0 cutover
completed and PostgreSQL is now authoritative, so these scripts would fail the
project for having succeeded. Their subject is complete by definition.

`validate_chinese_library.py` — pinned the ZH grammar library at 56 lessons with
a contiguous 1..56 ordering and 8 lessons per level. R5 replaced that library
with 239 concepts. The current contract is covered by
`tests/test_m4_universal_grammar_full_rollout.py` (`assert len(ZH_KB) == 239`)
and the rest of the `tests/test_*grammar*` suite, which run in CI.
