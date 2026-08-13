# Shared Review Policy

This contract applies to ChatGPT, Codex, human reviewers, and future review
agents.

## Verdicts

- **APPROVE** — acceptance criteria and required evidence pass with no
  unresolved P0 or P1 finding.
- **REQUEST CHANGES** — at least one P0 or P1 remains, required evidence is
  missing, or the implemented scope is materially different from the approved
  task.

## Severity

- **P0** — critical safety, data, security, or production-correctness blocker.
- **P1** — must fix before merge.
- **P2** — non-blocking improvement unless the task or reviewer explicitly
  elevates it.

## Review rules

- Never report a false PASS.
- Review the actual diff and relevant repository state, not only an
  implementation report.
- Do not claim CI PASS without CI evidence. Local test PASS must be labeled as
  local execution.
- Scope creep is reviewable and may be a P1 when it increases risk or bypasses
  an approved boundary.
- A shared EN/ZH learner feature implemented for only one language without a
  valid linguistic reason is P1.
- Destructive persistence risk is P0 or P1 according to immediacy and blast
  radius.
- Stale canonical project-state documentation after a verified transition must
  be corrected before the stage closes.
- Unresolved P0 or P1 findings require REQUEST CHANGES.
- Once acceptance criteria pass, APPROVE and stop. Do not endlessly improve an
  already-passing scope.
- Validators and comparisons must not be weakened merely to produce PASS.
- Environment, packaging, data-compatibility, and application failures must be
  distinguished rather than hidden with product-code changes.
- Unexpected cross-domain changes require ownership and regression evidence.

## Required completion evidence

Every implementation or correction checkpoint reports:

- full commit SHA;
- exact files changed;
- tests and validators actually run;
- exact pass, fail, and skipped results;
- remaining blockers and P0/P1/P2 findings;
- protected-area changes;
- persistence or runtime changes;
- application and frontend version changes;
- deployment or production-operation changes;
- exact Git status;
- whether `PROJECT_STATE.md` changed;
- whether `CURRENT_HANDOFF.md` changed;
- whether a Decision Log entry was required.

Documentation-only work must not claim application behavior PASS merely
because no application code changed. Validate document scope, links,
consistency, versions, and diff hygiene instead.

## Stop behavior

Stop and involve the human coordinator when repository evidence materially
contradicts canonical state, credentials or production mutation are required,
a rollback path is unclear, a task crosses a human gate, or resolving repeated
P1 findings requires broader redesign than the accepted scope.
