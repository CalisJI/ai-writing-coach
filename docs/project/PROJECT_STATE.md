# Verified Project State

This document records verified current truth only. It is not a wish list or a
historical narrative.

## Identity and versions

- Product: Orena / BECOMING codebase
- Repository: `CalisJI/ai-writing-coach`
- Last verified application/runtime baseline:
  `de2054fcdf702011be015a2357d0e92c0f3c6dfc`

This SHA identifies the verified application/runtime baseline inherited by this
governance checkpoint. Documentation-only or governance-only descendant commits
may advance `main` without changing that baseline. Update this field only after
a reviewed change materially changes verified application, runtime, product, or
operational state.

- Application version: `1.4.0`
- BECOMING frontend version: `2.17.5`

## Orena UI/UX integration

- Branch `codex/orena-ui-ux-integration` integrates the selected UI commits
  from `claude/work` over `origin/main` and intentionally excludes the Claude
  tool-configuration and historical-validator relocation commits.
- Frontend `2.17.5` includes the shared Orena shell, responsive desktop rail
  and mobile drawer, rebuilt Home, Writing, Review, and sign-in surfaces,
  shared light/dark Orena tokens, learner-data mastheads, custom accessible
  select fields, bounded Listening return/history improvements, and the
  first Orena-prod-matched Profile / Preferences screen.
- Profile now follows the supplied Orena-prod light, dark, desktop, and mobile
  hierarchy through a dedicated `static/becoming/orena/profile.css` layer:
  grouped learning/experience/appearance/account settings, accessible
  listboxes, a Pinyin switch, truthful account rows, and a compact explanatory
  aside. Existing goal, guidance, palette, EN/ZH, interface-language, and
  evidence-derived Growth Rank behavior remains connected.
- Human review of the first Profile pass found uneven preference-row alignment
  and mojibake in glyph-based language icons. Baseline `30876d9` retains the
  font-independent flags and shared control track from `b216ac1`, then corrects
  the desktop content frame against the Orena-prod geometry, restores visible
  stroke icons, gives mobile cards balanced gutters, centers the mobile route
  title while preserving drawer navigation, and constrains listboxes so an open
  menu cannot create horizontal page overflow.
- Opened Grammar lessons now use a focused Orena-prod workspace rather than
  leaving the full 269-item curriculum visible below the lesson. The desktop
  surface uses a bounded teaching column plus a truthful progress/outline rail;
  mobile uses compact, accessible disclosure rows for informational sections
  while leaving Pattern and evidence-producing practice visible. Stable Grammar
  Concept IDs, schema-v2 rendering, completion evidence, and EN/ZH content
  contracts remain unchanged.
- Grammar checkpoint `de2054f` extends that frame into one shared visual
  learning system for all `508 / 508` source-backed EN/ZH lessons. Pattern and
  word-order parts, Use-when checks, contextual examples, nearby-form contrast,
  incorrect/correct correction, exception boundaries, practice choices, memory
  cues, and cross-skill transfer now have distinct Orena visual semantics.
  Repeated explanatory copy is suppressed only at presentation time; Static
  Grammar KB content and stable concept IDs are not rewritten.
- Existing Writing practice context, Dictionary/Pinyin assistance, Review POS
  lens, Chinese Review Pinyin, EN/ZH behavior, and UI-03 shared primitives are
  preserved by the integration checkpoint.
- Local automated evidence at `de2054fcdf702011be015a2357d0e92c0f3c6dfc`:
  architecture and UI-03 validators PASS; Profile and Grammar contracts PASS;
  browser ESM graph PASS with 48 linked modules; JavaScript UI tests `30 passed,
  2 known pre-existing failures`; Docker build PASS. The isolated runtime smoke
  and backend regression were not rerun for this CSS/JavaScript-only Grammar
  presentation change; the inherited backend result remains `503 passed, 3
  warnings`.
- Interactive Brave visual QA PASS at desktop and mobile reference dimensions,
  light/dark, and VI/ZH interface states. The verified desktop surfaces measured
  `830px + 26px + 294px`; mobile cards retained `12px` side gutters; opening a
  `190px` language listbox left `scrollWidth == clientWidth` and `scrollX == 0`;
  Chinese rendered without mojibake; and browser console warnings/errors were
  zero. Human acceptance of the screenshots remains pending. This checkpoint
  is not deployed and does not promote any learner skill to PUBLIC.
