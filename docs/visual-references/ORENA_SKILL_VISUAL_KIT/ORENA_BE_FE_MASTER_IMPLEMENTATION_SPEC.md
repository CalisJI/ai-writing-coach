# ORENA — BE/FE MASTER IMPLEMENTATION SPECIFICATION
## Canonical Product + Frontend + Backend Contract

**Purpose:** Give Claude/Multica/other implementation agents one detailed source of product intent and engineering expectations so frontend and backend evolve together without inventing incompatible behavior.

**Scope:** Onboarding, Home, Writing, Review, Reading, Listening, Speaking, Grammar, Library / Active Recall, Journey / Progress, Profile / Preferences, Admin / AI Control Plane, plus shared architecture and cross-skill contracts.

**Important:** This document distinguishes:

- **CURRENT** — verified capability already present in the repository/runtime.
- **TARGET** — desired product behavior.
- **PROPOSED CONTRACT** — may be added if the current contract is insufficient.
- **DEFERRED** — intentionally later.
- **HUMAN GATE** — production/config/data mutation requiring explicit authorization.

---

# 0. IMPLEMENTATION MANDATE

## 0.1 Product identity

Learner-facing product name:

**Orena**

Legacy/internal names such as `BECOMING`, `/becoming`, historical module names, storage keys, route internals, and migration artifacts may remain where changing them would risk stability.

Do not expose obsolete learner-facing branding.

---

## 0.2 Mandatory supported learning languages

Current mandatory learning languages:

- English (`en`)
- Chinese (`zh`)

Shared learner-facing product behavior must be designed for both from the start.

Never implement:

> English now → duplicate/translate for Chinese later.

Use:

> shared language-neutral contract + language adapter where a true linguistic distinction exists.

Examples of real language-specific differences:

### English
- tokenization;
- morphology;
- parts of speech;
- phonemes;
- lexical stress;
- sentence rhythm;
- English grammar taxonomy.

### Chinese
- Hanzi segmentation;
- Pinyin;
- initials/finals;
- tones;
- particles;
- aspect;
- measure words;
- Chinese word-order patterns;
- Chinese grammar taxonomy.

---

## 0.3 Learner-scope invariant

Conceptually all learner-specific learning data is scoped by:

`user_id + learning_language`

Examples:

- learner profile;
- writing history;
- revision evidence;
- reading sessions;
- saved vocabulary;
- grammar completion;
- practice outcomes;
- learner memory;
- speaking/listening progress.

Never accidentally mix English learner state with Chinese learner state.

---

## 0.4 Product truthfulness

Never fabricate:

- progress;
- streak;
- mastery;
- proficiency;
- pronunciation score;
- fluency score;
- AI phase;
- processing percentage;
- learner milestone;
- recommendation rationale.

UI references may show example values for composition. Runtime must use real state or an explicit empty/unavailable state.

---

## 0.5 AI usage principle

**NO LLM IN HOT PATH** unless a genuine intelligence task requires it.

Prefer:

1. deterministic logic;
2. local/static knowledge;
3. specialized local/open-source model;
4. provider-backed AI only when needed.

AI must not be used merely because an interaction looks “smart”.

Examples:

### Deterministic first
- progress math;
- review scheduling;
- current segment selection;
- token highlighting from existing annotations;
- grammar curriculum lookup;
- revision delta presentation;
- exact phrase matching;
- route release gating.

### AI appropriate
- Writing evaluation;
- Writing task generation;
- context-aware improvement;
- dictionary explanation when local dictionary is insufficient;
- translation where specialized translation is justified;
- transcript acquisition when provider/service is needed;
- future pronunciation/speaking evaluation.

---

# 1. VERIFIED CURRENT ARCHITECTURE BASELINE

## 1.1 Runtime persistence

**CURRENT**

PostgreSQL is the authoritative runtime.

SQLite is:

- archive;
- rollback;
- historical migration/testing source.

Rules:

- no dual-write;
- no reverse PostgreSQL → SQLite sync;
- no silent SQLite fallback;
- no destructive volume cleanup;
- no automatic upgrade of an existing non-empty PostgreSQL DB with a mismatched revision.

---

## 1.2 Current learner screen registry

**CURRENT**

The frontend contains these screen modules:

1. Onboarding
2. Home
3. Writing
4. Writing Review
5. Reading
6. Listening
7. Speaking
8. Library
9. Grammar
10. Journey
11. Profile

---

## 1.3 Current release truth

**CURRENT**

| Skill | Current state | Internal | Public |
|---|---|---:|---:|
| Writing | BETA | yes | no |
| Reading | DEVELOPMENT | yes | no |
| Listening | DEVELOPMENT | yes | no |
| Speaking | DEVELOPMENT | yes | no |

Grammar, Library, Journey and Profile are product surfaces but are not controlled by the same skill route gating model.

No learner skill should be promoted to public simply because its screen renders.

Release state must come from backend/runtime capability truth.

---

# 2. SHARED FRONTEND ARCHITECTURE CONTRACT

# 2.1 Routing

FE owns:

- route rendering;
- active navigation state;
- preserving browser history;
- release gating presentation;
- redirecting unavailable routes to a safe destination.

BE owns:

- authoritative capability/skill availability data.

Existing capability source:

`GET /api/platform/skills`

Frontend must not hardcode public availability.

---

# 2.2 Global frontend state

State should contain only shared runtime state.

Examples:

```text
me
languages
active learning language
support language
skill registry
learner profile
current route
theme/palette
current learner session context
```

Screen-specific transient state should remain screen-local where possible.

