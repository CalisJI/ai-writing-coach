# BECOMING Upgrade Regression Rules

These are mandatory for every upgrade after v2.3.1.

## 1. No blind continuation after a failed stage
An installer must stop at the first failed contract and print the exact failing object: route, asset, file, schema, or command.

## 2. Known incidents are release blockers
Run:

```powershell
python .\scripts\becoming_release_gate.py --project . --expected <frontend-version>
```

before declaring an upgrade ready.

## 3. Route ownership must be explicit
For Phase 4 memory:
- service logic: `writing_coach/becoming_memory.py`
- FastAPI route decorators: `app.py`
- no hidden `APIRouter` installation in the service module.

Required app contracts:
- `GET /api/learner-profile`
- `PUT /api/learner-profile`
- `GET /api/learning-memory`

## 4. Local source is authoritative
Do not rebuild the image for source-only changes.

Source-only change:
```powershell
docker compose up -d --force-recreate --no-build writing-coach
```

Image rebuild only for dependency/runtime-image changes such as `requirements.txt`, Dockerfile, system packages, or Python base image.

## 5. Never disturb persistent data during upgrade/debug
Must preserve:
```yaml
- writing_data:/data
```

Do not use:
```powershell
docker compose down -v
```

as an upgrade or troubleshooting step.

## 6. BECOMING assets use only the dedicated route
Allowed:
```text
/becoming-assets/*
```

Forbidden for BECOMING:
```text
/static/becoming/*
```

## 7. PowerShell URLs must delimit variables before query strings
Allowed:
```powershell
".../${asset}?v=2.3.1"
```

Forbidden:
```powershell
".../$asset?v=2.3.1"
```

## 8. Protected pages are not validated with unauthenticated browserless HTTP
Validate protected route registration from FastAPI runtime. Use HTTP smoke tests for public static assets.

## 9. Additive data migrations only unless a separately reviewed migration explicitly requires transformation
Every schema change must:
- keep previous user data;
- have safe defaults;
- be restart-idempotent;
- include a runtime self-test.

## 10. Every release must pass
- Python compile
- JavaScript syntax
- release gate
- Docker Compose config
- backend health/schema contract
- FastAPI runtime route contract
- feature self-test
- changed asset HTTP checks
- legacy root regression
- `git diff --check`

Do not begin the next feature phase until the current stabilization gate passes.


## 11. Personalized Practice route contract
Phase 5 requires explicit FastAPI routes:
```text
GET  /api/practice-recommendation
POST /api/practice/next
```

`writing_coach/becoming_practice.py` is a pure/service module only.

The runtime contract test must assert both route + HTTP method pairs in `app.routes`.

## 12. Recommendation ownership
The server is the single source of truth for:
- current focus selection;
- repair / reinforce / transfer intent;
- recommended practice mode;
- topic;
- target length;
- learner-facing rationale.

The frontend may render the recommendation and start the task, but must not contain a second independent recommendation algorithm.


## 13. Practice Outcome route contract
Phase 6 requires:
```text
GET /api/practice-outcome/{essay_id}
GET /api/practice-outcomes
```

The runtime gate must assert both routes in `app.routes`.

## 14. Outcome ownership
`writing_coach/becoming_outcomes.py` is the single source of truth for practice-effect interpretation.

The frontend may render:
- improved
- held
- transferred
- still_working
- needs_attention
- not_observed
- needs_more_evidence

but must not derive these states from scores itself.

## 15. Practice context persistence
`EssayIn` carries a bounded `PracticeContextIn`.
The context is stored in the already-existing `module_data_json`; Phase 6 must not add a new schema migration.

History/detail reads must expose `practice_context` so revisions can continue the same learning target.

## 16. Conservative learning claims
A missing error in one submission is only `not_observed` unless positive evidence supports a stronger result.

Do not equate:
- no detected error
- one improved revision
- internal practice outcome

with CEFR/TOEIC/IELTS/HSK mastery.


## 17. Generated-source EOF hygiene
Any updater that rewrites `app.py` must finish with exactly one newline and no trailing blank line.

Required pre-runtime contract:
```text
app.py ends with "\n"
app.py does not end with "\n\n"
```

Do not wait until the last `git diff --check` stage to discover this class of source-generation defect.


## 18. Library compatibility contract
Phase 7 adds a companion `vocabulary_learning` table but keeps `saved_words` as the shared content store.

Do not replace or rename the legacy dictionary/vocabulary APIs in a BECOMING update.

Existing saved words must be seeded into the companion table with `INSERT OR IGNORE`; migration must be idempotent.

## 19. Vocabulary review ownership
The server owns:
- due state;
- review stage;
- successful recall count;
- lapse count;
- next review time.