- Grammar Brave QA additionally verified a `815px + 26px + 294px` desktop
  lesson/rail frame at the measured viewport, no horizontal overflow, real
  curriculum progress, a six-target lesson outline, functional Back navigation,
  five accessible mobile disclosures, light/dark switching, and zero browser
  console warnings/errors. Mobile measured a `353px` lesson surface inside a
  `373px` document and kept Pattern plus Quick Practice in the initial compact
  sequence.
- The `de2054f` Grammar visual rereview used a read-only static harness loading
  the production renderer, styles, and real EN/ZH knowledge files. It verified
  balanced five/six-part formulas, no desktop or mobile horizontal overflow,
  dark/light token parity, functional mobile disclosures, Chinese CJK font
  fallback plus Pinyin, and no Unicode replacement characters. Full isolated
  application-runtime browser smoke remains pending because the required
  ephemeral Alembic initialization was not authorized at this checkpoint.

## Persistence

- PostgreSQL is the authoritative runtime.
- SQLite is a frozen rollback/archive source only.
- There is no dual-write.
- There is no reverse sync from PostgreSQL to SQLite.
- There is no silent SQLite fallback from PostgreSQL runtime failure.
- There is no startup auto-import.
- A genuinely empty PostgreSQL runtime may bootstrap automatically to the
  current Alembic head. Any non-empty database with a missing or mismatched
  revision fails closed; existing runtime databases are never auto-upgraded.
- Persistent volumes are never cleanup targets. Normal development and
  operations must never use `docker compose down -v`.
- Governance work must not mutate production runtime data.

The repository still contains SQLite implementations and historical migration
tooling because rollback, archive inspection, tests, and the completed cutover
history remain relevant. Their presence does not make SQLite the deployed
authority.

## Production staging

- Public endpoint: `https://orena.chillpickle.org`
- Request path: Internet → Cloudflare HTTPS → Docker Cloudflare Tunnel
  connector → `writing-coach:8000` → PostgreSQL.
- Google OAuth production staging passed.
- Public health and readiness passed.
- Authenticated `GET /api/product/me` passed against PostgreSQL.
- EN learner staging smoke passed.
- ZH learner staging smoke passed.
- Library, Journey, and Profile staging smoke passed.
- The Windows Cloudflared service was intentionally disabled after duplicate
  tunnel replicas caused 502 behavior.
- The Docker Cloudflared connector is canonical. Unrelated work must not
  reconfigure or duplicate it.

## Product release architecture

- R0 — Product Release Architecture: **CLOSED**.
- R1 — Production Staging + Cloudflare + Google OAuth: **CLOSED / PASS**.
- R2 — AI Capability Control Plane: **HUMAN GATE / READY, NOT PRODUCT-BLOCKING**.
- M1 — Media Learning Foundation: **CLOSED / FOUNDATION COMPLETE**.
- R3 — Writing Evaluation Completion: **IN PROGRESS / PRIMARY**.
- R5 — Grammar Knowledge System: **CLOSED / APPROVED / merged via PR #44**.
- R6 — Speaking Core: **IN PROGRESS / INTERNAL / SECONDARY**.

Current learner skill truth:

| Skill | Release state | Source | Internal | Public |
| --- | --- | --- | --- | --- |
| Writing | BETA | available | available | no |
| Speaking | DEVELOPMENT | available | available | no |
| Reading | DEVELOPMENT | available | available | no |
| Listening | DEVELOPMENT | available | available | no |

The first public product gate requires all four conditions:

- Writing COMPLETE;
- Speaking COMPLETE;
- English PASS;
- Chinese PASS.

Only after that reviewed gate may Writing and Speaking be promoted to PUBLIC
together. Reading and Listening are later, separate releases. No current
learner skill is PUBLIC.

## Multilingual product rule

Shared learner-facing behavior applies to every supported learning language.
The current mandatory languages are EN and ZH. Do not build a shared feature
for English and later copy it for Chinese.

