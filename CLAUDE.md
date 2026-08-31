# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Read the engineering contract first

@AGENTS.md is the binding contract for this repo. Read it before editing, plus
the mandatory doc order it names (`docs/project/PROJECT_STATE.md` →
`ARCHITECTURE_INVARIANTS.md` → `CURRENT_HANDOFF.md` → `DOMAIN_BOUNDARIES.md` →
relevant `ROADMAP.md` section). `/load-context` does this.

Source-of-truth precedence: repository implementation and verified Git state >
`PROJECT_STATE.md` > `CURRENT_HANDOFF.md` > `ARCHITECTURE_INVARIANTS.md` >
`DECISION_LOG.md` > `ROADMAP.md` > historical docs. A material contradiction is
a stop condition — report it, do not resolve it yourself.

## Test and validation runtime

The operator's Python 3.11 has **no project dependencies** (no pytest,
SQLAlchemy, Alembic, psycopg). Run dependency-heavy tests and validators inside
the app container:

```powershell
MSYS_NO_PATHCONV=1 docker compose run --rm --no-deps \n  -e PERSISTENCE_BACKEND=sqlite -e POSTGRES_RUNTIME_URL= \n  -v "<abs-windows-path>:/workspace:ro" -w /workspace writing-coach \n  sh -lc "pip install -q pytest; python -m pytest -q -p no:cacheprovider test_app.py tests"
```

Three things that will otherwise cost you an hour:

- The image does **not** ship pytest (`requirements.txt` omits it) — install it in
  the ephemeral container, as above.
- Git Bash rewrites `-w /workspace` into `C:/Program Files/Git/workspace`. Prefix
  with `MSYS_NO_PATHCONV=1` and pass the volume source as a Windows path.
- Compose always injects `POSTGRES_RUNTIME_URL`, which makes
  `test_invalid_and_postgres_fail_without_bundle` fail inside the container while
  passing in CI. Clear it with `-e POSTGRES_RUNTIME_URL=`. Full suite is
  **503 passed** when you do.

Pure-stdlib validators (`scripts/validate_*.py` that only read files) and the
Node contract tests run on the host:

```powershell
python scripts/validate_architecture.py
node scripts/test_listening_ui.mjs
```

`scripts/` holds ~40 `validate_*.py` / `audit_*.py` gates and ~30 `test_*.mjs`
Node contract tests. CI (`.github/workflows/ci.yml`) runs
`validate_architecture.py`, nine specific `.mjs` tests, then
`pytest -q test_app.py tests` with `PERSISTENCE_BACKEND=sqlite`. `/validate-gate`
reproduces that sequence.

Linting is ruff, **lint-only** (`ruff.toml`) — no formatter is configured, since
reformatting would produce large diffs across protected areas. Ruff is not in
`requirements.txt`; install it separately (`pip install ruff`) and lint the files
you touched: `ruff check <path>`. There is no `package.json` — `.mjs` tests run
under bare `node`.

## Branching

Work on `claude/<task>` branches, mirroring the `codex/*` lane convention. Never
develop directly on `main`; never auto-merge to `main`. Stage only files
belonging to the current coherent change — `git add -A` is forbidden.

## Shared Docker runtime — three worktrees

`git worktree list` shows three lanes (`...-v030`, `...-claudecode`,
`...-codex`) sharing one Docker runtime and one set of named volumes
(`ai-writing-coach-data`, `ai-writing-coach-postgres-data`). Only one lane may
operate Docker at a time — confirm no other lane is running a batch first.

Never `docker compose down -v`. Never delete persistent volumes as cleanup.

## Persistence invariants

PostgreSQL is the authoritative runtime; SQLite is frozen rollback/archive
only. No dual-write, no reverse sync, no silent SQLite fallback, no startup
auto-import, no startup automatic Alembic.

## Environment

Copy `.env.example` to `.env` (`start_docker.ps1` does this). Never print,
commit, or document secret **values** — variable names are fine.

## Protected areas

Do not opportunistically refactor Journey, Review, Library / Active Recall UI,
shared layout primitives, the shared CSS/JS design system, R5 Grammar contracts
and Concept IDs, or `docs/visual-references/**`. If a task requires touching
one, state why, make the minimum change, verify immediately.

## Reporting

Do not report success because code was written — success requires validating the
changed flow. Label local runs as local execution; never claim CI PASS without
CI evidence. `/completion-report` emits the required §17 report.

<!-- The Codex import appended a full copy of AGENTS.md here. Removed: it is
     already pulled in by the @AGENTS.md import above, and duplicating it
     loaded the contract twice into every session. -->
