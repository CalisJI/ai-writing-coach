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
- CI green on this branch at `cbdedfd` (runs 33585926995 / 33585927013). Local
  now: 716 backend, 11 web contracts, mobile validate clean.
- Real EN/ZH playback verified by browser decode through Orena's own player,
  including transcript sync, Dictation and the Shadowing handoff. Automated
  evidence, not human acceptance.

## DEPLOYED FOR QA — read this before touching the runtime

- `orena.chillpickle.org` runs commit `cbdedfd` (in `main` via PR #54), so its
  application code matches `main`. L1/L2 are NOT deployed.
- There is no CD. A GitHub push deploys nothing; the domain changes only when
  someone rebuilds on the host:
  `docker compose --profile public up -d --build writing-coach`.
- The three worktrees share one Docker runtime; the public stack belongs to the
  `-claudecode` project `ai-writing-coach`. Check no other lane is mid-batch.
- A human-approved production PostgreSQL migration ran 2026-09-02:
  `20260811_0001` -> `20260828_0004` (16 -> 19 tables, additive). The readiness
  guard that blocked startup beforehand is correct and must not be weakened.
  That approval covered that one run; the gate stays `approval_required`.

## IN PROGRESS

- Listening product batches from `docs/product/AGENT_IMPLEMENTATION_ORDER.md`.
  **L1 (discovery redesign, web) and L2 (source importer) are implemented.**
  Next is L3: run the full 200-candidate pack, inspect failures, curate.
- Human QA of the two real-media lessons on the deployed domain is still open;
  the domain has NOT been rebuilt with L1.

## DONE

- R0-R20 local foundations preserved. Listening ENGINE is library-first and
  locally accepted: Dictation, Shadowing, shared media contracts, progress.
- Listening REAL MEDIA CATALOG is PARTIAL: two rights-cleared video lessons
  (EN Royal Society CC BY 3.0, ZH Commons CC BY-SA 3.0) with real posters and
  subtitle-derived timings; the other five are seed audio. Not a catalog.
- One reviewed-media URL rule (https, exact host, no credentials, no port) on
  server, web and native. Poster hosts are per provider; playback stays
  Commons-only for direct media.
- L1 media-first discovery on responsive web: poster owns a 16:9 frame with
  level/duration/provider badges; description, rights text and source line are
  off the card; rails derived from topic/tags (3.4); real video leads every rail
  (3.5). Poster is 99% of card width at 1440px and 390px.
- L2 source importer: `scripts/build_listening_dev_catalog.py` over
  `writing_coach/listening_source_import.py`, reusing the YouTube adapter and
  the canonical Media Learning Object. Watch + Shorts, deterministic ids, several
  excerpts per source on real transcript boundaries only, per-outcome report,
  failures never end the batch. Overlay is BASE + GENERATED behind
  `ENABLE_DEV_LISTENING_CATALOG`, refused when `APP_ENV=production`.
- L2 hardening: generated content carries its own truthful lifecycle
  (`DEV_CANDIDATE` / `rights_review` / curation `proposed`) instead of borrowing
  PUBLISHED/verified; the base loader refuses all three. Human CSV fields are
  validated per row so one bad level or mode cannot poison the overlay. The
  artifact is committed, carries input digests and a content hash, and a
  hand-edited file is refused; `--check` verifies it offline in CI. Creator and
  thumbnail come from oEmbed, CSV only as fallback.
- Writing, Speaking and Reading are complete locally with acceptance passes and
  pre-public matrices. Writing is `beta`, the others `internal`. Do not rebuild
  them because they are not public.

## PENDING

- L3 real content load, L4 masked Dictation, L5 handoffs, L6 native parity,
  L7 human QA.
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

- Real catalog breadth: the BASE catalog still has one EN and one ZH real lesson,
  so most L1 rails are empty and the first viewport still shows icon fallbacks for seed audio. The
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

Batch L3 from `docs/product/AGENT_IMPLEMENTATION_ORDER.md`: run the importer over
the full EN/ZH candidate pack, record failures rather than dropping them,
**curate** the proposed excerpts, and commit the generated artifact. Generated
excerpts arrive as `proposed`; promoting one to `reviewed` is a human/curator
act. L3 also owns the learner-quality work the generator cannot do: translation
or meaning where required, Chinese Pinyin, level review and natural excerpt
review. Playback plus captions is not content-complete. Run it with
`python scripts/build_listening_dev_catalog.py --report <path>` and read the
per-candidate entries.

Separately, human QA remains open on `orena.chillpickle.org`: sign in with Google, open Listening
and exercise both real lessons — `en-science-cosmic-calendar` and
`zh-technology-search-wikipedia` — for poster, real playback, transcript sync,
Dictation, next segment, Shadowing handoff, and progress/resume.

If QA passes, record the acceptance in memory and open a small PR for the
docs-only memory commits still missing from `main`. If QA fails, fix the
reported defect at the smallest correct layer, redeploy with the command above,
and re-verify. Do not broaden the catalog, mark it complete, or redeploy before
QA reports back.