The frontend may only submit:
```text
again
got_it
```

It must not calculate the next interval independently.

## 20. Review-to-Library evidence
Writing Review may save:
- a short better phrase from feedback;
- a short positive phrase from exact strength evidence.

The saved item must retain the source fragment/essay when available.

Do not automatically save every detected error or every AI suggestion; capture remains learner-controlled.

## 21. Vocabulary learning claims
Vocabulary stages describe practical recall availability:

```text
New
Learning
Reinforcing
Available
```

They are not CEFR, HSK, TOEIC, IELTS, fluency, or mastery equivalences.


## 22. Reading Studio route contract
Phase 8 requires:
```text
GET  /api/reading/sessions
GET  /api/reading/session/{session_id}
POST /api/reading/session
POST /api/reading/session/{session_id}/answer
```

The runtime gate must assert all route + method pairs.

## 23. Reading generation ownership
`writing_coach/becoming_reading.py` is a pure/service module.

It receives the shared structured AI generator from `app.py`.

Forbidden inside the Reading service:
- provider-specific HTTP;
- Ollama URLs;
- hidden paid-provider failover logic;
- route registration.

## 24. Quiz integrity
Before submission, Reading APIs must not expose:
- `correct_index`;
- `explanation_vi`;
- answer evidence that trivially reveals the correct option.

Answer checking is server-side and deterministic from the stored question payload.

## 25. Reading evidence
Every checked question returns a verbatim evidence fragment from the passage.

The UI may highlight or scroll to that evidence after submission.

Do not generate explanations that cannot be grounded in the saved passage.

## 26. Library recycling integrity
Reading may request up to a small number of saved Library terms.

The final `recycled_words` field contains only terms that literally occur in the final passage.

Do not claim that a vocabulary item was recycled merely because it was included in the generation prompt.

## 27. Reading learning claims
`correct_count / total` is a passage-specific comprehension check only.

Do not convert one reading attempt into:
- CEFR mastery;
- HSK mastery;
- TOEIC/IELTS score;
- a global learner level.

Generated exam-style material must not be labeled official exam content.


## 28. Learning-language state isolation
Writing drafts and derived Review state must be scoped to the active learning language.

Required:
```text
becoming.draft.v2.en
becoming.draft.v2.zh
```

The implementation may derive those keys from one prefix, but it must not return to a single global writable draft key.

On learning-language switch:
- load the target-language draft;
- clear `lastEvaluation` and other language-derived state;
- if currently on Review, return to Writing rather than rendering old-language evidence.

## 29. Main-content focus contract
`#mainContent` may receive programmatic focus after route changes for accessibility.

The full-page container must not render the global interactive focus ring.

Do not remove visible focus indicators from real interactive controls.

## 30. Native/support language
`native_language` is additive learner-profile metadata.

Allowed values:
```text
vi
en
zh
```

Migration from older profiles:
- preserve goal/style/Pinyin/created_at;
- add the column idempotently;
- default existing users to `vi`.

Basic help/tooltips may use this support language while the learning language remains independently English or Chinese.

## 31. Feedback explanation anatomy
High-value Writing feedback must keep the established anatomy:
```text
Pattern
→ learner sentence/evidence
→ Before / Better change
→ Why
→ reusable rule/action
```

Exact backend fragments remain the evidence anchor. UI range expansion may only expand to complete lexical boundaries or sentence context; it must not invent a different error location.

## 32. Shared tooltip and dictionary presentation
Tooltips use one shared primitive.

Dictionary/Pinyin presentation uses one shared component reused by Writing, Review, and Library.

Do not create independent dictionary UI/logic per screen.

## 33. Chinese learning assistance
Pinyin follows the existing profile preference:
```text
auto
on
off
```

Hanzi writing grids may support character-shape tracing.

Never claim verified stroke order unless verified stroke data exists.

## 34. Writing progress presentation
Writing progress uses real essay/revision/memory evidence inside Journey.

Prefer:
- current focus;
- revision evidence;
- repeated strengths;
- small benchmark context.

Do not add a business analytics KPI wall or new dashboard navigation solely for visual completeness.

## 35. Strong Version presentation
Strong Version is part of the learner's work/review flow and should use calm Review-theme comparison surfaces.

3D remains reserved for identity moments such as onboarding, empty states, milestones, language selection, or feature introduction.

## 36. Interface locale is separate from learning language
The learner account has one interface locale and separate English/Chinese learning spaces.

Interface locale owns:
- navigation;
- page titles and editorial slogans;
- buttons and function labels;
- tooltips;
- loading/status/error labels;
- general feature guidance.