Avoid a single global object containing every editor/transcript/audio/detail state.

---

# 2.3 Loading model

Every async screen must define:

- initial loading;
- partial loading;
- action busy;
- empty;
- recoverable error;
- fatal/session error;
- success;
- stale state.

Do not replace the full screen with a spinner for a small secondary action.

Example:

Dictionary lookup loading must not erase the reading passage.

---

# 2.4 Non-destructive rendering

A state update must only rerender the smallest necessary region.

Never allow:

- media playback → destroys learner text;
- transcript highlight → destroys manual selection;
- async dictionary response → resets reading position;
- evaluation polling → clears Writing editor;
- route substate → recreates active recording.

Preserve user input and focus unless the learner explicitly resets it.

---

# 2.5 API request wrapper

**CURRENT**

Frontend already supports:

- same-origin credentials;
- no-store fetch;
- JSON/text response parsing;
- `401 → /login`;
- structured `detail.message`;
- `detail.category`;
- `error.status`.

All new APIs should follow the same structured error pattern rather than inventing screen-specific error strings.

---

# 2.6 Canonical error envelope

## TARGET

Prefer:

```json
{
  "detail": {
    "category": "stable_machine_code",
    "message": "Human-readable support-language message.",
    "retryable": false,
    "context": {}
  }
}
```

Rules:

- `category` is stable and semantic;
- FE behavior must not depend only on human text;
- authorization errors must not be treated as missing resource errors;
- validation errors must identify the invalid field when safe;
- retryability must be explicit for long-running/provider operations.

Examples:

```text
parent_essay_not_found
essay_scope_mismatch
language_scope_mismatch
media_transcript_unavailable
translation_unavailable
speech_provider_unavailable
invalid_reference_text
skill_not_available
```

Do not create dozens of arbitrary categories if existing conventions already cover the case.

---

# 2.7 Authentication

BE owns:

- Google OAuth;
- session identity;
- authorization;
- user ownership;
- admin authorization.

FE owns:

- session-aware routing;
- login redirect;
- logout action;
- account display.

Never rely on hidden UI for security.

Every user-specific endpoint must enforce ownership server-side.

---

# 2.8 Accessibility

Every learner screen must support:

- keyboard navigation;
- visible focus;
- semantic button/link behavior;
- meaningful labels;
- sufficient contrast;
- touch target size;
- reduced motion;
- screen-reader-safe status updates.

Icon-only buttons require accessible names.

---

# 2.9 Responsive architecture

Desktop and mobile share domain logic but not necessarily the same composition.

Desktop:
- navigation rail;
- multi-column secondary information;
- larger persistent supporting panels.

Mobile:
- one primary learning object;
- supporting panels become stack/sheet/accordion;
- bottom navigation where appropriate;
- no tiny multi-column cards;
- no horizontal overflow;
- primary CTA reachable.

---

# 2.10 Theme architecture

Required modes:

- light;
- dark;
- system.

Theme affects presentation only.

Do not duplicate domain markup for dark/light.

Use canonical tokens for:

- canvas;
- surface;
- raised surface;
- recessed surface;
- borders;
- ink;
- muted ink;
- accent;
- semantic colors;
- radius;
- spacing;
- elevation.

---

# 3. SHARED BACKEND ARCHITECTURE CONTRACT

# 3.1 Layering

Preferred flow:

```text
HTTP Route
→ request schema validation
→ authorization / learner scope
→ domain/service
→ persistence/provider adapter
→ normalized domain result
→ response schema
```

Avoid embedding business logic directly into route handlers or frontend JS when the rule is domain-wide.

---

# 3.2 Persistence ownership

Persist durable learner state server-side.

Examples:

- essays;
- evaluations;
- revision lineage;
- learner profile;
- vocabulary;
- grammar completion;
- reading sessions;
- durable progress where roadmap enables it.

Do not persist transient state unnecessarily.

Examples that may remain browser-session-only when explicitly designed that way:

- current media tab;
- temporary transcript selection;
- temporary listening reconstruction attempt;
- temporary shadowing round state;
- raw microphone audio when product contract says transient only.

---

# 3.3 Idempotency

Actions that may be retried should not create accidental duplicates.

Examples:

- complete grammar lesson;
- save vocabulary item;
- update learner profile;
- retry a media enrichment;
- save practice outcome.

Use stable IDs and unique constraints where the domain requires uniqueness.

---

# 3.4 Provider boundary

Provider-specific payloads must not leak into FE.

Backend normalizes:

```text
provider response
→ Orena domain schema
```

FE should not need to know whether the model is Groq, DeepSeek, OpenAI, local, etc.

---

# 3.5 Long-running provider jobs

For operations that may take noticeable time:

- transcript preparation;
- translation;
- AI evaluation;
- future pronunciation evaluation.

Use truthful states such as:

```text
queued
processing
ready
failed
unavailable
not_required
```

Do not expose fake subphases unless the backend actually knows them.

---

# 4. CANONICAL DOMAIN OBJECTS

The exact implementation may differ, but these conceptual objects must remain clear.

# 4.1 LearnerProfile

```json
{
  "learning_language": "en",
  "native_language": "vi",
  "goal": "everyday",
  "style": "guided",
  "pinyin": "auto",
  "theme_preset": "editorial"
}
```

BE:
- validates values;
- scopes by user + learning language;
- persists durable preference.

FE:
- edits;
- reflects current value immediately where safe;
- rolls back/show error if save fails.

---

# 4.2 Essay

Conceptual fields:

