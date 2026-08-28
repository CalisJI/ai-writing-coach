# Decision Log

This is an append-only log of accepted durable product and architecture
decisions. Do not silently rewrite past decisions. If a decision changes,
append a new entry and mark the earlier entry superseded.

## D-001 — PostgreSQL authority

**Status:** Accepted

**Decision:** PostgreSQL is authoritative after operational cutover. SQLite is
frozen rollback/archive only.

**Reason:** The reviewed cutover, PostgreSQL-backed staging verification, and
runtime smoke established PostgreSQL as the deployed system of record.

**Consequences:** Current operations and architecture must not describe SQLite
as authoritative. SQLite artifacts remain preserved for rollback/archive and
historical tooling.

**Supersedes / Superseded by:** Supersedes the pre-cutover SQLite-authoritative
state. Not superseded.

## D-002 — No hidden persistence synchronization

**Status:** Accepted

**Decision:** No dual-write, reverse sync, silent SQLite fallback, startup
auto-import, or startup auto-Alembic.

**Reason:** Hidden synchronization and mutation paths increase corruption,
rollback ambiguity, and production risk.

**Consequences:** Runtime fails closed, migrations are explicit, and rollback
boundaries remain operator-controlled.

**Supersedes / Superseded by:** None.

## D-003 — Shared features are multilingual

**Status:** Accepted

**Decision:** All shared learner features are multilingual by default; current
required languages are EN and ZH.

**Reason:** BECOMING is one product, not independent English and Chinese forks.

**Consequences:** Shared contracts are language-neutral. Adapters exist only
for real linguistic differences, and language-scoped data remains isolated.

**Supersedes / Superseded by:** None.

## D-004 — First public product composition

**Status:** Accepted

**Decision:** The first public learning product is Writing plus Speaking, both
complete for EN and ZH.

**Reason:** The release must deliver a coherent productive-language loop rather
than prematurely publishing a partial skill set.

**Consequences:** Writing COMPLETE, Speaking COMPLETE, EN PASS, and ZH PASS are
all mandatory before public promotion.

**Supersedes / Superseded by:** None.

## D-005 — Reading and Listening release separately

**Status:** Accepted

**Decision:** Reading releases separately after the first public product;
Listening releases later still.

**Reason:** Their completion and acceptance gates are distinct from the first
Writing + Speaking product.

**Consequences:** Existing internal Reading work does not imply a public claim.
Listening remains hidden future work.

**Supersedes / Superseded by:** None.

## D-006 — AI Control Plane scope

**Status:** Accepted

**Decision:** The AI Capability Control Plane manages AI workloads only.

**Reason:** Provider configuration, capability routing, and AI diagnostics form
a bounded infrastructure concern.

**Consequences:** It does not become a registry for identity, Social, or
deterministic product domains unrelated to AI infrastructure.

**Supersedes / Superseded by:** None.

## D-007 — Social is not an AI domain

**Status:** Accepted

**Decision:** Social is not an AI capability or AI-owned domain. Its future
concept includes Rooms, Friends, Messaging, Presence, Reactions, Blocking, and
Moderation.

**Reason:** Social interaction must remain available when AI is unavailable.
AI may assist Social but cannot own its continuity.

**Consequences:** Future Social contracts and storage stay outside the AI
Control Plane. Documentation does not imply Social is currently implemented.

**Supersedes / Superseded by:** None.

## D-008 — Modular monolith

**Status:** Accepted

**Decision:** The architecture remains a modular monolith for now, not
microservices.

**Reason:** Current scale and team coordination benefit from explicit module and
repository boundaries without distributed-system overhead.

**Consequences:** Domain boundaries are conceptual and enforce ownership inside
one deployable application.

**Supersedes / Superseded by:** None.

## D-009 — Initial realtime Social architecture

**Status:** Accepted

**Decision:** When Social is implemented, initial realtime architecture should
prefer FastAPI WebSocket plus PostgreSQL. Redis is deferred until scale requires
it.

**Reason:** This preserves operational simplicity while leaving a clear scaling
path.

**Consequences:** Do not introduce Redis preemptively or treat this decision as
authorization to implement Social now.

