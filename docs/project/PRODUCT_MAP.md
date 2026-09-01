# Current Orena Product Map

## Governance

**Purpose:** explain the current learner/product architecture and cross-skill
contracts. **Authority:** product relationships are human-governed; agents may
clarify only accepted, verified contracts. **Change when:** an accepted product
relationship or canonical contract changes. **Do not store:** source-file
inventories, implementation history, task status, or old architectures.

## Connected learner system

```text
                         ORENA
                           │
          ┌────────────────┼────────────────┐
          ▼                ▼                ▼
      Listening ───────► Speaking ───────► Writing
          │                ▲                ▲
          └────────────► Reading ───────────┘
                           │
                           ▼
                  Library / Active Recall

 Shared across the system: Grammar · Dictionary · Media Learning · Progress
 Authentication · Entitlements · AI Capabilities · Admin
```

## Listening

- **Purpose:** learn from interesting curated or learner-selected media through
  normal listening, active listening, Dictation, and Shadowing.
- **Important input:** canonical Media Learning Object, rights/provenance,
  timestamped segments, transcript, translation, and Pinyin where applicable.
- **Important output:** listening progress, Dictation evidence, difficult words,
  selected segment/mode, and Speaking Shadowing handoff.
- **Cross-skill handoffs:** transcript to Reading/Dictionary; vocabulary to
  Library; segment to Speaking; evidence to Progress and future practice.
- **Canonical contracts:** one Media Learning identity and one Listening Engine
  for curated and imported sources.
- **Must not duplicate:** imported player, curated player, transcript store,
  vocabulary system, progress authority, or media ingestion per mode.

## Speaking

- **Purpose:** turn selected language into spoken production and feedback.
- **Input:** learner recording, language context, or canonical media segment for
  Shadowing.
- **Output:** bounded transcript/evaluation evidence and return context.
- **Handoffs:** receives Listening/Reading content; returns feedback to the same
  media segment and contributes progress/evidence.
- **Must not duplicate:** Media Learning, vocabulary, proficiency authority, or
  client-specific scoring.

## Reading

- **Purpose:** understand texts, answer comprehension prompts, inspect language,
  and retain useful vocabulary.
- **Input:** canonical reading content or shared transcript/text context.
- **Output:** comprehension evidence, dictionary context, saved words, and
  writing/speaking prompts.
- **Handoffs:** Library/Active Recall, Grammar, Writing, and Progress.
- **Must not duplicate:** dictionary, vocabulary, Grammar concepts, or progress.

## Writing

- **Purpose:** produce, evaluate, review, revise, and transfer language into
  durable practice.
- **Input:** learner text, goal/language context, and prompts/evidence from other
  skills.
- **Output:** evaluation evidence, Review, revisions, targeted Grammar practice,
  and Progress/Library cues.
- **Must not duplicate:** Review evidence, Grammar curriculum, learner memory,
  or language-specific product flows.

## Shared learning infrastructure

### Media Learning

Owns canonical source/media identity, provenance/rights, transcript, timestamped
segments, translations, and bounded playback metadata. Learner progress remains
learner-scoped outside the content object.

### Library / Active Recall

Owns saved vocabulary and scheduled recall reused by every skill. No skill or
client creates a private flashcard system.

### Grammar and Dictionary

Grammar owns stable concepts and shared pedagogy. Dictionary owns contextual
lookup and language-specific adapters. Skills consume these contracts rather
than copying them.

### Progress

Owns truthful learner evidence and resume continuity. Practice scores do not
automatically become proficiency claims.

## Platform systems

- **Authentication:** one server-authoritative identity/session boundary.
- **Entitlements:** one plan/usage contract; clients do not invent policy.
- **AI capabilities:** provider/configuration infrastructure separated from
  deterministic learning logic and credentials.
- **Admin:** authorized operational/editorial control surfaces; learner clients
  do not bypass them.
