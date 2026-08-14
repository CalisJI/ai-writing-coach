# Current Handoff

**Application/runtime baseline:**
`38e023aaea735e81d3d725dfc912702d84fdefbe`

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
- M1.3 — shared media translation
- M1.4 — internal passive Listening MVP integration and acceptance
- PV-2 / OREN-10 — internal Listening workspace foundation
- PV-3 / OREN-11 — Listening practice navigation and playback controls

## Current M1 checkpoint

M1.1 is **CLOSED / APPROVED / merged**. Its provider-neutral, learner-neutral
Media Learning Object remains the canonical shared content contract. Learner
progress remains separate and scoped by user and learning language.

M1.2 is **CLOSED / APPROVED / merged**. The authenticated import API owns
provider acquisition, learning-language caption selection, canonical transcript
identity, and provider-hosted playback.

M1.3 Shared Media Translation is **CLOSED / APPROVED / merged**. It owns the
independent backend support-language contract and enriches the server-owned
import response through the exact `learner_translation` capability.

The PV-2 / OREN-10 internal Listening workspace and PV-3 / OREN-11 practice UX
are merged. Together they consume the import response for provider-hosted
playback, transcript interaction, stable segment selection, Previous / Next,
canonical timestamp replay, supported playback speeds, and truthful
translated/degraded states.

M1.4 Listening MVP integration and acceptance is **CLOSED / APPROVED / merged**.
It established one shared EN/ZH passive follow-along flow over the reviewed
Media Learning backend.

M1.5 Active Listening is **IN PROGRESS**. It adds bounded, deterministic
transcript-reconstruction practice over canonical Media Learning segments with
browser-session-only practice state. There is no durable media or Listening
progress persistence, AI dictation grading, or Shadowing activation. Listening
and Speaking remain non-public.

## Current runtime truth

- One central `LEGACY` / `CAPABILITY` learner runtime mode exists; `LEGACY`
  remains the default and current production behavior.
- All eight provider-backed workloads pass explicit, shared capability
  identities. In `CAPABILITY` mode, exact persisted provider/model routing does
  not fall back to `active_selection()`.
- Capability runtime activation has not occurred. Rolling back to `LEGACY`
  preserves capability configuration.

## Next checkpoints

- M1 product-development lane: complete review of M1.5 Active Listening. After
  its reviewed merge, M1.6 Shared-media Shadowing integration is next. M1.5
  does not make Listening complete or public.
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
