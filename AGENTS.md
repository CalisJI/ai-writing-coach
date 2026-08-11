\# BECOMING — ENGINEERING CONTRACT



\## 1. Repository roles



`main` is the STABLE and VERIFIED branch.



Codex development must happen on `codex/\*` branches or an explicitly

approved development branch.



Do not perform experimental development directly on `main`.



Before making any change:

1\. inspect `git status`

2\. inspect the current branch and HEAD

3\. inspect the relevant existing implementation

4\. identify the stable baseline

5\. run appropriate baseline validation when feasible



\---



\## 2. Development cycle



Every coherent change must follow:



INSPECT

→ PLAN

→ IMPLEMENT

→ RUN

→ VERIFY FUNCTION

→ REGRESSION CHECK

→ VISUAL CHECK when applicable

→ CHECKPOINT



Do not report success merely because code was written.



Success requires actual validation of the changed flow.



\---



\## 3. Regression rule



If a new change breaks previously stable behavior:



STOP.



Do not continue with a chain such as:



fix A

→ break B

→ patch B

→ break C

→ patch C



Instead:



1\. identify the latest relevant change

2\. isolate the root cause

3\. rollback the latest change if required

4\. implement the minimum root-cause correction

5\. verify the original feature

6\. run regression checks

7\. only then continue



Never weaken a validator simply to make a failing batch pass.



\---



\## 4. No hardcoding



Do not hardcode around failures, tests, users, languages, IDs,

environment-specific paths, migration records, API results, or UI state.



Prefer:

\- explicit contracts

\- configuration

\- repository abstractions

\- deterministic mappings

\- reusable primitives

\- real root-cause fixes



\---



\## 5. Protected stable areas



Treat these as PROTECTED unless the current task directly requires them:



\- Journey

\- Review

\- Library / Active Recall UI

\- shared layout primitives

\- shared CSS/JS design system

\- page gutter

\- card padding

\- section gaps

\- overflow behavior

\- content/container width primitives

\- BECOMING frontend v2.15.7



Do not opportunistically refactor protected areas.



If a task requires modifying one:

1\. state why

2\. make the minimum change

3\. verify it immediately



\---



\## 6. Persistence safety



SQLite remains authoritative unless PostgreSQL runtime cutover is

explicitly approved.



PostgreSQL shadow may be:

\- migrated

\- refreshed

\- verified

\- compared



But do NOT automatically enable PostgreSQL runtime.



Forbidden without explicit approval:

\- PostgreSQL runtime cutover

\- destructive data migration

\- deleting SQLite databases

\- deleting PostgreSQL data volumes

\- recreating persistent data blindly

\- billing enforcement

\- quota enforcement

\- subscription enforcement



\---



\## 7. Git safety



Forbidden:



\- `git clean -fd`

\- arbitrary `git add -A`

\- destructive `git reset --hard` without explicit approval

\- force-push to `main`

\- automatic merge to `main`

\- deleting unrelated untracked files



Allowed local untracked assets:



`docs/visual-references/\*\*`



These assets must not be deleted as cleanup.



Only stage files belonging to the current coherent change.



\---



\## 8. Docker safety



Only one BECOMING worktree may actively operate the shared Docker

runtime/data volumes at a time.



Before starting Docker work:

\- ensure the other development lane is not running a batch

\- preserve SQLite data

\- preserve PostgreSQL shadow data unless a task explicitly requires otherwise



An existing Docker volume warning is not itself a failure.



\---



\## 9. UI rules



Do not modify frontend/layout as part of backend architecture work unless

there is a direct dependency.



Maintain:

\- EN/ZH responsive behavior

\- light/dark parity

\- accessibility

\- existing BECOMING visual identity

\- shared tokens/primitives



Avoid:

\- duplicated page-specific shared CSS

\- nested card stacks

\- excessive borders/shadows

\- one-off visual hacks



\---



\## 10. Investigation before implementation



For unfinished work, classify findings where useful as:



\- STABLE

\- IN PROGRESS

\- PARTIAL

\- UI ONLY

\- DISCONNECTED

\- MISSING

\- DEFERRED

\- REGRESSION RISK



Prefer completing partial/disconnected core-flow work over adding unrelated

new features.



\---



\## 11. Core learning flow



Preserve the existing learning flow:



Language / Goal

→ Writing

→ Submit

→ AI Analysis

→ Review

→ Evidence

→ Revision / Practice

→ Progress

→ Journey / Library

→ Return to Practice



Changes must not silently disconnect an existing step.



\---



\## 12. Tests and execution environment



Use the application's actual runtime environment for tests requiring

application dependencies.



Do not assume the operator/Hermes Python environment contains project

packages such as SQLAlchemy, Alembic, Psycopg, or pytest.



When Docker is the runtime dependency environment, run dependency-heavy

validators inside the application container.



Distinguish:

\- source failure

\- packaging failure

\- execution-environment failure

\- data compatibility failure

\- real application regression



Do not patch application logic to hide an environment problem.



\---



\## 13. Direct script import rule



Before treating a direct Python script failure as an application regression,

check whether the failure is caused by Python import-root / `sys.path`

behavior.



Prefer module execution where appropriate.



\---



\## 14. Completion report



At completion report:



\- files changed

\- reason for each change

\- tests actually executed

\- tests passed/failed

\- remaining blockers

\- whether protected areas changed

\- whether runtime cutover changed

\- exact Git status



Never merge to `main` automatically.



Leave the result reviewable.

