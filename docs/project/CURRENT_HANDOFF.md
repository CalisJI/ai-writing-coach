# Current Handoff

## Governance

**Purpose:** current execution state only. **Authority:** updated by the active
agent after verified evidence. **Change when:** branch/lane, verified batch,
status, blocker, human gate, or exact next task changes. **Do not store:**
durable product philosophy, historical closeouts, implementation inventories,
or secret values.

## Current branch / lane

- Branch: `claude/integration-v2`. **PR #55 was merged by a human 2026-09-03**
  (`main` = `e8e2d70`). Work since then sits on **draft PR #56**.
- CI runs only on `push: [main]` and `pull_request`, so branch commits with no
  open PR get NO CI. Check the PR before claiming CI.
- Lane: Orena integration, Listening catalog.
- Read live HEAD with `git rev-parse HEAD`. Verified application baseline:
  `7192cf0eadc2c536d83a40e6323584583b20fad5`.
- That baseline ALREADY CONTAINS, do not re-implement: support-language
  separation, curated meaning + translation cache, Groq token sizing, background
  recovery orchestration, the atomic provider-poll claim, the L3 import
  pipeline, and the curated-transcript runtime contract (D-046).
- This field goes stale on EVERY application commit — update it and the YAML in
  the same batch, or the next agent rebuilds finished work.

## Last verified batch

- CI + Mobile green at `876dd1a`. Local now: **803 backend passing, 0 failures**,
  11/11 web contracts, validators OK. (The old 4 admin/reference failures were
  the Compose-OAuth gotcha; clearing that env passes them.)
- Real EN/ZH playback verified by browser decode through Orena's own player.
  Automated evidence, not human acceptance.

## DEPLOYED FOR QA — read before touching the runtime

- `orena.chillpickle.org` still runs `cbdedfd` and does NOT follow `main`, so
  nothing since L1 is deployed. It is `APP_ENV=production` + PostgreSQL, so the
  dev overlay is refused there by design — do not weaken that guard.
- No CD. The domain changes only when someone runs `docker compose --profile
  public up -d --build writing-coach` on the host. Three worktrees share one
  Docker runtime; the public stack is `-claudecode`. Check no other lane is
  mid-batch.
- A human-approved production PostgreSQL migration ran 2026-09-02 to
  `20260828_0004`; one run only, gate stays `approval_required`.
- OPEN HUMAN QA there: open Listening, exercise `en-science-cosmic-calendar`
  and `zh-technology-search-wikipedia` for poster, playback, transcript sync,
  Dictation, Shadowing, resume.

## IN PROGRESS

- Listening batches from `docs/product/AGENT_IMPLEMENTATION_ORDER.md`. **L1 and
  L2 are implemented**; L2.5 is one live check from done; **L3 ran the full pack
  and is BLOCKED** (below).

## DONE

- R0-R20 preserved. Listening ENGINE locally accepted; Writing (`beta`),
  Speaking, Reading (`internal`) complete locally — do not rebuild them.
- REAL MEDIA CATALOG PARTIAL: two rights-cleared video lessons, five seed audio.
  L1 discovery, web only.
- L2/L3 importer reuses the YouTube adapter and canonical Media Learning Object:
  deterministic ids, excerpts on real transcript boundaries only, and a failed
  caption request is never recorded as "no captions".
- L2.5 (D-042/D-044): support/learning language and UI locale distinct, twelve
  languages, no Vietnamese default; meaning editorial → cached → live →
  truthful unavailable, second call free; warm no-caption recovery proven on
  `iVk7Ft6gl5w`; cold response 1.36s; the paid provider poll is claimed
  atomically.
- Groq key is VALID; never replace it. HTTP 403 was Cloudflare 1010 refusing a
  `Python-urllib` UA, not a bad key.

## CURATED TRANSCRIPT MVP — done, proven in a browser

- **D-046**: curated transcript acquisition is INGESTION-time. Opening a curated
  lesson never calls a transcript provider. Meaning stays lazy/cached, transcript
  is eager/persisted. My Media keeps async recovery — CURATED READY only.
- Proven not asserted: `tests/test_curated_transcript_contract.py` makes every
  provider raise, then opens real EN and ZH lessons; one test proves the guard
  itself bites, so the suite cannot pass vacuously.
