# Mobile Visual Parity Audit

Status: **P0 CLOSED / FOUNDATION P1s CLOSED / PER-SCREEN P1 CLOSED — all ten
roadmap screens ported; Home, Review and Writing were subsequently rebuilt
against the live running web app (not just its static source) per an
explicit correction that native must never diverge from what the web
actually renders. Eight of ten screens now carry a documented P2 residual
(see remediation order §6)**

The responsive web application is the canonical visual source. This audit
compares the native client against it and classifies every divergence. It is a
parity record, not a redesign proposal: nothing here proposes changing the web.

## Source of truth

`static/becoming/orena/tokens.css` is the authoritative visual layer. Its own
header states why:

> Every colour and dimension here was measured off `docs/visual-references/Orena-prod/*.png`
> rather than eyeballed … The whole layer lives under the `--o-` prefix and the
> `.o-` class namespace. That is deliberate: twenty-two older stylesheets are
> still loaded for the screens that have not been rebuilt yet.

`static/becoming/theme.css` is one of those older stylesheets.

## Finding 0 — the native tokens were taken from the legacy layer

**Severity: P1. Affects every screen.**

The native token port read `theme.css`, not `orena/tokens.css`, so the whole app
is built on superseded values.

| Token | Native now (from `theme.css`) | Orena (`orena/tokens.css`) |
| --- | --- | --- |
| canvas | `#F7F7F5` | `#F2EFEA` |
| surface sunken | — | `#F8F5F1` |
| border | `#E4E5E2` | `#EFECE7` |
| border strong | `#D2D4D0` | `#DFDAD4` |
| ink | `#303236` | `#16161A` |
| ink muted | `#72757B` | `#6B6B76` |
| ink faint | — | `#9A9AA4` |
| accent | `#FF6A1A` | `#FD5703` |
| accent hover | `#FF7A2F` | `#E84A00` |
| positive | `#2F8F5B` | `#1B7F3B` |
| attention | `#D89B22` | `#B4770F` |
| critical | `#D75B45` | `#C43D2E` |
| card radius | `18` | `20` |
| field radius | `10` | `15` |
| chip radius | — | `10` |
| dark canvas | `#111310` | `#08090B` |
| dark surface | `#181B17` | `#15181C` |
| dark raised | — | `#1A1E23` |
| dark ink | `#D8D9D3` | `#F4F4F6` |

The four learner palettes ported from `theme.css` remain correct for
`theme_preset`; the base layer beneath them is what was wrong.

## Finding 1 — no navigation shell exists

**Severity: P0. The product cannot be navigated.**

The web shell is a sticky topbar (`--o-header-h` 80px, bottom border, canvas
background, title at `--o-text-title` 600 weight) beside a 244px sidebar rail
that becomes a `min(84vw,300px)` drawer with a scrim below 1023px. Nav items are
44px tall, 13px gap, `--o-radius-field`, `--o-text-body` at 500 weight, each with
a 21px icon.

The native client renders **no chrome at all**: no topbar, no drawer, no rail.
Every screen is a bare scroll view. A learner on device can only reach Writing,
Review, Grammar, Reading, Listening, Speaking, Library, Journey or Profile if a
screen happens to link there; there is no global navigation. This is both a
visual-identity regression and a functional dead end.

## Finding 2 — no icons

**Severity: P1.**

The web ships a designed icon set (`static/becoming/orena/icons.js`) used in nav
items, buttons and panel headers. The native client imports no icon library and
draws none. Nothing may be substituted with emoji.

## Finding 3 — no elevation, rim or sheen

**Severity: P1.**

Orena floats white cards on a warm canvas with real depth:
`--o-shadow-card: 0 1px 2px rgba(28,25,23,.04), 0 7px 18px -2px rgba(28,25,23,.07)`,
plus `--o-rim` (inset top highlight) and `--o-sheen` (a 140px top gradient). Dark
mode uses far heavier shadows.

The native cards have a 1px border and nothing else, so surfaces read as flat
outlines rather than raised cards — the exact effect the token file's comments
say the design rejected.

## Finding 4 — the type scale is the legacy one

**Severity: P1.**

Orena's scale is meta 12, label 13, ui 14, body 15, heading 17, title 20. The
native screens use 14/16/18/22/26/28/38, which is `base.css`. Only the new Home
primitives use the Orena scale.

## Screen matrix

Colour/Type/Space/Component/Layout are scored against the web implementation.
`—` means the screen has no meaningful implementation to compare.