```json
{
  "id": "stable-id",
  "user_id": "...",
  "learning_language": "en",
  "prompt": "...",
  "text": "...",
  "created_at": "...",
  "updated_at": "...",
  "parent_essay_id": null,
  "practice_context": {}
}
```

Revision lineage must be explicit.

---

# 4.3 Evaluation

Conceptual fields:

```json
{
  "essay_id": "...",
  "summary": "...",
  "scores": {},
  "issues": [],
  "strengths": [],
  "evidence": [],
  "recommendations": [],
  "schema_version": "..."
}
```

Evidence must refer to actual learner text.

---

# 4.4 PracticeOutcome

Conceptual fields:

```json
{
  "id": "...",
  "skill": "writing",
  "learning_language": "en",
  "source_id": "...",
  "result": {},
  "created_at": "..."
}
```

Used for Journey/recommendations only when persisted and semantically meaningful.

---

# 4.5 MediaLearningObject

Canonical shared media content object.

Conceptually:

```json
{
  "asset_id": "...",
  "source": {},
  "source_language": "zh",
  "segments": [
    {
      "segment_id": "...",
      "start_ms": 0,
      "end_ms": 3500,
      "text": "...",
      "pinyin": null,
      "translations": {}
    }
  ]
}
```

One imported media source exists once.

Listening and Shadowing consume the same asset.

Do not duplicate transcript/media objects per skill.

---

# 4.6 ReadingSession

Conceptual:

```json
{
  "id": "...",
  "learning_language": "en",
  "source": {},
  "content": "...",
  "questions": [],
  "answers": {},
  "result": {},
  "created_at": "..."
}
```

---

# 4.7 VocabularyItem

Conceptual:

```json
{
  "id": "...",
  "learning_language": "zh",
  "term": "习惯",
  "pinyin": "xíguàn",
  "meaning": "habit",
  "source_context": "...",
  "source_type": "listening",
  "source_id": "...",
  "review_state": {}
}
```

---

# 4.8 GrammarConcept

Grammar uses stable canonical concept IDs.

Do not replace stable IDs with generated text labels.

Completion evidence is separate from content definition.

---

# 5. ONBOARDING

## CURRENT

Onboarding renderer exists.

Learner profile APIs exist.

## Product goal

Collect the minimum configuration required to make Orena useful.

## FE responsibilities

Show:

1. learning language;
2. support/native language;
3. learning goal;
4. guidance style;
5. Pinyin preference when relevant;
6. appearance preference if included.

Requirements:

- no marketing carousel;
- concise explanation of why a setting matters;
- multi-step state survives accidental rerender;
- Continue disabled only when required data is missing.

## BE responsibilities

Use existing profile/language contracts:

```text
GET  /api/platform/languages
POST /api/platform/language
GET  /api/learner-profile
PUT  /api/learner-profile
```

Validate:

- enabled language;
- supported native language;
- allowed profile enum values;
- user ownership.

## Completion behavior

On success:

```text
save learning language
→ save learner profile
→ initialize learner-scoped view
→ navigate Home
```

Do not create fake learning history.

## Error behavior

If profile save fails:
- keep selections;
- display retry;
- do not advance as if saved.

## Acceptance

- EN onboarding works.
- ZH onboarding works.
- learner scope is correct.
- refresh loads persisted profile.
- mobile is usable.

---

# 6. HOME

## Product goal

Home answers:

1. What was I doing?
2. What should I do next?
3. What changed in my learning?

Home is not a marketing landing page.

## FE responsibilities

First viewport should prioritize:

### A. Continue / current work
Examples:
- unfinished Writing revision;
- active Grammar concept;
- current Reading session;
- active media practice.

### B. Current learning focus
A meaningful focus backed by learner evidence.

### C. Next recommended action
One primary recommendation.

### D. Recent evidence
Examples:
- repeated issue decreasing;
- revision improved;
- grammar concept completed;
- recall due.

Lower priority:
- recent work;
- small timeline;
- skill shortcuts.

Avoid:
- giant slogan;
- KPI wall;
- fake streak;
- arbitrary 0–100 progress.

## BE responsibilities

Existing:

```text
GET /api/dashboard
GET /api/learning-memory
GET /api/practice-recommendation
GET /api/practice-outcomes
```

Dashboard/domain layer should normalize multiple skills into a learner-home model.

## TARGET Home response

Prefer one normalized response rather than FE reconstructing domain truth from many unrelated calls:

```json
{
  "continue": {
    "skill": "writing",
    "label": "Continue revision",
    "route": "#/write",
    "source_id": "..."
  },
  "current_focus": {
    "type": "recurring_issue",
    "label": "Sentence connection",
    "evidence": {}
  },
  "next_action": {
    "skill": "grammar",
    "label": "Practice conjunctions",
    "reason": "..."
  },
  "recent_evidence": [],
  "recent_work": []
}
```

If `/api/dashboard` already supplies equivalent semantics, extend it instead of creating duplicate Home endpoints.

## Recommendation rules

Recommendation must be based on:
- known learner state;
- curriculum;
- recent practice;
- due review;
- real incomplete work.

AI-generated recommendation is optional, not required for hot-path Home render.

## Empty state

New learner:

```text
No fabricated progress.
Show:
- first meaningful task;
- recommended starting point;
- brief product orientation.
```

## Acceptance

- user can continue current work in one action;
- Home renders without AI;
- no stale route references;
- no cross-language data leakage;
- mobile first viewport contains action, not decorative copy.

---

# 7. WRITING

## Current relevant APIs

