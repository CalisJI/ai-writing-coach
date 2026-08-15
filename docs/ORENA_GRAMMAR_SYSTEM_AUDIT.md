# Orena Global Grammar Learning System — Phase 1 Audit

> Scope: all current English + Chinese grammar content. This document is an audit/migration map, not a claim that the redesign is complete.

## AUDIT

- English: **228 lessons / 269 total items**.
- Chinese: **197 lessons / 239 total items**.
- Total current curriculum items: **508**.
- English levels: A1, A2, B1, B2, C1, C2.
- Chinese levels: HSK1, HSK2, HSK3, HSK4, HSK5, HSK6, HSK7-9.
- English modules/categories: 26 / 27.
- Chinese modules/categories: 14 / 15.

### Current data model

- Curriculum keys: `category, common_traps, completion_policy, content_version, contrasts, id, kind, level, module, module_scope, objective_vi, official_mapping, order, practice_blueprint, prerequisites, reference_basis, restrictions, scope, title`.
- Static KB top-level keys: `content_version, cross_skill, id, kind, lesson, level, quick_reference, source, title`.
- Current teaching-body keys: `contrasts, examples, exceptions, explanation_vi, guided_practice, mistakes, production_task_vi, rules, writing_tip_vi`.
- Static KB already provides stable IDs, quick reference, cross-skill metadata, content status and runtime-AI exclusion.
- The current KB does **not** yet expose the rich adaptive learning-block model required for formula, position, insertion, timeline, scene, sentence-building, recall and transfer composition.

## ARCHITECTURE

- DONE — `#/grammar` route exists
- DONE — Grammar screen is registered
- DONE — Shared API client serves Grammar
- DONE — Quick-reference API client exists
- DONE — Lesson endpoint serves static KB
- DONE — Runtime Grammar lesson AI generation is removed
- DONE — Completion/uncomplete endpoints exist
- DONE — Grammar chrome localization exists
- Current UI route: `#/grammar`.
- Current Grammar API routes: `/api/library/grammar, /api/library/grammar/{lesson_id}, /api/library/grammar/{lesson_id}/complete, /api/library/grammar/{lesson_id}/reference`.
- Current renderer functions: `examplesBlock, groupByLevel, groupByModule, kindLabel, lessonMarkup, listBlock, nextIncomplete, overviewMarkup, practiceBlock, progressOf, renderGrammar, sourceLabel`.

## CURRENT RENDERER GAP

- Current lesson renderer is still primarily linear: objective → rules → contrasts → exceptions → examples → mistakes → guided practice → production.
- Missing reusable visual-learning capabilities detected in current renderer: **formula, semantic_sentence, transformation, word_order, timeline, contrast, scene, sentence_builder, personal_practice, recall, memory_hook, skill_transfer**.
- Developer/content-source metadata in primary learning flow: **YES**.
- Mastery/completion disclaimer in primary learning flow: **YES**.
- Current completion gate is based on two production lines: **YES**.

## ENGLISH

- DONE — curriculum source of truth exists for 228 lessons.
- DONE — static KB coverage missing IDs: 0.
- IN PROGRESS — foundation static content: 269.
- PENDING — curated rich-learning content: 0 / 269 items.
- PENDING — incomplete/placeholder teaching bodies detected: 228.
- Migration status: `{"PENDING": 269}`.

## CHINESE

- DONE — curriculum source of truth exists for 197 lessons.
- DONE — static KB coverage missing IDs: 0.
- IN PROGRESS — foundation static content: 239.
- PENDING — curated rich-learning content: 0 / 239 items.
- PENDING — incomplete/placeholder teaching bodies detected: 197.
- Migration status: `{"PENDING": 239}`.

## DUPLICATION / PLACEHOLDER SIGNALS

- English duplicate-title groups: 2.
- Chinese duplicate-title groups: 1.
- English duplicate teaching-body fingerprints: 0.
- Chinese duplicate teaching-body fingerprints: 0.
- Duplicate fingerprints are audit signals only; they require content review before being treated as actual duplicate lessons.

## LOCALIZATION

- Shared Grammar renderer currently has EN/VI/ZH chrome copy.
- Current lesson-body source is not yet a full learner-locale content system; the next content model must separate UI locale from target-language pedagogy.
- Chinese must preserve Hanzi-first presentation with optional/toggleable Pinyin and natural meaning layers in Phase 2+.

## PROGRESS / COMPLETION

- Existing completion persistence is retained and must not regress.
- Current completion is activity evidence, not mastery.
- Phase 2 must move completion UI to the end of meaningful learning flow without breaking existing stored completion IDs.

## HARD-CODE / SOURCE SCAN

- Scan boundary: active repository source; backups/tool caches excluded.
- Grammar-related source files detected: 92.
- Files with developer/metadata markers requiring UX review: 1.
- Files with possible hard-coded grammar IDs: 1.
- Full file lists and markers are preserved in `docs/ORENA_GRAMMAR_MIGRATION_MAP.json`.

## PHASE 2 ENTRY GATE

- Build one shared Grammar Learning Content Model by extending the existing static KB; do not create a parallel lesson source.
- Build reusable adaptive learning blocks for formula, semantic sentence, transformation, position, insertion, timeline/aspect, contrast, scene, sentence building, micro-practice, personal practice, recall, memory hook and skill transfer.
- Preserve stable grammar IDs, current completion namespace and static-runtime behavior.
- Validate structurally different English concepts before mass migration.
- Validate Chinese word order, particle/aspect, comparison/classifier and construction concepts before mass migration.
- Do not begin full 508-item content migration until both representative English and Chinese renderers pass.

## MIGRATION STATUS

- Overall: `{"PENDING": 508}`.
- Per-item status, reasons and candidate visual modes are in `docs/ORENA_GRAMMAR_MIGRATION_MAP.json`.
- Candidate visual modes are heuristics for planning only; they are not authoritative pedagogy.

## REMAINING WORK

1. Phase 2 — rich data model + reusable renderer/component foundation.
2. Phase 3 — representative English validation.
3. Phase 4 — representative Chinese validation.
4. Phase 5 — migrate every current curriculum item with explicit status.
5. Phase 6 — Writing/Speaking/Reading/Listening grammar inspection and transfer.
6. Phase 7 — desktop/mobile/accessibility/localization/regression QA.

**Grammar redesign status: IN PROGRESS. Phase 1 audit only.**
