# BECOMING — HIGH FIDELITY IMPLEMENTATION MODE v1.0

> This file supplements the existing BECOMING design philosophy, design tokens, and visual reference addendum.
>
> Its purpose is to force AI coding/design agents to implement UI with **high visual fidelity to the approved BECOMING reference images**, instead of merely producing something "inspired by" the same style.
>
> This file does **not** replace:
> - `BECOMING_UIUX_SKILL.md`
> - `BECOMING_DESIGN_TOKENS.json`
> - `BECOMING_VISUAL_REFERENCE_ALIGNMENT_ADDENDUM.md`
>
> It defines the **execution mode** to use when a screen must closely match the approved visual direction.

---

# 1. MODE DECLARATION

For all UI/UX work where approved BECOMING reference images are provided, operate in:

> **HIGH-FIDELITY IMPLEMENTATION MODE**

This is NOT:

> "design something in a similar style"

This IS:

> "translate the approved visual reference into a real product interface with the highest practical visual fidelity."

The reference images are **visual ground truth**.

Do not copy literal poster layouts, branding, or demo content.

Transfer the visual grammar with high fidelity.

---

# 2. PRIMARY OBJECTIVE

The final rendered UI must approach the approved reference in:

- tonal contrast
- visual hierarchy
- physical depth
- material quality
- component thickness
- surface separation
- shadow language
- rim definition
- directional light
- contact shadow
- icon consistency
- radius consistency
- spacing rhythm
- typography authority
- focal-point clarity
- accent discipline
- overall visual confidence

Do not interpret these qualities conservatively.

If the reference feels tactile and strongly dimensional,
the implementation must create a comparable visual impression.

A tiny shadow on a flat card does NOT satisfy "soft physicality".

---

# 3. VISUAL PRIORITY RULE

When choosing between:

A. a safe generic SaaS solution  
B. a solution that more faithfully expresses the approved BECOMING visual language

choose **B**, as long as usability and accessibility remain correct.

Do not fall back to framework-default aesthetics.

Do not allow:
- generic Tailwind dashboard styling
- default component-library appearance
- flat bordered cards
- mixed icon styles
- generic dark analytics UI

to override the approved visual direction.

---

# 4. REFERENCE INTERPRETATION

Treat approved BECOMING reference images as a design specification.

Do NOT ask:

> "Does the layout look identical?"

Ask:

> "Does the rendered product have the same visual quality and material language?"

Compare:

- contrast
- surface depth
- component thickness
- tactile presence
- light direction
- hero emphasis
- typography hierarchy
- negative space
- accent usage
- icon family coherence
- visual polish

The implementation must preserve product usability while matching these qualities.

---

# 5. REQUIRED PHASE 1 — INSPECT BEFORE CODING

Do NOT code immediately.

Before making changes:

1. Inspect the current rendered UI.
2. Inspect the relevant source code.
3. Inspect the approved reference images.
4. Identify the current screen's dominant idea.
5. Identify the hero object / hero surface.
6. Identify the main interaction.
7. Identify the current visual hierarchy.
8. Identify the visual gap between current UI and reference.

Then explicitly define:

- canvas
- section surfaces
- primary surface
- raised objects
- floating controls
- accent signals
- strongest focal point

---

# 6. REQUIRED PHASE 2 — EXTRACT A SCREEN-SPECIFIC VISUAL SPEC

Before coding, create a short implementation specification for the current screen.

It must define:

## Layout
- page structure
- hero position
- primary content region
- secondary information regions
- spacing rhythm
- alignment strategy

## Typography
- display level
- section title level
- body level
- metadata level
- relative emphasis

## Surface system
- canvas tone
- section tone
- raised surface tone
- hero surface treatment
- floating control treatment

## Depth system
- border treatment
- rim definition
- ambient shadow
- contact shadow
- directional light
- inner highlight if needed

## Icon system
- icon family
- stroke weight
- roundedness
- optical weight
- outline vs filled behavior

## Shape system
- radius family
- component thickness
- chip/button shape
- card/hero shape

## Color
- neutral dominance
- accent usage
- semantic colors
- muted supporting tones

## Interaction
- hover
- pressed
- selected
- focus
- disabled

Do not begin implementation until this screen-specific spec is coherent.

---

# 7. ICON CONSISTENCY — NON-NEGOTIABLE

All icons must belong to the same visual language.

Required consistency:

- same stroke philosophy
- same optical weight
- same roundedness
- same detail density
- same geometric character
- same sizing logic
- same active-state logic

Do NOT mix:
- thin icons with heavy icons
- rounded icons with sharp icons
- filled icons with outline icons arbitrarily
- flat icons with pseudo-3D icons without a deliberate hierarchy

If an existing icon set cannot match the approved style, normalize or replace it consistently.

Do not patch individual icons one by one.

---

# 8. COMPONENT CONSISTENCY — NON-NEGOTIABLE

Components must look like members of one design system.

Maintain consistency in:

- radius
- surface tone
- thickness
- shadow family
- rim highlight
- border softness
- padding rhythm
- icon placement
- hover behavior
- pressed behavior
- active behavior
- typography hierarchy