```text
GET  /api/essays
GET  /api/essays/{id}
POST /api/tasks/generate
POST /api/evaluate
POST /api/improve
POST /api/essays/{id}/linguistic-annotations
```

Writing is currently primary development lane.

---

## 7.1 Writing setup

FE fields may include:

- mode/genre;
- topic;
- level;
- target length;
- audience;
- practice target;
- generated prompt.

Do not require every optional setting before writing.

BE should validate task generation inputs.

---

## 7.2 Prompt generation

AI appropriate.

Existing:

`POST /api/tasks/generate`

BE returns normalized task:

```json
{
  "prompt": "...",
  "mode": "essay",
  "level": "B2",
  "target_length": {"min":150,"max":220},
  "learning_language": "en"
}
```

FE:
- shows busy state;
- preserves setup controls;
- allows retry;
- never silently replaces an existing draft.

---

## 7.3 Draft editor

FE must:

- prioritize writing canvas;
- preserve text through async operations;
- track word/character count locally;
- prevent destructive rerender;
- provide intentional reset;
- warn before navigation only when unsaved local data can actually be lost.

Autosave should reflect real save behavior only.

Do not display “Saved” if draft is only browser-local unless label explains that.

---

## 7.4 Linguistic annotations

Existing:

`POST /api/essays/{id}/linguistic-annotations`

Use for:

- word-role/POS highlighting;
- deterministic/local linguistic layers where available.

FE rules:
- annotation is optional lens;
- error feedback dominates POS colors;
- exact span coordinates must match the displayed text.

BE rules:
- return offsets tied to immutable text version/hash;
- do not apply annotations generated for old text to modified text.

Preferred:

```json
{
  "text_hash": "...",
  "annotations": [
    {
      "start": 10,
      "end": 15,
      "type": "verb",
      "label": "Verb"
    }
  ]
}
```

---

# 8. WRITING EVALUATION

## Product goal

Evaluation must answer:

- What is good?
- What needs attention?
- Where exactly?
- Why?
- How can I improve?
- What should I revise first?

---

## 8.1 Submit contract

Existing:

`POST /api/evaluate`

Request conceptually:

```json
{
  "text": "...",
  "prompt": "...",
  "learning_language": "en",
  "parent_essay_id": null,
  "practice_context": {}
}
```

BE must:
- validate language;
- validate ownership if parent supplied;
- save or associate essay consistently;
- evaluate with canonical evaluator schema;
- return stable essay/evaluation IDs;
- preserve evidence offsets.

---

## 8.2 Evaluation schema

Target:

```json
{
  "essay_id": "...",
  "summary": {
    "headline": "...",
    "interpretation": "..."
  },
  "dimensions": {
    "grammar": {},
    "vocabulary": {},
    "coherence": {},
    "task": {},
    "naturalness": {}
  },
  "issues": [
    {
      "id": "...",
      "category": "grammar",
      "priority": "high",
      "span": {"start":0,"end":10},
      "quote": "...",
      "why": "...",
      "how": "...",
      "suggestion": "...",
      "examples": []
    }
  ],
  "strengths": [],
  "next_actions": []
}
```

Not every language must use identical dimension names when linguistically inappropriate, but FE should consume one stable shared envelope.

---

## 8.3 Score truth

Never display unsupported precision.

If evaluator confidence does not justify `82/100`, prefer:

- band;
- level;
- dimension ranges;
- qualitative interpretation.

Any score must have:
- deterministic meaning;
- stable scale;
- schema version.

---

# 9. WRITING REVIEW

## FE hierarchy

1. interpretation;
2. learner draft;
3. exact evidence;
4. priority issues;
5. strengths;
6. WHY/HOW;
7. dimensions;
8. revision action.

Do not lead with a giant score.

---

## 9.1 Evidence mapping

Every issue referring to learner text must map to:

- exact text span;
- quote;
- stable issue ID.

If offset no longer matches the text version:
- do not highlight the wrong phrase;
- show safe fallback text and request refresh/re-evaluation if needed.

---

## 9.2 WHY / HOW interaction

Click issue:

```text
WHY
→ contextual reason

HOW
→ corrected pattern
→ example
→ contrast
→ optional micro-practice
```

Do not convert every issue into a full chat thread.

---

## 9.3 Revision lineage

A revision has an explicit parent.

Target:

```text
essay v1
→ evaluation v1
→ revision v2(parent=v1)
→ evaluation v2
```

This allows real before/after evidence.

---

## 9.4 Missing parent behavior

This must be a domain decision, not arbitrary FE behavior.

Backend must distinguish:

- parent genuinely deleted/missing;
- wrong owner;
- wrong learning language;
- invalid lineage;
- unauthorized resource.

Do not use “all 404 = stale parent”.

Preferred semantic errors:

```text
parent_essay_not_found
essay_scope_mismatch
language_scope_mismatch
invalid_revision_lineage
```

Then FE can perform a defined recovery only for the explicitly recoverable category.

If product decision is:
> missing parent starts a new standalone series

formalize it in the BE contract and test it.

---

## 9.5 Revision comparison

BE or deterministic FE can derive:

- removed issue;
- persistent issue;
- changed phrase;
- new issue;
- score/band delta.

Do not use an LLM for simple text/evidence comparison if deterministic IDs/spans are sufficient.

---

# 10. READING

## CURRENT APIs

```text
GET  /api/reading/sessions
GET  /api/reading/session/{id}
POST /api/reading/session
POST /api/reading/session/{id}/answer
GET  /api/dictionary
```

Reading is DEVELOPMENT / internal.

