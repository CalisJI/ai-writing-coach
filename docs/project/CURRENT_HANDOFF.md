# Current Handoff

## Governance

**Purpose:** current execution state only. **Authority:** updated by the active
agent after verified evidence. **Change when:** branch/lane, verified batch,
status, blocker, human gate, or exact next task changes. **Do not store:**
durable product philosophy, historical closeouts, implementation inventories,
or secret values.

## Current branch / lane

- Branch: `claude/integration-v2`. PR #54 is merged (`main` = `8d04c44`,
  through `cbdedfd`). **PR #55 is OPEN** and carries everything since — L1, L2,
  L2.5, catalog loader, YouTube provider, CI, tests. `main` has none of it.
- Lane: Orena integration, Listening real-media catalog.
- Read live HEAD with `git rev-parse HEAD`. The verified application baseline is
  `4d037736945c81abbaa9ffb1259097f02d3beec6`, the latest application-changing
  commit, verified by CI at its docs-only descendant `077dd46`. Commits after
  `4d03773` are governance-only; earlier SHAs in old handoffs are stale.
- That baseline ALREADY CONTAINS L2.5 application work — do not re-implement it:
  support-language separation (`ed9acc7`), curated meaning with a persistent
  translation cache (`6af33fc`), Groq token sizing and the single language
  registry (`017c91e`), and background transcript-recovery orchestration
  (`4d03773`).

## Last verified batch

- Real-media Listening at web/native parity, deployed for human QA. Real EN/ZH
  playback verified by browser decode through Orena's own player: transcript
  sync, Dictation, Shadowing handoff. Automated evidence, not human acceptance.
- CI green at `cbdedfd` and `077dd46`. Local: 769 backend passing, 11 web
  contracts, mobile validate clean. The 4 local admin/reference failures are the
  documented Compose-OAuth gotcha (401, not a regression); CI passes them.

## DEPLOYED FOR QA — read before touching the runtime

