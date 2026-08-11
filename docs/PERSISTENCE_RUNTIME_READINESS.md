# BECOMING Persistence Runtime Readiness — v1.3.1

## Goal

Move the application toward a safe PostgreSQL runtime cutover without changing
which database currently serves learners.

This batch keeps SQLite authoritative and closes two persistence-boundary gaps
that were still embedded directly in service modules: authentication and
platform AI configuration.

## Runtime store matrix

| Domain | Runtime store | Boundary | PostgreSQL implementation | Cutover status |
|---|---|---|---|---|
| Learning (essays, progress, library, reading) | SQLite per user + language | Partial; `app.py` and BECOMING services still use SQLite connection factory | SQLAlchemy models + importer exist | **BLOCKER / not cut over** |
| Authentication | `auth.db` SQLite | `AuthRepository` | `PostgresAuthRepository` | Ready for later cutover, SQLite active |
| Product/subscription/usage | `product.db` SQLite | `ProductRepository` | `PostgresProductRepository` | Ready for later cutover, SQLite active |
| Platform AI config | `platform.db` SQLite | `PlatformRepository` | `PostgresPlatformRepository` | Ready for later cutover, SQLite active |
| Dictionary cache | learning SQLite | cache-only | intentionally not migrated | Rebuildable |
| Grammar lesson cache | learning SQLite | cache-only | intentionally not migrated | Rebuildable |

## What changed

- `auth_support.py` no longer executes SQLite SQL directly. Its public functions
  delegate to `SQLiteAuthRepository`.
- `writing_coach/ai/platform.py` no longer executes SQLite SQL directly. It
  delegates to `SQLitePlatformRepository`.
- PostgreSQL implementations for both contracts are present but **not selected**.
- A scoped shadow-read comparator verifies persisted learning counts per
  `(user_key, language_code)` instead of relying only on global totals.

## Why scoped comparison matters

Global source/target counts can pass even if records move between language or
user scopes. The v1.3 migration already uncovered a historical stale
`language_code` issue. v1.3.1 therefore verifies each discovered SQLite
user-language database independently against PostgreSQL.

Compared per scope:

- learner profile
- essays
- revision records
- extracted writing errors
- saved vocabulary
- grammar progress
- reading sessions
- reading attempts

## Deliberately unchanged

- `app.py` still creates the learning SQLite connection.
- BECOMING memory/library/reading/outcome/linguistics services still receive the
  existing SQLite connection factory.
- `ProductService` still selects `SQLiteProductRepository`.
- auth still selects `SQLiteAuthRepository`.
- platform AI config still selects `SQLitePlatformRepository`.
- PostgreSQL service remains optional and stopped outside explicit verification.
- billing and entitlement enforcement remain disabled.
- BECOMING frontend/layout is untouched.

## Remaining cutover blocker

The next persistence milestone is the **learning repository boundary**. It must
replace direct learning SQL without changing current API behavior, then compare
SQLite and PostgreSQL read semantics before any runtime switch is approved.

## v1.3.2 learning core boundary

The core FastAPI learning routes no longer own SQLite SQL. They now delegate to
`SQLiteLearningRepository`, with a matching `PostgresLearningRepository`
implementation present but not selected. Rebuildable dictionary/grammar caches
use a separate local cache repository.

The remaining learning cutover blocker is narrower: BECOMING memory,
outcomes, Active Recall library, Reading Studio, and linguistic services still
use transitional SQLite adapters. These are intentionally deferred to the next
boundary phase instead of being refactored together with stable core routes.
