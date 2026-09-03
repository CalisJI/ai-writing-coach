# Current Handoff

## Governance

**Purpose:** current execution state only. **Authority:** updated by the active
agent after verified evidence. **Change when:** branch/lane, verified batch,
status, blocker, human gate, or exact next task changes. **Do not store:**
durable product philosophy, historical closeouts, implementation inventories,
or secret values.

## Current branch / lane

- Branch: `claude/integration-v2`. **PR #55 was merged by a human 2026-09-03**
  (`main` = `e8e2d70`, everything through `e329ec6`: L1, L2, L2.5, loader,
  provider, CI, tests). The L3 work sits ahead of `main` on **draft PR #56**.
- CI runs only on `push: [main]` and `pull_request`, so branch commits with no
  open PR get NO CI. Check the PR before claiming CI.
- Lane: Orena integration, Listening catalog.
- Read live HEAD with `git rev-parse HEAD`. Verified application baseline:
  `406bbdbb79192d828e9cf88868b2e546d21e492b`.
- That baseline ALREADY CONTAINS, do not re-implement: support-language
  separation, curated meaning + translation cache, Groq token sizing, one
  language registry, background recovery orchestration, the atomic
  provider-poll claim, and the L3 import pipeline.
- This field goes stale on EVERY application commit — update it and the YAML in
  the same batch, or the next agent rebuilds finished work.

## Last verified batch

- CI + Mobile validation green at `e329ec6` (now merged as `e8e2d70`). The L3
  commits have NO CI yet — see above. Local: 787 backend passing, 11 web
  contracts, mobile validate clean. The 4 local admin/reference failures are the
  documented Compose-OAuth gotcha (401, not a regression); CI passes them.
- Real EN/ZH playback verified by browser decode through Orena's own player:
  transcript sync, Dictation, Shadowing handoff. Automated evidence, not human
  acceptance.

## DEPLOYED FOR QA — read before touching the runtime

- `orena.chillpickle.org` still runs `cbdedfd` and does NOT follow `main`, so
  L1/L2/L2.5 are merged but NOT deployed, and L3 is neither. It is
  `APP_ENV=production` + PostgreSQL, so the dev overlay is refused there by
  design — do not weaken that guard.
- No CD. The domain changes only when someone runs `docker compose --profile
  public up -d --build writing-coach` on the host. Three worktrees share one
  Docker runtime; the public stack is `-claudecode`.
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
- L2/L3 importer reuses the YouTube adapter and canonical Media Learning
  Object: deterministic ids, excerpts on real transcript boundaries only, and a
  failed caption request is never recorded as "no captions".
- L2.5 (D-042/D-044): support/learning language and UI locale distinct, twelve
  languages, no Vietnamese default; meaning resolves editorial → cached → live →
  truthful unavailable, ja/es proven with the second call free; warm no-caption
  recovery proven on `iVk7Ft6gl5w`; cold response 1.36s; the paid provider poll
  is claimed atomically.
- Groq key is VALID; never replace it. HTTP 403 does NOT mean a bad key (it was
  Cloudflare 1010 refusing a `Python-urllib` UA).

## L3 STATUS — source strategy replaced; import environment still blocked

- **D-045**: content is now short-form dialogue (movie/animation scenes, quotes
  in context, situational comedy), 15-90s, natural dialogue units. The
  100 EN / 100 ZH informational pack is retired as primary.
- Pilot packs, every channel verified through provider oEmbed (not memory),
  reupload channels excluded rather than used to pad the count:
  `listening_sources_en_pilot_dialogue.csv` — 11 Kung Fu Panda scene clips
  (Movieclips / Fandango / Rotten Tomatoes / IGN), **all 11 have EN captions**;
  `listening_sources_zh_pilot_daihuaxiyou.csv` — 6 DaihuaXiyou 呆話西遊 videos.
- **IP_BLOCKED_REPRODUCED=YES.** `youtube_transcript_api._errors.IpBlocked` on
  transcript BODY fetch; metadata (oEmbed) and caption-track LISTING still work.
  No retries, no pacing games, no proxy — evidence preserved and testing stopped.
- **All 7 DaihuaXiyou videos checked have captions DISABLED**, so the whole ZH
  pilot family is RECOVERY_REQUIRED even when the ban lifts. Short-form
  animation channels typically disable captions, so this content direction
  depends on paid transcript recovery much more than the old pack did.
- The playlist could not be enumerated: JS-rendered, and enumeration needs a
  YouTube Data API key (credential gate). The 6 ZH rows were found by search,
  each verified via oEmbed.
- No pilot catalog was built — the blocked path is the one it needs.
  `SNAPSHOT_REQUIRED` stays False; nothing generated, nothing committed.

## PENDING

- Unblock the import environment, run the pilot, then L4-L7.
- Human playback acceptance of the two real lessons.

## BLOCKED

- L3 content: YouTube IP ban (above). L2.5 cold acceptance: Supadata quota.
- Enabling Supadata in production is a paid-provider human gate, not done.

## OPEN P0

- None known.

## OPEN P1

- **L2_5_REAL_COLD_ACCEPTANCE=PENDING_EXTERNAL_PROVIDER_QUOTA** on fixture
  `iSTlFeW-Z9M` (Supadata HTTP 429). Per **D-044** an external gate, not an L3
  blocker: implementation, regression and warm E2E PASS, only cold completion
  unproven. L2.5 is NOT complete; run the one acceptance when quota resets.
- **L3 blocked by a YouTube IP ban on transcript bodies**; catalog breadth
  stays one EN and one ZH lesson.
- **The ZH source pack is not fit for purpose**: 87/100 rows cannot yield a
  Chinese transcript even unblocked. Needs human content replacement.
- Registry is process-local: resume handles do not survive a restart.
- L1 is web only; native needs the L6 port. Native curated video verified by
  tests, not on a device; iOS VP9/WebM decode unproven.
- Generated excerpts are `proposed` candidates; ids are provisional.

## HUMAN GATES

- The standing list is AGENTS.md §15 (production data/runtime, secrets, DNS,
  paid providers, deployment, mobile signing, publication).
- **New:** how L3 obtains transcripts from a blocked host, and replacing the ZH
  source pack.
- `PROJECT_STATE.md`'s checkpoint SHA still predates the PR #55 merge. Merging
  moved real application truth onto `main`; refreshing that field is a human
  checkpoint decision, deliberately not taken by an agent.

## NEXT EXACT TASK

Get the import environment unblocked; everything else is ready. The pilot packs
are verified and the pipeline is tested, so once transcript bodies are
reachable, run:

    python scripts/build_listening_dev_catalog.py       writing_coach/content/listening_sources_en_pilot_dialogue.csv       writing_coach/content/listening_sources_zh_pilot_daihuaxiyou.csv       --pause-seconds 3.5 --retry-passes 3 --report l3_pilot_report.json

Unblocking options, in the order I would ask: (1) run it from an unblocked
network — deterministic, no secrets needed; (2) authorise Supadata for
development recovery, a paid gate, once quota resets — needed anyway for the ZH
family, which has no captions. Then QA on a local development runtime, never the
production domain (**D-043**), and only then discuss the snapshot;
`SNAPSHOT_REQUIRED` stays False until we agree to scale this direction.
Separately, when quota resets, run the ONE L2.5 cold acceptance on
`iSTlFeW-Z9M`.