---

## 10.1 Reading library target

Reading should eventually have a source-backed content library.

Content source types:

- public-domain;
- licensed;
- Orena original;
- learner-imported;
- other legally usable content.

Do not populate with commercial copyrighted books without permission.

Metadata:

```json
{
  "source_id":"...",
  "title":"...",
  "author":"...",
  "type":"article",
  "level":"B2",
  "length_words":1200,
  "license":"public_domain",
  "source_url":null
}
```

---

## 10.2 Create reading session

Existing:

`POST /api/reading/session`

BE creates a durable learner-scoped session from:
- source-backed material;
- or currently supported generated content.

If AI generates the reading, label provenance.

Do not present generated text as a real published article/source.

---

## 10.3 Reading practice

FE primary:
- passage;
- current position;
- reading aid toggles.

Secondary:
- dictionary;
- Pinyin;
- translation;
- notes;
- questions.

Selected text should not permanently shrink the passage on mobile.

---

## 10.4 Dictionary

Existing:

`GET /api/dictionary?word=...`

Target response:

```json
{
  "term":"...",
  "language":"zh",
  "pronunciation":"xíguàn",
  "part_of_speech":"noun",
  "meanings":[...],
  "contextual_meaning":"...",
  "examples":[...]
}
```

Use learner support language for explanations.

---

## 10.5 Reading answers

Existing:

`POST /api/reading/session/{id}/answer`

Reading evaluator is deterministic in current architecture.

Questions should connect to passage evidence.

Response target:

```json
{
  "result": {
    "correct": 3,
    "total": 4
  },
  "questions": [
    {
      "id":"...",
      "correct":true,
      "evidence_span":{}
    }
  ]
}
```

---

# 11. LISTENING / MEDIA LEARNING

## CURRENT foundation

Media Learning Foundation is closed and canonical.

Existing APIs:

```text
POST /api/media-learning/import
POST /api/media-learning/import/status
POST /api/media-learning/translate
POST /api/media-learning/annotate
POST /api/media-learning/explain
```

One media asset is represented once.

---

## 11.1 Import

FE:
- accepts supported URL/source;
- displays explicit import state;
- does not promise unsupported source.

BE:
- validates source;
- selects appropriate learning-language caption;
- creates canonical asset;
- returns stable asset ID.

---

## 11.2 Import status

Use explicit status contract.

Example:

```json
{
  "status":"ready",
  "asset_id":"...",
  "message":null
}
```

Possible states:

```text
processing
ready
transcript_unavailable
unsupported
failed
```

FE polls only when status says processing.

No aggressive infinite polling.

---

## 11.3 Translation

Existing:

`POST /api/media-learning/translate`

Translation enriches the same MediaLearningObject.

States must distinguish:

```text
ready
not_required
transcript_unavailable
too_large
unavailable
```

Never create a duplicate translated media asset.

---

## 11.4 Listening modes

### Follow
Playback drives current segment.

### Active
Learner practice target can remain pinned.

### Shadowing
Speaking practice consumes shared segment/media.

The state model must distinguish:

```text
playingSegmentId
selectedSegmentId
manualSelection
practiceTargetId
```

Never treat all four as the same variable.

---

## 11.5 Playback-follow invariant

### Follow
Playback segment may update selected segment.

### Active
Playback changes only playing segment.
Learner-selected target remains stable.

### Shadowing
If manual selection is false:
- playback may update practice target.

If manual selection is true:
- learner target stays fixed.

“Current / Playing” action:
- clears manual selection;
- jumps to playback;
- resumes auto-follow.

---

## 11.6 Transcript reconstruction

CURRENT foundation supports deterministic bounded practice.

Practice state may remain browser-session-only until durable Listening progress stage.

Do not prematurely add persistence that conflicts with future R11 design.

---

## 11.7 Text annotation / explanation

Existing:

```text
POST /api/media-learning/annotate
POST /api/media-learning/explain
```

Use for:
- word roles;
- phrase explanation;
- context explanation.

FE sends exact:
- asset;
- segment;
- selected text;
- language/support context.

BE validates selection belongs to canonical transcript.

---

# 12. SPEAKING

## CURRENT

Speaking is internal DEVELOPMENT.

Existing:

```text
POST /api/speech/transcribe
POST /api/speech/pronunciation
```

Project state says current R6 verified core is:
- microphone recording;
- optional RNNoise;
- immediate playback;
- transient audio;
- ASR;
- deterministic transcript-content match.

Pronunciation/fluency/proficiency are not automatically equivalent to ASR.

---

## 12.1 Recording

FE:
- permission state;
- recording state;
- timer;
- stop;
- playback;
- retry;
- error.

Audio must not be lost merely because another panel rerenders.

---

## 12.2 Audio persistence

CURRENT contract:
raw learner audio is transient.

Backend should:
- process request;
- not silently persist audio into learner history unless future product contract explicitly changes.

---

## 12.3 ASR

Existing:

`POST /api/speech/transcribe`

Request:
multipart file + language.

Response target:

```json
{
  "transcript":"...",
  "language":"en",
  "provider_metadata": null
}
```

Provider metadata should normally stay server-side.

---

## 12.4 Transcript content match

Deterministic comparison when a reference segment exists.

Output examples:

```json
{
  "match": {
    "score": 0.86,
    "missing_tokens": [],
    "extra_tokens": []
  }
}
```

Label as:
- content match;
- transcript match.

Do not label as pronunciation.

---

## 12.5 Pronunciation

