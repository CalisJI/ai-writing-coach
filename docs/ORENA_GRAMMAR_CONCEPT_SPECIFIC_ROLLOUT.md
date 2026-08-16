# Orena Grammar — Concept-Specific Source-Backed Rollout

Status: **SOURCE-BACKED AUTHORING COMPLETE / EXPERT VALIDATION TRACK REMAINS**

## Coverage

- English: **269 / 269**
- Chinese: **239 / 239**
- Total: **508 / 508**
- Runtime AI: **0**
- Stable Grammar Concept IDs preserved.

## What this milestone means

Every current Grammar lesson now renders from a schema-v2 learning model assembled
from its own Static Grammar KB/curriculum evidence: meaning/function, actual rule or
relationship, examples, structured mistake with WHY + correction, guided practice,
production, recall and skill transfer.

The compiler refuses to write the KB unless all 508 lessons pass the same source
evidence gate. It also rejects whole-core duplicate lesson bodies and title-only
placeholder lessons.

## What this milestone does NOT claim

`source-backed-concept-specific` is not the same as external expert validation.

The three English representative lessons retain their existing reviewed status.
The other 505 lessons remain explicitly marked `human_expert_validation=pending`.
They may be improved in later linguistic/editorial QA without changing the shared
Universal Grammar renderer.

## Runtime contract

- Static KB remains source-of-truth.
- Runtime AI remains disabled.
- Target/interface/explanation/translation languages remain separate.
- Chinese reading aid remains capability-driven.
- Core mobile content keeps the no-horizontal-scroll contract.
- Completion remains different from mastery.

## Next quality track

Broad linguistic/editorial validation should sample every language, level and
grammar family, then correct source content where needed. Those corrections flow
through the same renderer and do not require lesson-specific UI forks.