**Supersedes / Superseded by:** None.

## D-010 — No silent paid-provider failover

**Status:** Accepted

**Decision:** No provider-to-provider silent paid failover.

**Reason:** Cost, privacy, behavior, and operator intent must remain explicit.

**Consequences:** Provider failures are visible and typed; changing providers is
an explicit configuration or future reviewed policy decision.

**Supersedes / Superseded by:** None.

## D-011 — Static and live AI validation are separate

**Status:** Accepted

**Decision:** Static AI configuration validation is separate from live
provider/model validation.

**Reason:** Valid configuration must be persistable while a provider is offline,
while live tests need precise credentials, catalog, transport, and response
diagnostics.

**Consequences:** Configuration mutation performs no provider network call;
explicit live-test APIs own runtime validation.

**Supersedes / Superseded by:** None.

## D-012 — Atomic learner runtime activation

**Status:** Accepted

**Decision:** Learner capability routing activation must be atomic; mixed
partial activation is prohibited.

**Reason:** Partial workload migration would create inconsistent behavior and an
unclear rollback boundary.

**Consequences:** Until the reviewed activation gate passes,
`generate_structured()` remains wholly on legacy `active_selection()`.

**Supersedes / Superseded by:** None.

## D-013 — Human coordination and repository context

**Status:** Accepted

**Decision:** The human remains the coordinator between agents; verified Git
state and repository governance documents are persistent project context.

**Reason:** Chat histories are incomplete and transient across implementation,
review, and domain agents.

**Consequences:** Agents follow the canonical read order, update handoffs and
state responsibly, and stop on material contradictions or human gates.

**Supersedes / Superseded by:** None.

## D-014 — Shared Media Learning content

**Status:** Accepted

**Decision:** An imported media source is processed once into one reusable,
provider-neutral Media Learning Object. Its source-language transcript,
timestamped segments, and support-language translations are shared learning
content consumed by both Listening and Speaking Shadowing and reusable by
Vocabulary / Library and Grammar.

**Reason:** Independent media representations for Listening and Shadowing would
duplicate acquisition and processing, allow transcript identity to drift, and
disconnect vocabulary and grammar evidence from the source learners actually
used.

**Consequences:** Learner progress is not part of shared media content. Listening
progress, Shadowing attempts, saved vocabulary, learned segments, and exercise
outcomes remain scoped by user and learning language. M1 may deliver a
non-public Listening MVP before R11; R11 remains the Listening completion and
public-release-readiness gate. R9 remains advanced Shadowing completion rather
than the first authorization for media learning. This decision does not make
Listening or Speaking public and does not close R2.

**Supersedes / Superseded by:** None.

## D-015 — Closed-stage preservation and contract-first integration

**Status:** Accepted

**Decision:** A reviewed CLOSED stage becomes a protected product baseline.
Later stages consume its stable contracts, IDs, and data instead of
opportunistically rewriting the subsystem. Reopening requires a concrete
learner-facing regression, an explicitly approved extension, or a new accepted
architecture decision.

**Reason:** Rebuilding already-passing systems wastes implementation capacity,
creates regressions, and causes agents to lose the product-level roadmap while
chasing local improvements.

**Consequences:** R5 Grammar and M1 Media Learning are the first explicit
protected examples. Writing, Speaking, Reading, and Listening integrations must
reference their stable contracts instead of creating duplicate curricula,
renderers, transcript models, or migration paths. P2 polish remains deferable.

**Supersedes / Superseded by:** None.

## D-016 — Multilingual Writing quality is not a later retrofit

**Status:** Accepted

**Decision:** EN/ZH Writing evaluation quality is part of R3 Writing Evaluation
Completion itself. The former standalone roadmap stage “R4 — Multilingual
Writing Language Lens” is absorbed into R3. R4 is redefined as “Writing
Learning Loop + Grammar Transfer.”

**Reason:** D-003 already establishes multilingual shared behavior as a product
invariant. A later language-lens stage encourages an English-first flow and
creates avoidable divergence.

