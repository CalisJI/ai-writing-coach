# Current Handoff

**Application/runtime baseline:**
`5b5807a0986a8563406322f0cca884eb0100902c`

This is the inherited verified application/runtime baseline, not a requirement
that `main` HEAD remain identical after docs-only or governance-only commits.

**Current program:** R2 — AI Capability Control Plane

**Current status:** IN PROGRESS

## Completed

- R2 Slice 1
- R2 Slice 2
- R2 Slice 3
- R2 Slice 4

## Current runtime truth

- One central `LEGACY` / `CAPABILITY` learner runtime mode exists; `LEGACY`
  remains the default and current production behavior.
- All eight provider-backed workloads pass explicit, shared capability
  identities. In `CAPABILITY` mode, exact persisted provider/model routing does
  not fall back to `active_selection()`.
- Capability runtime activation has not occurred. Rolling back to `LEGACY`
  preserves capability configuration.

## Next technical checkpoint

Static activation-readiness gate and operator checkpoint. R2 remains IN
PROGRESS.

## Human gate

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
