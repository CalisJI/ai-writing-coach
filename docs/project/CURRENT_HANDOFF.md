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
- R12 — Retention & Growth: **COMPLETE / LOCAL ACCEPTANCE PASS**

- R15 - SaaS Plans, Entitlements & Usage Policy: **COMPLETE / LOCAL ACCEPTANCE PASS**
- R16 — Advanced Learning Intelligence: **COMPLETE / LOCAL ACCEPTANCE PASS**
  for contextual dictionary, adaptive Writing difficulty, error-memory
  review-cue, and cross-skill transfer foundations.
- R17 — Product Analytics & Operational Observability: **COMPLETE / LOCAL
  ACCEPTANCE PASS** for privacy-bounded Admin activity trends and readiness
  evidence; live/production release gates remain human-gated.
- R18 — Mobile/API Readiness: **COMPLETE / LOCAL ACCEPTANCE PASS** for the
  immutable reference-data cache, authenticated session-bootstrap, and compact
  media-status contracts; mobile-client implementation and production release
  remain deferred.
- R19 — Native Mobile App Foundation: **COMPLETE / LOCAL ACCEPTANCE PASS** for
  the native shell, secure session/media boundaries, immutable cache/lifecycle
  resume contracts, and portable Android/iOS build preparation; device,
  signing, store, and production actions remain human-gated.
- R13 — Platform Admin Completion: **COMPLETE / LOCAL ACCEPTANCE PASS**.
- R14 — AI Usage, Cost, Quota & Provider Operations: **COMPLETE / LOCAL
  ACCEPTANCE PASS**; credentialed provider and production operations remain
  deferred.

**Current governance lane (2026-08-30):**

R12–R19 local foundations are complete and evidence-backed. The autonomous
R20 implementation lane is next: native learner vertical slices may build on
the verified R19 foundation while the R8/R11 promotion review remains an
explicit human governance decision, preserving the R2 capability-activation
and production-operation gates.

**Native mobile lane on `claude/integration-v2` (2026-08-30):**

Ownership returned to Claude as primary implementation owner after a Codex
interval. `claude/integration-v2` HEAD matches `origin/codex/work`; nothing
diverged and no historical branch was merged wholesale.

- **R20 — Mobile Learning Experience Parity: COMPLETE / LOCAL ACCEPTANCE PASS.**
  The native vertical slices landed through `69b0ff6` (Reading with contextual
  dictionary and saved-word Library handoff, Listening follow/active
  practice/resume, Speaking evaluation and Shadowing return, Grammar, Active
  Recall, Journey, Profile/Settings, cross-skill resilience, accessibility, and
  layout parity), and acceptance is now closed by the deterministic
  `scripts/r20_release_matrix.mjs` runner and
  `docs/project/R20_LOCAL_ACCEPTANCE_MATRIX.json`: nine verified mounted checks,
  six static contract inspections, five explicit human deferrals, with the
  canonical report checked byte-for-byte in the runner's default mode.
- Closing R20 exposed one real parity gap: **Writing and Review had no mounted
  test at all**, so the loop R20 names first — Writing → Evaluate → Review →
  Grammar targeted practice → Revise — was the only flow with no native
  evidence. `mobile/app/(app)/r20-writing-review.test.tsx` now mounts both
  screens across EN/ZH and covers the real evaluation payload, the practice
  brief versus revision distinction (`parent_essay_id` linkage), literal server
  evidence in the interface language, the R5 Grammar handoff, single-consumption
  handoffs, and truthful empty/disabled/failure states.
- A second gap: EN/ZH parity was asserted only over the main message catalogue,
  while `speakingMessages` and `flowMessages` went unchecked. Because
  `translate` falls back to returning the message id, a missing ZH key would
  have reached a learner as literal text like `profile.title`. `MESSAGE_CATALOGUES`
  is now exported and the i18n suite asserts parity across every catalogue and
  that no id is ever rendered raw. Parity held; the check now guards it.
- R21 readiness work through `d1e27a1` covers privacy boundaries, diagnostics,
  store metadata, and entitlement presentation with an explicit deferred
  purchase boundary. Store credentials, signing, billing activation, and
  submission remain human-gated and untouched.