Learning language owns:
- learner work;
- exercise/passage content;
- language-specific level systems;
- language-specific feedback mechanics and evidence.

Do not use the learning-language switch as a UI translation switch.

## 37. Every product route requires a BECOMING screen contract
For every route in `router.js`, `domain/screen-contract.js` must define:
```text
learnerGoal
dominantIdea
primaryAction
progressiveDisclosure
evidence
```
A new screen is not release-ready merely because it renders.

## 38. Async interaction feedback
Any user-triggered action that can await network/AI/dictionary/server work must communicate immediately.

Prefer shared primitives:
```text
spinner
setBusy
runBusy
showLoadingDialog
```
Do not create per-screen loading button implementations unless the interaction genuinely needs different semantics.

## 39. Chinese Review Pinyin
When learning language is Chinese:
- `auto` and `on` show Pinyin support inside Review;
- `off` hides it;
- visible evidence shows a processing indicator while phonetic data is loading;
- Pinyin comes from the existing verified/current dictionary response;
- absence of phonetic data is shown honestly.

Do not fabricate transliteration to make the UI look complete.

## 40. Theme personalization
Curated palette presets are a presentation preference, not separate products.

Theme presets:
```text
editorial
sage
clay
blueprint
```

They may override shared theme token values only. They must not fork layout, typography hierarchy, navigation, scoring, learning logic, or domain components.

Light/Dark remains a separate appearance dimension.

## 41. Growth Rank integrity
Growth Rank may use a proud original crest/frame in Profile because it is an identity/achievement moment.

Its tier progression must come from real Writing evidence such as:
- repeated positive evidence;
- stable/mastered strengths;
- revision wins;
- writing series with meaningful evidence.

Forbidden rank inputs/claims:
- login streaks;
- time spent;
- click/activity counts;
- purchased status;
- leaderboard position;
- CEFR/HSK/TOEIC/IELTS equivalence.

Do not copy a MOBA/game logo, tier name, badge silhouette, icon set or copyrighted rank art. Use original BECOMING geometry and current design tokens.

## 42. Locale-safe backend helper fields
Fields whose schema name explicitly encodes Vietnamese, such as `translation_vi` or `explanation_vi`, may be displayed directly only in Vietnamese interface mode unless an equivalent localized field exists.

For other interface locales, prefer:
- neutral definition data;
- exact learner evidence;
- localized generic explanation tied to that evidence.

Do not silently show Vietnamese inside English/Chinese UI.


## 36. Browser ESM graph is a release blocker

All BECOMING frontend releases must validate the actual module graph from:

```text
static/becoming/app.js
```

using browser-module semantics.

Required validator:

```text
scripts/validate_browser_esm_graph.mjs
```

The gate must catch:
- template-literal/module parse errors;
- missing relative modules;
- invalid named imports/exports.

`node --check file.js` is not sufficient by itself.

## 37. Shell-visible / app-blank failure signature

If the page shows:
- static header/navigation;
- initial `Loading…` learning-language option;
- blank `mainContent`;

treat it first as a frontend module/bootstrap failure, not a backend rendering or CSS problem.

Check the browser ESM graph before rebuilding Docker or changing backend routes.


## 38. Protected learner-route smoke tests

`/becoming` is authenticated.

Do not use an unauthenticated `Invoke-WebRequest /becoming` response body to prove the private BECOMING template version. PowerShell may follow the auth redirect and return login HTML.

For protected learner routes, deployment validation should separate:

```text
public assets
→ HTTP status/content

private template source
→ host/container source-of-truth + hash

route availability
→ runtime FastAPI route registration

authenticated rendering
→ browser/integration session
```

An auth redirect must not be misclassified as a template deployment failure.


## 39. Visual reference alignment contract
The visual reference is a calibration target, not a literal UI specification.

BECOMING must preserve:

```text
Learner is the protagonist.
Work is the evidence.
AI is the guide.
Bold in meaning. Calm in presentation. Human in guidance.
```

Visual execution must additionally preserve:

```text
strong tonal contrast
one clear focal point
matte tactile surfaces
reusable depth hierarchy
clean negative space
scarce accent
editorial composition
```

Do not copy reference branding, poster structure, device mockups, exact orange usage, or marketing layout.

## 40. Shared depth/material system
Depth is owned by `static/becoming/visual-alignment.css` through reusable levels:

```text
DEPTH-0 canvas
DEPTH-1 section
DEPTH-2 raised surface
DEPTH-3 hero object
DEPTH-4 floating micro-control
```

Major depth must combine tonal separation, edge definition, a consistent upper-left/top highlight, ambient separation, and contact shadow.