A newly added component must not look like it came from a different library.

Avoid one-off visual treatments unless the component has a unique semantic role.

---

# 9. SURFACE PHYSICALITY

Important components must feel like digital objects with physical presence.

Desired surface language:

- solid
- matte
- softly rounded
- tactile
- studio-lit
- physically plausible
- refined

Use a combination of:

1. tonal separation
2. subtle border
3. top/edge rim
4. directional highlight
5. ambient shadow
6. contact shadow
7. restrained material gradient when useful

Do NOT rely on one generic `box-shadow`.

Do NOT create physicality through:
- glossy gradients
- neon glow
- excessive glass
- extreme neumorphism
- heavy outlines

Important objects should feel as if they are sitting on a surface.

---

# 10. COMPONENT THICKNESS

The approved references have visible object thickness.

Replicate this impression through:

- edge layering
- lower-edge tonal change
- contact shadow
- rim lighting
- subtle surface gradient
- inset highlight where appropriate

The goal is not literal 3D rendering.

The goal is:

> **perceived thickness**

Flat rectangles with thin borders are insufficient for major hero components.

---

# 11. LIGHT DIRECTION

Use a consistent virtual light source across the screen.

Default:

> soft light from upper-left / upper-front

Therefore:

- upper edges may receive a subtle highlight
- lower/right edges may be slightly darker
- contact shadow should generally sit beneath the object
- hero surfaces should share the same lighting logic

Do not randomly reverse lighting between components.

---

# 12. HERO PRESENCE

Every major screen must have ONE dominant visual object or experience.

Examples:

- current writing bottleneck
- progress journey
- mastery object
- AI review insight
- writing editor
- learning state
- language identity

The hero must be visually stronger than surrounding content.

Avoid:

```text
[card] [card] [card] [card]
```

when the content hierarchy is not equal.

Prefer:

```text
[           HERO            ]

[ evidence ] [ supporting ]
```

Supporting content must recede.

---

# 13. SAME-WEIGHT CARD PROHIBITION

Do not distribute equal visual weight across unrelated information.

If one insight is more important, the visual hierarchy must reflect that.

Replace:

```text
Metric A | Metric B | Metric C | Metric D
```

with a hierarchy such as:

```text
Primary insight
Supporting evidence
Secondary metrics
```

Use data hierarchy to drive visual hierarchy.

---

# 14. TYPOGRAPHY AUTHORITY

Typography must create structure before color does.

Major statements should feel:

- bold
- editorial
- concise
- confident
- high-contrast

Supporting copy should recede.

Do not use nearly identical font sizes/weights for:
- page title
- hero statement
- section title
- supporting text

The difference must be visually obvious.

For Chinese/CJK:
- preserve visual authority
- do not force Latin condensed mechanics
- maintain comfortable line height
- preserve readability

---

# 15. ACCENT DISCIPLINE

Warm orange is the primary BECOMING accent unless another semantic color is required.

Use it sparingly.

Use accent for:
- primary action
- active state
- selected object
- important progress
- current bottleneck
- significant insight

Do NOT use orange across:
- every icon
- every border
- every title
- every metric
- every card

Accent must remain rare enough to remain powerful.

---

# 16. LIGHT MODE EXECUTION

Light mode should feel:

- bright
- warm-neutral
- high contrast
- tactile
- premium
- calm
- editorial

Use:
- off-white / warm neutral canvas
- near-black primary text
- clearly separated raised surfaces
- visible soft depth
- restrained accent

Do NOT allow light mode to become:
- sterile
- flat
- pure-white everywhere
- border-only
- visually weak

---

# 17. DARK MODE EXECUTION

Dark mode must preserve the same physical identity.

Do NOT implement dark mode as:

```text
black canvas
+ dark gray card
+ slightly lighter border
```

Dark mode must still have:

- strong tonal separation
- visible rim light
- surface hierarchy
- ambient shadow
- contact shadow
- near-white typography
- restrained accent
- tactile depth

Dark mode should feel like dark physical objects under soft studio light.

Avoid:
- gray-on-gray flatness
- gaming UI
- cyberpunk
- neon
- glowing AI aesthetics

---

# 18. NEGATIVE SPACE

Do not fill space simply because space is available.

Use negative space to:

- isolate the hero
- strengthen hierarchy
- improve reading
- increase perceived quality
- create calmness

A BECOMING screen should feel composed.

Not crowded.

Not empty.

---

# 19. FRAMEWORK DEFAULTS ARE NOT ACCEPTABLE VISUAL OUTPUT

Do not consider a component complete simply because:

- Tailwind classes are applied
- a card exists
- a border exists
- a shadow utility is used
- a component-library default renders correctly

Framework defaults are implementation tools, not the design target.

The rendered result must be visually evaluated against the reference.

---

# 20. SCREEN-SPECIFIC FIDELITY OVERRIDES GENERIC REUSE

Reuse existing components where possible.

However:

If an existing generic component prevents the screen from matching the approved visual direction,
refactor the shared component instead of forcing the screen into a weak generic pattern.

