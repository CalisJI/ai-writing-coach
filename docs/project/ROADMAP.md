# Canonical Multi-Agent Roadmap

This is the canonical program sequence for coordinated work. Status changes
require approval and must remain consistent with `PROJECT_STATE.md` and
`CURRENT_HANDOFF.md`.

## Roadmap operating rules

1. **Preserve closed systems.** A reviewed CLOSED stage is a protected baseline,
   not the default place for opportunistic refactoring. Later stages consume its
   stable contracts, IDs, and data.
2. **One primary product lane at a time.** Secondary lanes may receive bounded
   blocker fixes or explicitly approved integration work, but must not distract
   from the current learner-visible milestone.
3. **Multilingual is part of the milestone, not a later retrofit.** Shared
   learner behavior must pass EN and ZH in the same stage. Language adapters are
   used only for genuine linguistic differences.
4. **Prefer learner-visible vertical slices.** When architecture is already
   sufficient, connect the feature end-to-end and make it testable before
   spending cycles on non-blocking backend polish.
5. **Stop when acceptance passes.** P0/P1 findings block. P2 polish and rare edge
   cases are recorded and deferred unless they materially affect learning or
   release readiness.

## Program status

| Stage | Scope | Status |
| --- | --- | --- |
| R0 | Product Release Architecture | CLOSED |
| R1 | Production Staging + Cloudflare + Google OAuth | CLOSED |
| R2 | AI Capability Control Plane | HUMAN GATE / READY, NOT PRODUCT-BLOCKING |
| M1 | Media Learning Foundation (cross-cutting) | CLOSED / FOUNDATION COMPLETE |
| R3 | Writing Evaluation Completion | COMPLETE / LOCAL ACCEPTANCE PASS |
| R4 | Writing Learning Loop + Grammar Transfer | COMPLETE / LOCAL ACCEPTANCE PASS |
| R5 | Grammar Knowledge System | CLOSED |
| R6 | Speaking Core | COMPLETE / LOCAL ACCEPTANCE PASS |
| R7 | Speaking Evaluation + Pronunciation Completion | COMPLETE / LOCAL ACCEPTANCE PASS |
| R8 | Public Product Gate: Writing + Speaking EN/ZH | PLANNED |
| R9 | Speaking Advanced / Shadowing Studio | COMPLETE / LOCAL ACCEPTANCE PASS |
| R10 | Reading Completion → separate public release | COMPLETE / LOCAL ACCEPTANCE PASS |
| R11 | Listening Completion → separate public release | PRE-PUBLIC MATRIX COMPLETE / HUMAN PROMOTION GATE |
| R12 | Retention & Growth | COMPLETE / LOCAL ACCEPTANCE PASS |
| R13 | Platform Admin Completion | COMPLETE / LOCAL ACCEPTANCE PASS |
| R14 | AI Usage, Cost, Quota & Provider Operations | COMPLETE / LOCAL ACCEPTANCE PASS |
| R15 | SaaS Plans, Entitlements & Usage Policy | PLANNED / POST-R12 PLATFORM TRACK |
| R16 | Advanced Learning Intelligence | PLANNED / POST-R12 PRODUCT TRACK |
| R17 | Product Analytics & Operational Observability | PLANNED / POST-R12 PLATFORM TRACK |
| R18 | Mobile/API Readiness | PLANNED / POST-R12 PLATFORM TRACK |

## Historical execution order

The historical primary execution from the post-R5 checkpoint was:

`R3 → R4 → finish remaining R6 core gaps → R7 → R8`

R3 is now complete at its local-acceptance checkpoint. Current ownership and
promotion gates are recorded in `CURRENT_HANDOFF.md` and `PROJECT_STATE.md`;
there is no active autonomous R3/R4 implementation lane.

R2 production activation is an independent human gate and should be completed
before it is required for public runtime behavior, but it must not block R3/R4
product development in that historical sequence. R6 remains usable internally
and may receive bounded regression fixes while R3/R4 were primary.

## R0 — Product Release Architecture

**CLOSED.** Established one product-wide skill release contract, truthful
pre-public skill states, shared route ownership, and the first public product
gate.

## R1 — Production Staging + Cloudflare + Google OAuth

**CLOSED / PASS.** Established public staging, canonical Docker Cloudflare
Tunnel connectivity, Google OAuth, PostgreSQL-backed product reads, and EN/ZH
staging smoke evidence. Reopen only for a new concrete failure.

## R2 — AI Capability Control Plane

**HUMAN GATE / READY, NOT PRODUCT-BLOCKING.**

