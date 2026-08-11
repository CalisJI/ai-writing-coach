# BECOMING Upgrade Incident Ledger

This file is a permanent input to future upgrade work. A new release must not reintroduce a failure already recorded here.

## INC-001 — Protected page smoke test treated login redirect as route failure
**Symptom:** `/becoming` installer check failed although the page existed.
**Cause:** PowerShell request had no browser auth cookie and followed the expected login redirect.
**Permanent guard:** protected page existence is validated from the FastAPI route table; unauthenticated HTTP is not used as proof that a protected page is missing.

## INC-002 — New frontend file existed on host but not in running container
**Symptom:** backend healthy; new CSS/JS returned 404.
**Cause:** frontend source was baked into the Docker image and local iteration could run against stale image contents.
**Permanent guard:** local Compose must retain read-only bind mounts for `static`, `templates`, `app.py`, and `writing_coach`, while preserving `writing_data:/data`.

## INC-003 — BECOMING assets coupled to legacy `/static/becoming/*`
**Symptom:** host/container hashes matched but new BECOMING asset still returned 404 through the legacy static path.
**Permanent guard:** BECOMING template uses dedicated `/becoming-assets/*`; release gate rejects `/static/becoming/*`.

## INC-004 — PowerShell query-string interpolation removed asset filename
**Symptom:** expected `.../phase3.css?v=...`; actual request became `.../=2.2.2`.
**Cause:** unsafe `"$asset?v=..."` interpolation.
**Permanent guard:** always use `"${asset}?v=..."`; release gate scans every `.ps1` for `$variable?`.

## INC-005 — Phase 4 service module worked but API router did not appear in `app.routes`
**Symptom:** memory self-test passed and schema v7 was healthy, but `/api/learner-profile` and `/api/learning-memory` were absent from the FastAPI app.
**Cause:** route ownership was hidden behind module-level `APIRouter` installation; runtime registration did not satisfy the final app contract.
**Permanent guard:** `writing_coach/becoming_memory.py` is service-only. The three Phase 4 routes are declared explicitly in `app.py`. Release gate rejects `APIRouter`, `@router.*`, `app.include_router` inside the service module, and asserts exact route declaration counts in `app.py`.

## Release policy
When a new incident is found:
1. fix the defect;
2. add a deterministic regression check;
3. add the incident here;
4. make future installers run the release gate before runtime validation.

A fix is incomplete if it only makes the current installer pass.


## Phase 5 release contract — Personalized Practice
This is not a new incident; it is a permanent extension of the stabilized route policy.

Required explicit routes in `app.py`:
- `GET /api/practice-recommendation`
- `POST /api/practice/next`

`writing_coach/becoming_practice.py` must remain service-only:
- no `APIRouter`
- no `@router.*`
- no hidden `app.include_router`

Personalization rules live on the server. The frontend consumes recommendations and must not independently duplicate the recommendation algorithm.


## Phase 6 release contract — Practice Outcome Loop
This phase closes the personalized-practice loop without a new database schema.

Required explicit routes in `app.py`:
- `GET /api/practice-outcome/{essay_id}`
- `GET /api/practice-outcomes`

`writing_coach/becoming_outcomes.py` must remain service-only:
- no `APIRouter`
- no `@router.*`
- no hidden `app.include_router`

Practice context must be persisted in the existing `essays.module_data_json` under the `practice` key.

A practice outcome must remain conservative:
- absence of a matching error in one piece is not mastery;
- transfer is claimed only when positive evidence exists in the target family and no matching issue is present;
- revision improvement is based on before/now evidence for the same practice focus.

The frontend must not infer an outcome independently from score changes.


## INC-006 — Upgrade patcher left an extra blank line at `app.py` EOF
**Symptom:** every functional/runtime gate passed, then `git diff --check` failed with `new blank line at EOF`.
**Cause:** the patcher appended a route block that already ended with a newline and then appended another newline.
**Permanent guard:** source patchers must normalize generated `app.py` to exactly one final newline. `becoming_release_gate.py` checks this before container recreation/runtime checks. `git diff --check` remains the final independent guard.

