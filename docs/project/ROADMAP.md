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
| R3 | Writing Evaluation Completion | IN PROGRESS / PRIMARY |
| R4 | Writing Learning Loop + Grammar Transfer | PLANNED |
| R5 | Grammar Knowledge System | CLOSED |
| R6 | Speaking Core | IN PROGRESS / INTERNAL / SECONDARY |
| R7 | Speaking Evaluation + Pronunciation Completion | PLANNED |
| R8 | Public Product Gate: Writing + Speaking EN/ZH | PLANNED |
| R9 | Speaking Advanced / Shadowing Studio | PLANNED |
| R10 | Reading Completion → separate public release | PLANNED |
| R11 | Listening Completion → separate public release | PLANNED |
| R12 | Retention & Growth | PLANNED |

## Current execution order

Primary execution from the post-R5 checkpoint is:

`R3 → R4 → finish remaining R6 core gaps → R7 → R8`

R2 production activation is an independent human gate and should be completed
before it is required for public runtime behavior, but it must not block R3/R4
product development. R6 remains usable internally and may receive bounded
regression fixes while R3/R4 are primary.

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

**IN PROGRESS / PRIMARY.**

R3 finishes the trustworthy Writing evaluation contract and its learner-facing
feedback. Existing foundations already include a shared evaluator request/schema,
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

**PLANNED.**

R4 converts trustworthy R3 evaluation evidence into a complete learning loop:

`Write → Evaluate → Understand → Targeted Practice → Revise → Compare → Progress`

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

**IN PROGRESS / INTERNAL / SECONDARY.**

The current core reuses shared Media Learning, local microphone recording,
RNNoise enhancement when available, transient Groq ASR, and deterministic
transcript content-match feedback.

Preserve the distinction:

`transcript match ≠ pronunciation score ≠ fluency score ≠ proficiency score`

While R3/R4 are the primary lane, R6 should receive only bounded core completion
or regression fixes. Do not broadly rewrite stable Speaking/media integration.

## R7 — Speaking Evaluation + Pronunciation Completion

**PLANNED.**

R7 adds the evaluation layer required for Speaking COMPLETE:

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

R9 productizes advanced Shadowing after the first public core is stable. It
continues to consume the same shared Media Learning asset/transcript/translation
contracts established by M1 rather than inventing a new media pipeline.

## R10 — Reading Completion → separate public release

R10 completes Reading, including integration with shared learning evidence,
Vocabulary/Library, and Grammar where useful. Reading remains a separate public
release after the first Writing + Speaking product.

## R11 — Listening Completion → separate public release

R11 turns the existing internal M1 Listening foundation into a complete learner
product with durable progress, richer active practice, acceptance evidence, and
its own public-release gate. Imported media remains shared with Speaking
Shadowing.

## R12 — Retention & Growth

R12 focuses on return-to-practice, useful progress visibility, habit support,
onboarding/activation, and growth without weakening learning quality,
accessibility, multilingual behavior, or the closed contracts established by
earlier stages.

## Multilingual roadmap principle

All shared learner behavior is multilingual by default. EN and ZH are the
mandatory languages for the first public product. Use shared capabilities and
flows, plus language adapters for genuine linguistic differences. Future
languages implement the same shared contract.

[`docs/PUBLIC_PRODUCT_RELEASE_ROADMAP.md`](../PUBLIC_PRODUCT_RELEASE_ROADMAP.md)
is supporting historical R0/release-contract context. This document is the
canonical current multi-agent program roadmap.
