# Architecture Invariants

These rules must not drift through incidental implementation work. Changing an
invariant requires an explicit accepted decision, an appended Decision Log
entry, and corresponding current-state and handoff updates.

## Persistence

- PostgreSQL is authoritative.
- SQLite is frozen rollback/archive only.
- No dual-write.
- No reverse sync from PostgreSQL to SQLite.
- No silent SQLite fallback.
- No startup import.
- No automatic startup Alembic.
- No destructive persistent-volume cleanup.
- Production data mutation is always a human gate.
- Schema ownership remains Alembic-based for PostgreSQL.

## Frontend

- `BECOMING_FRONTEND_VERSION` remains exactly `2.17.5` until an explicitly
  scoped, reviewed change updates it.
- Backend and architecture tasks do not casually touch frontend code or assets.
- Preserve shared responsive behavior, accessibility, EN/ZH parity, light/dark
  parity, shared tokens, and the established visual identity.
- Journey, Review, Library / Active Recall UI, shared layout primitives,
  gutters, spacing, overflow, and container-width primitives are protected.
- `static/becoming/orena/**` is the bounded frontend `2.17.5` presentation layer
  for the shared Orena shell and learner screens. Its `--o-*` tokens and `.o-*`
  primitives remain shared; dedicated screen styles may compose them but must
  not copy shared tokens, layout primitives, or responsive contracts into new
  page-local systems. D-024 completes the approved screen migration without
  relaxing protected domain, persistence, EN/ZH, accessibility, or learner-flow
  contracts.
- `docs/visual-references/**` remains untouched unless explicitly scoped.

## Multilingual product

- Shared product behavior applies to EN and ZH.
- A shared feature is implemented once through a language-neutral contract.
- Language adapters are used only for genuine linguistic differences.
- Future languages plug into shared contracts rather than receiving copied
  product flows.
- Conceptually language-scoped learner data is isolated by user and learning
  language.

## Closed-stage protection

- A reviewed CLOSED subsystem is a protected baseline. Later work consumes its
  contracts instead of casually replacing or refactoring it.
- R5 Grammar Knowledge System is closed at the PR #44 baseline: preserve stable
  Grammar Concept IDs, Static Grammar KB authority, schema-v2 models, the shared
  renderer, multilingual language-context separation, and Grammar runtime AI
  `0`.
- Do not re-run or recreate superseded broad structural Grammar migration write
  paths over concept-specific authoring.
- M1 Shared Media Learning contracts are likewise protected: one canonical
  media asset/transcript/segment model is reused by Listening and Speaking
  Shadowing.
- Reopening a closed subsystem requires a concrete regression, explicit product
  extension, or accepted architecture decision.

## Release

- Writing and Speaking form the first complete public learning product.
- Writing COMPLETE, Speaking COMPLETE, EN PASS, and ZH PASS are all required.
- Reading is a separate later public release.
- Listening is later still.
- No learner skill is currently PUBLIC. Promotion requires a reviewed release
  gate and an explicit repository-state transition.

## AI Platform

- The AI Control Plane owns AI infrastructure and AI workload configuration;
  it is not a general product-domain registry.
- `reading_evaluator` and `writing_linguistic` are deterministic and not
  provider-configurable. Word segmentation and part-of-speech tagging are a
  solved local problem; a provider must never be routed either workload.
- Speech capabilities are reserved and unimplemented until Speaking work
  explicitly implements them.
- Capability configuration and diagnostics never persist or expose credentials.
- No provider-to-provider fallback or silent paid-provider failover.
- Shared-media translation may select Groq or local Marian once from explicit
  configuration; a provider failure must stop rather than silently fail over.
- Static configuration validation remains separate from live provider/model
  testing.
- Learner `generate_structured()` remains on legacy `active_selection()` until
  one reviewed atomic activation switches the whole runtime contract.
- Persisted fallback policy is metadata until runtime activation explicitly
  implements its behavior.

## Operations

- Never use `docker compose down -v`.
- Never print or commit secrets, credential-bearing URLs, authorization
  headers, or raw sensitive provider responses.
- No automatic production migration or production capability-row mutation.
- Cloudflare, DNS, OAuth, secret, and production staging infrastructure changes
  require explicit scope and human authorization.
- Do not casually re-enable the disabled Windows Cloudflared service; the
  Docker connector is canonical.
- Preserve rollback evidence and persistent PostgreSQL data.

## Git

- `main` is stable and verified; development occurs on `codex/*` or an
  explicitly approved development branch.
- Never force-push `main`, merge automatically to `main`, or rewrite verified
  history.
- Never use `git clean -fd`, arbitrary `git add -A`, or destructive
  `git reset --hard` without explicit authorization.
- Do not delete unrelated untracked files or `docs/visual-references/**`.
- Stage only files belonging to the coherent reviewed change.
- Leave every checkpoint reviewable with exact validation and status evidence.

## Human gates

Stop before production data mutation, runtime activation, unapproved schema or
Alembic work, Cloudflare/DNS/OAuth/secret changes, paid-provider or billing
decisions, destructive Git, volume deletion, public release, rollback-path
removal, ambiguous architecture decisions, unresolved P0 findings, or repeated
P1 findings that require broader redesign.