Do not create unique per-page shadow recipes when an existing depth level applies.

## 41. Light-first identity
Light/soft-light is the default BECOMING identity for Home, Journey, Review summary, Profile, Library, Onboarding, milestone and identity moments.

Dark remains a first-class explicit user display preference and may suit focused Writing/Reading.

Do not let the operating-system dark preference silently redefine the default brand identity when the user has not selected an appearance.

## 42. One hero presence per major screen
Every current/future learner screen must declare `visualHero`, `surfaceHierarchy`, `themeBias`, and `accentPolicy` in `SCREEN_CONTRACT`.

Supporting surfaces must visibly recede from the hero.

A new router route without the visual contract is a release failure.

## 43. Journey composition
Journey is reflection/transformation, not analytics.

Required order:

```text
editorial statement
→ what is changing
→ one primary tactile progress object
→ evidence from real work
→ deeper history
```

Do not restore a dominant row of four equal metric cards.

## 44. Review composition
Review must keep:

```text
learner work = evidence
current bottleneck = visual priority
strength / benchmark / supporting metrics = receded
more detail = progressive disclosure
```

The screen should communicate “this system understands my writing,” not “this app generated an analytics report.”

## 45. Visual completion QA
Major UI work requires at least one render → inspect → refine → render loop.

Score 0–2 for:

```text
Contrast
Focal point
Depth
Material
Editorial hierarchy
Negative space
Accent discipline
Surface hierarchy
Craft
BECOMING coherence
```

Do not report visually complete below 14/20. Target 17–20 for strong reference alignment. Functional QA remains mandatory and separate.

## 46. Canonical shell / IA contract
The approved canonical visual references are the minimum visual-quality target, but they do not authorize a product-architecture rewrite.

The learner IA remains:

```text
Home
Write
Read
Library
Journey
Profile
```

Desktop may use a composed left navigation rail when it improves hierarchy. Smaller viewports may transform that rail into horizontal/top continuation. Do not add or remove routes merely to resemble a reference image.

## 47. Canonical reference data is not production data
Never copy illustrative reference content into the real product as if it were user state.

Forbidden unless backed by current product data:

```text
fake streaks
fake XP
fake milestones
fake reading progress
fake scores
fake activity counts
fake achievements
```

Reference objects define material, hierarchy, composition, contrast and craftsmanship—not business truth.

## 48. Learner work owns Home hero presence
For Home, the dominant tactile object must be learner work or a faithful empty-state equivalent.

Required composition:

```text
dominant editorial insight
→ learner-work folio / work object
→ evidence-based journey cycle
→ quiet supporting signal rail
→ recent work
```

Do not replace the learner-work hero with AI branding, analytics, a generic KPI grid, or decorative illustration unrelated to the learner's actual work.

## 49. Localization must preserve navigation objects
When a global navigation link contains an icon plus localized label, localization updates only the label descendant.

Required pattern:

```text
<a data-route="...">
  <svg ...></svg>
  <span data-i18n-label>...</span>
</a>
```

Do not assign `textContent` to the whole anchor and destroy its icon/interaction structure.

## 50. v2.9 canonical Home visual completion
Canonical Home must preserve both Light and Dark parity:

```text
Light
→ warm off-white canvas
→ near-black editorial type
→ tactile paper/work object
→ sparse orange signal

Dark
→ deep ink canvas
→ visibly separated dark physical surfaces
→ rim/ambient/contact depth
→ near-white editorial type
→ the same sparse orange signal
```

Mobile is a continuation, not a squeezed desktop. The secondary folio page may recede/hide so learner work remains primary.


## 39. PowerShell `python -c` quoting

In PowerShell, backslash does not escape a double quote.

Forbidden pattern inside executable `.ps1`:

```text
python -c "... \"quoted value\" ..."
```

Prefer Python payloads that need only single-quoted string literals, for example:

```text
python -c "t=...; ok=('app-sidebar' in t)"
```

Every release package must run:

```text
scripts/validate_powershell_python_c_quoting.py
```

against its own package root before installer completion.


## 40. Journey helper preservation

If Journey renders `${revisionList(groups)}`, the screen must declare the stable `revisionList(groups=[])` helper.

A visual refactor is not allowed to delete a functional helper simply because the rendered markup is being recomposed.

## 41. Tooltip portal

Shared explanatory tooltips must escape local clipping contexts.

Required architecture:

```text
helpTip()
→ data-tooltip trigger
→ one global fixed-position tooltip layer
→ viewport-clamped positioning
```

Do not fix tooltip clipping by globally changing unrelated containers to `overflow:visible`.

## 42. Writing Dashboard evidence rule