Use one shared language-neutral contract plus a language adapter only where a
real linguistic difference requires it. Examples include English tokenization,
phonemes, stress, and grammar details, and Chinese Hanzi segmentation, Pinyin,
tones, measure words, particles, and grammar details.

Conceptually language-scoped learner data remains isolated by:

`user + learning_language`

## M1 Media Learning Foundation

M1 is **CLOSED / FOUNDATION COMPLETE** after the explicit post-R5
program review. M1.1 through M1.6 are closed and merged. The provider-neutral,
learner-neutral Media Learning Object remains the canonical shared content
contract: source-language transcript, stable timestamped segment identities,
support-language translations, internal Listening consumption, and
shared-media Shadowing reuse the same asset.

Learner progress remains separate and scoped by user and learning language.
Future durable Listening progress belongs to R11, advanced Shadowing belongs to
R9, and full Speaking evaluation/pronunciation belongs to R7. Those stages
consume M1; they do not reopen or duplicate its foundation.

Explicit M1 closeout evidence remains canonical:

- M1.1 is **CLOSED / APPROVED / merged** — media object and segment contracts.
- M1.2 is **CLOSED / APPROVED / merged** — media ingestion and transcript acquisition.
- M1.3 is **CLOSED / APPROVED / merged** — Shared Media Translation.
- M1.4 is **CLOSED / APPROVED / merged** — Listening MVP integration and acceptance.
- M1.5 is **CLOSED / APPROVED / merged** — Active Listening transcript reconstruction.
- M1.6 Shared-media Shadowing integration is **CLOSED / APPROVED / merged** via PR #33.

One imported media source is represented once as a reusable Media Learning
Object and is consumed by both Listening and Speaking Shadowing through the same
canonical asset and timestamped segments. Learner progress remains separate.

M1.2 is **CLOSED / APPROVED / merged**. It established the authenticated media
import API, isolated YouTube adapter, explicit learning-language caption
selection, canonical transcripts, stable content-derived segment identities,
and provider-hosted playback without durable media persistence, audio download,
or audio transcription.

M1.3 is **CLOSED / APPROVED / merged**. It established one backend
support-language contract for `vi`, `en`, and `zh` and atomic enrichment of the
same Media Learning Object through the existing `learner_translation`
capability, with explicit ready, not-required, transcript-unavailable,
too-large, and unavailable states.

PV-2 / OREN-10 merged the first authenticated internal Listening workspace.
PV-3 / OREN-11 merged selected-segment navigation, Previous / Next, canonical
timestamp replay, supported playback rates, and stronger selection visibility.

M1.4 is **CLOSED / APPROVED / merged**. It verified that the reviewed M1.1-M1.3
backend and PV-2/PV-3 workspace form one truthful, internally usable EN/ZH
follow-along flow over canonical Media Learning segments.

M1.5 is **CLOSED / APPROVED / merged**. It added bounded, deterministic
transcript-reconstruction practice over canonical Media Learning segments with
browser-session-only practice state referencing canonical `asset_id` and
`segment_id`. It did not add durable learner-progress persistence.

M1.6 Shared-media Shadowing integration is **CLOSED / APPROVED / merged** via
PR #33. It reuses the same canonical Media Learning `asset_id`, transcript
segments, translations, and provider-hosted playback inside the existing
Listening workspace, with browser-session-only Shadowing round state. It did
not add a Speaking route, microphone capture, ASR, pronunciation scoring,
durable learner-progress persistence, or public release. Listening and Speaking
remain non-public.

## R5 Grammar Knowledge System

R5 is **CLOSED / APPROVED / merged via PR #44** at baseline
`d88c8cb17b16412b8c8b0de6d5fe7ab8f4a69061`.

Verified closeout:

- English `269 / 269`;
- Chinese `239 / 239`;
- total `508 / 508`;
- schema-v2 source-backed concept-specific learning models `508 / 508`;
- Grammar runtime AI `0`;
- representative expert-reviewed lessons `3`;
- `505` lessons remain explicitly `human_expert_validation=pending` as a
  deferred content-quality track.

Static Grammar KB remains source of truth. Stable Grammar Concept IDs, the
shared schema-v2 renderer, multilingual language-context separation,
capability-driven Chinese reading aids/Pinyin, and activity-evidence completion
semantics are protected. Future skill integrations consume these contracts
rather than duplicating or mass-rewriting Grammar.

