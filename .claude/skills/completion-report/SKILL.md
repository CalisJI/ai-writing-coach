---
name: completion-report
description: Emit the AGENTS.md §17 completion report for the work just finished — files changed, validators actually executed with exact results, protected areas, persistence/runtime impact, governance changes, and Git state.
disable-model-invocation: true
---

Gather real evidence first — do not fill this in from memory or intent:

```powershell
git status
git log --oneline -3
git diff --stat HEAD
```

Then emit exactly these sections. Write "none" where a section does not apply;
do not omit a section.

1. **Files changed** — each file with the reason it changed.
2. **Tests and validators actually executed** — the exact commands run.
3. **Results** — exact passed, failed, and skipped counts per command. Label
   local runs as **local execution**; never claim CI PASS without CI evidence.
4. **Remaining blockers and review findings** — including severity (P0/P1).
5. **Protected areas** — did any change? (AGENTS.md §5: Journey, Review, Library
   / Active Recall UI, shared layout primitives, shared CSS/JS design system,
   page gutter, card padding, section gaps, overflow, width primitives, the
   frontend version pin, R5 Grammar contracts and Concept IDs,
   `docs/visual-references/**`, and human-governed project-memory files.)
   If yes, state why and what verified it.
6. **Persistence or runtime behavior** — did it change?
7. **Application or frontend versions** — did `VERSION` or
   `BECOMING_FRONTEND_VERSION` change?
8. **Deployment or production operations** — did anything change?
9. **`PROJECT_STATE.md`** — changed?
10. **`CURRENT_HANDOFF.md`** — changed?
11. **Decision Log entry** — was one required? Was it written?
12. **Project memory** — did verified truth change, was the correct memory file
    updated, and did `validate_project_memory.py` pass?
13. **Git state** — exact `git status` summary, branch, and commit SHA when
    applicable.

Success requires actual validation of the changed flow, not that code was
written. If the flow was not validated, say so plainly in section 4.

Never merge to `main` automatically. Leave the result reviewable.