- capability/provider contracts: **CLOSED**;
- configuration persistence and migration tooling: **CLOSED**;
- capability-centric admin API and live capability test: **CLOSED**;
- atomic learner runtime support: **IMPLEMENTED**;
- production capability activation: **HUMAN GATE / NOT EXECUTED**.

Do not redesign the control plane while product work is advancing. Production
migration/config initialization, live provider validation, atomic activation,
and rollback remain explicit human operations. R2 must be completed before a
public capability-dependent release requires it, but its production gate does
not block learner-facing R3/R4 development.

## M1 — Media Learning Foundation (cross-cutting)

**CLOSED / FOUNDATION COMPLETE.**

M1.1 through M1.6 are closed and merged. The foundation now provides one
provider-neutral Media Learning Object, canonical timestamped transcript
segments, support-language translation, internal Listening practice, Active
Listening reconstruction, and shared-media Shadowing integration.

Merged foundation slices:

- M1.1 — media object and segment contracts: **CLOSED / merged**;
- M1.2 — media ingestion and transcript acquisition: **CLOSED / merged**;
- M1.3 — shared media translation: **CLOSED / merged**;
- M1.4 — Listening MVP integration and acceptance: **CLOSED / merged**;
- M1.5 — Active Listening: **CLOSED / merged**;
- M1.6 — Shadowing integration: **CLOSED / merged**.

M1 is closed because no remaining foundation slice is defined. Future work does
**not** reopen M1:

- durable Listening progress belongs to R11;
- full Speaking evaluation and pronunciation belong to R7;
- advanced Shadowing Studio belongs to R9;
- shared-media learner product refinement may be consumed by those stages.

The same imported video/media asset must continue to power Listening and
Speaking Shadowing through the canonical shared segments rather than creating
parallel media pipelines.

## R3 — Writing Evaluation Completion

**COMPLETE / LOCAL ACCEPTANCE PASS.**

R3 finishes the trustworthy Writing evaluation contract and its learner-facing
feedback. The shared EN/ZH evaluator request/schema, grounded evidence,
revision/review handoff, and degraded-state contracts are locally accepted;
public promotion remains governed by R8 and the R2 capability-activation gate.
Existing foundations already include a shared evaluator request/schema,
language policy, weighted scoring, literal learner-fragment evidence, confidence
filtering, and the shared `writing_evaluator` capability identity.

R3 completion requires:

- one shared evaluation flow for EN and ZH; no English-first implementation
  followed by a later Chinese retrofit;
- scores that reflect demonstrated performance rather than being forced toward
  the learner's target level;
- exact learner evidence for strengths and errors, with false or low-confidence
  evidence omitted;
- learner-visible categorized feedback, including category-coded annotations
  where useful, without one-off language-specific UI;
- actionable correction, explanation, and compact rule/evidence presentation;
- stable evaluator/provider failure and degraded states;
- revision/evaluation evidence that can be consumed by Review, Journey,
  Library/Practice, and later progress logic;
- representative EN/ZH regression fixtures and end-to-end learner flow checks.

R3 should not duplicate Grammar content, redesign R5, or implement pronunciation.

### Multilingual scope change

The former roadmap stage **R4 — Multilingual Writing Language Lens** is absorbed
into R3. This follows the existing multilingual invariant: EN/ZH quality is part
of Writing evaluation completion itself, not a bolt-on after an English product.

## R4 — Writing Learning Loop + Grammar Transfer

**COMPLETE / LOCAL ACCEPTANCE PASS.**

R4 converts trustworthy R3 evaluation evidence into a complete learning loop:

`Write → Evaluate → Understand → Targeted Practice → Revise → Compare → Progress`

The shared EN/ZH evidence-to-grammar, targeted-practice, revision-lineage, and
downstream Review/Journey/Library contracts are locally accepted. Public
promotion remains governed by R8 and the R2 capability-activation gate.

R4 consumes the CLOSED R5 Grammar Knowledge System through stable Grammar
Concept IDs and shared contracts. It must not copy or regenerate a second
Grammar curriculum inside Writing.

Expected outcomes:

- map appropriate Writing findings to existing Grammar concepts when a reliable
  mapping exists;
- open or recommend the matching Grammar lesson/practice without duplicating its
  content;
- generate targeted micro-practice from learner evidence and current learning
  context;
- preserve revision lineage and show meaningful before/after deltas;
- feed learning evidence back into Review/Journey/Library/Practice;
- maintain EN/ZH parity through the shared flow plus genuine language adapters.

Writing becomes a **COMPLETE** public-gate candidate only after R3 and R4 pass
their reviewed acceptance gates.

## R5 — Grammar Knowledge System

