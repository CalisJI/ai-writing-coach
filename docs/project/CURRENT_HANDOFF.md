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

## DEPLOYED FOR QA — read this before touching the runtime

- `orena.chillpickle.org` runs commit `cbdedfd` (in `main` via PR #54), so its
  application code matches `main`. L1/L2 are NOT deployed.
- That runtime is `APP_ENV=production` with `PERSISTENCE_BACKEND=postgresql`
  (verified on the container). The development overlay is therefore refused
  there by design, and L3 content will stay invisible on the domain even after a
  deploy. That guard must not be weakened.
- There is no CD. A GitHub push deploys nothing; the domain changes only when
  someone rebuilds on the host:
  `docker compose --profile public up -d --build writing-coach`.
- The three worktrees share one Docker runtime; the public stack is the
  `-claudecode` project `ai-writing-coach`. Check no other lane is mid-batch.
- A human-approved production PostgreSQL migration ran 2026-09-02 to
  `20260828_0004`. That approval covered that one run; the gate stays
  `approval_required`, and the startup readiness guard must not be weakened.

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

- Support language separated from learning language and UI locale, one rule in
  `core/support_languages.py`, persistent in the profile, twelve languages, nine
  Vietnamese defaults removed. One recovery policy shared by My Media and the
  importer; `transcript_origin` on every media response. Both DONE.
- Caption-less video is NOT rejected: a real YouTube URL returns embed playback
  and title with `transcript_origin: none` plus a Supadata job.
- Curated meaning resolves editorial → cached → live → truthful unavailable,
  persisted in the non-critical cache DB keyed by asset+segment+text
  fingerprint+language+provider. ZH Pinyin derived where the manifest has none.
- **Provider credentials are the current blocker, not code.** Groq returns
  **403 Forbidden** (key present, rejected) and the local Marian service ships
  only `en-vi` (es/ja → 422, zh → 500). So live meaning in ja/es cannot be
  demonstrated in this environment; the logic is proven by unit tests instead.
- Production is `MEDIA_TRANSCRIPT_FALLBACK=none` with `SUPADATA_CONFIGURED=true`
  — configured but off. Enabling it there is a paid-provider gate, NOT done.

## PENDING

- Finish L2.5, then L3 content, L4 Dictation, L5 handoffs, L6 native, L7 QA.
- Human playback acceptance of the two real lessons on the domain.

## BLOCKED

- No code blocker. Enabling Supadata in production is a paid-provider human
  gate and has NOT been done; it is on for the local preview only.

## OPEN P0

- None known.

## OPEN P1

- Live meaning for non-preauthored languages is implemented but unproven end to
  end: no working translation provider in this environment.
- Caption-less recovery is proven to START (playback created, Supadata job); a
  successful generated transcript and async resume are NOT demonstrated.
- Real catalog breadth: one EN and one ZH real lesson; spec 3.23 waits on L3.
- L1 is responsive web only; native needs the L6 port.
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

Finish L2.5 before L3. The remaining work is blocked on credentials, not code:
renew or replace the Groq key (currently 403), or add local Marian models beyond
`en-vi`, then re-run the ja/es meaning check and the Supadata no-caption smoke
test on the preview runtime. Also still open: real Supadata async resume and
web/native visual QA. Then Batch L3: run the importer over the
full EN/ZH pack
(`build_listening_dev_catalog.py --report <path>`), read the per-candidate
entries, **curate** the proposed excerpts, and commit the snapshot. Excerpts
arrive `proposed`; promotion to `reviewed` is a human act. L3 also owns what the
generator cannot do — translation/meaning, Pinyin, level review, natural excerpt
review; playback plus captions is not content-complete. Commit the snapshot and
flip `listening_dev_artifact.SNAPSHOT_REQUIRED` True in the SAME commit: the
invariant forbids any other pairing.

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