Reserved/full evaluation belongs to later architecture unless `/api/speech/pronunciation` is actually validated end-to-end.

Required product semantics before public use:

### English
- phoneme;
- lexical stress;
- rhythm/intonation where supported.

### Chinese
- initials;
- finals;
- tones;
- tone-sandhi-aware behavior where appropriate.

BE must return evidence, not one unexplained score.

Target:

```json
{
  "overall": {...},
  "units": [
    {
      "text":"...",
      "pronunciation_target":"...",
      "result":"...",
      "evidence":{}
    }
  ]
}
```

---

## 12.6 Fluency

If added later, define from measurable features:
- pause duration;
- speaking rate;
- repetitions;
- restart frequency;
- timing/rhythm.

Do not ask an LLM to invent a fluency percentage from a transcript alone.

---

## 12.7 Standalone Speaking Library

TARGET

Speaking must not depend only on imported media.

Practice types:
- prompt response;
- sentence practice;
- pronunciation;
- grammar production;
- scenarios;
- shadowing.

BE can expose practice catalog/next recommendation via existing practice recommendation architecture if semantically appropriate.

Avoid a parallel duplicated recommendation system.

---

# 13. GRAMMAR

## CURRENT

Grammar Knowledge System is CLOSED / protected.

Current library:

- EN 269 concepts;
- ZH 239 concepts;
- total 508.

Runtime AI for canonical Grammar content: zero.

Existing APIs:

```text
GET    /api/library/grammar
GET    /api/library/grammar/{id}
GET    /api/library/grammar/{id}/reference
POST   /api/library/grammar/{id}/complete
DELETE /api/library/grammar/{id}/complete
```

---

## 13.1 Grammar library

FE:
- level/category;
- current progress;
- search/filter where useful;
- recommended/current concept.

BE:
- return canonical concept IDs;
- learner-scoped completion;
- language-correct curriculum.

---

## 13.2 Lesson flow

Canonical instructional flow:

```text
NOTICE
→ UNDERSTAND
→ PATTERN
→ CONTEXT
→ COMPARE
→ APPLY
→ RECALL
→ TRANSFER
```

FE should visually distinguish:
- pattern/formula;
- meaning;
- use conditions;
- contrasts;
- mistakes;
- practice.

Do not flatten lesson into a long text document.

---

## 13.3 Chinese

Hanzi primary.

Pinyin:
- associated;
- optional/adaptive;
- secondary.

Support-language translation/explanation:
- tertiary.

Chinese concepts must use Chinese-specific instructional representation.

---

## 13.4 Completion

Completion must reflect real activity evidence.

Do not mark complete simply because the learner opened the page.

Existing complete/uncomplete endpoints must preserve canonical semantics.

---

## 13.5 Protected rule

Do not:
- mass rewrite Grammar content;
- regenerate static KB by runtime AI;
- change concept IDs casually;
- duplicate grammar content into Writing/Speaking.

Other skills link to Grammar concept IDs.

---

# 14. LIBRARY / ACTIVE RECALL

## CURRENT APIs

```text
GET    /api/library/vocabulary
POST   /api/library/vocabulary
POST   /api/library/vocabulary/{word}/review
DELETE /api/library/vocabulary/{word}
GET    /api/library/grammar
```

---

## 14.1 Library object model

Library should become the reusable memory surface for:
- vocabulary;
- phrases;
- grammar references;
- recurring learner issues;
- saved learning objects.

Avoid implementing separate disconnected “saved words” stores per skill.

---

## 14.2 Save vocabulary

Source skills:
- Reading;
- Listening;
- Writing Review;
- Grammar;
- Speaking.

Request target:

```json
{
  "term":"习惯",
  "pinyin":"xíguàn",
  "meaning":"habit",
  "source_type":"listening",
  "source_id":"asset/segment",
  "source_context":"..."
}
```

BE:
- normalize duplicates;
- keep language scope;
- preserve useful context.

---

## 14.3 Review

Existing:

`POST /api/library/vocabulary/{word}/review`

Review result must use a small stable enum.

Example:

```text
again
hard
good
easy
```

or the existing equivalent.

Do not let FE invent scheduling math independently.

BE should own durable scheduling/mastery rules.

---

## 14.4 Active Recall UI

Show:
- due now;
- current queue;
- next item;
- context;
- reveal;
- learner result.

Do not conflate:
- daily goal;
- proficiency;
- memory strength.

---

## 14.5 Spaced repetition

Backend owns:
- due date;
- state transition;
- interval;
- review history.

Frontend owns:
- interaction;
- reveal timing;
- result submission;
- visual status.

---

# 15. JOURNEY / PROGRESS

## Product goal

Explain learner change, not product usage vanity metrics.

Journey answers:

- What improved?
- What remains difficult?
- What is stable?
- What should I do next?

---

## BE data sources

Prefer derived evidence from:
- practice outcomes;
- essay/revision evidence;
- grammar completion;
- review history;
- reading answers;
- speaking/listening outcomes once durable.

Existing:

```text
GET /api/learning-memory
GET /api/practice-outcomes
GET /api/practice-recommendation
GET /api/dashboard
```

Do not create duplicate analytics tables if current evidence can be derived safely.

---

## FE

Sections may include:

- current focus;
- recent improvement;
- recurring issue;
- stable strength;
- timeline;
- next target.

Charts only when they clarify change.

A concise sentence is better than meaningless analytics.

---

## Learner memory

Must be:
- evidence-based;
- language scoped;
- inspectable;
- updateable from real outcomes.

Do not let one AI evaluation permanently define learner identity.