Do not duplicate components just to bypass poor visual architecture.

Prefer improving the system.

---

# 21. REQUIRED PHASE 3 — IMPLEMENTATION

After visual analysis and screen spec are complete:

1. implement the smallest coherent change set;
2. reuse existing design tokens;
3. reuse or refactor shared components;
4. avoid hardcoded one-off values;
5. preserve business logic unless a UX requirement demands otherwise;
6. preserve responsiveness;
7. preserve English and Chinese support;
8. preserve accessibility.

Do not redesign unrelated product flows.

---

# 22. REQUIRED PHASE 4 — RENDER AND COMPARE

After implementation:

1. render the real application;
2. capture a screenshot;
3. inspect the screenshot next to the approved reference;
4. compare visual qualities, not literal layout.

Evaluate:

- contrast
- focal point
- depth
- material
- thickness
- surface hierarchy
- icon consistency
- typography
- spacing
- accent
- negative space
- craftsmanship

Do not approve the screen from source code alone.

---

# 23. REQUIRED PHASE 5 — TOP 3 GAP REFINEMENT

After the first render:

Identify the **three largest remaining visual gaps**.

Example:

```text
1. Hero surface is still too flat.
2. Icons have inconsistent optical weight.
3. Supporting sections compete too strongly with the hero.
```

Then fix those three gaps.

Render again.

At least one refinement pass is required for major UI work.

---

# 24. VISUAL QA SCORE

Score the final rendered screen from 0–2 for each category.

```text
0 = poor / missing
1 = acceptable
2 = strong
```

Categories:

1. Contrast
2. Focal point
3. Depth
4. Material quality
5. Component thickness
6. Icon consistency
7. Typography hierarchy
8. Negative space
9. Accent discipline
10. BECOMING coherence

Maximum: 20

Interpretation:

```text
17–20 = strong alignment
14–16 = acceptable, polish recommended
10–13 = not visually complete
<10   = rework required
```

Do not report visual completion if:

- score < 14
- Focal point = 0
- Depth = 0
- Icon consistency = 0
- BECOMING coherence = 0

---

# 25. DONE CRITERIA

Do not report "Done" merely because the build passes.

UI work is complete only when:

- the real UI renders correctly;
- the dominant idea is obvious;
- the hero object has sufficient presence;
- icon language is consistent;
- component language is consistent;
- important surfaces have visible physical depth;
- light/dark mode retains the same identity;
- English/Chinese remain correct;
- responsive layout is correct;
- the result has been visually compared to the reference;
- at least one refinement pass has been completed;
- the Visual QA threshold is met.

---

# 26. ANTI-PATTERNS

Never default to:

- generic SaaS dashboard
- flat card grids
- nested cards
- weak generic shadows
- border-only hierarchy
- mixed icon libraries
- inconsistent icon stroke weights
- inconsistent radius values
- gray-on-gray dark mode
- low-contrast light mode
- overly safe generic UI
- random gradients
- excessive glow
- decorative AI styling
- different visual language per feature
- page-specific CSS patches when shared causes exist

---

# 27. ROOT-CAUSE RULE

When multiple visual defects come from the same:

- component
- token
- icon system
- spacing system
- elevation system
- radius system
- layout primitive
- theme variable

fix the shared cause first.

Do not accumulate visual patches.

---

# 28. REQUIRED FINAL REPORT

At the end of a major UI task, report:

```text
HIGH-FIDELITY UI REPORT

Screen:
[...]

Primary visual gaps found:
1. ...
2. ...
3. ...

Shared systems changed:
- ...

Components changed:
- ...

Icon system changes:
- ...

Visual refinement performed:
- ...

Visual QA:
Contrast: X/2
Focal point: X/2
Depth: X/2
Material: X/2
Thickness: X/2
Icon consistency: X/2
Typography: X/2
Negative space: X/2
Accent discipline: X/2
BECOMING coherence: X/2

Total: XX/20

Remaining risks:
- ...
```

---

# 29. AGENT BOOTSTRAP BLOCK

Add this instruction to the agent/project bootstrap:

```text
For all high-fidelity UI work, read and obey:

1. BECOMING_UIUX_SKILL.md
2. BECOMING_DESIGN_TOKENS.json
3. BECOMING_VISUAL_REFERENCE_ALIGNMENT_ADDENDUM.md
4. BECOMING_HIGH_FIDELITY_IMPLEMENTATION_MODE.md
5. Approved BECOMING Light and Dark visual reference images

When a reference image is supplied, treat it as visual ground truth.

Do not merely imitate the style.
Extract its visual grammar and reproduce the same level of:
contrast, depth, material, thickness, icon consistency,
typography hierarchy and visual confidence.

Do not approve major UI without rendering, comparing,
identifying the three largest gaps, refining, and rendering again.
```

---

# 30. FINAL EXECUTION PRINCIPLE

> **Do not design "something similar." Implement the approved visual language faithfully.**

> **The reference defines the minimum expected level of visual confidence.**

> **A BECOMING screen should feel composed, tactile, coherent and intentional — not merely functional.**