The Windows `LF will be replaced by CRLF` message is a Git line-ending warning and is not itself the whitespace error that caused this incident.


## Phase 7 release contract — Vocabulary Library
This phase introduces the first new learner surface after the Writing loop was stabilized.

Required explicit routes in `app.py`:
- `GET /api/library/vocabulary`
- `POST /api/library/vocabulary`
- `POST /api/library/vocabulary/{word}/review`
- `DELETE /api/library/vocabulary/{word}`

`writing_coach/becoming_library.py` must remain service-only:
- no `APIRouter`
- no `@router.*`
- no hidden `app.include_router`

The existing legacy endpoints must remain available:
- `GET /api/dictionary`
- `GET /api/vocabulary`
- `POST /api/vocabulary`
- `DELETE /api/vocabulary/{word}`

The new Library augments the old saved-word store instead of replacing it, so old UI behavior and user vocabulary are preserved.

Recall stages are internal availability labels only. `Got it` is self-reported recall evidence; it is not a benchmark score or mastery claim.


## Phase 8 release contract — Reading Studio
Phase 8 introduces persisted reading practice while preserving all Writing/Library behavior.

Required explicit routes in `app.py`:
- `GET /api/reading/sessions`
- `GET /api/reading/session/{session_id}`
- `POST /api/reading/session`
- `POST /api/reading/session/{session_id}/answer`

`writing_coach/becoming_reading.py` must remain service-only:
- no `APIRouter`
- no `@router.*`
- no hidden `app.include_router`
- no direct Ollama/provider HTTP calls

Reading generation must use the existing shared `generate_structured` abstraction configured from `app.py`.

Correct answer indices, explanations, and evidence fragments must remain server-side until the learner submits answers. A session GET before submission exposes only question text and options.

Every generated comprehension answer must include an exact `evidence_fragment` that literally occurs in the saved passage. Invalid generated material falls back to built-in practice instead of exposing unsupported answer explanations.

Library recycling is evidence-based: a saved term is labeled as recycled only when it actually occurs in the final passage.


## INC-007 — Programmatic main-content focus rendered full-page orange rails
**Symptom:** after reload/route render, two orange vertical lines ran down both sides of the content area.
**Cause:** `renderCurrent()` correctly focuses `#mainContent` for accessibility, but the global interactive `:focus-visible` ring was also applied to the full-height content container.
**Permanent guard:** preserve programmatic main-content focus for accessibility while suppressing only the visual outline on `.main-content:focus/.main-content:focus-visible`. Interactive buttons, inputs, links, skip links, and other controls keep visible focus indicators.

## INC-008 — Draft and Review evidence leaked across learning-language switches
**Symptom:** switching between English and Chinese while Writing/Revising could keep incompatible text/evaluation state.
**Cause:** one global `becoming.draft.v1` localStorage record and language-derived in-memory state were shared across learning spaces.
**Permanent guard:** drafts are stored by learning language (`becoming.draft.v2.<language>`), the legacy draft is migrated only to the inferred matching language, and a language switch invalidates dashboard/memory/review/reading-derived state before rendering the target language. A Review created in one language cannot remain active after switching learning language.

## UI/UX batch polish contract — Native guidance and evidence clarity
The learner profile now includes additive `native_language` support metadata. Existing profiles are migrated idempotently with default `vi` and no profile row is recreated.

Native/support copy is centralized in `domain/support.js`; do not scatter parallel translations across individual screens.

Dictionary/Pinyin/Hanzi assistance must reuse the existing `/api/dictionary` path. The Hanyu-style grid supports character-shape tracing only; stroke order must not be claimed unless a verified dictionary source later provides it.

Strong Version stays a Review/work comparison surface. Do not turn it into a decorative 3D identity moment.

Writing progress belongs in the existing Journey evidence flow. Do not introduce a generic KPI dashboard route for this polish.