| Screen | Web reference | Native state | Colour | Type | Space | Component | Layout | Light | Dark | EN | ZH | Severity |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Shell / nav | `orena/shell.css`, `shell.js` | rail + topbar + drawer, gated | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | P3 |
| Auth / sign-in | `screens/onboarding.js` | plain centred stack | ~ | ✗ | ~ | ✗ | ~ | ✓ | ✓ | ✓ | ✓ | P1 |
| Onboarding | `screens/onboarding.js` | `OnboardingForm` radio list | ~ | ✗ | ~ | ✗ | ✗ | ✓ | ✓ | ✓ | ✓ | P1 |
| Home | `screens/home.js`, `orena/home.css` | hero (`homeInsight` statement, not the raw focus label) + listening-habit/resume + next-practice + library-review-due + writing dashboard + journey stages/rail + cross-skill cue + recent drafts + library preview | ✓ | ✓ | ✓ | ~ | ✓ | ✓ | ✓ | ✓ | ✓ | P2 |
| Writing | `screens/write.js`, `orena/writing.css` | prompt card + editor card + aside, plus a mode/level/topic/length setup panel for a self-directed session | ✓ | ✓ | ✓ | ~ | ✓ | ✓ | ✓ | ✓ | ✓ | P2 |
| Review | `screens/review.js` | `PromptCard` + confidence-banded `IssueRow` findings + revision-delta + practice-outcome/review-cue signal cards + aside actions | ✓ | ✓ | ✓ | ~ | ✓ | ✓ | ✓ | ✓ | ✓ | P2 |
| Grammar | `screens/grammar.js`, `orena/grammar.css` | curriculum overview + lesson detail | ✓ | ✓ | ✓ | ~ | ✓ | ✓ | ✓ | ✓ | ✓ | P2 |
| Reading | `screens/reading.js`, `orena/reading.css` | create form + recent-passages history + article header + passage + rail | ✓ | ✓ | ✓ | ~ | ✓ | ✓ | ✓ | ✓ | ✓ | P2 |
| Listening | `screens/listening.js`, `orena/listening.css` | import + Follow/Active + resume, panel-restyled | ✓ | ✓ | ✓ | ~ | ~ | ✓ | ✓ | ✓ | ✓ | P2 |
| Speaking | `screens/speaking.js`, `orena/speaking.css` | record + evidence, panel-restyled | ✓ | ✓ | ✓ | ~ | ~ | ✓ | ✓ | ✓ | ✓ | P2 |
| Library | `screens/library.js`, `orena/library.css` | word list + reveal/recall | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | P3 |
| Journey | `screens/journey.js`, `orena/journey.css` | metric row + current-focus trend + reliable strengths + recent improvement + outcomes panels | ✓ | ✓ | ✓ | ~ | ~ | ✓ | ✓ | ✓ | ✓ | P2 |
| Profile | `screens/profile.js`, `orena/profile.css` | one settings Panel with grouped radio pills | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | P3 |
| Entitlement | in `profile.js` | Panel + Chip per feature | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | P3 |
| Degraded states | `components/primitives.js` | truthful, escapable | ~ | ✗ | ~ | ✗ | ✓ | ✓ | ✓ | ✓ | ✓ | P2 |

Light/dark, EN and ZH pass everywhere because those were verified on device in
earlier work; they are marked ✓ only for *behaviour*, and inherit the wrong base
palette from Finding 0.

## Remediation order

Tokens first, as the token layer is what every screen reads.

1. ~~**P1 Finding 0** — re-port the token layer from `orena/tokens.css`.~~ Done.
2. ~~**P1 Finding 3** — add elevation to the surface primitives.~~ Done. The web
   rim and sheen are CSS gradients with no single-view React Native equivalent,
   so the shadow carries the lift alone; that remains a P3 difference.
3. ~~**P0 Finding 1** — build the shell: topbar and drawer navigation.~~ Done,
   including the skill gating the web applies from `/api/platform/skills`.
4. ~~**P1 Finding 2** — port the Orena icon set.~~ Done: thirteen nav and UI
   icons as `react-native-svg` geometry copied verbatim from `icons.js`, at the
   web's 1.7 stroke on the 24 grid. No emoji stand in for a designed icon.
