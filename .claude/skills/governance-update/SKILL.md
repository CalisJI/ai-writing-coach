---
name: governance-update
description: Apply Orena's repository-memory transaction when verified state, handoff, a durable decision, an invariant, or roadmap status changes.
disable-model-invocation: true
---

$ARGUMENTS describes what changed. Apply the AGENTS.md §14 protocol — pick the
right file, do not scatter the same fact across all of them.

## Which file changes

| File | Change it when |
| --- | --- |
| `CURRENT_PRODUCT_STATE.yaml` | Compact verified current truth changes; keep the schema valid. |
| `PRODUCT_CONSTITUTION.md` | Only explicit human authorization changes durable product intent. |
| `LEGACY_TOMBSTONES.md` | Only explicit human authorization retires/supersedes a direction. |
| `PROJECT_STATE.md` | A fact is **verified** by implementation, tests, operations evidence, or an accepted Git checkpoint. |
| `CURRENT_HANDOFF.md` | Current lane, status, blockers, gates, or exact next task changed; keep compact. |
| `DECISION_LOG.md` | A durable product or architecture decision changed — **append**, never rewrite. |
| `ARCHITECTURE_INVARIANTS.md` | An explicit accepted decision supersedes an invariant. |
| `ROADMAP.md` | An approved roadmap or status transition. |
| `DOMAIN_BOUNDARIES.md` | A bounded context is introduced or materially reassigned. |

## Rules

- **The application/runtime baseline SHA in `PROJECT_STATE.md` and
  `CURRENT_HANDOFF.md` is not a moving `main`-HEAD field.** Refresh it only
  after a reviewed change materially changes documented application, runtime,
  product, or operational facts. A docs-only or governance-only descendant
  commit does not require refreshing it and is not a contradiction.
- `PROJECT_STATE.md` records verified truth only — not plans, not narrative.
- Never silently rewrite a past decision or historical record. Historical
  cutover/migration/release docs stay as evidence of their time.
- Never write secret **values** into governance docs. Environment variable
  names are allowed; credential-bearing URLs, keys, tokens, and session secrets
  are not.

## When a decision changes

1. Append a new `DECISION_LOG.md` entry.
2. Mark the prior decision superseded and identify the new entry.
3. Update current invariants and verified state.
4. Update `CURRENT_HANDOFF.md` if active work is affected.

## Finish

Keep cross-references between the files internally consistent. Report which
files changed and why each one, and whether a Decision Log entry was required.
Run `python scripts/validate_project_memory.py`. Do not commit unless asked;
stage only the governance files belonging to this change.