**Consequences:** R3 must pass representative EN and ZH evaluation and learner
feedback evidence. R4 focuses on turning those findings into targeted practice,
revision, progress, and stable R5 Grammar concept transfer rather than building
a second language-specific evaluator.

**Supersedes / Superseded by:** Supersedes the old R4 roadmap meaning only. It
does not supersede D-003.

## D-017 — Interactive transcript timing is additive to Media Learning

**Status:** Accepted

**Decision:** Real word timing for interactive transcript playback is an
additive interaction layer over the CLOSED M1 Media Learning contract. Native
provider captions remain canonical source text when available. The existing
Groq Whisper ASR boundary may resolve real segment/word timestamps from a
short-lived provider media-file URL and may supply a missing source transcript
when no canonical transcript exists. Supadata remains a transcript fallback;
it does not become a second Media Learning model.

**Reason:** Listening and Shadowing need truthful active-word synchronization,
while M1 intentionally owns stable reusable media assets and segment identity.
Fabricating equal-duration word timestamps or creating parallel Listening and
Speaking transcript pipelines would violate those contracts.

**Consequences:** Word timing is optional API interaction metadata and may
degrade to segment-only synchronization. Provider media is not persisted merely
to obtain timing. EN/ZH use the same flow. Existing source captions are not
overwritten by ASR text solely to gain timing. Provider failures remain typed
and must not cause a hidden cross-provider billing policy. Any future durable
processing-job persistence or schema change requires its normal human gate.

**Supersedes / Superseded by:** Extends D-014 and D-015; supersedes neither.

## D-018 — YouTube timing uses bounded ephemeral provider-native download

**Status:** Accepted

**Decision:** When Groq cannot retrieve a resolved YouTube media URL, Orena may
use yt-dlp itself to acquire the selected audio format into bounded ephemeral
temporary storage and upload those bytes through the existing Groq ASR boundary.
The temporary artifact is not product storage and is deleted automatically.

**Reason:** Live validation on 2026-08-19 showed Groq returning HTTP 400 because
its media fetcher received a 302 redirect. A generic `requests` fallback also
failed, while yt-dlp's own downloader successfully retrieved YouTube format 140.
The provider-native downloader is therefore the transport path actually verified.

**Consequences:** No durable media cache, database schema, or Alembic migration is
introduced. The Groq byte limit is enforced around acquisition, yt-dlp filesystem
cache is disabled for this operation, native captions remain canonical when
available, and no hidden cross-provider failover is added.

**Supersedes / Superseded by:** Extends D-017; supersedes neither D-014 nor D-017.

## D-019 — YouTube word timing degrades truthfully when audio transport is unavailable

**Status:** Accepted

**Decision:** The default YouTube Interactive Transcript path does not claim
word-level timing unless Orena has a verified raw-audio transport that can
deliver real media bytes to ASR. With canonical YouTube captions available,
the learner receives real segment-level synchronization. Without a canonical
transcript, the existing explicitly configured transcript fallback policy may
run. Orena does not fabricate equal-duration word timing.

**Reason:** Live validation on 2026-08-19 showed that Groq could not retrieve
the resolved media URL, generic direct download was not reliable, and a full
yt-dlp audio download returned HTTP 403 even with a supported JavaScript
runtime. A short `--test` download was therefore insufficient evidence for
full-media transport.

**Consequences:** The failed experimental direct-download transport is removed
from the default path. Native caption text and segment timing remain canonical.
Real word timing can return later only through a separately reviewed and
verified media transport capability. This does not authorize hidden provider
failover, account-cookie use, fabricated timing, or a schema change.

**Supersedes / Superseded by:** Supersedes D-018. Extends D-017 without
superseding D-014 or D-017.

## D-020 — Playback clock ownership and learner-facing transcript units

**Status:** Accepted

**Decision:** Media playback owns the provider clock. Interactive Transcript
consumes an internal media-time event and never instantiates or polls a provider
player itself. Canonical M1 transcript snippets remain unchanged; Listening may
derive deterministic learner-facing display units that map one or more
canonical segment IDs into one presentation row. Automatic linguistic AI
annotation is opt-in rather than viewport-triggered.