Use recurrence/weight/recency rules.

---

# 16. PROFILE / PREFERENCES

## CURRENT APIs

```text
GET /api/learner-profile
PUT /api/learner-profile
POST /api/platform/language
```

## FE sections

- learning language;
- support language;
- learning goal;
- guidance style;
- Pinyin preference;
- theme;
- account-safe settings.

No giant hero.

---

## Change learning language

Required sequence:

```text
save/confirm current transient work if necessary
→ POST active language
→ reload language-scoped profile/state
→ clear incompatible screen-local state
→ rerender current safe route
```

Never preserve English essay/session state after switching to Chinese.

---

# 17. ADMIN / AI CONTROL PLANE

## CURRENT canonical APIs

```text
GET  /api/admin/ai/config
PUT  /api/admin/ai/config/{capability_key}
POST /api/admin/ai/test/{capability_key}
```

## Capability catalog currently includes

Provider-backed:
- writing_evaluator
- writing_linguistic
- reading_generator
- writing_task_generator
- writing_improver
- learner_dictionary
- learner_translation
- grammar_lesson_generator

Deterministic:
- reading_evaluator

Reserved:
- speech_asr

Reserved/unimplemented:
- pronunciation_evaluator
- speaking_evaluator

---

## FE Admin responsibilities

Admin screen may show:
- capability;
- provider;
- model;
- mode;
- readiness;
- test connection;
- status;
- configured fallback metadata.

Do not expose secrets.

---

## BE

- admin authorization mandatory;
- secrets server-side only;
- validate provider/model;
- testing must not mutate learner state;
- capability mode activation is a human gate.

No silent provider-to-provider paid fallback.

---

# 18. CROSS-SKILL PRACTICE RECOMMENDATION

Existing:

```text
GET  /api/practice-recommendation
POST /api/practice/next
GET  /api/practice-outcome/{id}
GET  /api/practice-outcomes
```

Use one recommendation domain.

Avoid:
- Home recommendation engine;
- Speaking recommendation engine;
- Grammar recommendation engine;
all independently producing conflicting “next action”.

Recommendation input can include:
- current skill;
- learner memory;
- due recall;
- incomplete activity;
- level;
- recent outcome.

Output:

```json
{
  "id":"...",
  "skill":"grammar",
  "target_id":"...",
  "reason":"...",
  "action":{"route":"#/grammar/..."}
}
```

Reason should be understandable.

---

# 19. I18N + SUPPORT LANGUAGE

There are two distinct language concepts:

### Learning language
What learner is learning.

### Support/interface language
What explanations/UI use.

Never assume they are the same.

Examples:

```text
Learning language = Chinese
Support language = Vietnamese
```

Output:
- grammar concept/examples primarily Chinese;
- Pinyin if configured;
- explanations Vietnamese;
- UI Vietnamese.

---

# 20. DATA PROVENANCE

Every content object should have truthful provenance where relevant.

Examples:

### Reading
```text
licensed
public_domain
original
user_imported
ai_generated
```

### Media transcript
```text
provider_caption
user_source
generated_transcript
```

### Translation
```text
source_provided
local_mt
provider_ai
```

Do not make provenance visually noisy, but preserve it in domain data.

---

# 21. EMPTY / LOADING / ERROR CONTRACT BY SCREEN

Every screen must explicitly implement these states.

| Screen | Loading | Empty | Recoverable error |
|---|---|---|---|
| Home | dashboard skeleton | first-task state | retry dashboard |
| Writing | setup/profile loading | blank editor | task/eval retry |
| Review | evaluation loading | no evaluation | reopen draft |
| Reading | session loading | library/start state | retry source/session |
| Listening | import/transcript loading | import media | retry import/translation |
| Speaking | recorder/ASR | choose practice | retry ASR/eval |
| Grammar | lesson loading | no match | return library |
| Library | queue loading | nothing saved | retry list/review |
| Journey | evidence loading | start learning state | retry evidence |
| Profile | preference loading | defaults | retry save |

Do not show an empty blank card.

---

# 22. ASYNC UX CONTRACT

## Short operation (< ~1s typical)
Use local busy state.

## Medium provider operation
Show:
- neutral status;
- safe cancellation only if supported;
- preserved learner work.

## Long operation
Backend should expose actual state.

Never rotate fabricated messages like:

```text
Reading each sentence...
Almost done...
```

unless backend actually reports those phases.

Preferred neutral text:

```text
Preparing your review…
Still working on your review…
This may take a little longer…
```

---

# 23. FE–BE VERSIONING

For high-value structured outputs:

- evaluation;
- grammar learning model;
- media object;
- pronunciation result.

Include schema version where necessary.

FE should fail safely if a required field is absent.

Do not silently interpret unknown new enums as a different existing state.

---

# 24. VALIDATION

## FE validation

Use for:
- required input;
- simple ranges;
- immediate UX.

## BE validation

Always authoritative:
- enums;
- ownership;
- language scope;
- resource existence;
- payload size;
- provider eligibility;
- content limits.

Never trust FE validation for security/domain correctness.

---

# 25. SECURITY / PRIVACY

- No provider keys in frontend.
- No secrets in logs.
- No learner audio persistence unless contract says so.
- User data access enforced server-side.
- Admin APIs require admin.
- Imported URLs validated server-side.
- Avoid SSRF through media/source imports.
- Uploaded media/audio size/type constrained.
- Error responses should not leak filesystem/provider secrets.

---

# 26. PERFORMANCE

Home and primary navigation must not require multiple LLM calls.

