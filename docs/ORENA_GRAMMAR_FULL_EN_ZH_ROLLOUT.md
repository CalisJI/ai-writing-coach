# Orena Universal Grammar — Full English + Chinese Structural Rollout

Status: **STRUCTURAL ROLLOUT COMPLETE / BROAD QA PENDING**

The accepted Universal Grammar template is applied structurally to every current
Grammar knowledge entry in both supported target languages.

## Coverage

- English: **269 / 269**
- Chinese: **239 / 239**
- Total rich schema-v2 models: **508 / 508**
- Runtime AI: **0**

Stable Grammar Concept IDs and curriculum coverage are preserved.

## Structural rollout is not fake curation

The three English representative lessons remain the human-reviewed `curated`
reference set. The other 505 entries remain `foundation` content but now carry a
deterministic `source-adapted-v1` schema-v2 learning model built from the existing
Static Grammar KB.

This means all 508 lessons use the accepted rich UI without falsely claiming that
all 508 received individual expert editorial review.

`rich structural coverage != human-curated content`

## Shared learning flow

Every migrated model uses:

`NOTICE → UNDERSTAND → PATTERN → CONTEXT → COMPARE → APPLY → RECALL → TRANSFER`

with context, contrast, Common Mistake + WHY, usage boundary, micro-practice,
personal practice, active recall, memory hook and cross-skill transfer.

## Language-sensitive pattern layer

The renderer remains shared and capability-driven.

- English source-adapted entries use the shared Formula capability.
- Chinese source-adapted entries use the shared Word Order capability.
- Chinese reading aid is generic/transliteration-capable when source examples
  contain Pinyin.
- Chinese is not forced into an English tense/formula mental model.

## Runtime contract

- Static Grammar KB remains source-of-truth.
- Runtime AI remains forbidden.
- Stable IDs remain unchanged.
- Completion remains different from mastery.
- Target/interface/explanation/translation language remain separate.
- The accepted desktop/mobile template is shared across both languages.

## QA model after this bulk rollout

The migration is no longer lesson-by-lesson. Automated gates validate and render
all **508 / 508** models. Visual QA becomes broad sampling across levels,
categories, both target languages and mobile/desktop breakpoints.

Content-specific weaknesses discovered later are corrected in Static KB/content,
not by creating language-specific renderers or returning to legacy lesson UI.

**FULL STRUCTURAL ROLLOUT IS COMPLETE. MASS HUMAN CURATION REMAINS A SEPARATE CONTENT-QUALITY TRACK.**