**Reason:** Browser acceptance showed split player ownership, overlapping
provider caption intervals, learner-visible over-segmentation, and unnecessary
automatic annotation calls. The upstream YouTube transcript contract describes
snippet duration as on-screen duration rather than speech duration and permits
overlaps, so raw snippet intervals are not a valid non-overlapping playback
timeline.

**Consequences:** Active caption lookup uses ordered caption starts with the
next start as the overlap boundary. Display grouping is deterministic and does
not rewrite stable canonical IDs. Dictionary/playback remain usable without AI.
POS/Pinyin annotation begins only after learner opt-in. Real word highlight is
shown only when true word timestamps exist.

**Supersedes / Superseded by:** Extends D-017 and D-019; supersedes neither.

## D-021 — Media Meaning uses isolated local machine translation

**Status:** Superseded by D-026

**Decision:** Normal Media Meaning translation uses a provider-neutral boundary
whose default provider is an isolated local Marian service. Canonical transcript
and playback readiness do not depend on translation readiness.

**Reason:** Per-request generic AI translation adds avoidable latency and cost,
and translation failure must not make otherwise usable media lessons unavailable.

**Consequences:** The application image contains no translation models. Models
are provisioned into a separate cache, loaded lazily by language pair, and used
in bounded batches. Completed translations are cached by engine version,
language pair, and canonical transcript hash. Generic AI remains available only
for explicit intelligence features, not normal Meaning generation.

**Supersedes / Superseded by:** Narrows D-014 for Media Meaning; extends D-020;
superseded by D-026 for the default provider selection.

## D-022 — Orena UI migration uses one bounded shared namespace

**Status:** Superseded by D-024

**Decision:** Frontend `2.17.4` uses `static/becoming/orena/**` as a bounded,
shared migration layer for the Orena shell and rebuilt Home, Writing, and Review
surfaces. The `--o-*` tokens and `.o-*` primitives are shared contracts loaded
after the legacy stylesheet stack. Screens not yet rebuilt are adopted through
the shared compatibility layer rather than receiving copied page-local design
systems.

**Reason:** The reference-led interface requires a coherent responsive shell,
depth, spacing, and interaction vocabulary while the protected Journey,
Library, Grammar, Media Learning, and other stable screens remain operational.
A namespaced migration boundary lets the product advance without a single
high-risk rewrite or uncontrolled cascade conflicts.

**Consequences:** New Orena work reuses the shared namespace, preserves EN/ZH,
light/dark, accessibility, and existing learner-flow contracts, and must not
duplicate tokens into screen-specific CSS. Legacy compatibility is transitional
and may be removed only through a separately reviewed migration. This decision
does not change backend, persistence, learner-skill release state, or production
deployment.

**Supersedes / Superseded by:** Extended the frontend invariant and OREN-16
shared-primitives checkpoint; superseded by D-024 for completed screen scope.

## D-023 — Hanzi stroke order is vendored data, never generated

**Status:** Accepted

**Decision:** Chinese stroke order is served from a glyph dataset vendored into
the repository (Make Me a Hanzi, redistributed as `hanzi-writer-data`, Arphic
Public License) through a deterministic Chinese language adapter,
`writing_coach/languages/chinese/stroke_order.py`, and the route
`GET /api/chinese/stroke-order`. No AI capability produces stroke data, and no
runtime CDN is consulted. A character the pack does not carry is reported as
unavailable; the learner then gets a shape-copying grid that makes no claim
about stroke order.

**Reason:** `UPGRADE_REGRESSION_RULES.md` §33 already forbade claiming verified
stroke order without verified stroke data, which left the Chinese dictionary
with a grid that could only show a finished character. Stroke order is exact,
per-character geometry: a language model cannot produce it truthfully, so the
only honest way to offer the feature is to ship real glyph data. Bundling it
rather than fetching per character from a CDN keeps the feature working offline
and in networks where public CDNs are unreachable — which includes the learner
population this feature is for.