- **Takeover finding (closed, `302ed95`):** the native strict
  `productPlanSchema` required a `plan.entitlements` array that
  `ProductService.account_state` never returns. Mobile fixtures had invented the
  field, so the suites agreed with themselves while any real
  `GET /api/product/me` response would have failed `.parse()` on device and left
  Profile permanently rendering `profile.unavailable`. The field is removed,
  fixtures now match the emitted payload, and drift guards were added on both
  sides — a backend test comparing `account_state`'s plan keys against the field
  names declared in the mobile schema, a pin on the degraded
  (`available: false`) envelope, and a client test parsing that envelope. The
  backend guard was confirmed to fail against the pre-fix schema.
- A follow-up audit compared every other mobile contract envelope against its
  backend response builder (learner profile, platform language, practice
  recommendation, practice task, grammar practice, reading session/list/answer,
  library vocabulary list/save, listening progress, journey dashboard). No
  further mismatch was found.
- Verification actually executed locally at `302ed95`: mobile ESLint PASS,
  `tsc --noEmit` PASS, Jest `33 suites / 120 tests` PASS, architecture validator
  PASS, browser ESM graph PASS (`52 modules`), all nine CI Node media contracts
  PASS, `git diff --check` PASS, `ruff check` PASS on the changed test file, and
  the changed backend product tests executed directly on the host (stdlib-only
  imports).
- **Containerized regression closed:** `pytest -q test_app.py tests` now reports
  **676 passed, 0 failed, 3 warnings** (local execution, not CI). Reaching it
  required recovering the Docker runtime — dockerd had deadlocked (32 threads in
  `futex_wait_queue`, SIGTERM ignored, no `docker.sock`) and Docker Desktop's
  supervisor would not respawn it, so Desktop was restarted. All four project
  containers came back and every named volume, including
  `ai-writing-coach-postgres-data`, is intact. No volume was deleted and
  `down -v` was never used.
- Two environment contaminations had to be cleared before the suite reflected
  application state, extending the `POSTGRES_RUNTIME_URL` caveat already in
  `CLAUDE.md`: Compose injects `.env`, so `APP_ENV` and the Google client
  variables make `auth_enabled` true and turn seven learner/admin route tests
  into `401`s. The CI-equivalent invocation additionally passes
  `-e APP_ENV=development` and blanks the provider/OAuth variables by name.
- Three genuine failures survived that and were inherited from the Codex lane
  (`13087f7`, `af69c01`, both 2026-08-26, absent from `main`) — never caught
  because that lane had no Python. All three were defects in the tests, not the
  application, and each was corrected to assert its stated intent rather than
  relaxed: the confidence-tie case used `word_order`, which the English
  `ERROR_CATEGORIES` allowlist correctly drops, so it silently tested the
  allowlist instead of tie ordering; the degraded-notice case asserted the
  summary's wording against the priority line; and the provider-leak case
  asserted `provider_error not in message`, which cannot hold when the token is
  `unavailable` and the truthful learner copy reads "temporarily unavailable" —
  it now pins the full raw provider string instead.

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
- **R12 local-foundation closeout:** COMPLETE / LOCAL ACCEPTANCE PASS. Focused
  EN/ZH browser contracts verify the localized Listening return cue and
  device-local habit state, prioritized next-practice routing across Writing,
  Reading, Listening, and Speaking, and the baseline Writing onboarding action.
  Malformed or unavailable evidence remains explicitly unclaimed; public
  retention promotion and server-side tracking remain deferred.
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
- R14 cost observation now uses the exact-match, versioned provider/model
  catalog in `writing_coach.ai.pricing`. Telemetry snapshots pricing
  provenance at event creation; complete prompt/completion usage yields a
  USD estimate while unknown models, partial usage, and absent usage remain
  explicitly unpriced/partial/unknown. Admin capability and seven-day trend
  aggregates group only estimated amounts by currency/catalog version. No
  billing, quota enforcement, live price fetching, or provider activation is
  implied.
- R14 capability administration now persists an optional complete standby
  provider/model pair with the same static compatibility validation as the
  primary. Admin exposes sanitized primary/standby provenance and a distinct
  click-only standby health check; learner runtime remains primary-only with no
  automatic retries or cross-provider failover.
- **R14 local-operations closeout:** COMPLETE / LOCAL ACCEPTANCE PASS. The
  deterministic `scripts/r14_release_matrix.mjs` runner verifies the mounted
  Admin operations view and records the telemetry, PostgreSQL audit boundary,
  bounded aggregation, pricing, and provider-control contracts in
  `R14_LOCAL_ACCEPTANCE_MATRIX.json`. Credentialed provider checks, production
  observation, billing/quota enforcement, and learner runtime activation remain
  human-gated and deferred.