- Measured: open **10ms**, 0 provider calls. Browser showed video, timestamped
  segments, Hanzi + toned Pinyin, Dictation and Shadowing; the only external
  request was the media file streaming.
- Provenance travels with the text (origin/revision/language/quality_state).
  Older lessons default to UNSPECIFIED, never "official captions".
- Storage today is the catalog artifact; the durable rule is PERSISTED CANONICAL
  TRANSCRIPT ARTIFACT, not "JSON forever".
- `OfflineTranscriptAdapter` + `--offline-transcripts`: one machine acquires, a
  blocked host builds with no network.

## L3 STATUS — strategy replaced (D-045); ingestion blocked

- Content is short-form dialogue now, 15-90s. Pilot packs:
  `listening_sources_en_pilot_dialogue.csv` (11 Kung Fu Panda clips from
  licensed distributors, all with EN captions) and
  `listening_sources_zh_pilot_daihuaxiyou.csv` (6). Channels verified via
  oEmbed; reuploads excluded, not used to pad.
- **IP_BLOCKED_REPRODUCED=YES**: `IpBlocked` on transcript BODY fetch; metadata
  and caption LISTING still work. External block, not a code defect. No proxy.
- **All 7 DaihuaXiyou videos checked have captions DISABLED** — the ZH pilot
  needs paid recovery even once the ban lifts.
- Nothing generated or committed; `SNAPSHOT_REQUIRED` stays False. Evidence:
  `l3_import_report.json`, `l3_caption_audit.json` (local).

## PENDING

- Unblock the import environment, run the pilot, then L4-L7.
- Human playback acceptance of the two real lessons.

## BLOCKED

- L3 content: YouTube IP ban (above). L2.5 cold acceptance: Supadata quota.
- Enabling Supadata in production is a paid-provider human gate, not done.

## OPEN P0

- None known.

## OPEN P1

- **L2_5_REAL_COLD_ACCEPTANCE=PENDING_EXTERNAL_PROVIDER_QUOTA** on
  `iSTlFeW-Z9M` (Supadata 429). Per **D-044** an external gate, not a blocker:
  implementation, regression and warm E2E PASS, only cold completion unproven.
  L2.5 is NOT complete.
- **L3 content blocked by a YouTube IP ban on transcript bodies**; catalog
  breadth stays one EN and one ZH lesson. Transcript recovery is on the critical
  path: the ZH pilot family has no captions at all.
- Listening progress/resume is wired for PostgreSQL only, so it cannot be QA'd
  on a SQLite dev runtime (503 by design, not a regression).
- Registry is process-local: resume handles do not survive a restart.
- L1 is web only; native needs the L6 port. iOS VP9/WebM decode unproven.
- Generated excerpts are `proposed`; ids are provisional.

## HUMAN GATES

- The standing list is AGENTS.md §15 (production data/runtime, secrets, DNS,
  paid providers, deployment, mobile signing, publication).
- **New:** how L3 obtains transcripts from a blocked host, and replacing the ZH
  source pack.
- `PROJECT_STATE.md`'s checkpoint SHA still predates the PR #55 merge. Merging
  moved real application truth onto `main`; refreshing that field is a human
  checkpoint decision, deliberately not taken by an agent.

## NEXT EXACT TASK

The learner runtime is done and proven; only content acquisition is blocked. Get
an unblocked ingestion path, then run the pilot:

    python scripts/build_listening_dev_catalog.py       writing_coach/content/listening_sources_en_pilot_dialogue.csv       writing_coach/content/listening_sources_zh_pilot_daihuaxiyou.csv       --pause-seconds 3.5 --retry-passes 3 --report l3_pilot_report.json

Options: (1) run it from an unblocked network, or acquire there and hand over a
transcript JSON for `--offline-transcripts`; (2) authorise Supadata for
development recovery — needed anyway for the ZH family, which has no captions.
Then QA on a local development runtime, never the production domain (**D-043**);
`SNAPSHOT_REQUIRED` stays False until we agree to scale. Separately, when quota
resets, run the ONE L2.5 cold acceptance on `iSTlFeW-Z9M`.
