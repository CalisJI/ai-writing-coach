# Current Handoff

## Governance

**Purpose:** current execution state only. **Authority:** updated by the active
agent after verified evidence. **Change when:** branch/lane, verified batch,
status, blocker, human gate, or exact next task changes. **Do not store:**
durable product philosophy, historical closeouts, implementation inventories,
or secret values.

## Current branch / lane

- Branch: `claude/integration-v2`. **PR #55 was MERGED by a human on
  2026-09-03** (`main` = `e8e2d70`, containing everything through `e329ec6`:
  L1, L2, L2.5, catalog loader, YouTube provider, CI, tests). The branch is 3
  commits ahead of `main` with the L3 work (`cf49d42`, `406bbdb`, `b9e14ea`)
  and NO open PR.
- CI runs only on `push: [main]` and `pull_request`, so branch commits with no
  open PR get NO CI. Open a PR before claiming CI.
- Lane: Orena integration, Listening real-media catalog.
- Read live HEAD with `git rev-parse HEAD`. Verified application baseline:
  `406bbdbb79192d828e9cf88868b2e546d21e492b` — see the SHA note below.
- That baseline ALREADY CONTAINS, do not re-implement: support-language
  separation (`ed9acc7`), curated meaning + persistent translation cache
  (`6af33fc`), Groq token sizing and one language registry (`017c91e`),
  background recovery orchestration (`4d03773`), the atomic provider-poll claim
  (`a97c4ea`), and the L3 import pipeline (`406bbdb`).
- This field goes stale on EVERY application commit. Whoever lands one updates
  it and the YAML in the same batch, or the next agent rebuilds finished work.

## Last verified batch

- CI + Mobile validation green at `e329ec6` (now merged as `e8e2d70`). The L3
  commits have NO CI yet — see above. Local: 787 backend passing, 11 web
  contracts, mobile validate clean. The 4 local admin/reference failures are the
  documented Compose-OAuth gotcha (401, not a regression); CI passes them.
- Real EN/ZH playback verified by browser decode through Orena's own player:
  transcript sync, Dictation, Shadowing handoff. Automated evidence, not human
  acceptance.

## DEPLOYED FOR QA — read before touching the runtime

- `orena.chillpickle.org` still runs `cbdedfd`. `main` has since advanced to
  `e8e2d70`; the domain does NOT follow `main`, so L1/L2/L2.5 are merged but
  NOT deployed, and L3 is neither. It is `APP_ENV=production` + PostgreSQL, so the dev overlay
  is refused there by design — do not weaken that guard.
- No CD. The domain changes only when someone runs `docker compose --profile
  public up -d --build writing-coach` on the host. Three worktrees share one
  Docker runtime; the public stack is `-claudecode`.
- A human-approved production PostgreSQL migration ran 2026-09-02 to
  `20260828_0004`; one run only, the gate stays `approval_required`.
- OPEN HUMAN QA there: open Listening and exercise
  `en-science-cosmic-calendar` and `zh-technology-search-wikipedia` for poster,
  playback, transcript sync, Dictation, Shadowing, resume.

## IN PROGRESS

- Listening batches from `docs/product/AGENT_IMPLEMENTATION_ORDER.md`. **L1 and
  L2 are implemented**; L2.5 is one live check from done; **L3 ran the full pack
  and is BLOCKED** (below).

## DONE

- R0-R20 preserved. Listening ENGINE locally accepted; Writing (`beta`),
  Speaking, Reading (`internal`) complete locally — do not rebuild them.
- REAL MEDIA CATALOG PARTIAL: two rights-cleared video lessons, five seed audio;
  one reviewed-media URL rule on server, web and native. L1 discovery, web only.
- L2 importer reuses the YouTube adapter and canonical Media Learning Object:
  deterministic ids, excerpts on real transcript boundaries only, failures never
  end a batch. Content stays `DEV_CANDIDATE` / `rights_review` / `proposed`.
- L2.5 (see D-042/D-044): support/learning language and UI locale distinct,
  twelve languages, no Vietnamese default; meaning resolves editorial → cached →
  live → truthful unavailable, ja/es proven with the second call free; warm
  no-caption recovery proven on `iVk7Ft6gl5w`; cold response 1.36s; the paid
  provider poll is claimed atomically.
- Groq key is VALID; never replace it. HTTP 403 does NOT mean a bad key (that
  403 was Cloudflare 1010 refusing a `Python-urllib` UA).

## L3 STATUS — pipeline done, content not obtainable from this host

- Full pack attempted: 100 EN + 100 ZH, TOTAL_OUTCOMES 200, no silent drops,
  0 ACCEPTED. **No snapshot committed**; `SNAPSHOT_REQUIRED` stays False and
  `--check` still SKIPs.
- **Blocker: `youtube_transcript_api._errors.IpBlocked`.** Track LISTING works
  from this host; fetching a transcript BODY is refused, so single requests and
  the caption audit succeed while every import fails — which is why it first
  looked like throttling. External block like the Supadata quota; not a code
  defect, not fixable by pacing (2.0s and 3.5s plus three retries all failed).
- Do NOT work around it with a proxy or IP-ban evasion — circumvention, and a
  human infrastructure decision. Supadata could fetch these but is a paid gate
  with exhausted quota.
- Measured pack truth (audit and run agree exactly: 41+37=78 EN, 13 ZH):
  EN 78/100 DO have EN captions, all blocked; 22 genuinely have none. ZH only
  13/100 have ZH captions — 45 disabled, 25 English-only subs, 16 auto-captions
  in another language. **The ZH pack cannot reach 100 lessons even unblocked**;
  replacing it is a human content decision.
- Evidence: `l3_import_report.json`, `l3_caption_audit.json` (local).

## PENDING

- Unblock L3 content, then L4 Dictation, L5 handoffs, L6 native, L7 QA.
- Human playback acceptance of the two real lessons.
- Open a PR for the L3 commits so they get CI.

## BLOCKED

- L3 content generation: YouTube IP ban (above).
- L2.5 cold acceptance: Supadata quota (below).
- Enabling Supadata in production is a paid-provider human gate, not done.

## OPEN P0

- None known.

## OPEN P1

- **L2_5_REAL_COLD_ACCEPTANCE=PENDING_EXTERNAL_PROVIDER_QUOTA** on fixture
  `iSTlFeW-Z9M` (Supadata HTTP 429). Per **D-044** an external gate, not an L3
  blocker: implementation, regression and warm E2E PASS, only cold completion
  unproven. L2.5 is NOT complete; run the one acceptance when quota resets.
- **L3 blocked by a YouTube IP ban on transcript bodies**; real catalog breadth
  stays one EN and one ZH lesson.
- **The ZH source pack is not fit for purpose**: 87/100 rows cannot yield a
  Chinese transcript even unblocked. Needs human content replacement.
- Registry is process-local: resume handles do not survive a restart. Future
  architecture concern, deliberately not expanded.
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

Decide with a human how L3 gets transcripts: the code is ready, the content is
not reachable from here. Options in the order I would ask them: (1) run the
importer from an unblocked network — deterministic, needs no secrets;
(2) authorise Supadata for bulk development recovery, a paid gate, once quota
resets; (3) replace the ZH pack, needed regardless of the ban. Then rerun
`build_listening_dev_catalog.py --pause-seconds 3.5 --retry-passes 3`, curate,
and commit the snapshot and `SNAPSHOT_REQUIRED = True` in one commit.
Separately, when Supadata quota resets, run the ONE L2.5 cold acceptance on
`iSTlFeW-Z9M`. L3 content is QA'd on a local development runtime, never on the
production domain — see **D-043**.