**CLOSED via PR #44 / merge `d88c8cb17b16412b8c8b0de6d5fe7ab8f4a69061`.**

Verified closeout state:

- English: **269 / 269**;
- Chinese: **239 / 239**;
- total: **508 / 508**;
- schema-v2 source-backed concept-specific learning models: **508 / 508**;
- Grammar runtime AI: **0**;
- representative expert-reviewed lessons: **3**;
- expert-validation-pending lessons: **505**, explicitly deferred as a later
  content-quality track rather than a product blocker.

Protected R5 contracts include stable Grammar Concept IDs, Static Grammar KB as
source of truth, the shared schema-v2 renderer, language-context separation,
capability-driven Chinese reading aids/Pinyin, activity-evidence completion
semantics, and no broad structural migration rewrite.

Reopen R5 only for a concrete learner-facing regression, an explicitly approved
curriculum extension, or an accepted architecture decision.

## R6 — Speaking Core

**COMPLETE / LOCAL ACCEPTANCE PASS.**

The current core reuses shared Media Learning, local microphone recording,
RNNoise enhancement when available, transient Groq ASR, and deterministic
transcript content-match feedback.

The EN/ZH record-to-transcript-to-feedback boundary is locally accepted. This
closeout does not add pronunciation, fluency, or proficiency scoring: those
dimensions remain R7 work, while R2 activation and R8 public promotion remain
explicit human gates.

Preserve the distinction:

`transcript match ≠ pronunciation score ≠ fluency score ≠ proficiency score`

During the historical R3/R4 primary lane, R6 received only bounded core
completion or regression fixes. Current R6 ownership and any promotion remain
governed by the status and human gates recorded in `CURRENT_HANDOFF.md` and
`PROJECT_STATE.md`; do not broadly rewrite stable Speaking/media integration.

## R7 — Speaking Evaluation + Pronunciation Completion

**COMPLETE / LOCAL ACCEPTANCE PASS.**

The EN/ZH evaluator, pronunciation evidence, localized feedback, and durable
learner-scoped attempt/history contracts are locally accepted. Transcription
confidence, pronunciation, fluency, and proficiency remain separate dimensions;
R2 capability activation and R8 public promotion remain explicit human gates.

R7 provides the evaluation layer required for Speaking COMPLETE:

- control-plane-integrated `speech_asr` when the R2 human gate is approved;
- `pronunciation_evaluator`;
- `speaking_evaluator`;
- durable Speaking attempt/progress evidence;
- clear separation of transcription confidence, pronunciation, fluency, and
  proficiency;
- language adapters for genuine differences such as English phonemes/stress and
  Chinese Pinyin/tones;
- EN/ZH representative acceptance and learner-visible feedback.

## R8 — Public Product Gate: Writing + Speaking EN/ZH

Public release requires all four conditions:

- Writing COMPLETE;
- Speaking COMPLETE;
- English PASS;
- Chinese PASS.

In the revised sequence this means R3 + R4 Writing acceptance and R6 + R7
Speaking acceptance must be closed, with a reviewed EN/ZH release matrix and
production readiness. Only an explicit human-approved release-gate action may
promote Writing and Speaking to PUBLIC.

## R9 — Speaking Advanced / Shadowing Studio

**COMPLETE / LOCAL ACCEPTANCE PASS.**

The EN/ZH Shadowing Studio flow is locally accepted for canonical shared-media
selection, transcript practice, Speaking-feedback continuity, and resumable
learner state. It continues to consume the same Media Learning
asset/transcript/translation contracts established by M1 rather than inventing
a parallel media pipeline. Public productization and provider activation remain
explicit human gates after the core release review.

## R10 — Reading Completion → separate public release

**COMPLETE / LOCAL ACCEPTANCE PASS.**

The EN/ZH Reading session, exact passage-evidence comprehension, learner-scoped
history, Library vocabulary, and contextual-dictionary contracts are locally
accepted without mastery or proficiency claims. Reading remains a separate
public release; credentialed provider validation, production mutation, and
public promotion remain explicit human gates.

## R11 — Listening Completion → separate public release

**PRE-PUBLIC MATRIX COMPLETE / HUMAN PROMOTION GATE.**

The EN/ZH Active Listening reconstruction, Shadowing rounds,
Shadowing-to-Speaking feedback continuity, and truthful restore/degraded states
are locally accepted through the deterministic pre-public matrix. Durable
progress remains learner-scoped and audio-free, and imported media remains
shared with Speaking Shadowing.

