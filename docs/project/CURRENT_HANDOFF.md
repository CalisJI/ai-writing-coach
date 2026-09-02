# Current Handoff

## Governance

**Purpose:** current execution state only. **Authority:** updated by the active
agent after verified evidence. **Change when:** branch/lane, verified batch,
status, blocker, human gate, or exact next task changes. **Do not store:**
durable product philosophy, historical closeouts, implementation inventories,
or secret values.

## Current branch / lane

- Branch: `claude/integration-v2`
- Lane: Orena integration; feature development paused for repository-backed
  project memory and its reviewed state-model correction.
- Live HEAD must be read with `git rev-parse HEAD`; the verified application
  baseline is `48a9eabab6422dd9dab7a6b8285a3a3def1db30d` (native curated-video
  parity). Later governance-only commits do not move it.

## Last verified batch

- Real-media Listening at web/native parity: video playback kind, real posters
  on player and discovery cards, the first two real EN/ZH lessons, the native
  expo-video adapter, and one reviewed-media URL rule on all three sides.
- Local evidence: backend `703 passed / 0 failed` in the CI-equivalent container;
  all 10 web contract tests pass. Real playback verified by browser decode:
  EN 854x481 / 47.328s / 96 frames, ZH 854x481 / 198.241s seeked to its 16.12s
  excerpt start; transcript sync, Dictation 100% match and Shadowing handoff all
  exercised over the real media. Local execution, not CI, not human acceptance.
- This is local evidence, not CI or production acceptance.

## DONE

- R0–R20 local foundations are preserved; R20 has local acceptance evidence.
- Listening ENGINE is library-first: Dictation, Shadowing, shared
  curated/import media contracts, progress/resume, and vocabulary all exist and
  are locally accepted.
- Listening REAL MEDIA CATALOG is PARTIAL, not complete. Two real rights-cleared
  video lessons now play on web AND native, one EN (The Royal Society, CC BY 3.0)
  and one ZH (Commons, CC BY-SA 3.0), with real posters and subtitle-derived
  timings. The other five lessons remain seed/synthetic audio. Human playback
  acceptance is still an open gate; two lessons are not a catalog.
- Media provenance is validated once, at the canonical catalog boundary, and the
  web player, the discovery card and native all consume the same rule.
- Writing, Speaking and Reading are complete locally with acceptance passes and
  pre-public matrices. They are internal, not public. Do not rebuild them.

## IN PROGRESS

- None. Repository-backed project memory, drift enforcement, and the bounded
  `/resume-orena` workflow are implemented and validated locally; the batch is
  awaiting human review.

## DEPLOYED FOR QA

- `orena.chillpickle.org` runs `cbdedfd` (branch `claude/integration-v2`, NOT
  merged to `main`), rebuilt via `docker compose --profile public up -d --build
  writing-coach`. There is no CD; the domain only changes when someone rebuilds
  on the host.
- Human-approved production PostgreSQL migration ran on 2026-09-02:
  `20260811_0001` -> `20260828_0004`, adding `speaking_attempts`,
  `listening_progress` and `shadowing_progress`. 16 -> 19 tables, additive only,
  no data dropped. The runtime had refused to start until this ran, because the
  database was three revisions behind the code.
- The gate itself stays `approval_required`: that approval covered this run, not
  future migrations.

## PENDING

- Human review of this project-memory checkpoint.
- R21 device/release-readiness evidence when explicitly resumed.
- Human visual/product acceptance and broader editorial/licensing approval for
  Listening.

## BLOCKED

- No code blocker for this governance batch.
- The standalone `127.0.0.1:8011` QA runtime does not validate durable
  PostgreSQL Listening progress; automated contracts pass.

## OPEN P0

- None known.

## OPEN P1

- Real catalog breadth: one EN and one ZH real lesson only. Discovery categories
  (Animation, Movies & Drama, Podcast, Stories, Kids, Interview, ...) have no
  real content yet.
- Native curated video is verified by unit/route tests, typecheck and Android
  prebuild, NOT on a real device or simulator. Device playback remains unproven.
- Durable Listening progress is unverified over real media. `app.py` wires
  `configure_listening_progress` only for the PostgreSQL backend, so the SQLite
  harness answers 503 and the UI correctly degrades to device-only practice.
  Verifying it needs the PostgreSQL runtime, which is a human gate.

## HUMAN GATES

- Production authentication/provider validation and AI activation.
- Production PostgreSQL migration/mutation, backup/restore, and rollback.
- Credentials/secrets, Cloudflare/DNS, billing/subscriptions, and deployment.
- Mobile signing, real-device matrix, store credentials/publication.
- Learner-skill/public release and built-in catalog publication approval.

## NEXT EXACT TASK

Require both GitHub workflows green on PR #54, then human playback/product
acceptance of the two real lessons on web and on a real device. Only after that,
broaden the real catalog across the discovery categories.