## R6 Speaking Core

R6 is **IN PROGRESS / INTERNAL**. Speaking Core reuses the current
language-scoped shared Media Learning session from Listening and adds local
microphone recording, RNNoise-based voice enhancement when available, and
immediate playback of the learner's take. When configured, the stopped take
is sent transiently through the authenticated speech API to Groq ASR. Orena
does not persist the audio take to the learner account.

The recognized transcript is compared deterministically with the selected
source segment to show content-match plus missing/extra token feedback. This
is not pronunciation, fluency, or proficiency scoring. Speaking remains
**DEVELOPMENT** and non-public. R2 `speech_asr` control-plane activation,
`pronunciation_evaluator`, and `speaking_evaluator` remain later gates.

## R2 AI Capability Control Plane

- Slice 1: **CLOSED / APPROVED / merged**.
- Slice 2: **CLOSED / APPROVED / merged**.
- Slice 3: **CLOSED / APPROVED / merged via PR #10**.
- Slice 4: **CLOSED / APPROVED / merged via PR #15**.

The capability-centric control plane exists. Canonical admin APIs are:

- `GET /api/admin/ai/config`
- `PUT /api/admin/ai/config/{capability_key}`
- `POST /api/admin/ai/test/{capability_key}`

Legacy global admin mutation and provider-test endpoints remain transitional
and deprecated.

Capability-aware learner runtime support is implemented behind one central
`LEGACY` / `CAPABILITY` mode. All eight provider-backed workloads pass explicit,
product-wide capability identities. `LEGACY` remains the default and current
production behavior; production has **not** been activated to `CAPABILITY`.
In `CAPABILITY` mode, routing resolves the exact persisted provider/model and
does not fall back to `active_selection()`.

### Current capability catalog

Configurable, implemented, provider-backed capabilities:

- `writing_evaluator`
- `writing_linguistic`
- `reading_generator`
- `writing_task_generator`
- `writing_improver`
- `learner_dictionary`
- `learner_translation`
- `grammar_lesson_generator`

Deterministic capability:

- `reading_evaluator`

Reserved in the R2 control plane and not activated:

- `speech_asr` — R6 currently uses a direct internal Groq ASR adapter outside
  control-plane activation.

Reserved and unimplemented:

- `pronunciation_evaluator`
- `speaking_evaluator`

Capability configuration is product-wide. Per-language capability IDs such as
`writing_evaluator_en` and `writing_evaluator_zh` do not exist and must not be
invented.

Persisted `fallback_policy` is configuration metadata for later activation.
It is not active learner fallback behavior. There is no provider-to-provider
fallback and no silent paid-provider failover.

## Current next development areas

The post-R5 roadmap uses one primary learner-visible lane.

- **R3 — Writing Evaluation Completion: IN PROGRESS / PRIMARY.**
  Preserve the current shared evaluator/request/schema/evidence architecture and
  close real scoring, evidence, learner-feedback, EN/ZH parity, and end-to-end
  Writing/Review gaps. Do not redesign R5 or duplicate Grammar content.
- **R6 — Speaking Core: IN PROGRESS / INTERNAL / SECONDARY.**
  Preserve the stable shared-media recording/ASR/content-match foundation.
  Bounded blocker fixes may continue, but broad Speaking expansion should not
  distract from R3/R4.
- **R2 — AI Capability Control Plane: HUMAN GATE / READY.**
  Static/runtime support exists. Production migration/config initialization,
  credentialed validation, activation, and rollback execution remain human
  gates and do not block R3/R4.
- **M1 — Media Learning Foundation: CLOSED / FOUNDATION COMPLETE.**
  Future Listening durability and advanced Shadowing belong to R11/R9.
- **R5 — Grammar Knowledge System: CLOSED.**
  Future skills consume its stable concept IDs and shared schema-v2 contracts.
  Expert validation of the remaining 505 lessons is a deferred content-quality
  track, not a reason to reopen the architecture.

The intended product sequence is:

`R3 → R4 → finish remaining R6 core gaps → R7 → R8`

R2 production activation is completed when explicitly authorized and before a
public capability-dependent release requires it.