**Consequences:** The repository carries ~14 MB of vendored stroke data
(9,565 characters) plus `ARPHICPL.TXT`, retained unaltered as the licence
requires, and a `README.md` carrying the §2a modification notice for the
container-format change. `scripts/build_hanzi_stroke_pack.py` rebuilds the pack
from the upstream package and `--check` verifies the committed one against its
recorded digest. The renderer, `hanzi-writer` (MIT), is vendored under
`static/becoming/vendor/` and imported lazily, so an English learner never
downloads it. The stroke-order route needs no AI capability and cannot degrade
with a provider. The numbered step diagram is built from the payload rather than
by the renderer, so it survives a failed vendor import.

**Supersedes / Superseded by:** Satisfies the condition `UPGRADE_REGRESSION_RULES.md`
§33 left open. Supersedes no earlier decision.

## D-024 — Orena completes the bounded learner-screen migration

**Status:** Accepted

**Decision:** Frontend `2.17.5` completes the bounded Orena presentation
migration across Home, Writing, Review, Reading, Listening, Speaking, Grammar,
Library, Journey, Profile, onboarding, and sign-in. Dedicated screen layers may
compose the shared `static/becoming/orena/**` tokens and primitives. They do not
own or replace domain models, stable identifiers, persistence boundaries,
learner evidence, release state, or shared EN/ZH behavior.

**Reason:** The explicitly requested resynchronization with `claude/work`
provided a coherent second migration slice for the remaining learner screens,
Grammar pedagogy presentation, Profile settings, and shared supporting
contracts. Keeping these screens indefinitely behind a compatibility-only
layer would leave two visual ownership models. Selective integration plus full
regression, release-gate, and responsive runtime verification establishes one
reviewable frontend boundary without reopening closed product systems.

**Consequences:** New visual work continues through shared Orena tokens and
primitives, with screen-local CSS limited to genuine screen composition.
Journey, Review, Library / Active Recall, Grammar, Media Learning, shared
layout, and overflow contracts remain protected and require focused validation
when touched. R5 Static Grammar KB, stable Grammar Concept IDs, schema-v2
models, completion semantics, PostgreSQL authority, application/frontend
versions, deployment, and learner-skill release state are unchanged.

**Supersedes / Superseded by:** Supersedes D-022 only for migration completion
and screen ownership. Retains D-022's bounded namespace and shared-contract
requirements.

## D-025 — Segmentation and part-of-speech tagging are deterministic

**Status:** Accepted

**Decision:** `writing_linguistic` is a deterministic capability, not a
provider-backed one. Word segmentation and part-of-speech tagging for EN and ZH
are performed locally by `writing_coach/linguistic_annotation.py` (NLTK for
English, jieba for Chinese, pypinyin for contextual readings), shared by the
Writing/Review parts-of-speech lens and the Listening interactive transcript.

**Reason:** The repository carried two implementations of one job. The
transcript already tagged locally and for free; `becoming_linguistics` asked a
model for the same result at 2 800 output tokens an essay. The local tagger's
label set is a superset of the eleven labels the prompt requested — it also
separates `proper_noun`, `classifier`, `auxiliary` and `interjection`, which the
prompt collapsed into `other`. Measured against the AI annotations cached in
eleven real learner essays: 92% of local annotations land on the identical span,
and 82% of those agree on the label; of the disagreements, 67 are the local
tagger being more specific. Neither tagger was ever validated against a gold
standard, so this is a change of engine, not a documented loss of accuracy — and
it makes Writing and Listening agree with each other, which they did not before.

**Consequences:** `writing_linguistic` leaves the configurable provider catalog,
so capability migration seeds seven explicit rows instead of eight and
activation readiness reports seven capabilities. No production rows exist to
orphan: the runtime carries no capability-config table and R2 activation remains
an unexecuted human gate. `configure_becoming_linguistics` no longer takes a
generator. The annotation cache, the literal-span validation, and the public
payload shape are unchanged, so no frontend contract moves.

**Supersedes / Superseded by:** Extends the deterministic-capability precedent
set by `reading_evaluator`. Supersedes no earlier decision.

## D-026 — Groq is the default translation provider; local Marian is the backup

**Status:** Accepted

