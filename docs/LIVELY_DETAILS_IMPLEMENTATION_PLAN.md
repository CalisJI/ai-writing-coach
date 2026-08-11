# BECOMING v2.14 — LIVELY DETAILS IMPLEMENTATION PLAN

Prepared before implementation.

## Goal

Carry the best micro-details from the approved concept into the real product without redesigning flows or introducing fake learning data.

The target is:

```text
calm base
+ strong physical material
+ a few memorable tactile details
+ restrained orange
+ clear semantic-positive states
```

## Approved details to transfer

### 1. Stronger Version header emblem
Add one small tactile BECOMING spark tile beside the dialog title.

Purpose:
- create a recognizable emotional anchor;
- make the dialog feel intentionally composed;
- do not compete with the learner's content.

### 2. Improved-version status badge
The stronger/right comparison card gets a small positive check object.

Purpose:
- clarify which side is the stronger version;
- use semantic positive, not orange.

### 3. Mini dashboard card physicality
Existing dashboard/evidence mini cards get:
- stronger surface thickness;
- upper-left rim;
- tighter contact shadow;
- more confident number/label hierarchy;
- small non-data decorative signal only where safe.

No fake streak/XP/statistics are introduced.

### 4. Vocabulary/review accent chip
The leading category chip in the priority feedback object gets:
- a small tactile orange icon tile/leaf mark;
- thicker chip surface;
- controlled accent.

This is applied structurally to the priority feedback's first category chip and does not inspect translated text.

### 5. Progress endpoint / micro-detail
Existing progress fill/metric bars receive a tactile endpoint highlight derived from the real current fill position.

No new value is invented.

### 6. Micro-interactions
Shared tactile controls gain:
- hover lift;
- pressed compression;
- subtle rim enhancement;
- reduced-motion support.

## Non-goals

- no business logic change;
- no API/schema change;
- no fake achievements;
- no new navigation;
- no global orange recolor;
- no neon/glow;
- no animation for decoration only.

## Regression priority

The Stronger Version scroll contract from v2.13 is protected first:

```text
bounded shell
→ fixed header
→ internal min-height:0 scroll body
→ overflow-y:auto
→ natural-height comparison cards
```

The v2.14 runtime may decorate this dialog but must not change scroll ownership.