## INC-009 — Async learner actions looked inert before data arrived
**Symptom:** dictionary/Pinyin and some generated actions could take noticeable time with no immediate visual response, so the learner could assume the control did nothing and click again.
**Cause:** loading treatment was implemented ad hoc per screen instead of through one interaction primitive.
**Permanent guard:** user-triggered async actions use shared busy primitives (`spinner`, `setBusy`, `runBusy`, `showLoadingDialog`) and enter a visible busy/disabled state immediately. Dictionary/Pinyin opens a loading dialog before awaiting the existing dictionary API.

## INC-010 — Interface language was only partially applied
**Symptom:** choosing Vietnamese/English/Chinese as the native/support language could leave mixed headlines, slogans, buttons, tooltips and status labels on the same page.
**Cause:** interface copy was split between hardcoded screen strings, learning-language config labels, and partial `support.js` guidance.
**Permanent guard:** interface locale is a first-class shared layer (`domain/i18n.js`) independent of learning language. Global chrome and all current screen modules consume the shared `t()` contract. Vietnamese-only backend helper fields are shown only when the interface locale is Vietnamese. New routes must satisfy the release-gate i18n contract.

## INC-011 — New modules could bypass BECOMING product-design intent
**Symptom:** future screens could technically compile while omitting the learner goal, dominant idea, primary action, progressive disclosure, or evidence model.
**Cause:** design philosophy existed only in documentation, not as a release contract.
**Permanent guard:** every router route must have a matching entry in `domain/screen-contract.js` with `learnerGoal`, `dominantIdea`, `primaryAction`, `progressiveDisclosure`, and `evidence`. `app.js` checks the contract at runtime and the release gate blocks route/contract mismatch.

## v2.7.2 profile ownership — curated theme + earned Growth Rank
- `theme_preset` is additive learner-profile metadata and must migrate idempotently from schema v10.
- Palette selection changes only shared theme tokens; it does not create a parallel component/design system.
- Growth Rank is an original BECOMING identity frame derived from repeated Writing evidence, revision wins and stable strengths. It is not activity XP, a streak system, leaderboard position, or equivalence to CEFR/HSK/TOEIC/IELTS.
- Rank visuals may use restrained identity-moment depth because Profile achievement is an identity/achievement context; do not copy any game badge, logo, tier name, or copyrighted rank artwork.

## v2.7.2 Chinese Review Pinyin contract
Pinyin assistance belongs directly in Chinese Review when the profile setting is `auto` or `on`.

The current product does not invent full-sentence Pinyin. Visible Review evidence requests phonetic/Pinyin through the existing dictionary API, shows a spinner immediately, and shows an honest unavailable state when the current dictionary source cannot provide phonetic data.

Setting `off` removes Review Pinyin assistance. No new provider or AI path is introduced.


## VISUAL-001 — Flat / same-weight composition can pass functional tests but still miss BECOMING visual quality
**Symptom:** the product is functionally correct yet major screens feel assembled from bordered sections rather than composed around one meaningful object. Journey may become equal metric cards; Review may give supporting metrics the same weight as the current bottleneck; important surfaces may rely on borders instead of tonal/material separation.

**Root cause:** visual philosophy existed as documentation but contrast, material, depth, hero presence, and screen-level composition were not encoded into the permanent release contract.

**Permanent guard:** BECOMING v2.8 introduces one shared visual-alignment layer and extends every learner screen contract with:

```text
visualHero
surfaceHierarchy
themeBias
accentPolicy
```

The release gate requires reusable depth/material tokens, one intentional hero/focal object on every current major screen, a light-first default, and specific Journey/Review hierarchy rules. Future routes must declare the same visual contract before release.

The visual layer must remain presentation-only: no scoring, AI/provider, API, or persistence logic.

## VISUAL-002 — Canonical visual boards can be copied superficially while the real product remains generic
**Symptom:** a screen may adopt orange, rounded cards, and shadows yet still feel like a generic SaaS dashboard because navigation, learner work, supporting evidence, and hero surfaces have equal or weak presence.

