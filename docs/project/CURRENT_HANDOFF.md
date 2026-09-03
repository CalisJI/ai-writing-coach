# Current Handoff

## Governance

**Purpose:** current execution state only. **Authority:** updated by the active
agent after verified evidence. **Change when:** branch/lane, verified batch,
status, blocker, human gate, or exact next task changes. **Do not store:**
durable product philosophy, historical closeouts, implementation inventories,
or secret values.

## Current branch / lane

- Branch: `claude/integration-v2`; work sits on **draft PR #56** (`main` =
  `e8e2d70`). CI runs only on `push: [main]` and `pull_request`, so branch
  commits with no open PR get NO CI — check the PR before claiming CI.
- Lane: Orena integration — Product UI Foundation + Golden Web Home. The
  Listening catalog lane is preserved and explicitly deferred.
- Read live HEAD with `git rev-parse HEAD`. Verified application baseline:
  `cac4ebf2f0e7f3913aa52820c2e587e6c7f1da86`.
- That baseline ALREADY CONTAINS, do not re-implement: support-language
  separation, curated meaning + translation cache, background recovery
  orchestration, the atomic provider-poll claim, the L3 import pipeline, the
  curated-transcript contract (D-046), the offline transcript producer, the
  preview tier (D-047/D-048), lesson-scoped progress + Continue Learning
  (D-049), and the Orena product component layer + Home H1 (D-051).
- This field goes stale on EVERY application commit — update it and the YAML in
  the same batch.

## Last verified batch

- **H1 Golden Home**, local: 864 backend passing / 2 failing before this
  batch's memory fix (both the handoff cap), 12/12 CI web contracts, ESM graph
  and `validate_architecture` OK. Eight `.mjs` tests fail identically at the
  previous HEAD and are untouched by H1 — none is in CI.
- Real EN/ZH playback verified by browser decode, not by a human.

## RUNTIME — ONE local Orena, read before touching Docker

- **D-048: ONE long-lived runtime.** `ai-writing-coach-writing-coach-1` on
  `127.0.0.1:8000`, `ai-writing-coach-postgres-1`, one cloudflared. Do NOT start
  a second Orena container, PostgreSQL, image, port, tunnel or Compose project,
  and never create feature-specific volumes.
- Source is bind-mounted, so `docker compose restart writing-coach` suffices
  for Python/JS/CSS/catalog changes. Rebuild ONLY for Dockerfile, requirements
  or system packages. Env changes need `up -d`.
- Images: keep CURRENT `ai-writing-coach:local` and ROLLBACK
  `orena-rollback:pre-realmedia`. No QA/feature/milestone/test images.
- **D-047 tier**: `APP_ENV` = runtime/security; `ORENA_DEPLOYMENT_TIER` =
  content visibility, default production. Preview content needs the
  platform-admin role, enforced server-side on listing AND lesson endpoints,
  and is per-USER. `compose.preview.yaml` is optional isolated staging only.
- 8 unused `orena-postgres-preview-data-*` volumes remain from an earlier era;
  volume deletion is a HUMAN GATE, so they are reported, not removed.
- `orena.chillpickle.org` runs `cbdedfd`, does NOT follow `main`, no CD. Three
  worktrees share one Docker runtime; check no other lane is mid-batch.

## IN PROGRESS

- H2 Golden Home: production artwork and visual fidelity. H1 shipped the real
  artwork containers, ratios and crop rules with a textless development wash.
- Listening batches remain preserved: L1/L2 done, L2.5 one live check from
  done, L3 blocked on ingestion. Deferred, not invalidated.

## DONE

- R0-R20 preserved. Listening ENGINE locally accepted; Writing (`beta`),
  Speaking, Reading (`internal`) complete locally — do not rebuild them.
- REAL MEDIA CATALOG PARTIAL: two rights-cleared video lessons, five seed audio.
- The L2/L3 importer reuses the YouTube adapter and the canonical Media
  Learning Object; a failed caption request is never "no captions".
- L2.5 (D-042/D-044): support/learning language and UI locale distinct; meaning
  editorial → cached → live → truthful unavailable. The Groq key is VALID —
  that 403 was Cloudflare 1010.