- R13 local acceptance is now closed by the deterministic
  `scripts/r13_release_matrix.mjs` runner and
  `docs/project/R13_LOCAL_ACCEPTANCE_MATRIX.json`. The matrix executes the
  mounted Admin contract, verifies the canonical API and backend contract
  boundaries, and records credentialed provider health and runtime activation
  as explicit human-gated deferrals.

- R6 — Speaking Core: **COMPLETE / LOCAL ACCEPTANCE PASS**
- R2 — AI Capability Control Plane: **HUMAN GATE / READY, NOT PRODUCT-BLOCKING**
- R14 — AI Usage, Cost, Quota & Provider Operations: **COMPLETE / LOCAL ACCEPTANCE PASS**

- R15 - SaaS Plans, Entitlements & Usage Policy: **COMPLETE / LOCAL ACCEPTANCE PASS**

**Current working lane (2026-08-29):**

- R16 contextual dictionary foundation is locally complete across the existing
  Writing, Review, Reading, and shared Listening/Speaking transcript
  sentence/segment flows. The shared authenticated contract requires visible
  learner evidence and exposes truthful unavailable states; provider activation
  and credentialed live validation remain deferred.
- R16 adaptive Writing difficulty now derives a bounded one-step length change
  only from verified, language-scoped practice outcomes or revision wins. Home
  and Write carry the provenance and localized stretch/scaffold/hold or
  insufficient-evidence rationale through the existing practice handoff.
- R16 error-memory review cues now select one literal, language-scoped recurring
  or unresolved Writing pattern with explicit source status and provenance.
  Home and Review render localized rationale, show an explicit no-actionable-
  evidence state, and open only the linked existing Review/Grammar handoff.
- R16 cross-skill transfer cues now select one completed, language-scoped
  Writing, Reading, Listening, or Speaking record with bounded provenance.
  Home and Journey render one localized source cue and reuse established
  skill handoffs; malformed, stale, or unlinked records produce an explicit
  no-evidence state without a shared proficiency or completion claim.
- The completed R16 evidence chain also includes the R12 scheduled Library
  review handoff: Home presents only a valid due review, opens the
  existing Library review action, and preserves the established scheduling
  semantics without inventing a completion claim.

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
  audio-free learner history reopening, saved-key-word handoff to Library, and
  contextual dictionary lookup with explicit unavailable handling. The
  deterministic pre-public matrix is checked in at
  `docs/project/R10_PRE_PUBLIC_MATRIX.json` and its default runner mode checks
  the canonical report byte-for-byte. The result is passage-specific and does
  not claim CEFR/HSK mastery; provider credentials, production mutation, and
  public Reading promotion remain separate human gates.
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

## R15 account-state visibility closeout

The existing Free/Premium catalog and authoritative PostgreSQL product
repository now feed an authenticated account endpoint. Profile and read-only
Admin surfaces localize plan, entitlement, monthly usage, exhausted, unlimited,
and unavailable states; billing and feature enforcement remain disabled.

## R16 contextual dictionary foundation closeout

Writing, Review, and Media sentence/segment lookups now share one authenticated
contextual dictionary response grounded in the learner's visible text. The
contract rejects selections absent from that context and returns an explicit
unavailable state when the explanation provider cannot produce a result. EN,
VI, and ZH adapters preserve the selected evidence without inventing context or
proficiency claims. Provider activation and credentialed live validation remain
deferred.

## R16 adaptive Writing difficulty closeout

The existing practice recommendation now validates recent learner-scoped
outcome/revision evidence before selecting one supported length step up or
down. Malformed and cross-language records produce an explicit
insufficient-evidence state; no CEFR, HSK, mastery, or proficiency claim is
inferred. Home and Write render the localized rationale and preserve the
existing task-generation and evaluation handoff.

## R16 error-memory review cue closeout

The authenticated learning-memory contract now exposes one bounded review cue
selected from recurring/new/watch Writing patterns or unresolved practice
outcomes. Each cue carries literal learner evidence, source and status, and a
linked essay or Grammar action only when that identifier is valid. Home and
Review share localized EN/VI/ZH rationale and render an explicit empty state
when no actionable evidence exists; no mastery or proficiency claim is made.

## R16 cross-skill evidence transfer closeout

