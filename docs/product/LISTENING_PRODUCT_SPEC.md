# ORENA — LISTENING PRODUCT SPECIFICATION

Status: Human product specification  
Languages: EN + ZH  
Primary principle: Listening is a MEDIA LIBRARY FIRST, not an import form.

## 1. Product outcome
Opening Listening should feel like: **“There are many interesting things I can watch and learn from right now.”** The main entry is curated media. My Media/import is secondary.

## 2. Canonical loop
Curated Media OR My Media → canonical Media Learning Object → Listen → Follow transcript → Dictionary/Vocabulary → Active Listening/Dictation → Shadowing → Speaking → progress/Active Recall.

Curated and imported media MUST use the same player abstraction, transcript model, progress model, Dictation evaluator and Shadowing system.

## 3. Discovery / Library
### 3.1 Media-first card
The poster is the primary visual object. Conceptually:

```
┌──────────────────────────────┐
│         16:9 POSTER          │
│ level                 0:45   │
│ provider badge               │
├──────────────────────────────┤
│ Title (max 2 lines)          │
│ #tag #tag                    │
│ Listen · Dictation · Shadow  │
└──────────────────────────────┘
```

Do not copy another app's exact styling.

### 3.2 Card MUST show
Real poster/thumbnail, title, level, duration, 1-3 important tags, available modes and a clear start action.

### 3.3 Card MUST NOT be dominated by
Long descriptions, full rights text, level evidence, full source metadata or every tag. Put those in lesson/source detail.

### 3.4 Sections
Continue Learning; Recommended; Quick Practice; Movie & Animation; Daily Conversations; Stories; Podcast & Interview; Science & Technology; Culture; Kids/Family-friendly; Dictation; Shadowing; New; Popular only if real data exists; Audio Practice.

### 3.5 Ranking
When real video exists, Recommended should prefer real playable poster-backed lessons. Old audio seed lessons must not visually dominate the first viewport.

### 3.6 Responsive
Desktop uses rich cards/rails/grids; mobile preserves the same content hierarchy. Thumbnail remains dominant.

## 4. Source is not Lesson
One source can create multiple excerpts:

```
source ABC 8:00
00:15–00:48 → lesson A
01:32–02:15 → lesson B
04:20–05:05 → lesson C
```

All share one source identity.

Required source fields: source_media_id, provider, canonical_url, provider_media_id, title, creator/channel, source_language, playback kind/reference, poster_url, duration, provenance.

Required lesson fields: lesson_id, source_media_id, excerpt_start_ms, excerpt_end_ms, title, language, level, topic, tags, sections, modes and transcript references.

## 5. Development Curated Source Importer
Humans MUST NOT hand-author domain JSON for every lesson.

Input such as `writing_coach/content/listening_sources.dev.csv` should accept source_url, language, topic, level_override, tags, desired_excerpt_count, min/max excerpt seconds, section hints and notes.

Build a deterministic generator such as `scripts/build_listening_dev_catalog.py`:

source list → existing provider adapter → metadata → transcript/captions → canonical segments → candidate excerpts → stable IDs → metadata → generated dev catalog.

Report accepted/skipped/failed/duplicate/missing-transcript/unsupported-language/unavailable-media/generated-source/generated-lesson counts. Unchanged input must preserve IDs.

## 6. YouTube
Reuse the existing YouTube provider. Do not build a second importer. It already recognizes watch and Shorts URLs and provides canonical identity, official embed playback, title/oEmbed metadata, captions/transcript normalization and existing fallback paths. Do not download/rehost source video just to populate the dev library.

## 7. Dev catalog overlay
Support BASE VERIFIED CATALOG + DEV GENERATED CATALOG behind an explicit development-only flag such as `ENABLE_DEV_LISTENING_CATALOG=1`. Production must default OFF. Do not weaken publication rules.

## 8. Development content target
Target at least **100 candidate short lessons in EN and 100 in ZH**. They may be generated from fewer longer sources. At least five useful categories per language, several levels, and real posters dominating the first viewport.

Priority content: animation; film/series official clips/trailers; meaningful dialogue; emotional/human stories; motivational/reflective speech; daily conversation; science/culture; family-friendly comedy; short interviews/stories.

## 9. Player
One canonical player owns media time. Required: play/pause, seek, speed, mute, duration/progress, excerpt start/end, segment replay, AB loop where available, truthful unavailable state, poster until first rendered frame, media-clock events. Playback may be official provider embed, reviewed direct audio or reviewed direct video. Never fabricate word timing from segment timing.

