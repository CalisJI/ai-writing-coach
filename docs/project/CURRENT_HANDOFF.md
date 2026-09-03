# Current Handoff

## Governance

**Purpose:** current execution state only. **Authority:** updated by the active
agent after verified evidence. **Change when:** branch/lane, verified batch,
status, blocker, human gate, or exact next task changes. **Do not store:**
durable product philosophy, historical closeouts, implementation inventories,
or secret values.

## Current branch / lane

- Branch: `claude/integration-v2`. **PR #55 was merged by a human 2026-09-03**
  (`main` = `e8e2d70`). Work since sits on **draft PR #56**.
- CI runs only on `push: [main]` and `pull_request`, so branch commits with no
  open PR get NO CI. Check the PR before claiming CI.
- Lane: Orena integration, Listening catalog.
- Read live HEAD with `git rev-parse HEAD`. Verified application baseline:
  `2791eabb31c9dedd12f68d5024d75b41b3060d58`.
- That baseline ALREADY CONTAINS, do not re-implement: support-language
  separation, curated meaning + translation cache, Groq token sizing, background
  recovery orchestration, the atomic provider-poll claim, the L3 import
  pipeline, the curated-transcript contract (D-046), the offline transcript
  acquisition producer, and the preview tier (D-047/D-048).
- This field goes stale on EVERY application commit — update it and the YAML in
  the same batch.

## Last verified batch

- **CI green at `c02f423`**; Mobile last green at `876dd1a` (path-filtered to
  `mobile/**`, so it skips backend-only commits). Local: **805 backend passing,
  0 failures**, 11/11 web contracts, validators OK. Baseline stays `7192cf0`:
  `c02f423` changed tests only.
- Real EN/ZH playback verified by browser decode. Automated evidence, not
  human acceptance.

## RUNTIME — ONE local Orena, read before touching Docker

- **D-048: ONE long-lived runtime.** `ai-writing-coach-writing-coach-1` on
  `127.0.0.1:8000`, `ai-writing-coach-postgres-1`, one cloudflared. Do NOT start
  a second Orena container, PostgreSQL, image, port, tunnel or Compose project,
  and never create feature-specific volumes. Port 8000 is the current dogfood
  convention, not permanent architecture.
- Daily loop: source is bind-mounted, so `docker compose restart writing-coach`
  suffices for Python/JS/CSS/catalog changes. Rebuild ONLY for Dockerfile,
  requirements or system packages. Env changes need `up -d`, not restart.
- Images: keep CURRENT `ai-writing-coach:local` and ROLLBACK
  `orena-rollback:pre-realmedia`. No QA/feature/milestone/test images.
- **D-047 tier**: `APP_ENV` = runtime/security; `ORENA_DEPLOYMENT_TIER` =
  content visibility, default production. Production tier never loads the
  preview artifact; preview tier needs the platform-admin role, enforced
  server-side on BOTH listing and lesson endpoints. The marker is per-USER:
  normal learners see the ordinary product.
- `compose.preview.yaml` is optional isolated staging only — never started
  routinely; no `orena-preview-*` volume has ever been created.
- Verified live: `APP_ENV=production`, `PERSISTENCE_BACKEND=postgresql`, tier
  `production`, `PostgresSpecializedLearningRepository` installed (503s on
  SQLite). Root 302s to Google login; catalog API 401s anonymously.
- 8 unused `orena-postgres-preview-data-*` volumes remain from an earlier era;
  volume deletion is a HUMAN GATE, so they are reported, not removed.
- `orena.chillpickle.org` runs `cbdedfd`, does NOT follow `main`, no CD. Three
  worktrees share one Docker runtime; check no other lane is mid-batch.

## IN PROGRESS

- Listening batches from `docs/product/AGENT_IMPLEMENTATION_ORDER.md`: L1 and L2
  implemented, L2.5 one live check from done, L3 blocked on ingestion (below).

## DONE

- R0-R20 preserved. Listening ENGINE locally accepted; Writing (`beta`),
  Speaking, Reading (`internal`) complete locally — do not rebuild them.
- REAL MEDIA CATALOG PARTIAL: two rights-cleared video lessons, five seed audio.
  L1 discovery, web only.