The authenticated read-only cross-skill selector accepts only completed,
language-scoped records with a concrete source-specific handoff from Writing,
Reading, Listening, or Speaking. Home and Journey render one localized cue
with literal provenance and preserve an explicit no-transfer-evidence state;
no shared proficiency, mastery, or completion score is inferred or persisted.

## R16 local-foundation evidence reconciliation

The complete local R16 chain is covered by focused contracts: contextual
dictionary source grounding (`scripts/test_r16_contextual_dictionary.mjs`,
`scripts/run_r16_contextual_dictionary.py`), Reading and shared
Listening/Speaking transcript lookup (`scripts/test_r16_reading_contextual_dictionary.mjs`,
`scripts/test_r16_shared_transcript_contextual_dictionary.mjs`), adaptive
Writing difficulty (`scripts/test_adaptive_difficulty_locale.mjs`,
`scripts/run_r16_adaptive_practice.py`), error-memory review cues
(`scripts/test_review_cue_locale.mjs`), cross-skill transfer
(`scripts/test_cross_skill_transfer_locale.mjs`), and scheduled Library review
(`scripts/test_home_library_review_handoff.mjs`). EN/ZH behavior remains
shared through existing contracts, while provider credentials, production
activation, and public promotion remain deferred gates.

## R17 privacy-bounded product activity trends

The Admin-only product activity endpoint aggregates bounded PostgreSQL Writing,
Reading, Listening, and Speaking records into active-learner, activity, and
completion trends. Output is read-only and omits learner identifiers, text,
media URLs, and event rows; empty and unavailable runtime states remain
explicit. The Admin view is additive and does not write learner events,
change scoring, enforce entitlements, or activate providers.

## R17 return-to-practice and retention observability

The Admin product-activity response now also derives bounded returning-learner,
repeat-practice, cross-skill return, and 1/3/7-day return-window aggregates
from the same existing PostgreSQL activity records. The mounted Admin view
shows those aggregates and daily return trends without learner identifiers,
content, or per-event history, and keeps explicit insufficient/unavailable
states. No tracking SDK, learner scheduling, scoring, entitlement, or event
write path was added.

## R17 privacy-bounded skill usage and completion funnels

The same Admin product-activity response now exposes source-specific funnel
stages where existing records provide them: Writing submission attempts and
completions, Reading session/attempt/completion stages, Listening progress
attempts/completions, and completed Speaking takes. Unsupported stages are
explicitly unavailable rather than zero. The response remains bounded,
	identifier-free, content-free, read-only, and malformed-record tolerant; no
	synthetic tracking events or learner-event writes were introduced.

## R17 learner-impact failure and degraded-state observability

	Admin product-activity now includes bounded capability/day failure trends from
	validated learner-origin AI telemetry only. Operator tests and configuration
	events are excluded; output has no learner identifiers, text, URLs, or event
	rows and reports explicit insufficient/unavailable states. Origin is an
	allowlisted telemetry field persisted through the existing PostgreSQL AuditLog
	boundary; no learner-event, scoring, billing, or provider-activation path was
added.

## R17 operational readiness evidence summary

The Admin-only readiness summary combines existing AI capability configuration,
bounded operation health, product-observability availability, validated
learner-impact evidence, and the human-gated activation policy. Each indicator
is explicitly ready, degraded, insufficient, unavailable, or deferred; the
overall view states that it is not production-release approval. The endpoint is
read-only and aggregate-only, with no probes, writes, learner records, billing,
activation, or deployment behavior. The authenticated/non-admin boundary and
redaction contract are exercised through the mounted ASGI route regression in
`tests/test_r17_admin_routes.py` using representative underlying records.

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

	**R17 local-foundation closeout:** COMPLETE / LOCAL ACCEPTANCE PASS. The
	Admin analytics and readiness decision surface is read-only, aggregate-only,
	and locally verified; live PostgreSQL observation, provider activation, and
	production release approval remain human-gated and deferred.

**R18 local-foundation closeout:** COMPLETE / LOCAL ACCEPTANCE PASS. The
reference-data cache, session bootstrap, and compact media-status contracts
are directly implemented and locally verified. Actual mobile-client
implementation now belongs to R19–R21; only production/provider/store actions
remain human-gated.

**R19 handoff:** Native Mobile App Foundation implementation/review lane.
Before any R19-R21 implementation or review, read
docs/project/MOBILE_IMPLEMENTATION_SPEC.md; it is the canonical native-mobile
build contract for Android and iOS.
The dedicated React Native + Expo + TypeScript `mobile/` workspace now
consumes the verified R18 contracts. R8/R11 public promotion, R2 production
activation, store credentials/signing, billing, and deployment remain deferred
human gates and must not block non-production R19/R20 work.

