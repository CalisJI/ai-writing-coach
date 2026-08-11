# BECOMING Learning Repository Boundary — v1.3.2

## Goal

Remove direct learning SQL from the core FastAPI application without changing
which database serves learners.

SQLite remains authoritative. PostgreSQL remains shadow-only.

## Runtime matrix

| Learning area | Runtime | Boundary state | PostgreSQL state |
|---|---|---|---|
| Core essays/revisions/dashboard | SQLite | `LearningRepository` | implementation present, not selected |
| Basic vocabulary CRUD | SQLite | `LearningRepository` | implementation present, not selected |
| Grammar completion | SQLite | `LearningRepository` | implementation present, not selected |
| Dictionary cache | SQLite cache | `LearningCacheRepository` | intentionally local/rebuildable |
| Grammar lesson cache | SQLite cache | `LearningCacheRepository` | intentionally local/rebuildable |
| Learning memory/profile | SQLite adapter | transitional | next boundary phase |
| Practice outcomes | SQLite adapter | transitional | next boundary phase |
| Active Recall library | SQLite adapter | transitional | next boundary phase |
| Reading Studio | SQLite adapter | transitional | next boundary phase |
| Linguistic annotation cache | SQLite adapter | transitional | next boundary phase |

## What changed

- `app.py` no longer imports `sqlite3`, opens learning DBs, or owns SQL queries.
- schema bootstrap moved into `SQLiteLearningRepository.initialize()`.
- core essay/revision, dashboard/error-memory, grammar-completion and basic
  vocabulary operations delegate through `LearningRepository`.
- dictionary and generated grammar-lesson caches use a separate rebuildable
  `LearningCacheRepository`.
- `PostgresLearningRepository` implements the same core contract using the
  SQLAlchemy v1.3 schema, but is deliberately not selected by runtime.

## Why caches are separate

Dictionary lookups and generated grammar lesson text are rebuildable cache
material. They do not need to block a future durable-data cutover and are not
part of the v1.3 PostgreSQL migration domain.

## Deliberately unchanged

The existing BECOMING memory, practice-outcome, Active Recall library, Reading
Studio and linguistic services still use the SQLite connection adapter supplied
by `SQLiteLearningRepository.connect`. Their API behavior is unchanged.

This makes the remaining blocker smaller and explicit instead of attempting a
large one-shot refactor across stable learning features.

## Cutover rule

No PostgreSQL runtime switch is allowed until the specialized BECOMING service
adapters are moved behind repository contracts and real SQLite/PostgreSQL
semantic parity passes for their read/write workflows.

## v1.3.3 specialized persistence boundary
Memory, practice outcomes, active recall, reading, and linguistic annotation persistence now use a dedicated repository contract. SQLite remains authoritative; the PostgreSQL implementation is ready but not selected.

## v1.3.4 schema ownership completion

The specialized SQLite repository also owns the durable schema bootstrap and
legacy compatibility backfills for those services. `app.py` initializes core
learning first, specialized learning second, and rebuildable caches last.
