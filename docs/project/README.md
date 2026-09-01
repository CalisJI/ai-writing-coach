# Orena Project Governance

Orena stores durable project memory in the repository so fresh human, Claude,
Codex, implementation, and review sessions do not depend on conversation
history.

Start with [`PROJECT_MEMORY.md`](PROJECT_MEMORY.md). It defines the small
canonical read order, separate precedence for product intent and implementation
fact, memory ownership, contradiction handling, and the end-of-batch memory
transaction. Do not begin by loading every file in this directory.

## Canonical memory

| File | Answers |
| --- | --- |
| [`PROJECT_MEMORY.md`](PROJECT_MEMORY.md) | How is repository memory loaded and maintained? |
| [`PRODUCT_CONSTITUTION.md`](PRODUCT_CONSTITUTION.md) | What durable Orena product principles govern implementation? |
| [`CURRENT_PRODUCT_STATE.yaml`](CURRENT_PRODUCT_STATE.yaml) | What compact, schema-validated facts are true now? |
| [`LEGACY_TOMBSTONES.md`](LEGACY_TOMBSTONES.md) | Which retired directions must not be revived? |
| [`CURRENT_HANDOFF.md`](CURRENT_HANDOFF.md) | What is done, active, pending, blocked, gated, and exactly next? |
| [`PRODUCT_MAP.md`](PRODUCT_MAP.md) | How do the current learner skills and shared systems connect? |
| [`DESIGN_CONTRACT.md`](DESIGN_CONTRACT.md) | How must responsive web map to the full native port? |

## Supporting evidence

`PROJECT_STATE.md`, `ARCHITECTURE_INVARIANTS.md`, `DOMAIN_BOUNDARIES.md`,
`ROADMAP.md`, release matrices, and tests remain authoritative in their bounded
roles. `DECISION_LOG.md` is append-only durable history and is consulted when a
relevant decision must be understood. Archived handoffs and historical release
evidence are not startup context.

## Update rule

Implementation fact must be verified before current memory changes. Durable
human-governed product philosophy must not be edited to excuse conflicting
code. Run:

```text
python scripts/validate_project_memory.py
```

before every coherent batch commit. Never store secrets or credential values
in project memory.