**Root cause:** treating the approved Light/Dark boards as a styling palette instead of a visual-grammar benchmark.

**Permanent guard:** BECOMING v2.9 transfers the canonical grammar into the real shell and Home composition without copying the demo layout:

```text
editorial statement
→ learner work as the dominant tactile object
→ one evidence-based journey object
→ quiet supporting signals
→ recent real work
```

The global learner IA remains Home / Write / Read / Library / Journey / Profile. Placement may adapt by viewport, but routes and product responsibilities do not change.

Visual references may contain illustrative streaks, milestones, books, percentages, or demo content. Those are calibration examples only. Production UI must render only product-backed learner data; never hardcode fake streaks, XP, milestones, scores, or activity simply to look closer to a reference.

## VISUAL-003 — Icon-bearing navigation can regress when localization replaces anchor textContent
**Symptom:** localized navigation works when links contain text only, then SVG icons disappear after interface-language changes.

**Root cause:** the localization layer assigns `link.textContent`, which destroys child icon markup.

**Permanent guard:** global navigation labels live in `[data-i18n-label]` descendants. Interface localization updates that label node only and must preserve route icon markup and accessible navigation structure.


## INC-012 — Journey called `revisionList()` after the helper was dropped
**Symptom:** Journey shell rendered, then the screen showed `revisionList is not defined`.

**Root cause:** a later visual source replacement retained `${revisionList(groups)}` but omitted the stable helper from the previous Journey implementation.

**Permanent guard:** release validation requires both the `revisionList(groups)` declaration and its integrated call site. Visual refactors must not replace a screen file without preserving its functional helpers.

## INC-013 — Nested tooltips were clipped by functional surfaces
**Symptom:** help text opened only partially or disappeared behind the upper edge of Library/Review surfaces.

**Root cause:** `helpTip()` placed an absolutely positioned popover inside the trigger's current DOM subtree. Ancestors with `overflow:hidden` clipped the popup.

**Permanent guard:** explanatory tooltips use one fixed-position `document.body` portal. Screens must not solve tooltip clipping by removing functional overflow rules from unrelated surfaces.

## INC-014 - Long comparison dialog lost its scroll owner

Observed:
- a long Stronger Version comparison dialog could render beyond the viewport;
- lower content could not be reached.

Root cause:
- the overlay/dialog shell had clipping behavior without an explicit internal flex + min-height + overflow-y scroll contract.

Permanent rule:
- long comparison dialogs must use an internal scroll owner;
- dialog shell must remain flex-column with bounded viewport height;
- scroll owner must use min-height:0 + overflow-y:auto;
- comparison cards must not own competing vertical scroll;
- this must be validated independently from visual styling.

## INC-015 - Learner sections bypassed one shared horizontal gutter

Observed:
- major sections on the same route could have different left/right edges;
- some sections inherited local padding/max-width while others approached the workspace edge;
- two-column compositions could have inconsistent outer breathing room.

Root cause:
- page gutter responsibility was fragmented between route roots, section wrappers and cards.

Permanent rule:
- page/container owns horizontal gutter and max-width;
- cards own internal padding only;
- learner routes must pass through one shared page-container primitive;
- accidental 100vw/full-bleed major sections are release blockers unless explicitly documented.

## INC-016 - Internal padding did not create an outer page gutter

Observed after v2.15:
- large route surfaces still approached the workspace edge;
- their inner content moved inward, but the physical surface itself did not.

Root cause:
- v2.15 expressed page gutter as `padding-inline` on the selected page root;
- on routes where the selected root itself was the major physical surface, this was an internal inset, not an external page gutter.

Permanent rule:
- page gutter must be proven on the OUTER edge of the actual route/page root;
- live route geometry must be measured, not inferred from synthetic fixtures;
- synthetic screenshots are not sufficient evidence for live layout completion.

