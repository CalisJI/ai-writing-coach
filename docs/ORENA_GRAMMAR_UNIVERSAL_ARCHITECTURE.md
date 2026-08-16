# Orena Grammar — Universal Architecture Contract

Status: **PHASE 3A IMPLEMENTED / VISUAL RECHECK PENDING**

This document operationalizes the Universal Grammar Learning System requirement.
English and Chinese are current validation languages; they are not architecture
boundaries.

## Universal architecture

The shared Grammar frontend renders lesson data by visualization capability and
block type. It does not select a separate page by target language.

Runtime language responsibilities are separated:

- **target language** — language being learned
- **interface language** — reusable Orena control/role labels
- **explanation language** — instructional explanations
- **translation language** — meanings/translations shown beside target content

The renderer accepts all four independently. Current product defaults may choose
the same interface/explanation/translation language, but the rendering contract
does not couple them.

A localized text object resolves only the requested locale, its base locale, or an
explicit `default`. It does not silently fall back to Vietnamese/English/Chinese.
This prevents accidental mixed-language UI.

## Grammar provider registry

Grammar course/knowledge selection is provided by one registry contract. Shared
runtime code no longer uses a Chinese-vs-English grammar branch.

Current providers:

| Language | Curriculum items | Lesson items | Curated | Legacy/foundation |
|---|---:|---:|---:|---:|
| English (`en`) | 269 | 228 | 3 | 266 |
| Chinese (`zh`) | 239 | 197 | 0 | 239 |

Counts describe the current repository state. Reviews/checkpoints are included in
curriculum totals; lesson counts include only `kind=lesson`.

Adding another target language should require a language/profile module,
curriculum/knowledge data and Grammar provider registration. It must not require a
copied Grammar screen or a new language-specific frontend renderer.

## Learning model schema v2

Schema v2 uses the universal cognitive flow:

NOTICE → UNDERSTAND → SEE THE PATTERN → SEE IT IN CONTEXT → COMPARE → APPLY →
RECALL → TRANSFER

Lesson composition remains adaptive. A lesson also declares normalized
`capabilities`, for example:

- formula
- word-order
- transformation
- agreement
- particle
- classifier
- case
- gender
- tense
- aspect
- timeline
- comparison
- sentence-building
- context-scene
- register

Capabilities are lesson metadata, not target-language branches.

The renderer currently includes shared visual primitives for Formula,
SemanticSentence, WordOrder, ParticlePosition, Transformation, Timeline, Contrast,
AgreementMap, InflectionTable, SentenceBuilder, Scene, CommonMistake, Recall,
MemoryHook and SkillTransfer. A genuinely new grammatical mechanism may extend
this library without creating another Grammar application.

Schema v1 remains readable during migration, but all newly curated content uses v2.

## Reading aid

The shared renderer uses generic `reading_aid`, `transliteration`, or
`pronunciation_guide` concepts. Pinyin is accepted only as a migration alias in the
data validator; the shared UI does not display Pinyin-specific control text and
does not branch on Chinese.

## Mobile contract

Core Grammar content must not depend on horizontal scrolling.

At widths up to 430px:

- Formula becomes a one-column relationship flow
- semantic sentence segments stack safely
- transformations recompose vertically
- contrasts and skill-transfer cards become one column
- controls wrap instead of forcing intrinsic width
- the learning-flow nav is removed from the first mobile viewport because stage
  headers already preserve orientation
- context hook is compact so the actual grammar pattern appears early

Required screenshot QA widths remain:

320, 360, 375, 390, 414 and 430px.

CSS rules are not screenshot approval. Phase 3 remains blocked until representative
desktop/mobile visual QA is repeated.

## Current validation status

English:

- A1 `a1-be-am-is-are` — curated schema v2, visual recheck pending
- A2 `a2-present-perfect-vs-past-simple` — curated schema v2, visual recheck pending
- B1 `b1-passive-voice-present-and-past` — curated schema v2, visual recheck pending

Chinese:

- curriculum/static KB present
- representative schema-v2 lessons pending
- visual QA pending

Future languages:

- no curriculum is invented by this phase
- shared Grammar architecture must be reused
- a new language must never silently fall back to English Grammar data

## Hard gates still open

- English representative screenshot recheck
- Chinese representative implementation and screenshot QA
- all-current-language migration
- all-current-language mobile QA
- final localization audit
- final accessibility QA
- full 508-item migration

**Mass migration and Phase 3 merge remain blocked until the representative visual
recheck passes.**