R11 turns the existing internal M1 Listening foundation into a complete learner
product with durable progress, richer active practice, acceptance evidence, and
its own public-release gate. Production migration, capability activation, and
public Listening promotion remain explicit human gates.

R11 remains the Listening completion and public-release-readiness gate.

## R12 — Retention & Growth

**COMPLETE / LOCAL ACCEPTANCE PASS.**

The EN/ZH return-to-practice, device-local Listening habit, prioritized
cross-skill next-practice, and baseline Writing onboarding contracts are
locally accepted. They preserve bounded language/segment/mode handoffs,
truthful unavailable/no-action states, and no transcript/audio persistence.
Server-side tracking, production operations, and public promotion remain
explicit human gates.

R12 focuses on return-to-practice, useful progress visibility, habit support,
onboarding/activation, and growth without weakening learning quality,
accessibility, multilingual behavior, or the closed contracts established by
earlier stages.


## Post-R12 roadmap extension — preserve existing product sequence

The stages below extend the roadmap without renumbering, rewriting, merging, or
changing the meaning of R0–R12. They formalize platform and advanced-product work
that already exists in repository code, architecture, or supporting plans but is
not yet represented as a canonical stage.

The extension follows these rules:

- **R0–R12 remain structurally unchanged.** Their scope, ordering, completion
  meaning, and human gates are preserved.
- **No extension stage may reopen a CLOSED subsystem by default.** It consumes
  existing contracts and adds only the missing product/platform layer.
- **The current learner-product execution order is unchanged.** R13–R18 do not
  preempt R3/R4/R6/R7/R8 unless they fix a concrete blocker.
- **Production mutation remains human-gated.** Admin completion must not silently
  activate production providers, paid services, capability mode, billing, or
  release state.
- **EN/ZH parity remains product-wide.** Platform controls are shared; learner
  behavior exposed by advanced features must preserve the multilingual
  invariant.

### Historical execution relationship

The historical primary path was:

`R3 → R4 → finish remaining R6 core gaps → R7 → R8`

This sequence is retained for traceability; current ownership and promotion
gates are governed by `CURRENT_HANDOFF.md` and `PROJECT_STATE.md`, with no active
autonomous R3/R4 implementation lane.

Then the existing post-R8 learner roadmap remains:

`R9 → R10 → R11 → R12`

R13–R18 are the canonical post-R12 extension. They may be implemented in
dependency-aware order rather than treated as one rigid serial chain. The
default dependency order is:

`R13 → R14 → R15`

and:

`R16`

and:

`R17 → R18`

Cross-stage work is allowed only when it is a bounded prerequisite, shared
contract, or verified blocker.

## R13 — Platform Admin Completion

**COMPLETE / LOCAL ACCEPTANCE PASS.**

The capability-centric Platform Admin matrix and scoped configuration flow are
locally accepted. It distinguishes configurable, deterministic, reserved,
unavailable, and saved-state provenance without exposing credentials; scoped
saves and explicit click-only health checks preserve sanitized failure states
without activating learner runtime or legacy global controls. Credentialed
provider health validation, production mutation, and runtime activation remain
explicit human gates.

R13 completes the current Platform Admin surface so it matches the capability-
centric R2 architecture instead of the older one-global-model UI.

Existing foundations to preserve include:

- administrator-only access and server-side secrets;
- capability-centric admin APIs;
- provider/model configuration persistence;
- capability-level model testing;
- product-wide provider catalog;
- legacy/capability runtime separation;
- the R2 human gate for production activation.

R13 completion requires:

- present a capability matrix rather than one model for the whole product;
- show provider, model, readiness, and runtime state per configurable capability;
- allow safe capability-level provider/model configuration;
- preserve deterministic capabilities as deterministic, not provider-backed;
- surface reserved/unimplemented capabilities truthfully;
- expose test/health status without leaking credentials;
- distinguish saved configuration from active production runtime;
- require explicit human approval for production activation/mutation;
- preserve auditability of admin-side changes;
- align the Admin UI with the current canonical admin API contract.

R13 must not redesign the R2 control plane or silently migrate production state.

## R14 — AI Usage, Cost, Quota & Provider Operations

**COMPLETE / LOCAL ACCEPTANCE PASS.**

The sanitized capability/provider telemetry, PostgreSQL audit aggregation, and
read-only Admin operations surface are locally accepted. Missing or partial
usage and rate-limit data remain explicit; bounded health, cost, quota, and
trend evidence never exposes credentials or performs provider probes. Scoped
provider controls preserve primary/standby separation without billing, quota
enforcement, automatic failover, or learner-runtime mutation. Credentialed
validation, production observation, billing/quota enforcement, and runtime
activation remain explicit human gates.

