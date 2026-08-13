# Current Handoff

**Application/runtime baseline:**
`13da0da4d73a743ca06e1581b0069f92a4a7c7b9`

This is the inherited verified application/runtime baseline, not a requirement
that `main` HEAD remain identical after docs-only or governance-only commits.

**Current program:** R2 — AI Capability Control Plane

**Current status:** IN PROGRESS

## Completed

- R2 Slice 1
- R2 Slice 2
- R2 Slice 3

## Current runtime truth

- Learner `generate_structured()` still routes through `active_selection()`.
- Capability configuration and the capability-centric admin control plane
  exist.
- Capability runtime activation has not occurred.

## Next technical checkpoint

R2 activation preparation / activation gate.

## Human gate

**YES**

**Reason:** Production persistence migration/config initialization and learner
runtime activation can affect production behavior and data.

Agents may:

- inspect activation design;
- prepare code and tests;
- prepare dry-run and preflight commands;
- review migration logic;
- validate atomic activation and rollback design.

Agents must not without explicit human authorization:

- execute production migration;
- mutate production capability rows;
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
