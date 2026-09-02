# Orena Product Constitution

## Governance

**Purpose:** define durable, high-authority Orena product intent.

**Authority:** human-governed. Agents must treat this file as read-only unless
the human explicitly changes product direction. A change requires an appended
Decision Log entry, explicit supersession of any prior accepted decision, and
matching state/validator updates.

**Change when:** an explicit human decision changes a durable product
principle. **Do not store:** implementation status, temporary workarounds,
backlog, historical narrative, or claims made only to match current code.

## Product identity and routing

- The active product name and learner-facing identity is **Orena**.
- The canonical Orena web route is `/`.
- `/becoming` is deprecated and compatibility-only. No new learner feature may
  target it.
- Historical paths such as `static/becoming/**`, `templates/becoming/**`, and
  `writing_coach/becoming_*` may remain while technically required. Their names
  are implementation history, not current product direction.
- A legacy namespace, filename, symbol, branch, screenshot, comment, or archived
  document never authorizes revival of the BECOMING product identity or route.

## Design and native parity

- The approved responsive Orena web product is the visual, functional, and
  interaction source of truth.
- Native mobile is a **full native port** of the same Orena product. It is not a
  redesign, simplified edition, generic Expo interpretation, generic Material
  interpretation, or generic iOS interpretation.
- Native preserves the approved UI, UX, functionality, navigation,
  interaction/animation intent, state behavior, EN/ZH behavior, light/dark
  behavior, and learner flows. Only necessary platform mechanics may differ.

## Connected learning system

Orena is not four isolated skill applications. Its core learning system is:

```text
Listening ↔ Speaking ↔ Reading ↔ Writing
```

Library / Active Recall, Grammar, Dictionary, Progress, and Media Learning are
shared infrastructure. Evidence and content should move meaningfully between
skills rather than being trapped inside a module.

Canonical continuity includes:

```text
Listen → Dictation → Read transcript → Dictionary / Vocabulary
→ Shadow → Speaking feedback → Writing response → Active Recall
```

Do not create parallel media, progress, dictionary, vocabulary, scoring, or
learning-evidence systems per skill or per client.

## Languages

- English and Chinese are equally first-class.
- Shared features support EN and ZH in the same implementation and batch.
- Do not implement English now with Chinese promised later.
- Language adapters exist only for genuine linguistic differences.

## Listening and Media Learning

- Listening is content-library-first. Curated, interesting learning content is
  the primary experience; learner media import is secondary.
- Curated and learner-imported media use the same Listening Engine.
- Normal Listening, Active Listening, Dictation, Shadowing, transcript,
  dictionary, translation, Pinyin, progress, and resume share canonical media
  contracts.
- One canonical Media Learning Object powers relevant downstream learning
  experiences. Do not build skill-specific media pipelines.
- Rights and provenance belong to the canonical source/media object and follow
  downstream Listening, Speaking, Reading, and Writing use.

## Persistence

- PostgreSQL is authoritative.
- SQLite is test, archive, and rollback only.
- No dual-write, reverse synchronization, silent fallback, automatic startup
  import, or automatic startup Alembic.
- Production data mutation requires explicit human authorization.

## Commercial production and human gates

Orena is a commercial production product. Tests passing is not equivalent to
production readiness. Public release, production authentication, billing,
subscription enforcement, production AI/provider activation, live credentials,
production migration, Cloudflare/DNS, signing/store publication, destructive
operations, and rollback-path removal remain explicit human gates.