5. ~~**P1 Finding 4** — move screens onto the Orena type scale.~~ Done.
6. ~~**P1 per-screen**~~ — compose each screen from its web counterpart, in the
   roadmap order Home → ~~Writing~~ → ~~Review~~ → ~~Grammar~~ → ~~Reading~~ →
   ~~Listening~~ → ~~Speaking~~ → ~~Library~~ → ~~Journey~~ → ~~Profile~~.
   Done — all ten screens in the roadmap are ported. Profile's settings
   groups (goal/style/native language/pinyin/theme/learning language) kept
   their exact radio semantics and `accessibilityLabel` format (asserted by
   r20-6.test.tsx) while moving onto one settings Panel with Label-headed
   pill groups, matching the web's single `.o-card.o-set` composition; the
   entitlements section became a Panel with a Chip per feature's
   available/exhausted/unavailable state. No residual: both sections' web
   composition is exactly what the mobile API already supports.

   Screens carrying a residual (documented at each screen's commit and
   summarized here): Home (P2, elevation-only sheen/rim gap, plus the
   cross-skill-cue signal and the Speaking branch of the next-practice plan
   -- see below), Writing (P2, no rich-text toolbar/word-role legend/
   guidance-scaffold disclosure/error watchlist/audience field), Review (P2,
   no POS-lens/pinyin overlay/compare-to-a-stronger-version dialog/
   downloadable feedback file), Grammar (P2, rich `learning_model`
   block-composition not reproduced), Reading (P2, no OS text-selection
   surface, no scroll-progress/font controls, no passage history endpoint),
   Listening and Speaking (P2 each, the web's full studio -- video/audio
   player, transport, waveform -- has no native surface beyond bare
   expo-audio playback), Journey (P2, pattern gauges/outcome history/
   timeline/target rail not reproduced). Library and Profile carry no
   residual.

   Home, Review and Writing were subsequently rebuilt a second time in this
   pass, against the live running web app rather than static source alone,
   after it was found the first port (built from a compacted conversation
   summary rather than a fresh source read) was substantially incomplete --
   Home in particular was rendering `recommendation.focus_label` (a raw
   category name) as its hero headline instead of the fixed sentence the
   web's `homeInsight()` computes. Home's residual narrowed further in this
   session's follow-up work: the `crossSkillCueMarkup` signal (GET
   /api/cross-skill-cue, writing_coach/cross_skill_transfer.py's
   select_cross_skill_cue()) is now wired in as a Cross-skill cue card,
   handling all four of the backend's action kinds -- review opens the
   linked essay through the same getEssay() path as Home's other Open
   buttons, reading resumes the linked session through
   readingResumeHandoff.ts, and listening/speaking route to their screens
   generically (no deep segment-jump handoff exists yet for either). It
   intentionally skips the web's shared-media-session freshness check for
   listening/speaking sources, since native has no equivalent in-memory
   "currently loaded lesson" cache to check against, and trusts the
   backend's own recency validation instead. Device-verified on
   emulator-5556: the card rendered real evidence and Open Review landed on
   that exact essay. Home's residual now narrows to the elevation-only
   sheen/rim gap plus the Speaking branch of the next-practice plan, which
   needs speaking-attempt history this pass did not build.

   A functional defect from that first pass was also found
   and fixed in this session's follow-up work: every "Open" affordance on
   Home (Current piece, the review-cue card, each recent-drafts row) called
   an `onOpenReview(essayId)` prop whose top-level wiring silently discarded
   the `essayId` argument and routed to Journey regardless of which essay
   was tapped. It now fetches the essay via a new `getEssay()` client method
   (GET /api/essays/{id}, the same route journey.js's own per-essay actions
   use) and opens the real Writing Review for that exact essay --
   device-verified on emulator-5556 tapping Current piece's Open button and
   landing on that essay's real findings, grammar links and review-cue
   cards, not a generic Journey redirect. The Next-practice plan's reading
   branch had the identical defect (`onReadResume(sessionId)` also
   discarded its argument and opened the bare Reading setup form); it now
   sets a new resumeId handoff (readingResumeHandoff.ts, mirroring
   writingHandoff.ts's pattern) that Reading consumes on mount and opens via
   the same `getReadingSession()` already built for Reading's own recent-
   passages panel above.

   Writing gained a mode/level/topic/length setup panel
   (backed by the same `POST /api/tasks/generate` the web calls) so a
   learner can start a self-directed session, closing a real functional gap
   -- previously native could only reach the editor via a handoff -- while
   the rich-text editor toolbar, word-role legend, guidance-scaffold
   disclosure, error watchlist and audience field remain unreproduced (RN's
   TextInput has no inline rich-text surface without a heavy third-party
   editor). Review gained the revision-evidence delta (before/after score
   and issue-count deltas) and the practice-outcome/review-cue signal cards,
   all backed by real endpoints (`/api/practice-outcome/{id}`,
   `/api/review-cue`) the mobile client did not call before; its POS-toggle
   linguistic-annotation lens, pinyin overlay, compare-to-a-stronger-version
   dialog and downloadable feedback file remain unreproduced, each its own
   subsystem rather than a styling gap.

   Library carries no residual: unlike Listening/Speaking/Grammar/Reading,
   the web's own composition (a word list with a per-word reveal gate and an
   Again/Got it recall action) is exactly what the mobile API already
   supports, so this port is full parity rather than a restyle-with-gaps.

   Journey's residual: the web is a growth-pattern dashboard (per-pattern
   progress gauges, a grammar/practice outcome history, a timeline, a target
   rail with its own dialog) built on `api.learningMemory()` -- "every card
   here is one record from" it, per journey.js's own comment. That endpoint
   was already wired into the mobile client for Home's insight computation
   (useLearningMemory in query/useHome.ts), so this pass draws three real
   cards from it that the first port left as a placeholder `error_memory[0]`
   line: current focus (category, status, and a before/now occurrence trend
   from the pattern's real `older`/`newer` counts, with a proportional bar
   standing in for the web's SVG gauge), reliable strengths (Stable/Mastered
   stage patterns), and recent improvement (the top revision win's score and
   issue-count deltas across its draft count). The existing Practice
   outcomes panel's status chip now also runs through the shared
   `status.*` translation table rather than showing the raw enum. Not
   reproduced: the SVG progress gauges, the multi-point journey timeline
   (started/first-win/momentum/upcoming), and the target rail with its own
   dialog. Recorded as a P2 residual, not claimed as done.

   Speaking's residual matches Listening's: the web is a studio (waveform
   recorder, pronunciation heatmap on the transcript) that native's
   record/transcribe/evaluate flow via `expo-audio` has no visual surface
   for. The functional flow (record, transcribe, evaluate, save an attempt,
   the Listening handoff) was already correct and untouched; only the bare
   bordered Views became Panels and the bold-Text headings became Labels.
   `test/routes/speaking.test.tsx` passes unchanged. Recorded as a P2
   residual, not claimed as done.

   Listening's residual gap is the largest of any screen so far: the web is a
   full studio (an embedded video/audio player with transport controls, a
   waveform-backed transcript, a Shadowing-mode layout variant, a vocabulary
   rail) that the native client has no player surface for beyond `expo-audio`
   bare playback -- `screens/listening.js` alone is over 2000 lines, several
   times any other screen's web source. What native functionally has (import
   a source, Follow/Active practice on a segment list, resume across an app
   restart, hand a segment to Shadowing) was restyled onto the Orena panel/
   label/chip primitives without changing any of its logic (all 8 of
   `test/routes/listening.test.tsx`'s behavioural tests -- resume, pending-
   import rehydration, Shadowing handoff, interrupted playback -- still pass
   unchanged). The studio layout itself (video frame, transport bar, vocab
   rail) is not reproduced and is recorded here as a P2 residual, not claimed
   as done.

   Reading's residual gap: the web triggers its contextual lookup from a mouse
   text selection (`window.getSelection()`), which has no stable cross-platform
   equivalent for a React Native `Text` view. Native keeps the manual-entry
   lookup (type the word or phrase) as the platform adaptation for that one
   mechanic. Also not reproduced: the live scroll-progress rail, font-size and
   line-spacing controls, focus mode, and clipboard copy. The recent-passages
   history list is now reproduced -- `GET /api/reading/sessions` (already
   exposed via `listReadingSessions`, built for Home's next-practice signal)
   and `GET /api/reading/session/{id}` (already exposed via
   `getReadingSession`) back a "Recent passages" panel below the create form,
   device-verified opening a scored history item on emulator-5556. Tracked as
   a P2 residual, not claimed as done.

   Grammar's residual gap: a rich `learning_model` lesson is rendered on the
   web by a second, large system (`components/grammar-learning.js` composing
   pattern/timeline/scene/contrast blocks per `ORENA_GRAMMAR_LESSON_DESIGN_SYSTEM`).
   The mobile contract carries that field only as an untyped `z.record(unknown())`,
   and reproducing its block composition is out of scope for this pass. Native
   renders such a lesson's localizable summary, contrasts, examples, mistakes
   and guided practice (all of which the API exposes with a stable shape) with
   the Orena panel primitives, and completion is unblocked rather than gated on
   a production task that a rich lesson does not have. A legacy (non-rich)
   lesson's rules/exceptions/production sections are reproduced in full,
   including the two-example production gate on completion. This is tracked as
   a P2 residual, not claimed as done.

No web file is changed by any of this.
