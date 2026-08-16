# Orena Grammar M4.3 Phase 3 — English Representatives

Status: **IMPLEMENTED / UNIVERSAL + MOBILE HARDENING APPLIED / VISUAL RECHECK PENDING**

Phase 3 intentionally curates only three English lessons. It is a representative
quality gate, not a mass migration.

## Representative concepts

1. `a1-be-am-is-are`
   - beginner cognitive load
   - formula + semantic roles
   - statement/question/negative transformation
   - realistic self-introduction context

2. `a2-present-perfect-vs-past-simple`
   - time viewpoint rather than signal-word matching
   - timeline + contrast
   - finished-time mistake with WHY
   - active decision practice

3. `b1-passive-voice-present-and-past`
   - information focus, not mechanical word swapping
   - active → passive transformation
   - semantic sentence roles
   - optional by-agent restriction
   - sentence construction

## Content hard gates

Each representative must preserve its stable Grammar Concept ID, remain Static KB
content with `runtime_ai=false`, use the full cognitive flow, include realistic
context, Common Mistake with WHY, Apply/Recall/Transfer learner evidence, a compact
Memory Hook, and cross-skill transfer. Activity completion is not mastery.

## Scope hard gate

Until Phase 3 visual approval and Phase 4 Chinese approval:

- exactly these three English entries may be `curated`
- all other English KB entries remain `foundation`
- Chinese grammar knowledge remains unchanged
- English and Chinese curriculum JSON remain unchanged
- full 508-item migration remains BLOCKED

## Visual QA — required before Phase 3 approval

Automated tests do **not** approve visual quality.

Capture and review all three representatives on desktop and mobile:

- A1 Be — desktop + mobile
- A2 Present Perfect vs Past Simple — desktop + mobile
- B1 Passive — desktop + mobile

Review meaning-before-formula, first-glance hierarchy, semantic labels, no card-wall,
no horizontal scrolling, timeline clarity, transformation clarity, Common Mistake
incorrect → WHY → corrected, decision-oriented micro-practice, personal connection,
active recall, and transfer to Writing/Speaking/Reading/Listening. A1 must not
overload; A2 must make viewpoint/time visible; B1 must show information-focus nuance.

**Phase 3 cannot be marked APPROVED until screenshot QA is completed.**

## Phase 3A universal hardening

The representative English content now uses Grammar Learning Model schema v2 and
the universal language-context contract.

The renderer separates target, interface, explanation and translation languages.
English screenshot QA must be repeated after this change.

Phase 3 remains **VISUAL RECHECK PENDING**. This branch must not be merged and the
508-item migration must not start until the representative visual gate passes.


## Phase 3B mobile hardening

Real screenshot QA after Phase 3A showed that the universal Formula component could
still overflow at mobile-like widths above 430px. Phase 3B therefore moves the
shared lesson/mobile composition breakpoint to 640px and constrains the complete
rich-learning frame hierarchy rather than hiding overflow.

This is a shared block/capability layout rule, not an English-specific patch.

Phase 3 is still **VISUAL RECHECK PENDING**. The three English representatives must
pass desktop/mobile review before this template may be rolled out to the remaining
grammar content and other supported languages.
