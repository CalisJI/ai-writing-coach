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

## 3b. Language identity — three distinct concepts

Orena is globally designed. These are separate and MUST NOT be conflated:

- **LEARNING_LANGUAGE** — what the learner studies. Currently EN and ZH.
- **SUPPORT_LANGUAGE** — the language of translated meaning, explanations,
  grammar notes, dictionary support meaning and learner-facing AI support text.
- **UI_LOCALE** — the language of the interface.

A learner may study English with meanings in Japanese, or Chinese with meanings
in Spanish plus Pinyin. **Vietnamese is one possible support language among
many.** It is never a built-in default, never inferred from a locale header, and
never derived from the learning language.

Support language resolves in exactly one order: stored profile preference → an
explicit valid selection → the configured neutral default. The final step is
configuration, not an inference about who the user is. Identity is stored
BCP-47-shaped; the list of languages Orena can currently translate into is a
capability boundary checked at resolution, not the data model.

The preference is persistent and survives login, restart, web/native and every
skill. It lives in the learner profile — not browser storage, and not a second
parallel preference store.

Translation targets the support language and never modifies `original_text`;
translated text is never canonical transcript truth.

## 3c. Media without captions is valid input

A playable supported video with no captions is a valid media source. Missing
captions start transcript recovery; they never mean unsupported or invalid.

**Playback state and transcript state are independent.** `playback = READY` with
`transcript = GENERATING` is a valid learner state: the player, poster and title
exist immediately, and only transcript-dependent modes — Dictation, follow
transcript, Shadowing reference text — wait.

Recovery order, reusing the services that already exist rather than building
another transcript system: provider captions → ASR/timing where raw audio is
genuinely available → Supadata generation (immediate or async job with polling)
→ only then a truthful degraded state.

Terminal states are explicit: READY, PROCESSING, TRANSCRIPT_UNAVAILABLE,
PROVIDER_TIMEOUT, PROVIDER_FAILURE, RETRY_AVAILABLE. No fake percentage
progress, and no spinner without end.

A generated transcript discloses its provenance — `provider_caption`,
`generated_asr` or `supadata_generated` — and is never presented as the source's
own subtitles. Word timing is never fabricated.

My Media import and curated catalog import share one recovery contract. The same
URL must not succeed in one and fail in the other.

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
