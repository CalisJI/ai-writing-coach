# BECOMING — UI/UX Implementation Contract

For every current or future BECOMING UI/UX task, read and obey in this order:

1. `BECOMING_UIUX_SKILL.md`
2. `BECOMING_DESIGN_TOKENS.json`
3. `BECOMING_VISUAL_REFERENCE_ALIGNMENT_ADDENDUM.md`
4. `BECOMING_VISUAL_CONTRACT.txt`
5. `visual-references/BECOMING_LIGHT_REFERENCE.png`
6. `visual-references/BECOMING_DARK_REFERENCE.png`
7. application calibration renders when they exist

The Light and Dark canonical boards define the minimum expected visual quality. They are calibration targets, not literal page specifications. The product philosophy still decides what the learner needs; tokens constrain implementation; the visual references decide the required level of contrast, depth, material, focal presence, spacing, accent discipline and craftsmanship.

## Before coding a major learner screen

1. Inspect the current rendered product and relevant source.
2. State the dominant learner idea in one sentence.
3. Identify the single hero object / hero experience.
4. Define the physical hierarchy:

```text
Canvas
→ Section
→ Primary surface
→ Raised object
→ Floating control
→ Accent signal
```

5. Decide what supporting information must visually recede.
6. Decide light-first vs focused-dark behavior and preserve Light/Dark identity parity.
7. Define the minimum orange-accent use.
8. Reuse current spacing, radius, typography, tone and depth tokens before creating new values.
9. Add/update the route entry in `SCREEN_CONTRACT`:

```text
learnerGoal
 dominantIdea
 primaryAction
 progressiveDisclosure
 evidence
 visualHero
 surfaceHierarchy
 themeBias
 accentPolicy
```

10. Never copy illustrative reference data into production. Streaks, milestones, scores, progress and achievements must come from real product data.

## During implementation

Prefer shared roots over local patches:

```text
shared shell
shared layout
shared material/depth tokens
shared controls
shared typography
shared i18n
shared interaction/loading states
```

Do not create a separate visual system per screen.

Do not sacrifice usability to imitate a reference. Do not redesign business logic when the task is visual.

## Required visual review after coding

1. Render the real UI when the environment allows it.
2. Capture Desktop Light.
3. Capture Desktop Dark when the screen supports it.
4. Capture Mobile continuation.
5. Compare against the canonical boards by visual grammar, never literal layout.
6. Score 0–2 for:

```text
Hierarchy
Contrast
Depth
Material
Focal point
Negative space
Typography
Accent discipline
Responsiveness
Craftsmanship
```

7. Identify the three largest gaps.
8. Fix those gaps at the highest shared level possible.
9. Render again.
10. Run functional and regression gates separately.

Do not report a major UI visually complete from source inspection alone. Target 17–20/20. Below 14/20 is not visually release-ready.

## Future-module release rule

A new learner route is not release-ready unless:

- router and `SCREEN_CONTRACT` agree;
- shared i18n/chrome survives it;
- async interactions expose immediate state;
- Light/Dark/mobile behavior is deliberate;
- evidence is learner-backed rather than illustrative;
- the browser ESM graph passes;
- permanent BECOMING release gates pass;
- a rendered visual review has been performed.

North Star:

```text
Learner is the protagonist.
Work is the evidence.
AI is the guide.

Bold in meaning.
Calm in presentation.
Human in guidance.
```

## HIGH-FIDELITY IMPLEMENTATION BOOTSTRAP

For every major UI task with an approved reference, read and obey in this order:

```text
1. BECOMING_UIUX_SKILL.md
2. BECOMING_DESIGN_TOKENS.json
3. BECOMING_VISUAL_REFERENCE_ALIGNMENT_ADDENDUM.md
4. BECOMING_HIGH_FIDELITY_IMPLEMENTATION_MODE.md
5. Approved BECOMING Light and Dark visual reference images
```

The approved references are visual ground truth.

Major UI cannot be approved from source alone. Required sequence:

```text
inspect
→ screen-specific visual spec
→ implement
→ render
→ compare
→ identify top 3 gaps
→ refine shared causes
→ render again
→ Visual QA score
```

Every learner route in `SCREEN_CONTRACT` must retain:

```text
fidelityMode: 'high'
```

A future learner screen that does not declare high-fidelity mode is not release-ready.