- `orena.chillpickle.org` runs `cbdedfd` (in `main` via PR #54). L1/L2/L2.5 are
  NOT deployed. It is `APP_ENV=production` + PostgreSQL, so the dev overlay is
  refused there by design — do not weaken that guard.
- No CD. A push deploys nothing; the domain changes only when someone runs
  `docker compose --profile public up -d --build writing-coach` on the host.
  Three worktrees share one Docker runtime; the public stack is `-claudecode`.
- Check no other lane is mid-batch before operating Docker.
- A human-approved production PostgreSQL migration ran 2026-09-02 to
  `20260828_0004`. That covered one run; the gate stays `approval_required`.

## IN PROGRESS

- Listening product batches from `docs/product/AGENT_IMPLEMENTATION_ORDER.md`.
  **L1 (discovery redesign, web) and L2 (source importer) are implemented.**
  Next is L3: run the full 200-candidate pack, inspect failures, curate.
- Human QA of the two real-media lessons is open (see OPEN HUMAN QA).

## DONE

- R0-R20 preserved. Listening ENGINE library-first and locally accepted.
  Writing (`beta`), Speaking, Reading (`internal`) complete locally; do not
  rebuild them.
- REAL MEDIA CATALOG PARTIAL: two rights-cleared video lessons; five seed audio.
- One reviewed-media URL rule on server, web and native; direct playback
  Commons-only. L1 media-first discovery, web only: 16:9 poster, rails from
  topic/tags, real video leads every rail.
- L2 importer reuses the YouTube adapter and canonical Media Learning Object:
  deterministic ids, excerpts on real transcript boundaries only, failures never
  end a batch. Generated content is `DEV_CANDIDATE` / `rights_review` /
  `proposed`.
- Artifact strategy implemented, NO snapshot committed: `SNAPSHOT_REQUIRED=False`,
  `--check` reports SKIP, fingerprint binds provenance and body, enforced BOTH
  ways.

## L2.5 STATUS

- Support/learning language and UI locale are distinct; one rule in
  `core/support_languages.py`, persistent in the profile, twelve languages, nine
  Vietnamese defaults removed. One recovery policy shared by My Media and the
  importer; `transcript_origin` on every response.
- Curated meaning: editorial → cached → live → truthful unavailable, keyed by
  asset+segment+text fingerprint+language+provider. PROVEN live — ja and es
  generate once then serve `cached-generated` with 0 calls; ZH gives Hanzi +
  Pinyin + meaning.
- Groq key is VALID; never replace it. HTTP 403 does NOT mean a bad key (that
  403 was Cloudflare 1010 refusing a `Python-urllib` UA). FIXED:
  `max_completion_tokens` 2048 replaces `max_tokens: 8000` which equalled the
  org ceiling; 413 splits the batch; the private vi/en/zh map is gone.
- No-caption recovery PROVEN warm on `iVk7Ft6gl5w`: 10 canonical timestamped
  segments, `transcript_origin: supadata_generated`, Japanese meaning, four
  modes, "generated automatically" disclosure, never "unsupported".
- Orchestration FIXED: the Orena job is created BEFORE the provider call, so the
  learner gets `provider_starting` + a handle immediately and the ~93s provider
  start runs on a bounded worker. Cold initial response **1.36s**, was a 90s
  timeout.
- Poll path now genuinely thread-safe — the earlier "registry thread-safe" claim
  covered the container, not the record. The right to poll the paid provider is
  claimed atomically, the service gets immutable snapshots, and every transition
  happens under the lock: concurrent status requests make ONE provider call and
  the rest are told `poll_in_flight`. `MEDIA_FALLBACK_START_WORKERS` is
  bounded-validated.

## PENDING

- Finish L2.5, then L3 content, L4 Dictation, L5 handoffs, L6 native, L7 QA.
- Human playback acceptance of the two real lessons.

## BLOCKED

- No code blocker. Enabling Supadata in production is a paid-provider human
  gate and has NOT been done; it is on for the local preview only.

## OPEN P0

- None known.

## OPEN P1

- **Supadata plan quota is exhausted**, so the cold end-to-end transcript is
  still unproven. A direct call now returns HTTP 429 `limit-exceeded`, "Plan
  usage limit was exceeded". Orena handled it correctly — truthful
  `provider_failure`, playback intact, never "unsupported" — but the final
  cold acceptance needs quota. Re-run with `iSTlFeW-Z9M` once it resets.
- Registry is process-local: resume handles do not survive a restart or span
  replicas. Future architecture concern, deliberately not expanded.
- Real catalog breadth: one EN and one ZH real lesson; spec 3.23 waits on L3.
- L1 is web only; native needs the L6 port. Native curated video verified by
  tests and prebuild, not on a device; iOS VP9/WebM decode unproven (the fix
  would be an H.264 derivative).
- Generated excerpts are `proposed` candidates; ids are provisional.

## HUMAN GATES

- Production auth/provider validation, AI activation, PostgreSQL
  migration/mutation, backup/restore, rollback.
- Credentials/secrets, Cloudflare/DNS, billing, paid providers, deployment.
- Mobile signing, real-device matrix, store publication; learner-skill/public
  release and catalog publication approval.

## NEXT EXACT TASK

Finish L2.5. Orchestration is done and measured; only the real cold acceptance
remains, blocked on Supadata plan quota (429 `limit-exceeded`). When quota
resets, re-run a cold import of `iSTlFeW-Z9M` and confirm
`provider_starting → queued → processing → completed` with a real transcript,
then web/native visual QA. Then Batch L3: run the importer over the full EN/ZH
pack, curate the proposed excerpts, commit the snapshot and flip
`SNAPSHOT_REQUIRED` True in the same commit.

## L3 PREVIEW PATH (decided)

**D-043**: L3 content is QA'd on a separate local development runtime
(`APP_ENV=development`, `ENABLE_DEV_LISTENING_CATALOG=1`, SQLite, `127.0.0.1`
only, off the tunnel), never on the production domain. Promotion to the
production catalog stays a human gate.

## OPEN HUMAN QA

`orena.chillpickle.org`: sign in, open Listening, exercise
`en-science-cosmic-calendar` and `zh-technology-search-wikipedia` for poster,
playback, transcript sync, Dictation, Shadowing, progress/resume.
