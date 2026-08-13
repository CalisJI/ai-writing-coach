# Verified Project State

This document records verified current truth only. It is not a wish list or a
historical narrative.

## Identity and versions

- Product: Orena / BECOMING codebase
- Repository: `CalisJI/ai-writing-coach`
- Last verified application/runtime baseline:
  `13da0da4d73a743ca06e1581b0069f92a4a7c7b9`

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

Current learner skill truth:

| Skill | Release state | Source | Internal | Public |
| --- | --- | --- | --- | --- |
| Writing | BETA | available | available | no |
| Speaking | DEVELOPMENT | unavailable as a complete product | unavailable | no |
| Reading | DEVELOPMENT | available | available | no |
| Listening | HIDDEN | unavailable | unavailable | no |

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

## R2 AI Capability Control Plane

- Slice 1: **CLOSED / APPROVED / merged**.
- Slice 2: **CLOSED / APPROVED / merged**.
- Slice 3: **CLOSED / APPROVED / merged via PR #10**.

The capability-centric control plane exists. Canonical admin APIs are:

- `GET /api/admin/ai/config`
- `PUT /api/admin/ai/config/{capability_key}`
- `POST /api/admin/ai/test/{capability_key}`

Legacy global admin mutation and provider-test endpoints remain transitional
and deprecated.

Learner runtime capability routing is **not active**. `generate_structured()`
still selects the provider and model through the legacy global
`active_selection()` path. This is intentional until atomic R2 activation.

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

## Current next development area

R2 runtime activation remains the next major technical area, but production
migration and runtime activation are a human gate. Agents may inspect, design,
test, and prepare dry-run or preflight work. They may not execute production
mutation or cutover without explicit human authorization.
