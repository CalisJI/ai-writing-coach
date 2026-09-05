# ORENA_UI_EXPLORATION_V1 — review checkpoint

Status: REVIEWABLE, not APPROVED. Branch: `codex/work`.
Commit: the commit titled `feat: add Orena field journal UI exploration`.
Starting HEAD: `ad52307ec7972ebc0d30bafc51870fa7dad6907a`.

Open **http://localhost:8010/#/explore**. The internal navigation also contains
**Orena · Explore / 探索**. Fresh review databases use normal onboarding.

## Experience

The direction is an editorial field journal: paper, forest ink, literary type,
an illustrated window into a story, and quieter, differently composed encounters.
The collection **The life between places / 在此处与彼处之间** leads into a reading
room, contextual expression notes, reflection, and the learner's own response.
Pasted personal text enters that same room and the same vocabulary/Writing paths.

The Constitution supplies the experiential purpose; the Content Architecture
supplies source identity, the relationship between discovery and import, and the
distinction between content kept and language learned. Existing domains supply
the Library and Writing behavior. None of these sources imply a shipped curated
catalog, mastery, or personalization.

Review the atmosphere, the invitation to enter, EN/ZH pacing, the transition from
story to response, and whether this direction should inform future surfaces.

## Real and provisional

- Real: three complete generated fictional encounters per learning language;
  prepared contextual notes, Chinese Pinyin, actual import, safe literal text
  rendering, saved-content toggling, and responses restored within the tab.
- Real integration: existing Library API writes source-grounded expressions to
  PostgreSQL; the Writing handoff retains the response, title, origin, and bounded
  source text. An existing draft requires explicit replacement. Normal onboarding
  remains intact. My language/Journey lead to existing Orena surfaces.
- Provisional: static seed collection, editorial difficulty/time suggestions,
  tab-local imports/saves/responses/last-opened identity. No durable content
  collection, backend Reading session, comprehension score, mastery, recommendation
  engine, or automated contextual explanation for imported text is claimed.
- Origins: stories and train art are generated for this preview; personal text
  is learner-imported. Saving changes the relationship, not the origin. The
  production curated/external catalog remains a future content requirement.
- No runtime AI provider is configured in this review environment. Provider-backed
  evaluation quality and public release are not verified by this checkpoint.

## Changes

| Files | Purpose |
| --- | --- |
| `static/becoming/screens/explore.js` | Collection, reading room, import, saved content, notes, response and handoffs |
| `static/becoming/domain/explore-{content,copy,session}.js` | Generated EN/ZH content, EN/ZH/VI UI copy, user/language-scoped tab continuity |
| `static/becoming/orena/explore.css` | Bounded composition using existing Orena semantic tokens and geometry |
| `static/becoming/orena/assets/last-train.png`, `LAST_TRAIN_PROVENANCE.md` | Original generated illustration and prompt |
| `static/becoming/app.js`, `router.js`, `domain/screen-contract.js`, `domain/skill-release.js`, `templates/becoming/index.html` | Internal route, navigation, style loading, superseded-render guard, keyboard skip behavior |
| `static/becoming/screens/write.js` | Cancel a late initial dashboard response after leaving Writing |
| `scripts/test_orena_explore.mjs`, `scripts/test_write_navigation_lifecycle.mjs` | Content truth, continuity/isolation, bounds/failure behavior, release gate, late-response regression |
| `ORENA_STATUS.md`, `PROJECT_STATE.md`, `CURRENT_HANDOFF.md`, this report | Current product and verified local checkpoint |

Protected areas: shared route lifecycle and Writing initialization changed only
for the verified navigation race; shared skip-link behavior now preserves route.
Existing theme and layout tokens are consumed with preview-scoped overrides.
No Grammar IDs, media identities, evaluator, persistence, schema, or ownership
contract changed. No Decision Log entry is required for an unapproved visual
exploration or a root-cause regression correction.

## Local validation actually executed

PASS:

- `node scripts/test_orena_explore.mjs`
- `node scripts/test_write_navigation_lifecycle.mjs`
- `node scripts/test_writing_evaluation_flow.mjs`
- `node scripts/test_r10_reading_flow.mjs`
- `node scripts/test_orena_profile_ui.mjs`
- `node scripts/test_r12_next_practice_plan.mjs`
- All nine existing CI Node media contracts: interactive transcript, Listening
  player lifecycle, smart follow, Listening UI, transcript display units,
  transcript playback, Active Listening, Shadowing, media learning quality.
- `node --experimental-vm-modules scripts/validate_browser_esm_graph.mjs`:
  56 linked modules; initial baseline was 52.
- `python scripts/validate_architecture.py`, in the isolated application container.
- `python -m pytest -q -p no:cacheprovider tests/test_canonical_becoming_routes.py
  tests/test_becoming_practice.py tests/test_learning_repository_boundary.py
  tests/test_public_skill_release_architecture.py`: **16 passed, 2 deprecation
  warnings**. Dependency-heavy tests used the application container and temporary
  test storage, with PostgreSQL environment inheritance cleared for archive tests.
- Browser: EN/ZH discovery and reading; source-grounded vocabulary writes from
  generated and imported text; response restoration; EN/ZH Writing handoff;
  independent interface/learning language; language-scoped collections;
  literal markup in pasted content; dialog Tab/Shift-Tab/Escape/focus restoration;
  light/dark and 320, 390, 767, 1440 CSS-pixel responsive views without horizontal
  overflow. Browser zoom meant requested viewport units differed from measured
  CSS pixels; measurements used the actual document width. No console errors.
- `git diff --check`.

FAILED, PRE-EXISTING: `python scripts/becoming_release_gate.py` reports exactly
the same six findings against this work and an archive of starting commit
`ad52307`: Writing persisted-practice-context source check; Home
`listening_habit_unavailable`; Home `next_plan_baseline_title`; Journey
`revisionList`; Journey revision integration; Node absent in the Python image.
The affected Home/Journey code and validator are unchanged. Host Node ESM and
focused behavioral contracts pass independently. No release-gate PASS is claimed.

An initial Python test attempt lacked pytest; the repository-pinned test
dependency was installed in the disposable container, and the actual tests then
passed. Initial ESM invocations with guessed script filenames were corrected to
the repository's actual `validate_browser_esm_graph.mjs`; these were invocation
errors, not application failures.

SKIPPED: full Python regression, live provider evaluation, production smoke,
public promotion, native mobile, and automated accessibility/contrast audit.
Reduced-motion behavior is CSS-defined and statically inspected, not an OS-level
browser-emulation claim. CI was not run. No unresolved new P0/P1 remains.

## Runtime and checkpoint impact

The localhost-only container `orena-codex-ui-web` mounts this branch read-only and
uses a separate temporary PostgreSQL container and Docker network. The verified
empty-database bootstrap is reused. No production data, volumes, archive, port
8000, Cloudflare, OAuth, secrets, or paid-provider configuration was changed.
No deployment or public release. The temporary review account contains actual
QA-created preferences, expressions, and clearly named test text; no learner
history was synthesized. Tab-local content can be reviewed in a fresh tab.

Application `1.4.0`, frontend `2.17.5`, and the inherited fully verified baseline
SHA remain unchanged. Product status, verified local state, and handoff are
updated. Constitution, Content Architecture, invariants, Roadmap, and Decision
Log remain unchanged. One coherent commit is the checkpoint; no merge to main.
