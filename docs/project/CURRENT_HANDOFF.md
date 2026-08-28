# Current Handoff

**Application/runtime baseline:**
`6c93d05b3cb1c79c2986af0ab4a83cf664eae3a9`

This baseline is the locally verified Orena UI/UX `2.17.5` integration code
checkpoint. It inherits the reviewed R5 Grammar Knowledge System closeout
(PR #44). Documentation-only descendants may advance without changing this
baseline.

**Primary completed checkpoints:**

- R3 — Writing Evaluation Completion: **COMPLETE / LOCAL ACCEPTANCE PASS**
- R4 — Writing Learning Loop + Grammar Transfer: **COMPLETE / LOCAL ACCEPTANCE PASS**
- R10 — Reading Completion: **COMPLETE / LOCAL ACCEPTANCE PASS**
- R11 — Listening Completion: **PRE-PUBLIC MATRIX COMPLETE / HUMAN PROMOTION GATE**
- R12 — Retention & Growth: **IN PROGRESS / LOCAL FOUNDATION**

**Secondary / gated programs:**

- R7 — Speaking Evaluation + Pronunciation: **COMPLETE / LOCAL ACCEPTANCE PASS**
  for the internal durable-attempt/history slice; public promotion remains gated.
- R8 — Public Product Gate: Writing + Speaking EN/ZH: **PRE-PUBLIC MATRIX
  COMPLETE / HUMAN PROMOTION GATE**.
- R9 — Speaking Advanced / Shadowing Studio: **COMPLETE / LOCAL ACCEPTANCE PASS**
  for the shared-media feedback-loop foundation; advanced provider scoring and
  public promotion remain gated.

- R11 — Listening Completion: **PRE-PUBLIC MATRIX COMPLETE / HUMAN PROMOTION GATE** for the
  durable Active Listening progress foundation; public Listening promotion and
  runtime migration remain gated.

- R12 has its first local retention slice: Home now exposes a localized,
  language-scoped return cue for a recent Listening lesson and hands off only
  the source URL plus bounded segment/mode context. Listening re-imports the
  asset and restores the valid selection/mode, falling back safely when the
  history is empty or stale. Home also surfaces the existing device-local
  Listening time and daily goal, with a route back to Listening's established
  goal control; malformed or unavailable local records remain explicitly
  unclaimed. No media payload is persisted and no public capability was
  activated.
- R12's next-practice slice now composes one prioritized Home return plan from
  existing Writing recommendation, unfinished Reading sessions, recent
  Listening history, and Speaking evidence when a prepared media session is
  available. Each action reuses its established route/handoff; unavailable
  evidence yields a localized empty state and no completion/progress claim.
- The R12 onboarding activation slice extends that plan with a final baseline
  Writing action when no resumable evidence exists. It uses the saved
  profile-aligned recommendation and established task-generation handoff,
  clears the draft before opening Write, and keeps recommendation or
  generation failures localized and non-actionable.
- R13 capability-matrix foundation is now locally implemented in the existing
  Platform Admin surface. The matrix consumes the canonical capability-centric
  admin response, distinguishes deterministic, reserved,
  unconfigured, configured, and unavailable states. Implemented provider-backed
  capabilities now expose scoped provider/model/enabled controls backed by the
  canonical capability PUT route; deterministic and reserved capabilities stay
  read-only. The matrix also shows audit-safe saved-state provenance and offers
  explicit click-only health checks for eligible configurations; saving or
  checking does not activate learner runtime, and failures never expose
  provider credentials.
- R14 capability telemetry foundation is now locally implemented across the
  existing structured-generation and Platform Admin live-test boundaries.
  Success and typed failure paths expose one sanitized capability/provider/
  model/latency/usage shape; absent token or quota data remains explicitly
  unknown, and no cost or billing behavior is inferred. Provider activation,
  billing, and credentialed live validation remain gated.
- R14 telemetry persistence and operator visibility now use the existing
  PostgreSQL `AuditLog` boundary and a read-only Admin operations endpoint.
  Aggregates expose recent activity, per-capability success/failure totals,
  deterministic healthy/degraded/provider-failure states from bounded recent
  evidence, latency, and explicit unknown-usage/no-data states without provider
  probes. Admin also reports provider-reported prompt/completion/total token
  totals with complete, partial, and unavailable evidence states; SQLite
  remains frozen archive storage. OpenAI-compatible response headers now carry
  allowlisted request/token limit and remaining evidence through the same
  sanitized event boundary, including reported exhaustion without enforcement.
  Admin operations now also expose bounded UTC day-bucket trends for request,
  failure, latency, tokens, and rate-limit evidence; malformed timestamps stay
  in an explicit unknown bucket.
- R13 local acceptance is now closed by the deterministic
  `scripts/r13_release_matrix.mjs` runner and
  `docs/project/R13_LOCAL_ACCEPTANCE_MATRIX.json`. The matrix executes the
  mounted Admin contract, verifies the canonical API and backend contract
  boundaries, and records credentialed provider health and runtime activation
  as explicit human-gated deferrals.

- R6 — Speaking Core: **COMPLETE / LOCAL ACCEPTANCE PASS**
- R2 — AI Capability Control Plane: **HUMAN GATE / READY, NOT PRODUCT-BLOCKING**
- R14 — AI Usage, Cost, Quota & Provider Operations: **IN PROGRESS / LOCAL FOUNDATION**

**Current working lane (2026-08-28):**

- Writing learner-flow work is checkpointed through `c2e16de` and the R3/R4
  acceptance matrix is locally complete: EN/ZH evaluator contracts and the
  24-case deterministic benchmark pass, and Review, Home, and Journey Grammar
  practice actions preserve literal evidence, fresh draft state, source
  revision lineage, and the real Write evaluation payload.
- R4 outcome coverage confirms re-evaluation remains linked to the source
  revision series and Review/Journey render the returned localized practice
  outcome without inventing learner evidence. Writing remains BETA pending
  the documented human public-gate review; no provider credentials or
  production capability activation were used.
- Speaking Core contract coverage is green, including local recording,
  RNNoise/native fallback, transient ASR, deterministic content matching, and
  provider pronunciation boundaries. The stale input-filter contract was
  aligned with the intentional raw-signal constraints in `28fc825`.
- The prepared-media acceptance matrix now mounts the Speaking screen for EN
  and ZH and verifies record → transient ASR → deterministic content-match
  feedback, plus truthful missing-session, unsupported-recorder, and ASR-error
  states. No pronunciation, fluency, proficiency, durable attempts, provider
  credentials, or production data are used.
- R7 now has an internal `speaking_evaluator` contract that normalizes one take
  into separate transcription-confidence, content-match, pronunciation,
  fluency, and explicitly-unassessed proficiency dimensions. It preserves
  word/phoneme evidence and synthetic-demo provenance. The EN/ZH mounted
  per-take matrix now carries optional ASR confidence and provider pronunciation
  evidence (including EN phonemes/stress and ZH tone-marked phonemes) through
  the evaluator, then renders measured versus unavailable dimensions without
  composite claims. Completed evaluator envelopes now flow through the
  authenticated Speaking attempts boundary into audio-free, learner-scoped
  history/progress retrieval. It does not expose public capability activation;
  release promotion remains deferred.
- The R8 pre-public matrix now runs the representative EN/ZH Writing → Review
  and Speaking record → ASR → evaluator → pronunciation → history contracts,
  plus the browser ESM graph. Source-only persistence/runtime boundary checks
  are labeled static inspections, while authenticated backend contracts are
  executed separately in the application container. The report records
  provider credentials, PostgreSQL migration execution, capability activation,
  and public promotion as deferred human operations; no release state changes.
  The deterministic report is checked in at
  `docs/project/R8_PRE_PUBLIC_MATRIX.json` and verified byte-for-byte by the
  runner's default mode.
- The R9 Shadowing Studio foundation now preserves the selected canonical
  EN/ZH asset and segment when opening Speaking, carries the same identity
  through recording/evaluation and audio-free attempt handoff, and restores the
  Shadowing mode and segment on return to Listening. On that return, Listening
  now retrieves only the authenticated learner's latest matching Speaking
  evaluator outcome for the same language, asset, and canonical segment, and
  renders dimension-specific feedback with localized empty/error states. The
  mounted handoff-and-feedback contract passes for both languages; provider
  scoring and public activation remain outside this local checkpoint.
- R10 now has an internal EN/ZH Reading learning-loop acceptance: mounted
  session creation, comprehension answers with exact passage evidence,
  audio-free learner history reopening, and saved-key-word handoff to Library.
  The result is passage-specific and does not claim CEFR/HSK mastery; public
  Reading promotion remains a separate human gate.
- R11 now has a deterministic EN/ZH pre-public Listening matrix covering the
  mounted Active reconstruction resume and Shadowing round resume flows,
  Shadowing-to-Speaking feedback continuity, localized unavailable/failure
  states, and the browser module graph. The matrix labels PostgreSQL-only,
  scope, and audio-free boundaries as static inspections; the canonical report
  is `docs/project/R11_PRE_PUBLIC_MATRIX.json`. Production migration,
  capability activation, and public Listening promotion remain deferred.

**Closed programs protected from casual rewrite:**

- R5 — Grammar Knowledge System: **CLOSED**
- M1 — Media Learning Foundation: **CLOSED / FOUNDATION COMPLETE**
- R1 — Production Staging + Cloudflare + Google OAuth: **CLOSED / PASS**
- R0 — Product Release Architecture: **CLOSED**

## Active cross-cutting integration — Orena UI/UX 2.17.5

Branch: `codex/orena-ui-ux-integration`

Code checkpoint: `6c93d05b3cb1c79c2986af0ab4a83cf664eae3a9`

Status: **LOCAL AUTOMATION + BRAVE VISUAL QA PASS / HUMAN ACCEPTANCE PENDING / NOT DEPLOYED**

- Every previously missing commit from local `claude/work` is now integrated,
  including the `606f24c` Claude tooling checkpoint, `0053152`
  validator-governance checkpoint, and the `43` application commits through
  `04bfb97`. Claude hooks/settings are present and historical release gates are
  archived under `scripts/archive/release-gates/`.
- Frontend `2.17.5` now has dedicated Orena presentation layers for Home,
  Writing, Review, Reading, Listening, Speaking, Grammar, Library, Journey,
  Profile, onboarding, and sign-in while retaining one shared shell, token,
  primitive, responsive, EN/ZH, accessibility, and light/dark contract.
- Profile retains real learning/interface language, goal, guidance, three-state
  Pinyin, palette, account, and evidence-derived Growth Rank behavior. Failed
  writes restore truthful control state; shared theme changes stay synchronized;
  mobile listboxes are viewport-bounded and the route title remains centered.
- Grammar now composes the source schema-v2 learning model through a
  deterministic pedagogy layer. All `508 / 508` EN/ZH lessons choose a real
  primary block and render every source block with type traceability. The
  focused lesson workspace preserves the bounded teaching column, `26px` gap,
  `288px` rail, one-column mobile reflow, active mobile title, Back action,
  completion evidence, and exact opener-focus restoration.
- R5 remains CLOSED: no Static Grammar KB record, stable Grammar Concept ID,
  schema-v2 language context, completion meaning, or Grammar runtime-AI contract
  changed.
- Chinese Dictionary now exposes deterministic stroke-order practice from the
  vendored `9,565`-character data pack through read-only
  `GET /api/chinese/stroke-order`. No AI provider or runtime CDN is involved.
- Media and speech routes with semantic categories now use the canonical error
  envelope; the frontend exposes category, retryability, context, and HTTP
  status. Shared-media translation now selects Groq when configured, while
  local Marian remains an explicit no-key/override path; failures never trigger
  provider failover. `writing_linguistic` is deterministic local annotation,
  shared by Writing/Review and Listening.
- Local verification at the code checkpoint: release gate PASS for frontend
  `2.17.5`; architecture PASS; full regression `561 passed, 3 warnings`, no
  failures or skips; browser ESM graph PASS (`50 modules`); all nine CI Node
  media contracts PASS; Profile and Grammar contracts PASS (`508 / 508` EN/ZH);
  error-envelope, Hanzi contract, Hanzi-pack digest, Grammar pedagogy, and
  linguistic/translation capability audits PASS.
- One earlier full-regression attempt inherited `POSTGRES_RUNTIME_URL` from
  Compose and produced `517 passed, 1 failed`; clearing that environment-only
  contamination was required before the current final `561 passed` result. No
  application logic was changed to hide the environment failure.
- Interactive Brave QA used an isolated current-branch runtime with temporary
  `/tmp` SQLite. Home, Profile, and Grammar were inspected at desktop and mobile
  breakpoints with no horizontal overflow or browser console error. Profile
  kept its two-column/single-column hierarchy and bounded open listbox; Grammar
  kept the desktop teaching/rail split, mobile one-column flow, ten traced
  source blocks, active mobile title, and verified Back-focus restoration.
  Screenshot capture timed out in the browser integration, so human visual
  acceptance remains pending.
- The one-off QA runtime was removed. Port `8000`, the active Claude worktree,
  PostgreSQL data, production runtime, deployment, OAuth, Cloudflare, release
  state, application/frontend versions, and public skill state were not changed.
- Former one-shot release gates are retained as historical evidence under
  `scripts/archive/release-gates/`. Surviving validators assert current
  contracts; no validator was weakened to make this sync pass.

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

## R3/R4 acceptance closeout

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

R3 learner-visible completion and the R4 Grammar-transfer loop are locally
verified:

1. verify the current EN/ZH evaluator contract and representative quality;
2. close real scoring/evidence correctness gaps only;
3. make categorized feedback clear and actionable in the Writing/Review flow;
4. preserve exact learner evidence and meaningful corrections;
5. verify provider/degraded states;
6. create representative EN/ZH regression fixtures;
7. validate the end-to-end Write → Evaluate → Review evidence path.

The verified R4 extension preserves Grammar IDs and exact Writing evidence
from Review, Home, and Journey into Write, keeps the originating essay as the
revision parent, and returns practice outcomes to Review/Journey through the
existing API contract.

Do not reopen R5 for Writing feedback. The verified Grammar transfer loop
references stable R5 concepts and does not duplicate Grammar content.

## Next after R4 — remaining internal/core checkpoints

The former standalone “Multilingual Writing Language Lens” stage is absorbed
into R3 because multilingual parity is already a product invariant.

R4 now connects:

`Writing evidence → appropriate R5 Grammar concept → targeted practice →
revision → delta/progress → Review/Journey/Library`

Writing is a COMPLETE public-gate candidate from the implementation and local
acceptance perspective; public promotion remains a human gate.

## R6 Speaking Core closeout

R6 is locally closed at the prepared-media internal acceptance checkpoint.
Preserve the existing Speaking/media implementation and the verified EN/ZH
record → ASR → content-match contracts. No durable Speaking progress or
pronunciation scoring is implied by this closeout.

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

**Next handoff owner:** R8 public-gate review owner; R7's internal durable-attempt
acceptance is locally closed and no deployment or capability activation is implied.
