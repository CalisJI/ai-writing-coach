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
  project memory.
- Live HEAD must be read with `git rev-parse HEAD`; the application baseline
  entering this governance batch is `7b1740e66a3f8ef82b2fc728dedaf7dd2c1d1b6f`.

## Last verified batch

- `7b1740e` — rights-aware, content-library-first Listening catalog and shared
  web/native learning engine.
- Local evidence: backend `698 passed / 0 failed` in the CI-equivalent container
  environment; native `48` suites / `346` tests; web contracts pass except the
  open P1 below.
- This is local evidence, not CI or production acceptance.

## DONE

- R0–R20 local foundations are preserved; R20 has local acceptance evidence.
- Listening is library-first with EN/ZH rights-reviewed starter content,
  Dictation, shared curated/import engine, progress/resume, vocabulary, and
  Shadowing handoff.

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

- `scripts/test_listening_player_lifecycle_contract.mjs` throws at
  `media-player.js:160` (`frame.dataset` undefined). Pre-existing at `7b1740e`;
  outside the project-memory batch and not introduced by it.

## HUMAN GATES

- Production authentication/provider validation and AI activation.
- Production PostgreSQL migration/mutation, backup/restore, and rollback.
- Credentials/secrets, Cloudflare/DNS, billing/subscriptions, and deployment.
- Mobile signing, real-device matrix, store credentials/publication.
- Learner-skill/public release and built-in catalog publication approval.

## NEXT EXACT TASK

Human review of the project-memory commits. Then root-cause the open P1 in
`media-player.js` before further Listening work.
