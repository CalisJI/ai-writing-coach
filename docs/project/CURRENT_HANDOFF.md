# Current Handoff

## Governance

**Purpose:** current execution state only. **Authority:** updated by the active
agent after verified evidence. **Change when:** branch/lane, verified batch,
status, blocker, human gate, or exact next task changes. **Do not store:**
durable product philosophy, historical closeouts, implementation inventories,
or secret values.

## Current branch / lane

- Branch: `claude/integration-v2`. PR #54 is merged (`main` = `8d04c44`,
  containing everything through `cbdedfd`). **PR #55 is OPEN** and carries
  everything since: L1 discovery UI, the L2 importer, catalog-loader and YouTube
  provider changes, CI and tests. `main` does NOT have any of it.
- Lane: Orena integration, Listening real-media catalog.
- Read live HEAD with `git rev-parse HEAD`. The verified application baseline is
  `e1a05d8fd9ddbb0063a00dd823e5ba9652464b69`, the latest application-changing
  commit. Only commits after it are governance-only.

## Last verified batch

- Real-media Listening at web/native parity, then deployed for human QA.
- CI green on this branch at `cbdedfd` (runs 33585926995 / 33585927013). Local
  now: 716 backend, 11 web contracts, mobile validate clean.
- Real EN/ZH playback verified by browser decode through Orena's own player,
  including transcript sync, Dictation and the Shadowing handoff. Automated
  evidence, not human acceptance.

## DEPLOYED FOR QA — read before touching the runtime

- `orena.chillpickle.org` runs `cbdedfd` (in `main` via PR #54). L1/L2/L2.5 are
  NOT deployed. It is `APP_ENV=production` + PostgreSQL, so the dev overlay is
  refused there by design.
- No CD. A push deploys nothing; the domain changes only when someone runs
  `docker compose --profile public up -d --build writing-coach` on the host.
- Three worktrees share one Docker runtime; the public stack is the
  `-claudecode` project. Check no other lane is mid-batch.
- A human-approved production PostgreSQL migration ran 2026-09-02 to
  `20260828_0004`. That covered one run; the gate stays `approval_required`,
  and the startup readiness guard must not be weakened.

## IN PROGRESS

- Listening product batches from `docs/product/AGENT_IMPLEMENTATION_ORDER.md`.
  **L1 (discovery redesign, web) and L2 (source importer) are implemented.**
  Next is L3: run the full 200-candidate pack, inspect failures, curate.
- Human QA of the two real-media lessons on the deployed domain is still open;
  the domain has NOT been rebuilt with L1.

## DONE

- R0-R20 preserved. Listening ENGINE library-first and locally accepted.
- Writing (`beta`), Speaking, Reading (`internal`) complete locally. Do not
  rebuild them.
- REAL MEDIA CATALOG PARTIAL: two rights-cleared video lessons; five seed audio.
- One reviewed-media URL rule on server, web and native; poster hosts per
  provider; direct playback Commons-only.
- L1 media-first discovery, web only: 16:9 poster, rails derived from
  topic/tags, real video leads every rail.
- L2 importer reuses the YouTube adapter and canonical Media Learning Object:
  watch + Shorts, deterministic ids, excerpts on real transcript boundaries
  only, per-candidate report, failures never end a batch. Generated content is
  `DEV_CANDIDATE` / `rights_review` / `proposed`.
- Artifact strategy implemented, NO snapshot committed: `SNAPSHOT_REQUIRED=False`,
  `--check` reports SKIP, fingerprint binds provenance and body, invariant
  enforced in BOTH directions.

## L2.5 STATUS

- Support language, learning language and UI locale are distinct; one rule in
  `core/support_languages.py`, persistent in the profile, twelve languages, nine
  Vietnamese defaults removed. One recovery policy shared by My Media and the
  importer; `transcript_origin` on every response.
- Curated meaning: editorial → cached → live → truthful unavailable, persisted
  by asset+segment+text fingerprint+language+provider. PROVEN live — ja and es
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
  start runs on a bounded worker. Cold initial response **1.36s**, down from a
  90s timeout. Registry thread-safe; `poll()` never polls a provider id that
  does not exist, and repeated polling never re-starts the provider.

## PENDING

- Finish L2.5, then L3 content, L4 Dictation, L5 handoffs, L6 native, L7 QA.
- Human playback acceptance of the two real lessons on the domain.

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
  replicas. Future architecture concern, deliberately not expanded here.
- Real catalog breadth: one EN and one ZH real lesson; spec 3.23 waits on L3.
- L1 is web only; native needs the L6 port.
- Native curated video verified by tests and prebuild, not on a device. iOS
  VP9/WebM decode unproven; the fix would be an H.264 derivative.
- Generated excerpts are `proposed` candidates; ids are provisional.

## HUMAN GATES

- Production authentication/provider validation and AI activation.
- Production PostgreSQL migration/mutation, backup/restore, rollback.
- Credentials/secrets, Cloudflare/DNS, billing, paid providers, deployment.
- Mobile signing, real-device matrix, store publication.
- Learner-skill/public release and catalog publication approval.

## NEXT EXACT TASK

Finish L2.5. Orchestration is done and measured; only the real cold acceptance
remains, blocked on Supadata plan quota (429 `limit-exceeded`). When quota
resets, re-run a cold import of `iSTlFeW-Z9M` and confirm
`provider_starting → queued → processing → completed` with a real transcript,
then web/native visual QA. Then Batch L3: run the importer over the full EN/ZH
pack, curate the proposed excerpts, commit the snapshot and flip
`SNAPSHOT_REQUIRED` True in the same commit.

## L3 PREVIEW PATH (decided)

L3 content is QA'd on a separate local development runtime, never on the
production domain: `orena.chillpickle.org` is `APP_ENV=production`, so the
overlay is refused and unreviewed content stays invisible to public users. An
admin-gated preview inside production was rejected — it would mean production
serving unreviewed content.

Run the app image from this worktree with `APP_ENV=development`,
`ENABLE_DEV_LISTENING_CATALOG=1`, SQLite, writable DB paths under `/tmp`,
published on `127.0.0.1` only and off the tunnel. Promotion to the production
catalog stays a human gate.

## OPEN HUMAN QA

`orena.chillpickle.org`: sign in, open Listening, exercise
`en-science-cosmic-calendar` and `zh-technology-search-wikipedia` for poster,
playback, transcript sync, Dictation, Shadowing and progress/resume.