## 10. Transcript / Follow
Highlight current segment. Word highlight only when truthful word timing exists. Support Original/Meaning toggles, Chinese Pinyin where available, segment click-to-seek/replay, word click-to-Dictionary, saved-vocabulary indication and smart follow. Manual selection must not fight auto-follow. AI-generated transcripts must be labelled as such.

## 11. Dictionary / Vocabulary
Tap a word/phrase → existing Dictionary → contextual meaning → save to shared Library/Active Recall. No Listening-only vocabulary silo. Chinese shows Hanzi, Pinyin and context-aware meaning.

## 12. Dictation loop
Play → Listen → Type → Check → learner-friendly differences → Replay/Hint/Retry → Pass → Next segment. It should feel like practice, not an exam.

## 13. Canonical Dictation evaluator
Preserve deterministic evaluation. EN normalizes whitespace/case/punctuation/contractions sensibly. ZH uses Hanzi-aware units and punctuation/whitespace normalization. Output correct, missing, wrong/substituted and extra. Do NOT replace with LLM grading.

## 14. Masked Reconstruction UI
Plain textarea is insufficient. Before reveal, show expected answer shape without exposing it.

EN example expected `I really like this movie`:

```
_  ______  ____  ____  _____
```

ZH example `我喜欢学汉语`:

```
□ □ □ □ □ □
```

During typing use neutral in-progress state. After Check map canonical diff to clear positive/critical/attention/extra states so the learner immediately knows which units were right or wrong.

## 15. Difficulty modes
Easy / Normal / Hard are presentation and hint policies over the SAME expected answer and SAME evaluator.

Easy: clear unit count/word length, optional first-letter/character help.  
Normal: unit/word shape, no answer text.  
Hard: minimal masking clues and fewer automatic hints.

## 16. Hints
Replay → Slow replay → word/character count → first letter/word/Hanzi → difficult vocabulary → translation/Pinyin where useful → per-unit reveal → full reveal. Track hint use. Revealed content never counts as unaided correctness.

## 17. Segment navigation
Desktop may coordinate VIDEO | DICTATION | SEGMENTS. Navigator shows current/unattempted/attempted/passed/revealed/needs-retry states without leaking hidden answers. After pass: Next, Replay, Shadow this segment.

## 18. Shadowing
Reuse same media/lesson/segment/timing. Listen model → repeat → optional local recording → listen to self → completed round → Speaking handoff for evaluation. If scoring is not available, say so truthfully.

## 19. Speaking handoff
Preserve asset/media ID, lesson ID, segment ID, source URL and reference text so Speaking opens ready for that exact segment.

## 20. Progress / Resume
Persist last lesson, segment, mode, Dictation attempts, best deterministic match, exact/pass, reveal/hint state as appropriate and Shadowing rounds. Continue Learning must be driven by real progress.

## 21. EN/ZH
Every feature above is QA'd in both languages. EN uses CEFR/word shape; ZH uses HSK/Hanzi/Pinyin/Chinese punctuation and natural segmentation.

## 22. Degraded states
Explicitly support source unavailable, provider timeout, no transcript, AI-generated transcript, translation unavailable, playback unavailable, poster unavailable, catalog failed, progress unavailable and native playback degraded. Never show a silent blank/black player when a truthful fallback exists.

## 23. Visual acceptance
Library FAILS if thumbnails are tiny, text dominates, first viewport is generic icons, only one real video is visible or seed audio and real media are indistinguishable. Dictation FAILS if it is only textarea + percentage or if correct/wrong/missing/extra and progression are hard to understand.

## 24. Tests
Cover bulk source ingestion, stable IDs, duplicates, YouTube watch/Shorts, missing transcript, poster, multiple excerpts/source, EN/ZH catalogs, dev overlay disabled in production, media-first discovery, player timing, transcript sync, EN masked Dictation, ZH masked Dictation, diff states, hint/reveal semantics, next segment, Shadowing handoff, progress/resume and web/native parity.

## 25. Definition of done
Listening is NOT done because one real video plays. A development milestone requires media-first discovery, meaningful content density in EN/ZH, bulk source ingestion, multiple excerpts/source, masked Dictation, useful deterministic diff, shared Dictionary/Vocab/Shadowing flows, native full-port parity and truthful Project Memory. Human visual/playback acceptance remains required.