- L2/L3 importer reuses the YouTube adapter and canonical Media Learning Object:
  deterministic ids, excerpts on real transcript boundaries only; a failed
  caption request is never recorded as "no captions".
- L2.5 (D-042/D-044): support/learning language and UI locale distinct; meaning
  editorial → cached → live → truthful unavailable, second call free; warm
  no-caption recovery proven on `iVk7Ft6gl5w`; the paid provider poll is claimed
  atomically. Groq key is VALID — that 403 was Cloudflare 1010, not a bad key.

## CURATED TRANSCRIPT RUNTIME — done, proven in a browser

- **D-046**: curated transcript acquisition is INGESTION-time; opening a lesson
  never calls a transcript provider. Meaning lazy/cached, transcript eager. My
  Media keeps async recovery — CURATED READY only.
- `tests/test_curated_transcript_contract.py` makes every transcript provider
  raise, then opens real EN and ZH lessons; one test proves the guard bites.
  Measured open **10ms**, 0 provider calls.
- Provenance travels with the text; older lessons default to UNSPECIFIED. The
  durable rule is PERSISTED CANONICAL TRANSCRIPT ARTIFACT, not "JSON forever".

## L3 SHORT-FORM PILOT — gated on ingestion

- 0 transcripts acquired; nothing invented. Three approved paths, three causes
  (2026-09-03): transcript body → `IpBlocked`; Supadata → **429
  `limit-exceeded`**; Groq ASR → yt-dlp resolves 1 of 11 EN sources and Groq
  returns 400 on googlevideo's 302 redirect.
- The blocker is INGESTION only; the curated runtime is proven.
- `scripts/acquire_listening_transcripts.py` is the producer half of the offline
  handoff: refuses to invent, never relabels ASR as provider captions, never
  re-acquires; its output is tested through the consumer adapter.
- `SNAPSHOT_REQUIRED` stays False. Pilot packs unchanged (D-045).

## PENDING

- Unblock the import environment, run the pilot, then L4-L7.
- Human playback acceptance of the two real lessons.

## BLOCKED

- L3 content: YouTube IP ban (above). L2.5 cold acceptance: Supadata quota.
- Enabling Supadata in production is a paid-provider human gate, not done.

## OPEN P0

- None known.

## OPEN P1

- **P1-A progress identity**: Listening progress is keyed by `asset_id`, so two
  excerpts of one source share a record. Each lesson/excerpt needs independent
  progress identity without breaking media identity.
- **P1-B Continue Learning**: declared but never populated server-side — the
  library endpoint emits no `continue-learning` section. Build it from persisted
  PostgreSQL progress, EN/ZH parity, nothing fabricated. Which MODE the learner
  was in is also unpersisted today.
- **L2_5_REAL_COLD_ACCEPTANCE=PENDING_EXTERNAL_PROVIDER_QUOTA** on
  `iSTlFeW-Z9M` (Supadata 429). Per D-044 an external gate; L2.5 is NOT complete.
- **L3 content blocked**: YouTube IpBlocked on transcript bodies; the ZH pilot
  family has no captions, so recovery is on the critical path.
- Registry is process-local: resume handles do not survive a restart.
- L1 is web only; native needs the L6 port. iOS VP9/WebM decode unproven.
- Generated excerpts are `proposed`; ids are provisional.

## HUMAN GATES

- The standing list is AGENTS.md §15 (production data/runtime, secrets, DNS,
  paid providers, deployment, mobile signing, publication, volume deletion).
- Deploying or exposing any new runtime, and deleting the 8 legacy volumes.

## NEXT EXACT TASK

Fix the two dogfood P1s on the single runtime (D-048), in order:

**P1-A** give each lesson/excerpt its own progress identity — today `asset_id`
alone means two excerpts of one source overwrite each other's progress. Keep
media/source identity intact; do not break existing rows silently.

**P1-B** populate Continue Learning server-side from persisted PostgreSQL
progress, resuming at the right lesson/excerpt and last segment, EN/ZH parity,
nothing fabricated. It is the first thing a returning learner sees, and it is
empty today.

Do not expand into L4. Transcript ingestion stays blocked (IpBlocked +
Supadata 429); short-form content drops in later with no runtime change.
