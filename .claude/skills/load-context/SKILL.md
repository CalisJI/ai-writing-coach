---
name: load-context
description: Load the mandatory BECOMING project context before editing — reads AGENTS.md and the docs/project governance files in required order, then summarizes the active lane, human gates, and protected areas. Use at the start of any task that will change code, docs, or configuration in this repo.
---

Read these files in this exact order (AGENTS.md "Project context first"):

1. `AGENTS.md`
2. `docs/project/README.md`
3. `docs/project/PROJECT_STATE.md`
4. `docs/project/ARCHITECTURE_INVARIANTS.md`
5. `docs/project/CURRENT_HANDOFF.md`
6. `docs/project/DOMAIN_BOUNDARIES.md`
7. the `docs/project/ROADMAP.md` section for the active program

Read `docs/project/DECISION_LOG.md` only if the task changes a durable product
or architecture decision. Read `docs/project/REVIEW_POLICY.md` before reviewing
or declaring a checkpoint complete.

Then inspect actual state: `git status`, current branch, HEAD SHA,
`git worktree list`.

Report back, concisely:

- **Active program and stage** — from `CURRENT_HANDOFF.md`, with status labels.
- **Closed/protected programs** the task must not reopen.
- **Application/runtime baseline SHA** and whether HEAD is a docs-only
  descendant of it (a docs-only descendant is not a contradiction).
- **Protected areas** from AGENTS.md §5 that this task would touch, if any.
- **Human gates** from §15 that this task would hit — stop and ask before those.
- **Persistence/runtime facts** relevant to the task.
- **Any material contradiction** between sources. Precedence: implementation and
  verified Git state > `PROJECT_STATE.md` > `CURRENT_HANDOFF.md` >
  `ARCHITECTURE_INVARIANTS.md` > `DECISION_LOG.md` > `ROADMAP.md` > historical
  docs. A contradiction is a stop condition — report it, do not resolve it.

Do not begin implementation from this skill. It ends with the summary.
