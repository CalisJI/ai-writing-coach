# ORENA — CROSS-SKILL PRODUCT CONTRACT

Status: Human product intent / agent implementation contract  
Scope: Listening, Speaking, Reading, Writing, Library/Active Recall, Dictionary, Grammar, Media Learning  
Languages: English (EN) and Chinese (ZH) are first-class

## 1. Product principle
Orena is one connected language-learning system, not four unrelated mini-apps.

Canonical loop:

Listening → Dictation → Reading transcript → Dictionary/Vocabulary → Shadowing/Speaking → Writing response → mistakes/vocabulary → Library / Active Recall → future practice.

A learner should move between skills without losing source lesson, source segment, vocabulary, progress or context.

## 2. Human product intent wins
Agents MUST NOT invent a replacement product direction because implementation details are missing. When product intent and code disagree: verify repository memory, treat durable product intent as authoritative, report the mismatch, and fix implementation unless the human explicitly changes direction.

## 3. Web/native rule
Responsive web is the approved visual and functional source of truth. Native is a FULL NATIVE PORT, not a redesign or simplified subset. Preserve feature availability, information hierarchy, interaction intent, loading/error/empty states, themes, EN/ZH parity, cross-skill handoffs and timing behavior. Platform mechanics may differ only where required.

## 4. Language parity
Every shared learner-facing feature MUST be designed and tested for BOTH EN and ZH.

EN: CEFR A1-C2 where levels are needed; word-aware normalization/tokenization.
ZH: canonical Orena/HSK levels; Hanzi-aware segmentation; Pinyin where useful; never apply English word-length assumptions to Chinese.

## 5. Canonical shared objects
One canonical Media Learning Object carries source identity, provider, canonical URL, playback, transcript, segment timing, optional word timing, translation, Pinyin/readings, excerpt boundaries, provenance and progress identity.

Cross-skill transitions preserve media/asset ID, lesson ID, segment ID, source/provenance and excerpt boundaries.

Words saved from any skill go to the existing Library / Active Recall system. No skill-specific flashcard silos.

## 6. Truthful AI
AI may assist with translation, explanations, transcript recovery, level estimation, feedback and tagging. AI MUST NOT fabricate timestamps, proficiency levels, rights status, sources or scores. Use deterministic logic before AI when the task is deterministic.

## 7. Progress
Progress must correspond to real learner actions: listened seconds, completed segments, Dictation attempts, best text match, hints, Shadowing rounds, Writing submissions and review status. Never infer a global CEFR/HSK level from one small exercise.

## 8. Production gate
Green tests do not equal production acceptance. Human gates remain for visual parity, real-device native QA, production migrations, public release, billing, AI providers, catalog publication, rights review and destructive operations.

## 9. Agent startup
Before implementing a skill: `/resume-orena` → this contract → relevant skill spec → relevant current code/tests → one coherent batch. Do not redesign from competitor screenshots alone.
