# Orena Codex Product Status

Branch: `codex/work`

Purpose: record the current learner-facing implementation and human-review state.

This file is current-state only.

Do not turn it into a historical diary.

---

## Current milestone

CURRENT_MILESTONE: ORENA_UI_EXPLORATION_V1

STATUS: REVIEWABLE

PRODUCT_GOAL:

Establish the first strong browser-reviewable visual and product direction for
the new Orena, grounded in the Product Constitution and Content Architecture.

The implementation should make the emerging Orena world visible before the
design direction is propagated broadly across the application.

The implementing agent may choose the strongest coherent preview surface and
solution.

---

## Human review

WEB_URL: http://localhost:8010/#/explore

WEB_ROUTE: /#/explore

HOW_TO_REACH_IT: Open the local preview directly, or use Orena · Explore / 探索 in the internal navigation. Normal onboarding applies on a fresh runtime.

LAST_HUMAN_APPROVED_MILESTONE: NONE_RECORDED

NEXT_REVIEWABLE_SLICE:

Human review of ORENA_UI_EXPLORATION_V1. Do not propagate the direction to another major surface until review.

---

## Current reviewable experiences

| Experience | Status | Web route | EN  | ZH  | Cross-capability | Human review | Commit |
| ---------- | ------ | --------- | --- | --- | ---------------- | ------------ | ------ |
| Field journal: The life between places | REVIEWABLE | /#/explore | Verified | Verified | Reading room → existing Library / Writing | Pending | Commit titled `feat: add Orena field journal UI exploration` |

---

## Content architecture status

| Product requirement                                    | Current state                 | Target           |
| ------------------------------------------------------ | ----------------------------- | ---------------- |
| Shared discoverable Orena content world                | BOUNDED GENERATED-FICTION PREVIEW | REQUIRED         |
| Orena-curated / provided Reading catalog               | MISSING                       | REQUIRED         |
| Reading learner-owned content import                   | TAB-LOCAL PASTED-TEXT PREVIEW                       | REQUIRED         |
| Generated Reading material                             | IMPLEMENTED / PARTIAL         | SUPPORTED SOURCE |
| Discoverable Listening media catalog                   | MISSING / PARTIAL FOUNDATION  | REQUIRED         |
| Listening learner media import                         | IMPLEMENTED / PARTIAL         | REQUIRED         |
| Shared Listening → Shadowing → Speaking media identity | IMPLEMENTED FOUNDATION        | REQUIRED         |
| Discoverable Speaking source experiences               | PARTIAL                       | REQUIRED         |
| Writing discoverable prompt / situation world          | PARTIAL                       | REQUIRED         |
| Writing free / custom starting point                   | IMPLEMENTED                   | REQUIRED         |
| Content provenance / rights metadata                   | PARTIAL                       | REQUIRED         |
| Learner-owned content collection                       | TAB-LOCAL PREVIEW / INCOMPLETE                    | REQUIRED         |
| Learner language / vocabulary collection               | IMPLEMENTED / PARTIAL         | REQUIRED         |
| Active Recall                                          | IMPLEMENTED                   | REQUIRED         |
| EN content-world quality                               | INCOMPLETE                    | REQUIRED         |
| ZH content-world quality                               | INCOMPLETE                    | REQUIRED         |

These rows describe product completeness, not release status.

An existing backend or isolated capability does not by itself satisfy a
discoverable learner-facing content requirement.

---

## Current product gaps

The current implementation contains strong learning foundations but does not yet
fully express the required product model:

Discover in Orena
OR
Bring your own
→ meaningful experience
→ appropriate learning capabilities
→ learner evidence
→ continuation.

Current implementation must not be treated as evidence that the content-world
requirements above are optional.

---

## Current technical blockers

No blocker to the local UI review. The legacy release-gate script fails identically
at starting commit `ad52307` and this checkpoint; see the exact evidence in
`docs/product/ORENA_UI_EXPLORATION_V1.md`. No release-gate or CI PASS is claimed.

## Preview truth

Three generated fictional encounters per learning language, an integrated reading
room, prepared contextual notes, pasted-text import, saved content, and personal
responses are implemented. Content relationships, imports, and responses are
tab-local presentation state, scoped by user and learning language. They are not
server Reading sessions, mastery, or recommendations. Expressions use the existing
PostgreSQL-backed Library API; responses transfer to the existing Writing draft
with source context. No configured AI provider is used by the local preview.

The preview is internal only and runs at localhost port 8010 with isolated,
temporary PostgreSQL data. Its review account contains explicitly performed QA
actions, not fabricated learner history. No production or public release changed.

---

## Current product blockers

The field-journal direction is implemented and REVIEWABLE; human approval remains pending.

---

## Current implementation rule

Implement one meaningful learner-facing vertical slice at a time.

The current UI exploration is allowed to inspect and compose enough existing
product surfaces to establish a coherent direction, but it must stop at a
substantial browser-reviewable checkpoint before broad propagation.

Before moving into another major learner-facing milestone:

1. make the current slice functional;
2. validate it;
3. expose it through the Orena web application;
4. update this file;
5. report the web route;
6. present it for human review.

`REVIEWABLE` does not mean `APPROVED`.

Only the human product owner can approve the current product direction.
