# Mobile Visual Parity Audit

Status: **P0 CLOSED / FOUNDATION P1s CLOSED / PER-SCREEN P1 IN PROGRESS**

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
| Home | `screens/home.js`, `orena/home.css` | hero + 3 panels + split | ~ | ✓ | ✓ | ~ | ✓ | ✓ | ✓ | ✓ | ✓ | P2 |
| Writing | `screens/write.js`, `orena/writing.css` | prompt card + editor card + aside | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | P3 |
| Review | `screens/review.js` | `PromptCard` + `IssueRow` findings + aside actions | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | P3 |
| Grammar | `screens/grammar.js`, `orena/grammar.css` | curriculum overview + lesson detail | ✓ | ✓ | ✓ | ~ | ✓ | ✓ | ✓ | ✓ | ✓ | P2 |
| Reading | `screens/reading.js`, `orena/reading.css` | passage + questions | ~ | ✗ | ~ | ✗ | ✗ | ✓ | ✓ | ✓ | ✓ | P1 |
| Listening | `screens/listening.js`, `orena/listening.css` | import + transcript | ~ | ✗ | ~ | ✗ | ✗ | ✓ | ✓ | ✓ | ✓ | P1 |
| Speaking | `screens/speaking.js`, `orena/speaking.css` | record + evidence | ~ | ✗ | ~ | ✗ | ✗ | ✓ | ✓ | ✓ | ✓ | P1 |
| Library | `screens/library.js`, `orena/library.css` | word list + recall | ~ | ✗ | ~ | ✗ | ✗ | ✓ | ✓ | ✓ | ✓ | P1 |
| Journey | `screens/journey.js`, `orena/journey.css` | metric row + cards | ~ | ✗ | ~ | ✗ | ✗ | ✓ | ✓ | ✓ | ✓ | P1 |
| Profile | `screens/profile.js`, `orena/profile.css` | radio groups | ~ | ✗ | ~ | ✗ | ✗ | ✓ | ✓ | ✓ | ✓ | P1 |
| Entitlement | in `profile.js` | bordered list | ~ | ✗ | ~ | ✗ | ~ | ✓ | ✓ | ✓ | ✓ | P2 |
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
6. **P1 per-screen** — compose each screen from its web counterpart, in the
   roadmap order Home → ~~Writing~~ → ~~Review~~ → ~~Grammar~~ → Reading →
   Listening → Speaking → Library → Journey → Profile. Home, Writing, Review
   and Grammar are done; the remaining six screens are the open work.

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
