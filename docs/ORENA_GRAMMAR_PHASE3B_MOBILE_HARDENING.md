# Orena Grammar M4.3 Phase 3B — Mobile UI Hardening

Status: **IMPLEMENTED / VISUAL RECHECK PENDING**

Phase 3B hardens the shared Universal Grammar lesson template after real-device
review showed the rich Formula frame could remain horizontal and overflow at
mobile-like widths above 430px.

## What Phase 3B changes

This phase is frontend/template hardening only. It does not migrate more grammar
content.

At widths up to 640px, the shared Grammar lesson now:

- constrains the lesson/frame/teaching column to the available viewport
- recomposes Formula relationships into one vertical column
- constrains every Formula part to `width:100%`, `min-width:0`, `max-width:100%`
- recomposes Semantic Sentence / Agreement / Particle rows to one column
- recomposes Transformation, Contrast, Match and Skill Transfer layouts
- constrains Common Mistake, Micro Practice, Sentence Builder and text inputs
- moves the learning-action frame into normal one-column flow
- wraps long target-language and instructional text instead of relying on
  horizontal scrolling

The rule is shared by block type/capability. There is no English-only or
Chinese-only mobile template.

## Core mobile hard gate

Core lesson content must never require horizontal scrolling to reveal information.

The following widths require visual QA:

- 320px
- 360px
- 375px
- 390px
- 414px
- 430px

The 640px breakpoint additionally protects wider mobile previews, landscape phones
and narrow embedded layouts such as the viewport that exposed the Phase 3A Formula
overflow.

## Scope protection

Phase 3B changes no English/Chinese Grammar KB entry and no curriculum file.

The current content scope remains:

- English curated representatives: 3
- Chinese curated representatives: 0
- all other current Grammar content: foundation/pending migration

**MASS MIGRATION REMAINS BLOCKED** until representative visual QA passes.

## Approval gate

Automated CSS/source tests are regression gates, not visual approval.

Before Phase 3 can be approved:

1. Recheck A1 Be on desktop and mobile after Phase 3B.
2. Recheck A2 Present Perfect vs Past Simple on desktop and mobile.
3. Recheck B1 Passive Voice on desktop and mobile.
4. Verify no clipping, no lost content and no horizontal scroll.
5. Only then may the shared template be used for the remaining grammar migration
   across all supported target languages.

Phase 3B remains **VISUAL RECHECK PENDING** until those screenshots are reviewed.
