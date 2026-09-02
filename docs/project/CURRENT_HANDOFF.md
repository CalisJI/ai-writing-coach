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
  `a97c4eab0406e5c5e0a291184d90d74973c1eb7e`, the latest application-changing
  commit, verified by CI at its docs-only descendant `73794c8`. Commits after
  `a97c4ea` are governance-only; earlier SHAs in old handoffs are stale.
- That baseline ALREADY CONTAINS L2.5 application work — do not re-implement it:
  support-language separation (`ed9acc7`), curated meaning with a persistent
  translation cache (`6af33fc`), Groq token sizing and the single language
  registry (`017c91e`), background transcript-recovery orchestration
  (`4d03773`), and the atomic provider-poll claim (`a97c4ea`).
- This field goes stale on EVERY application commit. Whoever lands one updates
  it and the YAML in the same batch, or the next agent rebuilds finished work.

## Last verified batch

- Real EN/ZH playback verified by browser decode through Orena's own player:
  transcript sync, Dictation, Shadowing handoff. Automated evidence, not human
  acceptance.
- CI + Mobile validation green at `73794c8` (run 33643021072), the newest
  verified state; also green at `cbdedfd` and `077dd46`. Local: 769 backend
  passing, 11 web contracts, mobile validate clean. The 4 local admin/reference
  failures are the documented Compose-OAuth gotcha (401, not a regression); CI
  passes them.

## DEPLOYED FOR QA — read before touching the runtime

- `orena.chillpickle.org` runs `cbdedfd` (in `main` via PR #54). L1/L2/L2.5 are
  NOT deployed. It is `APP_ENV=production` + PostgreSQL, so the dev overlay is
  refused there by design — do not weaken that guard.
- No CD. A push deploys nothing; the domain changes only when someone runs
  `docker compose --profile public up -d --build writing-coach` on the host.
  Three worktrees share one Docker runtime; the public stack is `-claudecode`.
- Check no other lane is mid-batch before operating Docker.
- OPEN HUMAN QA there: sign in, open Listening, exercise
  `en-science-cosmic-calendar` and `zh-technology-search-wikipedia` for poster,
  playback, transcript sync, Dictation, Shadowing, progress/resume.
- A human-approved production PostgreSQL migration ran 2026-09-02 to
  `20260828_0004`; that covered one run, the gate stays `approval_required`.

## IN PROGRESS

- Listening batches from `docs/product/AGENT_IMPLEMENTATION_ORDER.md`. **L1
  (discovery, web) and L2 (importer) are implemented**; L2.5 is one live check
  from done. Human QA of the two real lessons is open (see OPEN HUMAN QA).

## DONE

- R0-R20 preserved. Listening ENGINE locally accepted; Writing (`beta`),
  Speaking, Reading (`internal`) complete locally — do not rebuild them.
- REAL MEDIA CATALOG PARTIAL: two rights-cleared video lessons; five seed audio.
  One reviewed-media URL rule on server, web and native; direct playback
  Commons-only. L1 media-first discovery is web only: 16:9 poster, rails from
  topic/tags, real video leads every rail.
- L2 importer reuses the YouTube adapter and canonical Media Learning Object:
  deterministic ids, excerpts on real transcript boundaries only, failures never
  end a batch. Content is `DEV_CANDIDATE` / `rights_review` / `proposed`.
- Artifact strategy implemented, NO snapshot committed: `SNAPSHOT_REQUIRED=False`,
  `--check` SKIPs, fingerprint binds provenance and body, enforced both ways.

## L2.5 STATUS

- Support/learning language and UI locale are distinct; one rule in
  `core/support_languages.py`, persistent in the profile, twelve languages, nine
  Vietnamese defaults gone. One recovery policy shared by My Media and the
  importer; `transcript_origin` on every response.
- Curated meaning: editorial → cached → live → truthful unavailable, keyed by
  asset+segment+text fingerprint+language+provider. PROVEN live — ja and es
  generate once then serve `cached-generated` at 0 cost; ZH adds Pinyin.
- Groq key is VALID; never replace it. HTTP 403 does NOT mean a bad key (that
  403 was Cloudflare 1010 refusing a `Python-urllib` UA). FIXED:
  `max_completion_tokens` 2048 replaces `max_tokens: 8000` which equalled the
  org ceiling; 413 splits the batch; the private vi/en/zh map is gone.
- No-caption recovery PROVEN warm on `iVk7Ft6gl5w`: 10 canonical timestamped
  segments, `transcript_origin: supadata_generated`, Japanese meaning, four
  modes, "generated automatically" disclosure, never "unsupported".
- Orchestration FIXED: the Orena job is created BEFORE the provider call, so the
  learner gets `provider_starting` + a handle immediately and the ~93s provider
  start runs on a bounded worker. Cold initial response **1.36s**, was 90s.
- Poll path genuinely thread-safe — the earlier "registry thread-safe" claim
  covered the container, not the record. The right to poll the paid provider is
  claimed atomically and the service only gets immutable snapshots, so
  concurrent status requests make ONE provider call; the rest get
  `poll_in_flight`. `MEDIA_FALLBACK_START_WORKERS` is bounded-validated.

## PENDING

- Finish L2.5, then L3 content, L4 Dictation, L5 handoffs, L6 native, L7 QA.
- Human playback acceptance of the two real lessons.

## BLOCKED

- No code blocker. Enabling Supadata in production is a paid-provider human
  gate and has NOT been done; it is on for the local preview only.

## OPEN P0

- None known.

## OPEN P1

- **L2_5_REAL_COLD_ACCEPTANCE=PENDING_EXTERNAL_PROVIDER_QUOTA** on fixture
  `iSTlFeW-Z9M`. Supadata returns HTTP 429 `limit-exceeded`. Per **D-044** this
  is an external provider gate, NOT an L3 blocker: L2.5 implementation,
  automated regression and real warm E2E are PASS; only the cold completion is
  unproven. L2.5 is NOT complete, and this debt survives L3 — run the one
  acceptance when quota resets. Do not spend quota on bulk import.
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

Finish L2.5. Code is done and measured; only the real cold acceptance remains,
blocked on Supadata plan quota (429 `limit-exceeded`). When quota resets, run
ONE cold import of `iSTlFeW-Z9M`: `provider_starting` → provider job id →
queued/processing → completed → real canonical transcript →
`transcript_origin=supadata_generated` → meaning in the support language →
Dictation and Shadowing. Then web/native visual QA. Then Batch L3: importer over
the full EN/ZH pack, curate the proposed excerpts, commit the snapshot and flip
`SNAPSHOT_REQUIRED` True in the same commit. L3 content is QA'd on a local
development runtime, never on the production domain — see **D-043**.