Prefer:
- one normalized dashboard call;
- cached/static Grammar content;
- deterministic progress;
- lazy secondary panels.

Large libraries:
- paginate/filter server-side.

Media:
- do not load every transcript asset into global state.

---

# 27. TEST STRATEGY

Every new slice needs the smallest meaningful test set.

## Backend tests
- schema;
- authorization;
- language scope;
- persistence;
- semantic errors;
- provider adapter normalization;
- retry/idempotency where relevant.

## Frontend contract tests
- expected selector/state;
- non-destructive update;
- error category handling;
- route release gating;
- EN/ZH rendering contract.

## Browser ESM
All static browser modules must parse.

Existing browser ESM graph validator belongs in CI.

## Visual QA
Affected screen:
- desktop;
- mobile;
- light/dark where theme-sensitive;
- EN + representative ZH.

---

# 28. END-TO-END ACCEPTANCE FLOWS

# 28.1 First learner session

```text
OAuth
→ select learning language
→ learner profile
→ Home
→ recommended first action
```

PASS when refresh preserves scope/profile.

---

# 28.2 Writing

```text
Write
→ optional task generate
→ draft
→ evaluate
→ Review
→ inspect evidence
→ revise
→ evaluate revision
→ improvement evidence
→ Journey/Memory update
```

No draft loss.

---

# 28.3 Reading

```text
choose/create reading
→ passage
→ select phrase
→ dictionary/explain
→ answer questions
→ outcome
→ save useful vocabulary
```

---

# 28.4 Listening

```text
import media
→ transcript ready
→ translation optional
→ Follow
→ manual selected segment
→ Active practice
→ Shadowing reuse same asset
```

No duplicated media.

---

# 28.5 Speaking

```text
choose practice
→ record
→ playback
→ transient ASR
→ transcript/content match
→ pronunciation only if real evaluator active
→ next practice
```

No false scoring.

---

# 28.6 Grammar

```text
library
→ concept
→ learn sequence
→ practice evidence
→ completion
→ next concept
→ Library/Journey integration
```

---

# 28.7 Active Recall

```text
due queue
→ show prompt
→ reveal
→ learner result
→ BE scheduling update
→ next item
→ real progress summary
```

---

# 29. CURRENT / TARGET MATRIX

| Area | Current | Target |
|---|---|---|
| Onboarding | implemented | polish + strict scope |
| Home | implemented | normalized actionable dashboard |
| Writing | primary in progress | complete eval/revision loop |
| Review | implemented/in progress | evidence-first + revision proof |
| Reading | internal development | source-backed library + practice |
| Listening | strong internal foundation | durable later progress |
| Speaking | internal core | standalone practice + real pronunciation later |
| Grammar | closed/protected | presentation/integration only |
| Library | available | unified Active Recall memory surface |
| Journey | available | evidence-first cross-skill progress |
| Profile | available | clean learner settings |
| AI Admin | control plane ready | human-gated activation |
| EN/ZH | mandatory | parity on every shared feature |

---

# 30. IMPLEMENTATION AGENT WORKFLOW

Before changing a module:

1. Read repository governance files.
2. Verify current `main` / branch / diff.
3. Inspect current screen + API + domain implementation.
4. Mark requirement:
   - DONE
   - PARTIAL
   - MISSING
   - REGRESSION
   - DEFERRED
   - NEEDS PRODUCT DECISION
5. Identify whether change belongs in:
   - FE only;
   - BE only;
   - shared contract;
   - persistence;
   - provider adapter.
6. Define contract before implementation when both FE and BE change.
7. Implement smallest coherent slice.
8. Run focused tests.
9. Run browser ESM validation for JS changes.
10. Run architecture validation.
11. Visual test when learner-visible.
12. Commit/push.
13. Let CI run broader validation.

Do not claim a whole feature DONE after implementing one visible card.

---

# 31. API DESIGN RULE FOR FUTURE ENDPOINTS

Before adding a new endpoint, check whether an existing endpoint/domain already owns the concept.

Prefer extending:

```text
/api/dashboard
/api/practice-*
/api/learner-profile
/api/library/*
/api/media-learning/*
```

over creating redundant variants.

Bad:

```text
/api/home/recommendation
/api/speaking/recommendation
/api/grammar/recommendation
```

if `/api/practice-recommendation` already owns the shared concept.

---

# 32. PRODUCT ACCEPTANCE DEFINITION

A feature is complete only if all applicable layers agree:

```text
Product intent
+ FE interaction
+ BE domain rule
+ persistence
+ authorization
+ language scope
+ error behavior
+ loading behavior
+ mobile
+ EN/ZH
+ tests
+ real visual QA
```

A screen that looks correct but uses fake data is not complete.

An API that works but destroys learner input in FE is not complete.

A feature implemented only for English is not complete.

A feature that bypasses protected Grammar/Media/Persistence contracts is not complete.

---

# 33. FINAL NORTH STAR

Orena should behave as one coherent learning system.

Data should flow across skills:

```text
Writing evidence
       │
Reading evidence
       │
Listening evidence
       ├──→ Learner Memory / Practice Outcomes
Speaking evidence
       │                │
Grammar evidence        ▼
       │          Recommendation
Library recall          │
       └────────────────▼
                     Home
                      │
                      ▼
                    Journey
```

But each skill must still preserve its own correct domain semantics.

The objective is not to maximize screens, AI calls, metrics, or cards.

The objective is:

> **Give the learner the right learning object, the right evidence, and the right next action with a backend that preserves truth, history, ownership, and multilingual correctness.**
