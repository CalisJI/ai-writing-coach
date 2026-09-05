# Orena Product Constitution

## Governance

**Purpose:** preserve durable compatibility, technical-product, routing,
multilingual, media-learning, persistence, and native-parity invariants inherited
by the current Orena implementation.

This file is NOT the canonical learner-facing Product North Star.

Current learner-facing product direction is defined by:

`docs/product/ORENA_PRODUCT_CONSTITUTION.md`

Current content-world direction is defined by:

`docs/product/ORENA_CONTENT_ARCHITECTURE.md`

Approved Orena visual identity is defined by:

`assets/brand/orena/`

**Authority:** subordinate to explicit current human instruction,
`docs/product/ORENA_PRODUCT_CONSTITUTION.md`, and
`docs/product/ORENA_CONTENT_ARCHITECTURE.md` for learner-facing product intent.

This file remains authoritative only for compatible technical/product invariants
that have not been superseded by those higher-authority sources or an accepted
Decision Log entry.

**Change when:** an explicit accepted decision changes one of these durable
compatibility or technical-product invariants.

**Do not store:** current visual direction, temporary implementation status,
backlog, historical narrative, or product philosophy that belongs in the
canonical Orena Product Constitution.

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
