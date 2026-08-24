# Current Handoff

**Application/runtime baseline:**
`91276425bce28b93d2ce449a2a61460ae44761dd`

This baseline is the locally verified Orena UI/UX `2.17.5` integration code
checkpoint. It inherits the reviewed R5 Grammar Knowledge System closeout
(PR #44). Documentation-only descendants may advance without changing this
baseline.

**Primary active program:**

- R3 — Writing Evaluation Completion: **IN PROGRESS / PRIMARY**

**Secondary / gated programs:**

- R6 — Speaking Core: **IN PROGRESS / INTERNAL / SECONDARY**
- R2 — AI Capability Control Plane: **HUMAN GATE / READY, NOT PRODUCT-BLOCKING**

**Closed programs protected from casual rewrite:**

- R5 — Grammar Knowledge System: **CLOSED**
- M1 — Media Learning Foundation: **CLOSED / FOUNDATION COMPLETE**
- R1 — Production Staging + Cloudflare + Google OAuth: **CLOSED / PASS**
- R0 — Product Release Architecture: **CLOSED**

## Active cross-cutting integration — Orena UI/UX 2.17.5

Branch: `codex/orena-ui-ux-integration`

Code checkpoint: `91276425bce28b93d2ce449a2a61460ae44761dd`

Status: **LOCAL AUTOMATION + BRAVE VISUAL QA PASS / HUMAN ACCEPTANCE PENDING / NOT DEPLOYED**

- Selected UI commits from `claude/work` are integrated over the latest
  `origin/main`; Claude-specific tooling and broad validator archival were
  excluded as out of scope.
- Orena shell, Home, Writing, Review, sign-in, responsive navigation,
  accessible select fields, learner mastheads, and bounded Listening UX are
  present at frontend `2.17.5`.
- Profile / Preferences now follows the supplied Orena-prod desktop,
  light/dark, and mobile hierarchy while retaining the real EN/ZH learning
  switch, interface language, goal, guidance, Pinyin, palette, account, and
  evidence-derived Growth Rank contracts.
- The failed first human review identified uneven row geometry and corrupted
  glyph-based language flags. Checkpoint `30876d9` carries forward the CSS-drawn
  flags and shared control track from `b216ac1`, corrects the desktop frame and
  column gap against Orena-prod, restores SVG strokes, adds balanced mobile
  gutters and a centered Profile title, and prevents open mobile listboxes from
  widening the document.
- Grammar opened lessons now follow the supplied Orena-prod hierarchy: focused
  lesson header, Pattern, paired explanatory cards, full-width comparison and
  mistake/practice stages, plus a truthful progress/outline/action rail. The
  full curriculum is hidden only while a lesson is open and returns through a
  functional Back control. Mobile keeps Pattern and practice visible and turns
  five informational sections into accessible disclosure rows.
- This Grammar presentation layer is scoped to the protected Grammar route. It
  does not change R5 curriculum content, stable concept IDs, Static Grammar KB,
  schema-v2 rendering, or completion-evidence semantics.
- Integration fixes preserve Writing practice context, Dictionary/Pinyin,
  Review POS lens, Chinese Review Pinyin, and the UI-03 shared primitive
  contract.
- Local evidence for the correction: Profile and Grammar contracts,
  architecture, UI-03,
  ESM graph (`48 modules`), Docker build, and isolated runtime smoke PASS;
  JavaScript `29 passed` with two unchanged failures in protected R5/Speaking
  tests. The inherited backend regression remains `503 passed, 3 warnings`.
- Brave rereview PASS at desktop/mobile reference dimensions in light/dark and
  VI/ZH interface states. Desktop measured `830px + 26px + 294px`; mobile cards
  retained `12px` side gutters; the open `190px` language panel retained
  `scrollWidth == clientWidth` and `scrollX == 0`; no mojibake or console
  warnings/errors were observed. Remaining gate: human screenshot acceptance.
- Grammar Brave QA PASS in light/dark and desktop/mobile layouts: measured
  desktop lesson/rail geometry `815px + 26px + 294px`; mobile `scrollWidth ==
  clientWidth`, five disclosures toggled with correct `aria-expanded`, Back and
  outline navigation worked, and console warnings/errors were zero.
- No production runtime, PostgreSQL data, deployment, OAuth, Cloudflare,
  release state, application version, or public skill state changed.

## Newly completed

### R5 Grammar Knowledge System

R5 closed via PR #44.

Verified closeout:

- EN `269 / 269`;
- ZH `239 / 239`;
- total `508 / 508`;
- schema-v2 source-backed concept-specific models `508 / 508`;
- Grammar runtime AI `0`;
- representative expert-reviewed `3`;
- expert-validation-pending `505` as a deferred content-quality track.

Protected contracts:

- stable Grammar Concept IDs;
- Static Grammar KB remains source of truth;
- shared schema-v2 renderer;
- target/interface/explanation/translation language separation;
- capability-driven Chinese reading aid/Pinyin;
- completion records learning activity evidence, not CEFR/HSK mastery;
- superseded structural migration write paths must not overwrite current
  concept-specific authoring.

Future Writing/Speaking/Reading/Listening work consumes R5 through contracts and
IDs. It does not create a second Grammar system.

### M1 Media Learning Foundation

M1.1 through M1.6 are all closed and merged, so the foundation program is now
closed. Shared Media Learning remains the canonical contract for external media,
timestamped transcript segments, translation, Listening consumption, and
Speaking Shadowing consumption.

Future durable Listening progress belongs to R11. Advanced Shadowing belongs to
R9. Speaking evaluation/pronunciation belongs to R7. None of those should reopen
or duplicate M1 foundation architecture.

Closeout evidence retained for future agents:

- M1.1 is **CLOSED / APPROVED / merged**.
- M1.2 is **CLOSED / APPROVED / merged**.
- M1.3 Shared Media Translation is **CLOSED / APPROVED / merged**.
- M1.4 Listening MVP integration and acceptance is **CLOSED / APPROVED / merged**.
- M1.5 Active Listening is **CLOSED / APPROVED / merged**.
- M1.6 Shared-media Shadowing integration is **CLOSED / APPROVED / merged** via PR #33.
- PV-2 / OREN-10 internal Listening workspace foundation is merged.
- PV-3 / OREN-11 Listening practice navigation and playback controls are merged.

Listening and Speaking remain non-public.
Learner progress remains separate from shared Media Learning content and stays scoped by user and learning language.

## Approved cross-cutting priority override — Interactive Transcript refinement

The human coordinator explicitly approved this bounded cross-cutting refinement
on 2026-08-18. It runs on `codex/interactive-transcript-layer` and does **not**
reopen M1 or change R3's canonical PRIMARY roadmap status.

Current verified branch checkpoint:

- Slice 1 commit `2aaba1e73c457ad9711bee6584fbe79eeeafd4cd` adds the shared
  interactive transcript layer, EN/ZH annotation, Chinese lexical segmentation
  and contextual Pinyin, POS highlighting, dictionary/explain interactions, and
  media-clock segment synchronization.
- Slice 1 local validation: architecture PASS, JavaScript syntax PASS, Docker
  build PASS, full regression `486 passed`.
- Slice 2A introduces a non-blocking Supadata job contract as fallback
  infrastructure. Focused local validation: `9 passed`; architecture PASS.
- Slice 2B is committed at `ff0e5fad3420632f827638650cf7b66b77f19385`.
  It adds Groq URL ASR, the no-download YouTube audio resolver, provider-neutral
  word timing, and Listening word-timing requests.
- Slice 2B local validation: Docker build PASS; focused media/timing regression
  `26 passed`; architecture PASS; JavaScript syntax PASS; `git diff --check`
  PASS; full local regression `507 passed, 3 warnings`.
- Slice 2C implements explicit native -> Groq -> Supadata orchestration,
  process-resumable fallback jobs, and browser local resume without a schema
  change. Local validation: focused regression `70 passed, 2 warnings`;
  architecture PASS; JavaScript syntax PASS; full regression
  `516 passed, 3 warnings`. Live-provider/browser QA is still pending.

Status:

- **DONE:** Slice 1; Slice 2A; Slice 2B checkpoint `ff0e5fa` with local full
  regression through `507 passed`.
- **IN PROGRESS:** Slice 2C live-provider/browser QA and runtime-parity checks.
- **PENDING:** EN/ZH live-provider quality checks; browser resume QA; decide
  whether cross-restart/cross-worker job durability is required; PostgreSQL
  runtime-parity smoke where relevant; checkpoint, final review and PR.
- **BLOCKED:** no code blocker. Cross-restart durable job persistence would need
  PostgreSQL schema/Alembic work and therefore remains a human gate.

Provider policy for this branch is explicit: native source captions remain
preferred source text when available; Groq is used for real ASR timing and may
fill a missing transcript under the same Media Learning contract; Supadata
remains an explicit fallback path rather than a replacement media model.

## Current runtime truth

- PostgreSQL remains authoritative; SQLite remains frozen rollback/archive only.
- Application version remains `1.4.0`.
- BECOMING frontend version is `2.17.5`.
- Production staging remains behind the canonical Docker Cloudflare Tunnel and
  Google OAuth path already verified in R1.
- No learner skill is PUBLIC.
- Writing remains BETA.
- Speaking, Reading, and Listening remain DEVELOPMENT/internal.
- Shared learner-facing behavior applies to EN and ZH.
- One central `LEGACY` / `CAPABILITY` learner runtime mode exists; production
  capability activation has not occurred.
- R6 Speaking Core may use the current bounded internal Groq ASR path, but
  transcript match is not pronunciation/fluency/proficiency scoring.
- The authenticated internal transcription boundary remains
  `/api/speech/transcribe`; audio is transient and not persisted to the learner account.

## Primary next checkpoint — R3 Writing Evaluation Completion

Do not start by replacing the Writing architecture. Inspect and complete the
existing evaluation path.

Existing stable foundations to preserve include:

- shared `writing_evaluator` capability identity;
- shared request/schema contract;
- weighted scoring;
- literal learner-fragment evidence;
- confidence filtering;
- existing persistence/revision flow;
- Review/Journey/Library boundaries;
- shared EN/ZH product behavior.

R3 work should focus on learner-visible completion:

1. verify the current EN/ZH evaluator contract and representative quality;
2. close real scoring/evidence correctness gaps only;
3. make categorized feedback clear and actionable in the Writing/Review flow;
4. preserve exact learner evidence and meaningful corrections;
5. verify provider/degraded states;
6. create representative EN/ZH regression fixtures;
7. validate the end-to-end Write → Evaluate → Review evidence path.

Do not reopen R5 for Writing feedback. Grammar transfer belongs to the next
stage, R4, and must reference stable R5 concepts rather than duplicate content.

## Next after R3 — R4 Writing Learning Loop + Grammar Transfer

The former standalone “Multilingual Writing Language Lens” stage is absorbed
into R3 because multilingual parity is already a product invariant.

R4 will connect:

`Writing evidence → appropriate R5 Grammar concept → targeted practice →
revision → delta/progress → Review/Journey/Library`

Writing becomes a COMPLETE public-gate candidate only after R3 and R4 pass.

## R6 secondary lane

Preserve the existing internal Speaking/media implementation. Until R3/R4
close, only bounded R6 blockers or necessary core completion should interrupt
the primary Writing lane.

Later R7 owns pronunciation, full Speaking evaluation, durable Speaking
progress, and the final Speaking COMPLETE evidence.

## R2 human gate

**YES**

Production capability activation remains a human gate.
This remains a human-gated activation boundary and is not a learner-product development blocker.

Agents may:

- inspect activation design;
- prepare code/tests;
- run offline/static readiness checks;
- review migration/config initialization and rollback logic.

Agents must not without explicit human authorization:

- mutate production capability rows;
- execute production persistence/config migration;
- run credentialed production provider validation;
- switch production learner runtime;
- remove the legacy rollback path;
- deploy public capability activation.

R2 should not be used as a reason to delay R3/R4 learner-facing work.

## Protected-area rule

If a new task does not require changing a stable subsystem, do not refactor it.

Especially protect:

- R5 Grammar contracts and curriculum IDs;
- M1 shared Media Learning contracts;
- PostgreSQL authority and persistence boundaries;
- production Cloudflare/OAuth topology;
- shared design tokens/layout primitives;
- Journey, Review, Library/Active Recall behavior that already passes;
- EN/ZH shared contracts;
- current frontend version contract `2.17.5`.

## Stop conditions

Stop and return to the human coordinator when:

- repository state materially contradicts these facts;
- a task requires production credentials or mutation;
- a destructive operation or schema/Alembic change appears unexpectedly;
- a proposed change would replace a CLOSED stable subsystem without a concrete
  regression or approved architecture decision;
- a shared feature is being implemented for only one language without a genuine
  linguistic reason;
- an unresolved P0/P1 requires broader redesign;
- the rollback path becomes unclear.

**Next handoff owner:** R3 Writing implementation/review agent.
