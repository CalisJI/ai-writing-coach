# Current Handoff

**Application/runtime baseline:**
`d88c8cb17b16412b8c8b0de6d5fe7ab8f4a69061`

This baseline is the reviewed merge of R5 Grammar Knowledge System closeout
(PR #44). Documentation-only descendants may advance `main` without changing
this baseline.

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

## Current runtime truth

- PostgreSQL remains authoritative; SQLite remains frozen rollback/archive only.
- Application version remains `1.4.0`.
- BECOMING frontend version is `2.17.3`.
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
- current frontend version contract `2.17.3`.

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
