# Orena Codex Product Status

Branch: `codex/work`

Purpose: record the current learner-facing implementation and human-review state.

This file is current-state only.

Do not turn it into a historical diary.

---

## Current milestone

CURRENT_MILESTONE: ORENA_UI_EXPLORATION_V1

STATUS: PLANNED

PRODUCT_GOAL:

Establish the first strong browser-reviewable visual and product direction for
the new Orena, grounded in the Product Constitution and Content Architecture.

The implementation should make the emerging Orena world visible before the
design direction is propagated broadly across the application.

The implementing agent may choose the strongest coherent preview surface and
solution.

---

## Human review

WEB_URL: TO_BE_CONFIRMED

WEB_ROUTE: TO_BE_CONFIRMED

HOW_TO_REACH_IT: TO_BE_CONFIRMED

LAST_HUMAN_APPROVED_MILESTONE: NONE_RECORDED

NEXT_REVIEWABLE_SLICE:

A substantial coded browser preview demonstrating the new Orena product and
visual direction, including the idea that Orena contains things worth
discovering rather than only exposing learning tools.

---

## Current reviewable experiences

| Experience | Status | Web route | EN  | ZH  | Cross-capability | Human review | Commit |
| ---------- | ------ | --------- | --- | --- | ---------------- | ------------ | ------ |

---

## Content architecture status

| Product requirement                                    | Current state                 | Target           |
| ------------------------------------------------------ | ----------------------------- | ---------------- |
| Shared discoverable Orena content world                | MISSING / NOT YET PRODUCTIZED | REQUIRED         |
| Orena-curated / provided Reading catalog               | MISSING                       | REQUIRED         |
| Reading learner-owned content import                   | MISSING                       | REQUIRED         |
| Generated Reading material                             | IMPLEMENTED / PARTIAL         | SUPPORTED SOURCE |
| Discoverable Listening media catalog                   | MISSING / PARTIAL FOUNDATION  | REQUIRED         |
| Listening learner media import                         | IMPLEMENTED / PARTIAL         | REQUIRED         |
| Shared Listening → Shadowing → Speaking media identity | IMPLEMENTED FOUNDATION        | REQUIRED         |
| Discoverable Speaking source experiences               | PARTIAL                       | REQUIRED         |
| Writing discoverable prompt / situation world          | PARTIAL                       | REQUIRED         |
| Writing free / custom starting point                   | IMPLEMENTED                   | REQUIRED         |
| Content provenance / rights metadata                   | PARTIAL                       | REQUIRED         |
| Learner-owned content collection                       | INCOMPLETE                    | REQUIRED         |
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

None recorded.

---

## Current product blockers

No approved visual/product direction has yet been established for the new Orena.

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
