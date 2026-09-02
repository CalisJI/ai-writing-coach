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

- Listening product batches from `docs/product/AGENT_IMPLEMENTATION_ORDER.md`.
  **L1 (discovery redesign) is implemented on responsive web.** Next is L2, the
  CSV source importer.
- Human QA of the two real-media lessons on the deployed domain is still open;
  the domain has NOT been rebuilt with L1.

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
- L1 media-first discovery on responsive web: the poster owns a 16:9 frame with
  level/duration/provider badges; description, rights text, level evidence and
  the source line are off the card; rails are derived from topic/tags per spec
  3.4; real poster-backed video leads every rail per spec 3.5. Measured at
  1440px and 390px: poster is 99% of card width at both.
- Writing, Speaking and Reading are complete locally with acceptance passes and
  pre-public matrices. Writing is `beta`, the others `internal`. Do not rebuild
  them because they are not public.

## PENDING

- L2 source importer, L3 real content load, L4 masked Dictation, L5 handoffs,
  L6 native parity, L7 human QA.
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

- Real catalog breadth: one EN and one ZH real lesson only, so most L1 rails are
  empty and the first viewport still shows icon fallbacks for seed audio. The
  layout is right; spec 3.23 visual acceptance cannot pass until L3 loads real
  content. Do not treat this as an L1 layout defect.
- L1 landed on responsive web only. Native still renders the old card and needs
  the L6 full port.
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

Batch L2 from `docs/product/AGENT_IMPLEMENTATION_ORDER.md`: build the CSV source
importer (`scripts/build_listening_dev_catalog.py`) over the existing YouTube
provider, with stable IDs, multiple excerpts per source, a full accepted/skipped/
failed report, and the dev overlay defaulting OFF in production. The EN/ZH source
CSVs are already in `writing_coach/content/`.

Separately, human QA remains open on `orena.chillpickle.org`: sign in with Google, open Listening
and exercise both real lessons — `en-science-cosmic-calendar` and
`zh-technology-search-wikipedia` — for poster, real playback, transcript sync,
Dictation, next segment, Shadowing handoff, and progress/resume.

If QA passes, record the acceptance in memory and open a small PR for the
docs-only memory commits still missing from `main`. If QA fails, fix the
reported defect at the smallest correct layer, redeploy with the command above,
and re-verify. Do not broaden the catalog, mark it complete, or redeploy before
QA reports back.
