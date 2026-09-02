# Current Handoff

## Governance

**Purpose:** current execution state only. **Authority:** updated by the active
agent after verified evidence. **Change when:** branch/lane, verified batch,
status, blocker, human gate, or exact next task changes. **Do not store:**
durable product philosophy, historical closeouts, implementation inventories,
or secret values.

## Current branch / lane

- Branch: `claude/integration-v2`. PR #54 is **MERGED**: `origin/main` is
  `8d04c44` and contains every application commit through `cbdedfd`. Only two
  later docs-only memory commits on this branch are not in `main` yet.
- Lane: Orena integration, Listening real-media catalog.
- Read live HEAD with `git rev-parse HEAD`. The verified application baseline is
  `48a9eabab6422dd9dab7a6b8285a3a3def1db30d`; later commits on this branch are
  governance-only and do not move it.

## Last verified batch

- Real-media Listening at web/native parity, then deployed for human QA.
- CI evidence, GitHub, both workflows green on this branch: CI run
  `33585926995` (705 passed, validators, ESM graph, media contracts, Docker
  build) and Mobile validation run `33585927013` (48 suites / 358 tests,
  TypeScript, Android **and** iOS prebuild).
- Real playback verified by browser decode through Orena's own player:
  EN 854x481 / 47.328s / 96 frames; ZH 854x481 / 198.241s opened at its 16.12s
  excerpt start. Transcript sync stepped on the real subtitle boundaries,
  Dictation graded the real segment at 100%, Shadowing reused the same media
  object. Automated evidence, not human acceptance.

## DEPLOYED FOR QA — read this before touching the runtime

- `orena.chillpickle.org` runs commit `cbdedfd`, which is now in `main` via the
  PR #54 merge, so the domain's application code matches `main` (`8d04c44` adds
  only the merge commit). It is still not automatic: the runtime moved because
  someone rebuilt, not because anything was pushed or merged.
- There is no CD. The domain changes only when someone rebuilds on the host:
  `docker compose --profile public up -d --build writing-coach`. A GitHub push
  deploys nothing.
- The three worktrees (`-v030`, `-claudecode`, `-codex`) share one Docker
  runtime. The public stack belongs to the `-claudecode` project
  `ai-writing-coach`. Confirm no other lane is mid-batch before operating it.
- A human-approved production PostgreSQL migration ran 2026-09-02:
  `20260811_0001` -> `20260828_0004`, adding `speaking_attempts`,
  `listening_progress`, `shadowing_progress`. 16 -> 19 tables, additive, nothing
  dropped. Before it, the database was three revisions behind the code and the
  runtime refused to start; that guard is correct and must not be weakened.
- That approval covered that one run. The gate stays `approval_required`.

## IN PROGRESS

- Human QA of the two real-media lessons on the deployed domain. Nothing to
  implement until QA reports back.

## DONE

- R0-R20 local foundations preserved; R20 has local acceptance evidence.
- Listening ENGINE is library-first and locally accepted: Dictation, Shadowing,
  shared curated/import media contracts, progress/resume, vocabulary.
- Listening REAL MEDIA CATALOG is PARTIAL. Two rights-cleared video lessons play
  on web and native, EN (The Royal Society, CC BY 3.0) and ZH (Commons,
  CC BY-SA 3.0), with real posters and subtitle-derived timings. The other five
  lessons are still seed/synthetic audio. Two lessons are not a catalog.
- One reviewed-media URL rule (https, exact allowlisted host, no credentials, no
  port) is enforced on the server, the web player and native, and validated at
  the canonical catalog boundary.
- Writing, Speaking and Reading are complete locally with acceptance passes and
  pre-public matrices. Writing is `beta`, the others `internal`. Do not rebuild
  them because they are not public.

## PENDING

- Human playback/product acceptance of the two real lessons on the domain.
- Real-device native verification, then broader real catalog across the
  discovery categories.
- Getting the two docs-only memory commits on this branch into `main`; PR #54 is
  already closed, so they need their own PR. They carry no application change
  and no CI run fired for them because the PR was merged before they landed.

## BLOCKED

- No code blocker. The batch is waiting on human QA, not on implementation.

## OPEN P0

- None known.

## OPEN P1

- Real catalog breadth: one EN and one ZH real lesson only. Animation, Movies &
  Drama, Podcast, Stories, Kids, Interview and the rest have no real content.
- Native curated video is verified by unit/route tests, typecheck and prebuild,
  NOT on a real device or simulator.
- iOS VP9/WebM decode is unproven. Both real lessons are VP9 transcodes and
  Safari/AVFoundation historically lacks VP9 in WebM. iOS prebuild passing means
  `expo-video` integrates, not that the file decodes. If iOS fails, the fix is a
  source-level H.264/MP4 derivative in the manifest, not a player change.
- Durable Listening progress now has its tables in production and the app is on
  the PostgreSQL backend, but saving is unconfirmed until QA exercises it.

## HUMAN GATES

- Production authentication/provider validation and AI activation.
- Production PostgreSQL migration/mutation, backup/restore, and rollback.
- Credentials/secrets, Cloudflare/DNS, billing/subscriptions, and deployment.
- Mobile signing, real-device matrix, store credentials/publication.
- Learner-skill/public release and built-in catalog publication approval.

## NEXT EXACT TASK

Wait for human QA on `orena.chillpickle.org`: sign in with Google, open Listening
and exercise both real lessons — `en-science-cosmic-calendar` and
`zh-technology-search-wikipedia` — for poster, real playback, transcript sync,
Dictation, next segment, Shadowing handoff, and progress/resume.

If QA passes, record the acceptance in memory and open a small PR for the
docs-only memory commits still missing from `main`. If QA fails, fix the
reported defect at the smallest correct layer, redeploy with the command above,
and re-verify. Do not broaden the catalog, mark it complete, or redeploy before
QA reports back.