- **D-049**: progress is keyed by (user, language, LESSON, segment) for
  Dictation and Shadowing; Continue Learning is built server-side from real
  PostgreSQL progress with discovery's visibility boundary.
- **D-051 (H1)**: `orena/product-components.{js,css}` is the first reusable
  Orena product layer, opt-in behind `data-orena-ui="v2"`. Home's body is Hero
  → Continue → Worlds → For You → Challenge → Continue Exploring; the Writing
  dashboard, latest-score, learning-memory and streak blocks are off Home
  (Journey still renders them from the same untouched APIs). Worlds are a
  versioned semantic source (`content/orena_worlds.v1.json` +
  `world_catalog.py` + `GET /api/worlds`) whose availability, counts and lead
  lesson are MEASURED against the real catalog: EN 3 of 6, ZH 3 of 6.

## CURATED TRANSCRIPT RUNTIME — done, proven in a browser

- **D-046**: transcript acquisition is INGESTION-time; opening a lesson never
  calls a transcript provider. Meaning lazy/cached, transcript eager.
  `tests/test_curated_transcript_contract.py` makes every provider raise and
  opens real EN and ZH lessons: **10ms**, 0 provider calls.
- Provenance travels with the text; older lessons default to UNSPECIFIED. The
  durable rule is PERSISTED CANONICAL TRANSCRIPT ARTIFACT, not "JSON forever".

## L3 SHORT-FORM PILOT — gated on ingestion

- 0 transcripts acquired; nothing invented. Three paths, three causes
  (2026-09-03): transcript body → `IpBlocked`; Supadata → **429**; Groq ASR →
  yt-dlp resolves 1 of 11 EN sources and Groq 400s on googlevideo's 302.
- `scripts/acquire_listening_transcripts.py` produces the offline handoff.
  `SNAPSHOT_REQUIRED` stays False; pilot packs unchanged (D-045).

## PENDING

- H2 artwork; then the shell/navigation migration. No Explore or Progress
  route exists yet, so an H1 World card opens its lead lesson through the
  existing autostart handoff.
- The Listening human migration/dogfood step and ingestion work stay preserved.
- Human playback acceptance of the two real lessons.

## BLOCKED

- L3 content: YouTube IP ban (above). L2.5 cold acceptance: Supadata quota.
  Enabling Supadata in production is a paid-provider human gate, not done.
- H1 was NOT rendered as the signed-in Home: the dogfood runtime requires
  Google sign-in, which is a human gate. The three widths were verified against
  the real components and real served CSS in sized frames instead.

## OPEN P0

- None known.

## OPEN P1

- **L2_5_REAL_COLD_ACCEPTANCE=PENDING_EXTERNAL_PROVIDER_QUOTA** on
  `iSTlFeW-Z9M` (Supadata 429). Per D-044 an external gate; L2.5 is NOT done.
- **L3 content blocked**: YouTube IpBlocked on transcript bodies; the ZH pilot
  family has no captions.
- **Listening MODE is not persisted** — Continue Learning resumes the lesson
  and segment, not the prior mode.
- **Migration `20260903_0005` is NOT applied to the dogfood DB** (still
  `20260828_0004`). Applying it is a human step.
- Eight pre-existing `.mjs` failures listed above; none in CI, none from H1.
- `orena/home.css` is now largely dead, left in place until the shell
  migration proves no other screen depends on it.
- Registry is process-local: resume handles do not survive a restart.
- L1 is web only; native needs the L6 port. iOS VP9/WebM decode unproven.

## HUMAN GATES

- The standing list is AGENTS.md §15 (production data/runtime, secrets, DNS,
  paid providers, deployment, mobile signing, publication, volume deletion).
- Signing in to the dogfood runtime, and deleting the 8 legacy volumes.

## NEXT EXACT TASK

**H2 Golden Home.** Replace the development artwork wash with approved
production artwork inside the containers H1 already built, render the signed-in
Home at 1440/1024/390, compare against `ORENA_HOME_GOLDEN_SPEC.md`, fix the
three largest gaps at the highest shared level, and render again. Do not
redesign the composition H1 established.

Listening migration/dogfood and L3 ingestion remain preserved deferred work.
Do not run production/database mutation while executing UI work.
