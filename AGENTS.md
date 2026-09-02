# ORENA — ENGINEERING CONTRACT

## Project context first

Every implementation/review agent reads
[`docs/project/PROJECT_MEMORY.md`](docs/project/PROJECT_MEMORY.md) first and
follows its bounded startup order:

1. `docs/project/PROJECT_MEMORY.md`;
2. `docs/project/PRODUCT_CONSTITUTION.md`;
3. `docs/project/CURRENT_PRODUCT_STATE.yaml`;
4. `docs/project/LEGACY_TOMBSTONES.md`;
5. `docs/project/CURRENT_HANDOFF.md`;
6. only the relevant `docs/project/PRODUCT_MAP.md` section;
7. only the relevant `docs/project/ROADMAP.md` section;
8. relevant implementation and tests.

Read `docs/project/DECISION_LOG.md` only when a durable decision is relevant,
`docs/project/DESIGN_CONTRACT.md` for UI/native work, and
`docs/project/REVIEW_POLICY.md` before review or checkpoint acceptance.
`/resume-orena` performs the bounded restore.

Before relying on memory, inspect `git status`, current branch, HEAD, and the
last five commits. Agent chat history is not authoritative project state.

Product intent and implementation fact have different precedence. Follow the
exact model in `PROJECT_MEMORY.md`. If code contradicts durable product intent,
implementation is the suspect; report `MEMORY CONTRADICTION` rather than
rewriting governance to fit code.

A fresh agent must never infer current direction from directory names, old
filenames/classes/functions, archived scripts, stale screenshots, deprecated
routes, historical branch names/docs, or old comments. Orena is the active
product; `/` is canonical; `/becoming` and BECOMING-named filesystem symbols are
compatibility/history only.

An application/runtime baseline SHA records the verified state inherited by a
checkpoint. A newer docs-only or governance-only descendant `main` commit does
not alone create a contradiction or require refreshing that SHA. Refresh it
only after a reviewed change materially changes the documented application,
runtime, product, or operational facts.

## 1. Repository roles

`main` is the STABLE and VERIFIED branch.

Codex development must happen on `codex/*` branches or an explicitly approved
development branch. Do not perform experimental development directly on
`main`.

Before making any change:

1. inspect `git status`;
2. inspect the current branch and HEAD;
3. inspect the relevant existing implementation;
4. identify the stable baseline;
5. run appropriate baseline validation when feasible.

## 2. Development cycle

Every coherent change follows:

INSPECT → PLAN → IMPLEMENT → RUN → VERIFY FUNCTION → REGRESSION CHECK →
VISUAL CHECK when applicable → CHECKPOINT

Do not report success merely because code was written. Success requires actual
validation of the changed flow.

## 3. Regression rule

If a new change breaks previously stable behavior, stop. Do not continue with
a chain of compensating patches.

Instead:

1. identify the latest relevant change;
2. isolate the root cause;
3. roll back the latest change if required;
4. implement the minimum root-cause correction;
5. verify the original feature;
6. run regression checks;
7. only then continue.

Never weaken a validator merely to make a failing batch pass.

## 4. No hardcoding

Do not hardcode around failures, tests, users, languages, IDs,
environment-specific paths, migration records, API results, or UI state.

Prefer explicit contracts, configuration, repository abstractions,
deterministic mappings, reusable primitives, and real root-cause fixes.

## 5. Protected stable areas

Treat these as PROTECTED unless the current task directly requires them:

- Journey;
- Review;
- Library / Active Recall UI;
- shared layout primitives;
- shared CSS/JS design system;
- page gutter;
- card padding;
- section gaps;
- overflow behavior;
- content/container width primitives;
- the legacy-named `BECOMING_FRONTEND_VERSION` pin;
- R5 Grammar Knowledge System contracts, stable Grammar Concept IDs, and shared schema-v2 renderer;
- `docs/visual-references/**`.

Do not opportunistically refactor protected areas. If a task requires modifying
one, state why, make the minimum change, and verify it immediately.

## 6. Persistence safety

PostgreSQL is the authoritative runtime. SQLite is frozen rollback/archive
only.

The following invariants are mandatory:

- no dual-write;
- no reverse sync from PostgreSQL to SQLite;
- no silent SQLite fallback;
- no startup auto-import;
- no startup automatic Alembic;
- no destructive data migration without explicit human authorization;
- no deleting SQLite archives or PostgreSQL data volumes;
- no blindly recreating persistent data;
- no automatic production runtime activation or cutover;
- no billing, quota, or subscription enforcement without explicit scope.

Historical PostgreSQL shadow/import/cutover tooling may be inspected and tested
when explicitly scoped. Its presence does not make SQLite authoritative and
does not authorize production mutation.

## 7. Git safety

Forbidden:

- `git clean -fd`;
- arbitrary `git add -A`;
- destructive `git reset --hard` without explicit approval;
- force-push to `main`;
- automatic merge to `main`;
- deleting unrelated untracked files;
- rewriting verified history.

Allowed local untracked assets include `docs/visual-references/**`. These
assets must not be deleted as cleanup or staged without explicit scope.

Only stage files belonging to the current coherent change.

## 8. Docker safety

Only one Orena worktree may actively operate the shared Docker runtime/data
volumes at a time.

Before Docker work:

- ensure another development lane is not running a batch;
- preserve frozen SQLite archive/rollback data;
- preserve PostgreSQL production/shadow data unless an explicitly approved
  task requires otherwise.

An existing Docker volume warning is not itself a failure.

Never delete persistent volumes as cleanup. Never use
`docker compose down -v` for normal development or operations.

## 9. UI rules

Do not modify frontend/layout as part of backend architecture work unless
there is a direct dependency.

Maintain:

- EN/ZH responsive behavior;
- light/dark parity;
- accessibility;
- existing Orena visual identity;
- shared tokens and primitives.

Avoid duplicated page-specific shared CSS, nested card stacks, excessive
borders or shadows, and one-off visual hacks.

## 10. Investigation before implementation

For unfinished work, classify findings where useful as:

- STABLE;
- IN PROGRESS;
- PARTIAL;
- UI ONLY;
- DISCONNECTED;
- MISSING;
- DEFERRED;
- REGRESSION RISK.

Prefer completing partial or disconnected core-flow work over unrelated new
features.

## 11. Core learning flow

Preserve Orena as one connected learning system:

Listening ↔ Speaking ↔ Reading ↔ Writing, with Library / Active Recall,
Grammar, Dictionary, Progress, and Media Learning as shared infrastructure.

Changes must not silently disconnect a step or create parallel media,
progress, dictionary, vocabulary, scoring, or evidence systems.

Shared learner behavior applies to EN and ZH. Use language adapters only for
genuine linguistic differences, not duplicated product behavior.

## 12. Tests and execution environment

Use the application's actual runtime environment for tests requiring
application dependencies.

Do not assume the operator Python environment contains project packages such
as SQLAlchemy, Alembic, Psycopg, or pytest. When Docker is the runtime
dependency environment, run dependency-heavy validators inside the application
container.

Distinguish source failure, packaging failure, execution-environment failure,
data-compatibility failure, and real application regression. Do not patch
application logic to hide an environment problem.

Do not claim CI PASS without actual CI evidence. Label local test results as
local execution.

## 13. Direct script import rule

Before treating a direct Python script failure as an application regression,
check whether Python import-root or `sys.path` behavior caused it. Prefer
module execution where appropriate.

## 14. Project-memory update protocol

Every coherent batch follows IMPLEMENT → TEST → VERIFY → UPDATE PROJECT MEMORY
IF TRUTH CHANGED → `python scripts/validate_project_memory.py` → COMMIT.

- Treat `PRODUCT_CONSTITUTION.md`, fundamental `DESIGN_CONTRACT.md` principles,
  and `LEGACY_TOMBSTONES.md` as human-governed. Do not edit them merely to make
  current code look correct.
- Update `CURRENT_PRODUCT_STATE.yaml` only after verified current truth changes;
  its schema rejects arbitrary fields.
- Keep `CURRENT_HANDOFF.md` compact: branch/lane, last verified batch, DONE, IN
  PROGRESS, PENDING, BLOCKED, open P0/P1, human gates, exact next task.
- Follow `PROJECT_MEMORY.md` for the complete memory transaction and
  intent/fact precedence model.

- Update `PROJECT_STATE.md` only after a fact is verified. Its
  application/runtime baseline SHA is not a moving `main`-HEAD field.
- Update `CURRENT_HANDOFF.md` whenever active stage, ownership, status, human
  gate, or next checkpoint materially changes.
- Append to `DECISION_LOG.md` when a durable product or architecture decision
  changes.
- Change `ARCHITECTURE_INVARIANTS.md` only when an explicit accepted decision
  supersedes an invariant.
- Change `ROADMAP.md` only for approved roadmap or status transitions.
- Never silently rewrite past decisions or historical records.

When a decision changes:

1. append a new Decision Log entry;
2. mark the prior decision superseded;
3. update current invariants and state;
4. update the handoff when relevant.

## 15. Human gates

Agents must stop before:

- production PostgreSQL or production data mutation;
- production runtime activation or cutover;
- schema or Alembic migration not already explicitly approved;
- Cloudflare or DNS changes;
- Google OAuth configuration changes;
- secret or credential changes;
- paid-provider, billing, quota, or subscription-enforcement decisions;
- destructive Git operations;
- Docker volume deletion or `docker compose down -v`;
- public product release or learner-skill promotion;
- ambiguous architecture or product decisions;
- rollback-path removal;
- proceeding with an unresolved P0;
- repeated unresolved P1 findings requiring broader redesign.

## 16. Secret safety

Never print, commit, or document secret values. This includes API keys,
credential-bearing database URLs, database passwords, OAuth client secrets,
Cloudflare tunnel tokens, session secrets, and Authorization headers.

Environment variable names may be documented. Values must remain in approved
secret stores or operator-owned environments.

## 17. Completion report

At completion report:

- files changed and reason for each;
- tests and validators actually executed;
- exact passed, failed, and skipped results;
- remaining blockers and review findings;
- whether protected areas changed;
- whether persistence or runtime behavior changed;
- whether application or frontend versions changed;
- whether deployment or production operations changed;
- whether `PROJECT_STATE.md` changed;
- whether `CURRENT_HANDOFF.md` changed;
- whether a Decision Log entry was required;
- whether verified product truth changed and the project-memory validator
  passed;
- exact Git status and commit SHA when applicable.

Never merge to `main` automatically. Leave the result reviewable.
