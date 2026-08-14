# Verified Project State

This document records verified current truth only. It is not a wish list or a
historical narrative.

## Identity and versions

- Product: Orena / BECOMING codebase
- Repository: `CalisJI/ai-writing-coach`
- Last verified application/runtime baseline:
  `5b5807a0986a8563406322f0cca884eb0100902c`

This SHA identifies the verified application/runtime baseline inherited by this
governance checkpoint. Documentation-only or governance-only descendant commits
may advance `main` without changing that baseline. Update this field only after
a reviewed change materially changes verified application, runtime, product, or
operational state.

- Application version: `1.4.0`
- BECOMING frontend version: `2.15.7`

## Persistence

- PostgreSQL is the authoritative runtime.
- SQLite is a frozen rollback/archive source only.
- There is no dual-write.
- There is no reverse sync from PostgreSQL to SQLite.
- There is no silent SQLite fallback from PostgreSQL runtime failure.
- There is no startup auto-import.
- There is no startup automatic Alembic migration.
- Persistent volumes are never cleanup targets. Normal development and
  operations must never use `docker compose down -v`.
- Governance work must not mutate production runtime data.

The repository still contains SQLite implementations and historical migration
tooling because rollback, archive inspection, tests, and the completed cutover
history remain relevant. Their presence does not make SQLite the deployed
authority.

## Production staging

- Public endpoint: `https://orena.chillpickle.org`
- Request path: Internet → Cloudflare HTTPS → Docker Cloudflare Tunnel
  connector → `writing-coach:8000` → PostgreSQL.
- Google OAuth production staging passed.
- Public health and readiness passed.
- Authenticated `GET /api/product/me` passed against PostgreSQL.
- EN learner staging smoke passed.
- ZH learner staging smoke passed.
- Library, Journey, and Profile staging smoke passed.
- The Windows Cloudflared service was intentionally disabled after duplicate
  tunnel replicas caused 502 behavior.
- The Docker Cloudflared connector is canonical. Unrelated work must not
  reconfigure or duplicate it.

## Product release architecture

- R0 — Product Release Architecture: **CLOSED**.
- R1 — Production Staging + Cloudflare + Google OAuth: **CLOSED / PASS**.
- R2 — AI Capability Control Plane: **IN PROGRESS**.
- M1 — Media Learning Foundation: **IN PROGRESS / CROSS-CUTTING**.

Current learner skill truth:

| Skill | Release state | Source | Internal | Public |
| --- | --- | --- | --- | --- |
| Writing | BETA | available | available | no |
| Speaking | DEVELOPMENT | unavailable as a complete product | unavailable | no |
| Reading | DEVELOPMENT | available | available | no |
| Listening | DEVELOPMENT | available | available | no |

The first public product gate requires all four conditions:

- Writing COMPLETE;
- Speaking COMPLETE;
- English PASS;
- Chinese PASS.

Only after that reviewed gate may Writing and Speaking be promoted to PUBLIC
together. Reading and Listening are later, separate releases. No current
learner skill is PUBLIC.

## Multilingual product rule

Shared learner-facing behavior applies to every supported learning language.
The current mandatory languages are EN and ZH. Do not build a shared feature
for English and later copy it for Chinese.

Use one shared language-neutral contract plus a language adapter only where a
real linguistic difference requires it. Examples include English tokenization,
phonemes, stress, and grammar details, and Chinese Hanzi segmentation, Pinyin,
tones, measure words, particles, and grammar details.

Conceptually language-scoped learner data remains isolated by:

`user + learning_language`

## M1 Media Learning Foundation

M1 is an active cross-cutting development track. M1.1 establishes the shared,
provider-neutral and learner-neutral media-content contract. One imported media
source is represented once as a reusable Media Learning Object and consumed by
both Listening and Speaking Shadowing rather than being independently modeled
inside either skill.

The source-language transcript, stable timestamped segment identities, and
support-language translations belong to shared media content. Listening
progress, Shadowing attempts, saved vocabulary, learned segments, and exercise
outcomes remain separate learner state scoped by user and learning language.

M1.1 does not make M1 complete. It does not implement ingestion, provider
adapters, transcription, translation, Listening UI, or Shadowing behavior, and
it does not make Listening or Speaking public.

The first Listening workspace is available to authenticated internal/admin
testers. It consumes the shared Media Learning Object API contract, keeps
Listening non-public, and does not add ingestion, scoring, or learner progress.

## R2 AI Capability Control Plane

- Slice 1: **CLOSED / APPROVED / merged**.
- Slice 2: **CLOSED / APPROVED / merged**.
- Slice 3: **CLOSED / APPROVED / merged via PR #10**.
- Slice 4: **CLOSED / APPROVED / merged via PR #15**.

The capability-centric control plane exists. Canonical admin APIs are:

- `GET /api/admin/ai/config`
- `PUT /api/admin/ai/config/{capability_key}`
- `POST /api/admin/ai/test/{capability_key}`

Legacy global admin mutation and provider-test endpoints remain transitional
and deprecated.

Capability-aware learner runtime support is implemented behind one central
`LEGACY` / `CAPABILITY` mode. All eight provider-backed workloads pass explicit,
product-wide capability identities. `LEGACY` remains the default and current
production behavior; production has **not** been activated to `CAPABILITY`.
In `CAPABILITY` mode, routing resolves the exact persisted provider/model and
does not fall back to `active_selection()`.

### Current capability catalog

Configurable, implemented, provider-backed capabilities:

- `writing_evaluator`
- `writing_linguistic`
- `reading_generator`
- `writing_task_generator`
- `writing_improver`
- `learner_dictionary`
- `learner_translation`
- `grammar_lesson_generator`

Deterministic capability:

- `reading_evaluator`

Reserved and unimplemented:

- `speech_asr`
- `pronunciation_evaluator`
- `speaking_evaluator`

Capability configuration is product-wide. Per-language capability IDs such as
`writing_evaluator_en` and `writing_evaluator_zh` do not exist and must not be
invented.

Persisted `fallback_policy` is configuration metadata for later activation.
It is not active learner fallback behavior. There is no provider-to-provider
fallback and no silent paid-provider failover.

## Current next development areas

Two development tracks are active:

- R2 remains **IN PROGRESS**. Static activation readiness/preflight is its
  current technical checkpoint. Production migration/config initialization,
  live provider validation, runtime activation, and rollback execution remain
  human gates.
- M1 is **IN PROGRESS** as a cross-cutting product-development track. M1.1 is
  the current foundation checkpoint. After M1.1 is reviewed and merged, the
  next planned M1 checkpoint is M1.2 media ingestion and transcript acquisition
  under its own reviewed scope.
