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
- Live HEAD must be read with `git rev-parse HEAD`; the application baseline
  entering this governance batch is `7b1740e66a3f8ef82b2fc728dedaf7dd2c1d1b6f`.

## Last verified batch

- `7b1740e` — rights-aware, content-library-first Listening catalog and shared
  web/native learning engine.
- Local evidence: backend `698 passed / 0 failed` in the CI-equivalent container
  environment; native `48` suites / `346` tests; all 9 web contract tests pass.
- This is local evidence, not CI or production acceptance.

## DONE

- R0–R20 local foundations are preserved; R20 has local acceptance evidence.
- Listening ENGINE is library-first: Dictation, Shadowing, shared
  curated/import media contracts, progress/resume, and vocabulary all exist and
  are locally accepted.
- Listening REAL MEDIA CATALOG is NOT complete. Built-in lessons are still
  seed/synthetic, real source video playback is unaccepted, cards can present
  text with no meaningful real video, and neither EN nor ZH real playback has
  passed human acceptance. Seed content is not completion evidence.
- Writing, Speaking and Reading are complete locally with acceptance passes and
  pre-public matrices. They are internal, not public. Do not rebuild them.

## IN PROGRESS

- None. Repository-backed project memory, drift enforcement, and the bounded
  `/resume-orena` workflow are implemented and validated locally; the batch is
  awaiting human review.

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

- Listening real media catalog readiness: seed/synthetic only, pending real
  EN/ZH playable evidence and human playback acceptance.

## HUMAN GATES

- Production authentication/provider validation and AI activation.
- Production PostgreSQL migration/mutation, backup/restore, and rollback.
- Credentials/secrets, Cloudflare/DNS, billing/subscriptions, and deployment.
- Mobile signing, real-device matrix, store credentials/publication.
- Learner-skill/public release and built-in catalog publication approval.

## NEXT EXACT TASK

Human review of the memory-truth correction. Then source real, rights-cleared EN
and ZH media and obtain human playback acceptance; that, not more engine work,
is what the Listening catalog is missing.
