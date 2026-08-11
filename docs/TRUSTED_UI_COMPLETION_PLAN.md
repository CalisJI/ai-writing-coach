# BECOMING v2.13 — TRUSTED UI COMPLETION PLAN

Produced before implementation.

## Evidence inspected

Live screenshots supplied after v2.12 show remaining mixed-style areas across:
- Home recent evidence;
- Writing setup/guidance;
- Reading recent work;
- Reading questions/options;
- Library saved-language evidence;
- Journey patterns + benchmark estimate;
- Profile learning/interface/goal settings;
- Library active recall;
- Review positive/strength evidence;
- Stronger Version comparison dialog.

## A. Current areas already closest to the trusted visual language

- active recall inner card;
- the v2.12 comparison columns themselves;
- selected Profile controls;
- positive evidence semantic color;
- top-level page typography.

These become the internal visual reference.

## B. Remaining inconsistency groups

### 1. Large section frames
Symptoms:
- flat neutral rectangle;
- border carries most of the hierarchy;
- no clear perceived thickness;
- weak upper-left rim/contact depth.

Affected:
- recent evidence;
- reading history;
- saved-language evidence;
- pattern/benchmark frame;
- profile settings frame;
- positive evidence outer group.

### 2. Interactive controls
Symptoms:
- native/form-like select/radio/answer rows;
- varying radius and shadow;
- weak pressed/selected behavior.

Affected:
- Writing setup selects;
- Reading answers;
- Profile radio/goal controls.

### 3. Evidence/list rows
Symptoms:
- generic separators;
- insufficient object/row hierarchy;
- inconsistent metadata rhythm.

Affected:
- recent writing;
- reading history;
- saved language;
- pattern memory.

### 4. Stronger Version dialog
Functional bug:
- dialog content can exceed viewport but no reliable internal scroll owner exists;
- shell/header and content do not have an explicit flex/min-height/overflow contract;
- long comparison cards therefore become clipped below the viewport.

Visual issue:
- shell, header, scroll body and comparison cards do not fully share one overlay material/depth contract.

## C. Root causes

1. v2.12 normalized Review/dialog variants but did not migrate the remaining route-level section primitives.
2. Several screens still use legitimate low-depth `visual-section-surface` variants that are too weak for the current trusted BECOMING visual target.
3. Similar interactive objects are still owned by screen-specific CSS rather than one trusted control family.
4. Dialog overlay did not explicitly assign scroll ownership to an internal body/scroll region.

## D. Shared fix order

1. Fix modal scroll ownership first because it is a functional usability bug.
2. Introduce shared `bc13-*` surface/control/list primitives.
3. Map existing route DOM to those primitives through semantic class/structure selectors.
4. Keep list rows quieter than hero/raised surfaces to avoid nested cards.
5. Preserve existing business logic, APIs, scoring and navigation.
6. Validate Light/Dark and mobile continuation.
7. Render representative source fixtures.
8. Run a real browser scroll test for a tall comparison dialog.
9. Refine the top three visual gaps after pass 1.

## E. Visual hierarchy target

```text
Canvas
→ trusted section frame
→ primary work/learning surface
→ raised evidence/control
→ floating micro-control
→ sparse accent / semantic signal
```

## F. Non-goals

- no new feature;
- no new route;
- no business/API/database change;
- no copied poster layout;
- no hardcoded Vietnamese/English/Chinese text to decide styles.