**Decision:** Shared-media translation defaults to Groq through
`GroqTranslationProvider`, which implements the same `TranslationProvider`
boundary the local service does. Groq is also registered as a provider in the AI
capability catalog, so provider-backed capabilities can be routed to it. The
local Marian service is retained as the backup for a deployment with no external
dependency. The engine is chosen once at startup by
`MEDIA_TRANSLATION_PROVIDER`, defaulting to `groq` when `GROQ_API_KEY` is set
and `local` otherwise.

**Reason:** D-021 established a provider-neutral translation boundary whose
default was the local Marian service, and that service has never worked: it is
missing `protobuf`, and three of its four models were never provisioned.
Measured against this account's key, Groq translates a three-segment batch in
1.43 s with natural Vietnamese, where the local `qwen3:8b` needed 37 s for a
single dictionary entry. Production has no GPU, which rules out a local model as
the default.

**Consequences:** Translation becomes a third-party runtime dependency bounded
by a free-tier quota that is **per API key, so per product rather than per
learner** — the response headers report 1 000 requests and 8 000 tokens a
minute, and the provider records them in `last_quota` so an admin surface can
report the budget before it is exhausted. Surfacing that is not yet built.
Two behaviours were established by measurement and are encoded with their
reasons: `response_format: json_object` is required, because without it a
reasoning model spends its whole budget thinking and returns an empty string
rather than an error; and `reasoning_effort` is deliberately not sent, because
it is unnecessary in JSON mode and other Groq models reject it with HTTP 400.
A failure raises and stops — selecting the other provider is an operator action,
never an automatic switch, per the AI Platform invariant against
provider-to-provider fallback.

**Supersedes / Superseded by:** Extends D-021 by changing its default provider.
D-021's provider-neutral boundary and its rule that playback readiness does not
depend on translation readiness both stand.

## D-027 — Speaking attempts persist evaluator evidence without audio

**Status:** Accepted

**Decision:** Completed EN/ZH Speaking evaluations may be stored as bounded,
learner-scoped attempt records containing the transcript, source segment
reference, measured dimensions, provenance, evidence, and a server timestamp.
Raw audio and proficiency claims are excluded. PostgreSQL is the sole durable
runtime boundary; SQLite remains frozen rollback/archive and does not create or
write Speaking-attempt tables. An explicit migration is required before any
deployment cutover.

**Reason:** R7's learner-visible history/progress acceptance requires completed
take evidence to survive the transient recording screen while preserving the
privacy boundary established by R6. A dedicated repository/API/UI contract
keeps ownership and language scoping explicit without activating public
Speaking capabilities.

**Consequences:** The Speaking attempts API is authenticated and bounded,
updates a take by deterministic `take_id`, and returns unavailable dimensions
as `null`. The mounted EN/ZH screen can show history/progress from that
contract. Migration SQL is prepared but production execution, raw-audio
retention, provider activation, and public release remain human-gated.

**Supersedes / Superseded by:** Extends the R6 transient-audio boundary and
R7 per-take evaluator decision. Supersedes no earlier decision.

## D-028 — R8 release readiness is a deterministic pre-public matrix

**Status:** Accepted

**Decision:** R8 local acceptance is represented by one deterministic EN/ZH
matrix that exercises the existing Writing/Review and Speaking record,
evaluation, pronunciation, and history flows, then records deferred provider,
PostgreSQL migration, capability-activation, and public-promotion gates without
changing learner release state.

**Reason:** Writing (R3/R4) and Speaking (R6/R7) are locally closed, but their
public gate requires joined multilingual evidence and truthful separation of
offline verification from human-controlled operations. A successor matrix
validator keeps that evidence reproducible and prevents a local pass from being
reported as a public release.

**Consequences:** `scripts/r8_release_matrix.mjs` runs the representative browser
contracts, records source-only boundary checks explicitly as static inspections,
and emits deterministic verified/inspected/deferred results. The canonical
report is byte-for-byte checked when the runner is invoked without `--output`.
Credentialed provider smoke, production migration, R2 activation, and promotion
remain explicit human actions.

**Supersedes / Superseded by:** Extends the R3/R4 and R6/R7 local acceptance
decisions. Supersedes no earlier decision.