The Home dashboard reuses:

```text
/api/dashboard
/api/essays
/api/learning-memory
/api/practice-outcomes
```

It must remain one composed evidence surface, not a generic KPI-card wall.

The current focus is primary. Scores/metrics are supporting context.

## 43. Parts-of-speech lens

Parts-of-speech highlighting is a Review learning aid.

Required behavior:

```text
essay
→ explicit linguistic annotation API
→ service uses shared generate_structured abstraction
→ validated literal fragments
→ exact offsets owned by the server
→ cached in existing module_data_json
→ thin POS underline in learner work
```

The lens must not change evaluation/scoring.

Errors remain visually stronger than POS underlines.

## 44. Error color semantics

Only actual learner error evidence uses the `Important` semantic color.

Do not use red for:
- benchmark scores;
- navigation;
- generic warnings without error meaning;
- strengths;
- decoration.

Strength evidence keeps the Positive semantic treatment.

## 45. High-fidelity visual execution is a release contract

When approved BECOMING reference images exist, UI work runs in:

```text
HIGH-FIDELITY IMPLEMENTATION MODE
```

Every current/future learner screen must keep:

```text
fidelityMode: 'high'
```

Release blockers include:
- missing high-fidelity execution document;
- missing screen-specific visual contract;
- hero surfaces with no layered thickness/contact depth;
- mixed navigation icon optical weights;
- flat light mode that depends on borders;
- gray-on-gray dark mode;
- major screens without one dominant visual experience;
- UI approval without a render/refinement pass.

The shared material system must preserve:
- upper-left / upper-front virtual light;
- rim definition;
- lower-edge perceived thickness;
- tight contact shadow;
- ambient separation;
- restrained orange accent.

## 46. Avoid visual-patch accumulation

High-fidelity corrections should extend/refactor the shared:

```text
static/becoming/visual-alignment.css
```

system first.

Do not create a separate page-specific design language for each feature.

When a screen needs unique composition, its unique rules must still consume the shared:
- depth family;
- radius family;
- control interaction;
- icon stroke family;
- semantic color system.

## 47. Comparison-dialog scroll ownership is a regression contract

Do not allow a long comparison/Strong Version dialog to depend on page scrolling.

Required ownership:

overlay -> bounded dialog shell -> fixed/non-scrolling header -> min-height:0 internal body -> overflow-y:auto scroll owner -> non-scrolling comparison cards

A visual migration must not reintroduce clipping by setting overflow on the shell without an internal scroll region.

## 48. Trusted surface migration must remain shared

Remaining route-level legacy surfaces must map to the shared trusted primitives:

frame / raised / hero / row / control / choice

Do not recreate one shadow/radius family per screen.

## 49. Lively details must remain selective and non-semantic

Micro-details may add:
- decorative tactile emblem;
- semantic-positive status object;
- accent category chip;
- physical treatment for real metric cards;
- progress endpoint decoration derived from an existing real fill.

They must not:
- create fake streaks, scores, achievements or learning states;
- infer styling from translated visible copy;
- spread orange across neutral/supporting UI;
- take scroll ownership away from the v2.13 comparison dialog body.

## 50. Comparison dialog polish cannot override scroll ownership

Future visual polish may decorate:
- dialog header;
- comparison cards;
- close control;
- semantic state badge.

It must not redefine:
- `.bc13-dialog-scroll`;
- internal overflow-y ownership;
- shell max-height/min-height chain.

## 51. Page gutter is owned by one shared layout primitive

Required hierarchy:

```text
app shell
→ main workspace
→ page container
→ section
→ card / surface
```

The page container owns:
- horizontal gutter;
- max width;
- centering;
- major-section horizontal containment.

Cards/surfaces must not create page gutters.

## 52. Responsive page alignment is a release contract

At 1440 / 1280 / 1024 / 768 / 390 widths:
- gutter must remain present;
- direct major sections must remain inside the page container;
- no major section may use 100vw by default;
- two-column layouts must keep shared outer gutter and shared column gap;
- mobile must not lose horizontal padding.

## 53. Outer-gutter geometry must be measured on the actual route root

A page gutter passes only when the actual visible route/page root has at least
the shared gutter between its OUTER edge and the workspace edge.

Moving only inner text/content is not a pass.

## 54. Synthetic UI fixtures are not live-layout proof

Synthetic fixtures may test implementation mechanics, but a layout release may
not be visually accepted solely from fixture screenshots.

For final acceptance, use the real `/becoming` page and either:
- actual browser screenshot evidence, or
- actual-DOM geometry from `window.BECOMING_LAYOUT_PROOF.audit()`,
preferably both.

