# BECOMING Project Context

This directory is the persistent context system for humans, ChatGPT, Codex,
review agents, and future domain agents working on the Orena / BECOMING
codebase. It keeps verified project truth, durable decisions, ownership, and
the current handoff in Git instead of relying on any one conversation.

The human remains the coordination layer between agents. Repository state and
these governance documents are the shared handoff medium.

## Mandatory read order

Before editing, every new agent must read in this order:

1. [`AGENTS.md`](../../AGENTS.md)
2. [`docs/project/README.md`](README.md)
3. [`PROJECT_STATE.md`](PROJECT_STATE.md)
4. [`ARCHITECTURE_INVARIANTS.md`](ARCHITECTURE_INVARIANTS.md)
5. [`CURRENT_HANDOFF.md`](CURRENT_HANDOFF.md)
6. [`DOMAIN_BOUNDARIES.md`](DOMAIN_BOUNDARIES.md)
7. the relevant section of [`ROADMAP.md`](ROADMAP.md)
8. the relevant implementation and tests

Read [`DECISION_LOG.md`](DECISION_LOG.md) when a task changes a durable product
or architecture decision. Read [`REVIEW_POLICY.md`](REVIEW_POLICY.md) before
reviewing or declaring a checkpoint complete.

## Which file answers which question?

| File | Question answered |
| --- | --- |
| `PROJECT_STATE.md` | What is verified true now? |
| `ARCHITECTURE_INVARIANTS.md` | What must not drift casually? |
| `CURRENT_HANDOFF.md` | What is active, what is next, and where must an agent stop? |
| `DOMAIN_BOUNDARIES.md` | Which domain owns the work and how are cross-domain changes handled? |
| `ROADMAP.md` | What is the approved sequence and current stage status? |
| `DECISION_LOG.md` | Why were durable product and architecture choices made? |
| `REVIEW_POLICY.md` | What evidence and severity rules govern review? |

## Source-of-truth precedence

When sources differ, use this precedence:

1. actual repository implementation, tests, and verified Git state
2. `PROJECT_STATE.md`
3. `CURRENT_HANDOFF.md`
4. `ARCHITECTURE_INVARIANTS.md`
5. `DECISION_LOG.md`
6. `ROADMAP.md`
7. older or historical documentation

A material contradiction is a stop condition. Do not silently select the
convenient source, reinterpret a historical record as current truth, or invent
a resolution. Report the conflicting files, implementation evidence, and Git
checkpoint to the human coordinator.

An application/runtime baseline SHA records the commit at which the documented
application, runtime, product, or operational facts were verified. A newer
docs-only or governance-only descendant `main` commit is not, by itself, a
contradiction and does not require refreshing that baseline. Refresh it only
when a reviewed change materially changes the facts it represents.

## Update responsibilities

- Update `PROJECT_STATE.md` only after a fact is verified by implementation,
  tests, operations evidence, or an accepted Git checkpoint. Its
  application/runtime baseline SHA is not a moving `main`-HEAD field.
- Update `CURRENT_HANDOFF.md` whenever active stage, task ownership, status,
  human-gate state, or next checkpoint materially changes.
- Append to `DECISION_LOG.md` when a durable product or architecture decision
  changes. Never silently rewrite a past decision.
- Change `ARCHITECTURE_INVARIANTS.md` only when an explicit accepted decision
  supersedes an invariant.
- Change `ROADMAP.md` only for approved roadmap or status transitions.
- Update domain ownership when a bounded context is introduced or materially
  reassigned.
- Every agent changing one of these files must keep cross-references and the
  current handoff internally consistent.

When a decision changes:

1. append a new Decision Log entry;
2. mark the prior decision superseded and identify the new entry;
3. update current invariants and verified state;
4. update the handoff when the active work is affected.

Historical cutover, migration, and release documents remain evidence of the
state at the time they were written. Do not rewrite them to pretend the project
was always in its current state.

## Human gates

Agents must stop and obtain explicit human authorization before:

- production PostgreSQL or production data mutation;
- production runtime activation or cutover;
- any schema or Alembic migration not already explicitly approved;
- Cloudflare or DNS changes;
- Google OAuth configuration changes;
- secret or credential changes;
- paid-provider, billing, quota, or subscription-enforcement decisions;
- destructive Git operations;
- Docker volume deletion or `docker compose down -v`;
- public product release or learner-skill promotion to public;
- an ambiguous architecture or product decision;
- removing a rollback path;
- proceeding with an unresolved P0;
- repeated unresolved P1 findings that require broader redesign.

Governance documents may name environment variables, but they must never
contain secret values, credential-bearing database URLs, OAuth client secrets,
Cloudflare tunnel tokens, session secrets, API keys, or authorization headers.