R14 makes AI runtime economics and provider health observable before learners are
affected.

Existing foundations to consume include:

- per-capability provider/model configuration;
- captured provider quota/rate-limit metadata where available;
- the provider-neutral translation/evaluation boundaries;
- deterministic/local replacements already adopted for high-volume paths;
- the existing AI cost-reduction plan.

Expected outcomes:

- requests, tokens, latency, errors, and quota visibility by capability;
- provider/model health and failure-rate visibility;
- consumed/remaining quota when providers expose it;
- threshold-based operational warnings;
- clear exhausted/degraded states;
- operator-visible cost/usage trends;
- no silent paid-provider failover;
- explicit operator selection of backup provider where supported;
- safe test tooling that does not mutate learner runtime.

R14 is observability and operations work. It must not activate billing or paid
providers automatically.

## R15 — SaaS Plans, Entitlements & Usage Policy

**PLANNED / POST-R12 PLATFORM TRACK.**

R15 turns existing account/product foundations into explicit product-plan and
entitlement behavior.

Expected outcomes:

- canonical Free/Premium-or-later plan model;
- feature entitlements separated from UI-only badges;
- usage limits expressed in product policy rather than scattered conditionals;
- capability-aware limits where AI cost materially differs;
- truthful exhausted-limit behavior;
- account/product state available to learner UI and Admin;
- no feature unlocked only in one language;
- billing/provider integration behind explicit human-approved production gates;
- regression coverage for entitlement boundaries and downgrade/upgrade states.

R15 must not hard-code business rules into individual skills where a shared
entitlement contract is sufficient.

## R16 — Advanced Learning Intelligence

**PLANNED / POST-R12 PRODUCT TRACK.**

R16 formalizes advanced learner-facing intelligence that is currently distributed
across Writing, Review, Grammar, Dictionary, Media, Journey, and supporting
design documents.

R16 consumes existing stable systems rather than creating parallel ones.

Expected outcomes may include:

- contextual dictionary meaning using the learner's actual sentence/segment;
- adaptive practice selection from verified learner evidence;
- error-memory-driven review;
- cross-skill transfer of trustworthy evidence;
- personalized next-practice recommendations;
- adaptive difficulty from demonstrated performance, not target-level forcing;
- context-aware explanations that remain grounded in stable dictionary/Grammar
  sources;
- smart review scheduling that preserves the R12 retention model;
- EN/ZH behavior through shared contracts plus genuine language adapters.

R16 must not duplicate R5 Grammar content, replace shared Media Learning, or
invent unsupported proficiency claims.

## R17 — Product Analytics & Operational Observability

**PLANNED / POST-R12 PLATFORM TRACK.**

R17 provides product and operational visibility without changing learner-facing
scoring semantics.

Expected outcomes:

- active learner/session trends;
- skill usage and completion funnels;
- return-to-practice and retention measures;
- provider reliability and AI error-rate visibility;
- learner-facing failure/degraded-state counts;
- cost-per-capability and cost-per-active-user views where data is available;
- release/readiness evidence summaries;
- privacy-respecting event boundaries;
- admin-only operational dashboards where appropriate.

Analytics must not redefine learning mastery or fabricate progress from product
engagement alone.

## R18 — Mobile/API Readiness

**PLANNED / POST-R12 PLATFORM TRACK.**

R18 prepares Orena's existing web/server product contracts for a mobile client
without forking the product model.

Existing architectural direction to preserve:

- authoritative server-side datasets;
- stable authenticated APIs;
- shared EN/ZH contracts;
- server-managed provider secrets;
- shared Media Learning assets;
- PostgreSQL authority.

Expected outcomes:

- stable mobile-consumable API contracts;
- compressed API responses where appropriate;
- cache policy for immutable/versioned dictionary and stroke data;
- response shaping that avoids unnecessary payloads;
- mobile-safe authentication/session behavior;
- resumable media/learning state where product requirements demand it;
- graceful poor-network/degraded behavior;
- no duplication of large server datasets in the client by default;
- compatibility tests for web and mobile consumers of shared contracts.

R18 must not create a second mobile-only learning architecture.

## Multilingual roadmap principle

All shared learner behavior is multilingual by default. EN and ZH are the
mandatory languages for the first public product. Use shared capabilities and
flows, plus language adapters for genuine linguistic differences. Future
languages implement the same shared contract.

[`docs/PUBLIC_PRODUCT_RELEASE_ROADMAP.md`](../PUBLIC_PRODUCT_RELEASE_ROADMAP.md)
is supporting historical R0/release-contract context. This document is the
canonical current multi-agent program roadmap.
