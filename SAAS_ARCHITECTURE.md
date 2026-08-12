# SaaS Product Architecture

Writing Coach is moving from a local-first prototype to a multi-user SaaS product.

## Product direction

The architecture remains a modular monolith while the product is still evolving:

- FastAPI remains the backend/API host.
- Language modules continue to own language-specific evaluation/curriculum behavior.
- AI providers remain hidden from learners and are controlled by Platform Admin.
- Product plans and feature access are resolved through a dedicated entitlement layer.
- Billing providers must update subscription state; application features must not call billing vendors directly.
- Learning features must ask the entitlement service instead of checking `user.premium`.
- Frontend UX should expose learning concepts, not infrastructure concepts.

## Transitional v1.2 storage

v1.2 introduces one centralized `product.db` for subscription state and usage events.

This is deliberately isolated behind `ProductRepository`.
It is NOT the final SaaS database design.

The next data-foundation milestone will add:

- PostgreSQL
- SQLAlchemy 2
- Alembic migrations
- repository implementations backed by PostgreSQL
- an importer for existing SQLite learning data
- verification before switching reads/writes

Old SQLite learning data must not be deleted during migration.


## v1.3 PostgreSQL shadow foundation

v1.3 implements the next data-foundation milestone in **no-cutover mode**:

- SQLAlchemy 2 models and PostgreSQL repository foundation exist;
- Alembic owns the PostgreSQL schema;
- a SQLite importer can discover legacy and authenticated per-language DBs;
- source/target verification is required after shadow import;
- PostgreSQL is optional under the Compose `postgres` profile;
- runtime reads/writes remain on SQLite until a separately approved cutover.

SQLite files remain authoritative and are never deleted by the shadow tools.

## Planned PostgreSQL domains

- users
- user_language_profiles
- essays
- essay_revisions
- writing_errors
- saved_words
- grammar_progress
- subscriptions
- plans
- plan_entitlements
- usage_events
- platform_settings
- audit_logs

Every learning row should carry a stable `user_id` and `language_code`.

## Product plans

The application starts with product catalog definitions:

- Free
- Premium

Plans grant entitlements such as:

- `writing.evaluate`
- `writing.improve`
- `library.grammar`
- `dictionary.lookup`
- `vocabulary.save`
- `analytics.basic`
- `analytics.advanced`
- `practice.personalized`
- `export.report`

Quota enforcement will be activated endpoint-by-endpoint after billing and PostgreSQL are ready.

## UI rules

Learners should not see:

- Ollama/provider names
- model names
- API keys
- database implementation details
- technical health messages

Learners should see:

- what to do next
- current learning language
- plan name
- writing feedback
- progress
- saved learning content

Theme/font controls belong in account/settings rather than primary navigation.


## v1.3.1 persistence runtime readiness

v1.3.1 does not cut over runtime reads/writes. It narrows the remaining
persistence debt before that decision:

- authentication now sits behind an `AuthRepository`;
- platform AI configuration now sits behind a `PlatformRepository`;
- PostgreSQL implementations exist for auth, platform and product contracts;
- current runtime still selects the SQLite implementations;
- a per-user/per-language shadow read comparator verifies isolation, not only
  global row totals;
- the learning SQLite connection path in `app.py` remains the primary cutover
  blocker and is intentionally deferred to the next persistence milestone.

Dictionary and generated grammar-lesson caches are rebuildable and are not
required migration domains.

## v1.3.2 learning repository boundary

v1.3.2 removes direct learning SQL from `app.py` and places core essay,
revision, dashboard, grammar-progress, and basic vocabulary persistence behind a
`LearningRepository` contract. SQLite remains the selected implementation;
PostgreSQL has a matching core implementation but remains inactive.

Generated dictionary and grammar-lesson caches are separated from durable
learning persistence and remain local/rebuildable. Specialized BECOMING service
adapters remain the final learning-domain blocker before a cutover decision.

## v1.3.3 specialized persistence boundary
Memory, practice outcomes, active recall, reading, and linguistic annotation persistence now use a dedicated repository contract. SQLite remains authoritative; the PostgreSQL implementation is ready but not selected.

## v1.3.4 learning schema repository completion

The specialized SQLite repository owns its durable schema bootstrap and legacy
compatibility backfills. Service modules are storage-neutral; SQLite remains
authoritative and PostgreSQL remains shadow-only.

## v1.3.5 public deployment foundation

Public deployment is configuration-led: `APP_ENV=production` requires a
non-local HTTPS `PUBLIC_BASE_URL`, Google OAuth, and `SESSION_SECRET`. The
callback derives from the public origin unless explicitly overridden. Runtime
persistence selection is unchanged: SQLite remains authoritative and PostgreSQL
remains shadow-only.

## v1.4.0 authoritative runtime

The accepted operational cutover supersedes the pre-cutover runtime statements
in the historical v1.3 milestone sections above. PostgreSQL is authoritative
for deployed product data. SQLite is frozen rollback/archive evidence only;
there is no production fallback, dual-write, or reverse-sync path.

Production-like staging selects `PERSISTENCE_BACKEND=postgresql` with an
explicit `POSTGRES_RUNTIME_URL`. `POSTGRES_SHADOW_URL` remains isolated from
runtime selection. Startup checks connectivity and Alembic-head equality and
fails closed without automatically running migrations.