**R19-D local acceptance closeout:** COMPLETE / LOCAL ACCEPTANCE PASS. The
native Expo Audio microphone boundary requests permission only when invoked,
models denied/restricted/unavailable/interrupted/failed/suspended states in
shared EN/ZH UI, and releases transient recordings and playback resources on
stop, cancel, failure, and lifecycle suspension. Android RECORD_AUDIO and iOS
microphone usage configuration are present; raw audio is not persisted or
sent to a provider.

**R19-E local acceptance closeout:** COMPLETE / LOCAL ACCEPTANCE PASS. The
mobile client validates and bounds the immutable Chinese stroke-order
representation, sends If-None-Match and reuses matching 304 data, rejects
no-store/unavailable caching, and exposes safe stale-cache behavior for
transient read failures. Its persisted cache index remains bounded across
cache instances and only accepts explicit public immutable responses. Compact
media status is reduced to canonical asset and opaque resume identifiers;
foreground and Expo Network/TanStack online reconnect events cancel and
revalidate bootstrap, reference, and media queries without local authority
drift. Shared EN/ZH degraded-state messages cover offline, timeout,
authentication expiry, unavailable, stale, and refresh states.

**R19-F local acceptance closeout:** COMPLETE / LOCAL ACCEPTANCE PASS. The
portable Expo config, shared version/build-number and Android/iOS identifier
policy, development/preview/production EAS profiles, CI-ready validation
workflow, and secret-free config regression are checked in. The disposable
prebuild harness validates Android on Windows and both Android/iOS projects in
Linux CI, without retaining generated native folders. Windows-local validation
covers lint, strict typecheck, tests, public Expo config, and Android prebuild;
Android Studio/JDK/device and macOS/Xcode/iOS simulator checks remain deferred
human actions, as do signing, store credentials, OAuth registration, and store
release.

**Next handoff:** R21 mobile release-readiness completion. R20 is locally closed,
so the remaining work is the R21 checklist itself — OAuth/deep-link redirect
verification, reproducible signed-build preparation, and the device-QA matrix
across EN/ZH, light/dark, accessibility, auth expiry, offline/degraded states,
media resume, and upgrade paths. Do not add provider activation, raw-audio
persistence, billing, signing, or store-release behavior: those stay human gates.

## R18 immutable reference-data cache contract

The deterministic Chinese stroke-order endpoint now carries a stable
`source_version` tied to the vendored data release and returns a public,
one-year immutable cache policy with an ETag derived from that version and the
requested word. Matching `If-None-Match` requests receive `304` without a
payload; missing/unreadable stroke data is returned as a canonical, `no-store`
503 response. The mutable/provider-backed dictionary endpoint is explicitly
`Cache-Control: no-store` for both success and failure responses. Focused ASGI
tests cover EN/ZH applicability, repeat and conditional requests, unavailable
states, and the absence of provider calls; the existing Hanzi contract keeps
large datasets server-owned rather than duplicated in the client.

## R18 authenticated session-bootstrap contract

`GET /api/session/bootstrap` is the compact, versioned, read-only transport
contract for the existing authenticated session. It returns authenticated
state, minimal role/admin flags, the server-authoritative active language, and
the enabled language options without duplicating learner identity or content
data. The existing session middleware remains the authentication boundary:
missing or invalid sessions receive the non-sensitive
`{"detail":"Authentication required"}` response. Focused ASGI tests exercise
signed EN and ZH session cookies plus missing/invalid-cookie requests;
mobile-client implementation, OAuth changes, and production release remain
deferred.

## R18 resumable media-status response shaping

`POST /api/media-learning/import/status` preserves its full acquisition
response by default and accepts `compact: true` for constrained consumers. The
compact response contains only bounded job/asset state, the opaque public
resume handle, source, failure kind, and resumability; transcript, translation,
timing, playback, and provider job identifiers are not included. Existing
owner and learning-language scoping remains enforced by the fallback registry.
Missing, expired, or foreign handles return the canonical
`media_job_unavailable` envelope with an explicit unavailable, non-resumable
context. Focused ASGI tests cover processing, ready, failed, scoped, and
unavailable responses without changing provider or persistence architecture.
