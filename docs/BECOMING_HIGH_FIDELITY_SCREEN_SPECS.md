# BECOMING v2.11 — HIGH-FIDELITY SCREEN SPEC

This specification is written **before implementation**.

Source order used:
1. `BECOMING_UIUX_SKILL.md`
2. `BECOMING_DESIGN_TOKENS.json`
3. `BECOMING_VISUAL_REFERENCE_ALIGNMENT_ADDENDUM.md`
4. `BECOMING_HIGH_FIDELITY_IMPLEMENTATION_MODE.md`
5. Canonical Light reference
6. Canonical Dark reference
7. Current v2.10 rendered/source state

## Current high-level visual gaps

### Gap 1 — physicality is present but still too thin
The current system has shadows and tonal separation, but several important controls and surfaces still read as *styled rectangles* rather than objects with perceived thickness.

Reference target:
- visible lower edge;
- tight contact shadow;
- upper-left rim;
- ambient separation;
- physically plausible pressed state.

### Gap 2 — first viewport composition is still more "stacked product UI" than "composed BECOMING"
The current Home has the right ingredients, but the primary experience and editorial statement are not locked into one strong stage consistently enough.

Reference target:
- one strong first-viewport composition;
- editorial statement and hero object read together;
- support material recedes immediately.

### Gap 3 — icon/control language is under-weight relative to reference
Navigation SVGs are coherent geometrically, but the icons sit directly in route rows. They lack the tactile micro-object treatment and consistent optical presence visible in the approved references.

Reference target:
- same stroke family;
- same icon box;
- consistent 1.8–2px optical stroke;
- tactile icon tiles for high-frequency navigation/actions;
- active signal only where meaningful.

---

# Shared visual system specification

## Canvas
Light:
- warm/off-white;
- near-black typography;
- very subtle upper-left illumination;
- no pure-white-everywhere appearance.

Dark:
- ink-black canvas;
- raised objects must remain visibly separate without relying on borders;
- studio-rim highlight survives dark mode.

## Surface hierarchy

```text
Canvas
→ Section tone
→ Primary working surface
→ Raised object
→ Hero object
→ Floating control
→ Accent / semantic signal
```

Adjacent levels must remain distinguishable if borders are mentally removed.

## Depth

### Depth 1 — structural
- subtle top rim;
- almost no floating impression.

### Depth 2 — raised
- top/left rim;
- soft ambient shadow;
- 2–3px lower-edge tonal thickness;
- tight contact shadow.

### Depth 3 — hero
- stronger lower edge;
- upper-left directional highlight;
- larger ambient shadow;
- tight contact shadow;
- restrained material gradient.

### Depth 4 — control
- compact shadow;
- visible lower edge;
- hover lifts 1px;
- pressed translates down 2px and compresses the contact shadow.

## Shape
- small controls: existing token radius;
- navigation icon tile: object radius;
- cards: surface radius;
- hero objects: hero radius;
- no arbitrary pill proliferation.

## Icon
All main-navigation SVGs:
- same 24px viewbox;
- 18px rendered icon;
- stroke-driven;
- 1.9px optical stroke;
- rounded line caps/joins;
- placed in one shared tactile icon tile;
- active icon may use orange;
- inactive icons remain neutral.

## Accent
Orange only for:
- selected nav signal;
- primary CTA;
- current bottleneck/progress;
- tiny recognition mark.

Semantic red/green/blue/yellow remain meaning-driven only.

---

# Home

## Dominant idea
**The learner should understand the one writing signal that matters now.**

## Hero
Editorial statement + real Writing Dashboard form one composed first-viewport stage.

## Layout
Desktop:
```text
[ editorial statement  ][ dashboard hero object ]
[        work evidence / supporting continuation        ]
```

Mobile:
```text
statement
dashboard hero
work evidence
supporting actions
```

## Typography
- Home display is the strongest type in the product.
- dashboard title is clearly subordinate to the display;
- dashboard metric labels are tertiary.

## Material
- Dashboard gets hero-depth treatment.
- Current Focus becomes the strongest object inside the hero.
- Supporting metrics are not cards.

---

# Write

## Dominant idea
**The learner's writing is the object.**

## Hero
The editor is a paper/workbench surface, not a textarea card.

## Layout
- editor takes dominant width;
- setup/guidance remains secondary;
- controls sit on/near the workspace rather than competing with it.

## Material
- editor has page thickness;
- top rim and lower contact edge;
- setup panel uses lower depth.

---

# Review

## Dominant idea
**One bottleneck connected directly to the learner's work.**

## Hero
Learner paper + current bottleneck create one evidence composition.

## Material
- learner work = paper/working surface;
- bottleneck = raised hero insight;
- strength/benchmark = lower depth;
- POS lens remains assistance, not hero.

---

# Read

## Dominant idea
**The passage is the learning object.**

## Hero
Passage surface.

## Supporting
Questions and history recede.

---

# Library

## Dominant idea
**Recall one useful word, then manage the collection.**

## Hero
Recall card becomes a tactile learning object with visible thickness.

## Supporting
Lookup and saved rows are quieter.

---

# Journey

## Dominant idea
**Transformation over time, shown through real evidence.**

## Hero
Progress/mastery object gets ceremonial but restrained physical presence.

## Supporting
Revision history and memory evidence use lower depth.

---

# Profile

## Dominant idea
**This is the learner's identity and preferences.**

## Hero
Growth Rank remains the identity object.

## Supporting
Settings are calm, grouped surfaces.

---

# Onboarding

## Dominant idea
**Choose the learning identity deliberately.**

## Hero
Language/goal selection uses large tactile choices, not form-style radios.

---

# Interaction contract

Hover:
- lift 1px;
- increase rim/edge definition slightly;
- no glow.

Pressed:
- move down 2px;
- reduce ambient shadow;
- keep contact shadow plausible.

Selected:
- orange may appear in one small signal and/or active icon;
- do not recolor the whole surface.

Focus:
- accessible outline using accent family;
- must not become a page-long focus rail.

Disabled:
- lower contrast while preserving material silhouette.

---

# Required render QA

Major representative screens:
- Home Light
- Home Dark
- Write Light
- Review Dark
- Journey Light
- Profile Light
- Home Mobile
- Review Mobile

After pass 1:
1. identify top 3 gaps;
2. fix shared causes first;
3. render pass 2;
4. score 10 HIGH-FIDELITY categories /20.
