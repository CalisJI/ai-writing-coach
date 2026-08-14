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
- M1.2 — media ingestion and transcript acquisition
- PV-2 / OREN-10 — internal Listening workspace foundation

## Current M1 checkpoint

M1.1 is **CLOSED / APPROVED / merged**. Its provider-neutral, learner-neutral
Media Learning Object remains the canonical shared content contract. Learner
progress remains separate and scoped by user and learning language.

M1.2 is **CLOSED / APPROVED / merged**. The authenticated import API owns
provider acquisition, learning-language caption selection, canonical transcript
identity, and provider-hosted playback.

M1.3 Shared Media Translation is **IN PROGRESS**. It owns the independent
backend support-language contract and enriches the server-owned import response
through the exact `learner_translation` capability. Translation remains shared
Media Learning content. There is no durable media persistence, Listening
progress/scoring, active Listening, or Shadowing activation.

The PV-2 / OREN-10 internal Listening workspace is already merged. It consumes
the existing import response for playback, transcript interaction, segment
selection/replay, and truthful translated/unavailable states. Listening and
Speaking remain non-public.

## Current runtime truth

- One central `LEGACY` / `CAPABILITY` learner runtime mode exists; `LEGACY`
  remains the default and current production behavior.
- All eight provider-backed workloads pass explicit, shared capability
  identities. In `CAPABILITY` mode, exact persisted provider/model routing does
  not fall back to `active_selection()`.
- Capability runtime activation has not occurred. Rolling back to `LEGACY`
  preserves capability configuration.

## Next checkpoints

- M1 product-development lane: complete review of M1.3 shared media translation.
  After its reviewed merge, M1.4 Listening MVP integration and completion is
  next. M1.4 completes the internal MVP over the real shared media backend; it
  does not create the first Listening screen or make Listening public.
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
