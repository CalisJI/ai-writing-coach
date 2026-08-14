# Current Handoff

**Application/runtime baseline:**
`5b5807a0986a8563406322f0cca884eb0100902c`

This is the inherited verified application/runtime baseline, not a requirement
that `main` HEAD remain identical after docs-only or governance-only commits.

**Active programs:**

- R2 — AI Capability Control Plane: **IN PROGRESS / HUMAN-GATED ACTIVATION**
- M1 — Media Learning Foundation: **IN PROGRESS / CROSS-CUTTING**

## Completed

- R2 Slice 1
- R2 Slice 2
- R2 Slice 3
- R2 Slice 4
- M1.1 — media object and segment contracts

## Current M1 checkpoint

M1.1 is **CLOSED / APPROVED / merged**. Its provider-neutral, learner-neutral
Media Learning Object remains the canonical shared content contract. Learner
progress remains separate and scoped by user and learning language.

M1.2 is **IN PROGRESS**. It is the external-media ingestion and public-caption
acquisition checkpoint, with one authenticated learner API and provider access
isolated behind an adapter. The first provider target is public YouTube video
playback and captions. No durable media persistence, audio download, ASR,
translation generation, Listening UI, or Shadowing implementation is included.
Listening and Speaking remain non-public.

## Current runtime truth

- One central `LEGACY` / `CAPABILITY` learner runtime mode exists; `LEGACY`
  remains the default and current production behavior.
- All eight provider-backed workloads pass explicit, shared capability
  identities. In `CAPABILITY` mode, exact persisted provider/model routing does
  not fall back to `active_selection()`.
- Capability runtime activation has not occurred. Rolling back to `LEGACY`
  preserves capability configuration.

## Next checkpoints

- M1 product-development lane: finish review of M1.2 media ingestion and
  transcript acquisition. After M1.2 is reviewed and merged, M1.3 translation
  is the next planned checkpoint under a separate scope. M1.3 must establish a
  shared backend support-language validation contract before activating
  translation; M1.2 intentionally does not copy frontend-only language
  constants. Do not start M1.3 from this handoff.
- R2 control-plane lane: static activation-readiness gate and operator
  checkpoint. R2 remains IN PROGRESS.

## R2 human gate

**YES**

**Reason:** Production persistence migration/config initialization, live
provider validation, learner runtime activation, and rollback execution can
affect production behavior and data.

Agents may:

- inspect activation design;
- prepare code and tests;
- prepare dry-run and preflight commands;
- review migration logic;
- validate atomic activation and rollback design.
- run offline/static activation-readiness validation.

Agents must not without explicit human authorization:

- execute production migration;
- mutate production capability rows;
- perform production provider live validation;
- switch learner runtime;
- remove legacy global routing;
- deploy production activation.

## Stop conditions

- Repository state contradicts these facts.
- Production credentials are required.
- A destructive operation is required.
- Schema or Alembic work is unexpectedly required.
- Activation cannot be atomic.
- The rollback path is unclear.

Do not mark R2 CLOSED in this handoff.

**Next handoff owner:** Human coordinator → next implementation or review
agent.
