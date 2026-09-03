# Current Handoff

## Governance

**Purpose:** current execution state only. **Authority:** updated by the active
agent after verified evidence. **Change when:** branch/lane, verified batch,
status, blocker, human gate, or exact next task changes. **Do not store:**
durable product philosophy, historical closeouts, implementation inventories,
or secret values.

## Current branch / lane

- Branch: `claude/integration-v2`. PR #55 merged 2026-09-03 (`main` =
  `e8e2d70`); work since sits on **draft PR #56**.
- CI runs only on `push: [main]` and `pull_request`, so branch commits with no
  open PR get NO CI. Check the PR before claiming CI.
- Lane: Orena integration, Product UI Foundation + Golden Web Home. The prior
  Listening catalog lane is preserved and explicitly deferred until the human
  returns to it; do not discard its verified state.
- Read live HEAD with `git rev-parse HEAD`. Verified application baseline:
  `66cbcadcd75b89d2ee44911f15c13ee8031ee74d`.
- That baseline ALREADY CONTAINS, do not re-implement: support-language
  separation, curated meaning + translation cache, Groq token sizing, background
  recovery orchestration, the atomic provider-poll claim, the L3 import
  pipeline, the curated-transcript contract (D-046), the offline transcript
  acquisition producer, the preview tier (D-047/D-048), and lesson-scoped
  progress + Continue Learning (D-049).
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
  and never create feature-specific volumes. Port 8000 is today's dogfood
  convention, not permanent architecture.
- Daily loop: source is bind-mounted, so `docker compose restart writing-coach`
  suffices for Python/JS/CSS/catalog changes. Rebuild ONLY for Dockerfile,
  requirements or system packages. Env changes need `up -d`, not restart.
- Images: keep CURRENT `ai-writing-coach:local` and ROLLBACK
  `orena-rollback:pre-realmedia`. No QA/feature/milestone/test images.
- **D-047 tier**: `APP_ENV` = runtime/security; `ORENA_DEPLOYMENT_TIER` =
  content visibility, default production. Production tier never loads the
  preview artifact; preview tier needs the platform-admin role, enforced
  server-side on BOTH listing and lesson endpoints. The marker is per-USER.
- `compose.preview.yaml` is optional isolated staging only — never started
  routinely; no `orena-preview-*` volume has ever been created.
- Verified live: `APP_ENV=production`, `PERSISTENCE_BACKEND=postgresql`, tier
  `production`, `PostgresSpecializedLearningRepository` installed. Root 302s to
  Google login; catalog API 401s anonymously.
- 8 unused `orena-postgres-preview-data-*` volumes remain from an earlier era;
  volume deletion is a HUMAN GATE, so they are reported, not removed.
- `orena.chillpickle.org` runs `cbdedfd`, does NOT follow `main`, no CD. Three
  worktrees share one Docker runtime; check no other lane is mid-batch.

## IN PROGRESS

- Human-directed priority: integrate Orena Product UI Foundation v0.1 into
  canonical startup/design contracts, then implement and visually prove the
  Golden Web Home.
- Listening batches remain preserved: L1 and L2 implemented, L2.5 one live
  check from done, L3 blocked on ingestion. They are deferred, not invalidated.

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
  no-caption recovery proven on `iVk7Ft6gl5w`. Groq key is VALID — that 403 was
  Cloudflare 1010.
- **D-049**: progress is keyed by (user, language, LESSON, segment) for
  Dictation and Shadowing, asset_id kept as provenance; Continue Learning is
  built server-side from real PostgreSQL progress with the same visibility
  boundary as discovery.

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

- 0 transcripts acquired; nothing invented. Three paths, three causes
  (2026-09-03): transcript body → `IpBlocked`; Supadata → **429**; Groq ASR →
  yt-dlp resolves 1 of 11 EN sources and Groq 400s on googlevideo's 302.
- INGESTION is the only blocker; the curated runtime is proven.
- `scripts/acquire_listening_transcripts.py` produces the offline handoff:
  refuses to invent, never relabels ASR as captions, never re-acquires.
- `SNAPSHOT_REQUIRED` stays False. Pilot packs unchanged (D-045).

## PENDING

- Golden Home implementation after the UI integration gate passes.
- Preserve the Listening human migration/dogfood step and ingestion work for
  when the human resumes that lane; do not silently execute production/runtime
  mutation as part of UI work.
- Unblock the import environment, run the pilot, then L4-L7.
- Human playback acceptance of the two real lessons.

## BLOCKED

- L3 content: YouTube IP ban (above). L2.5 cold acceptance: Supadata quota.
- Enabling Supadata in production is a paid-provider human gate, not done.

## OPEN P0

- None known.

## OPEN P1

- **L2_5_REAL_COLD_ACCEPTANCE=PENDING_EXTERNAL_PROVIDER_QUOTA** on
  `iSTlFeW-Z9M` (Supadata 429). Per D-044 an external gate; L2.5 is NOT complete.
- **L3 content blocked**: YouTube IpBlocked on transcript bodies; the ZH pilot
  family has no captions, so recovery is on the critical path.
- **Listening MODE is still not persisted** — Continue Learning resumes the
  lesson and segment, not the prior mode. Recorded, not claimed fixed.
- **Migration `20260903_0005` is NOT applied to the dogfood DB** (still
  `20260828_0004`). Applying it is a human step; the command is below.
- Registry is process-local: resume handles do not survive a restart.
- L1 is web only; native needs the L6 port. iOS VP9/WebM decode unproven.
- Generated excerpts are `proposed`; ids are provisional.

## HUMAN GATES

- The standing list is AGENTS.md §15 (production data/runtime, secrets, DNS,
  paid providers, deployment, mobile signing, publication, volume deletion).
- Deploying or exposing any new runtime, and deleting the 8 legacy volumes.

## NEXT EXACT TASK

**Orena UI Integration Gate v0.1.**

1. Make canonical UI startup read the Orena Product UI Foundation.
2. Replace the legacy writing/dashboard Home screen contract with the
   motivation → discovery → continuation Home contract.
3. Validate project memory and the screen/release contract.
4. Commit this governance/contract batch separately.
5. Then inspect the real Home implementation and backend data sources before
   coding Golden Home. Do not redesign from a blank canvas.

Listening migration/dogfood and L3 ingestion remain preserved deferred work.
Do not run production/database mutation while executing this UI batch unless
the human explicitly returns to that gate.
