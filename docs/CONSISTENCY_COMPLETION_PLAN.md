# BECOMING v2.12 — UI CONSISTENCY COMPLETION PLAN

## Inspected legacy/mixed areas

1. Stronger Version modal
   - outer modal and inner comparison surfaces use flatter/older material treatment;
   - comparison cards do not share the current high-fidelity depth language;
   - close/help controls are visually lighter than current BECOMING controls;
   - reading hierarchy is too uniform.

2. Review/Vocabulary evidence area
   - priority evidence and positive evidence use different card languages;
   - several nested blocks still look like old border-first components;
   - helper buttons, chips, footer actions and evidence rows vary in radius/depth;
   - section title vs. card title hierarchy is inconsistent.

## Root causes

- old component variants remain in Review/dialog markup;
- newer high-fidelity system was applied at page/hero level before every feedback sub-component was migrated;
- multiple local variants share semantics but not a shared material primitive;
- modal content is created dynamically, so legacy comparison markup can bypass screen-level styling.

## Migration strategy

1. Introduce one shared consistency stylesheet consuming existing BECOMING tokens.
2. Normalize Review feedback surfaces through shared selectors/classes.
3. Normalize dialogs globally at the shared overlay level.
4. Add a tiny semantic runtime that:
   - adds visual classes only;
   - does not inspect learner data;
   - does not change business state;
   - recognizes two-column comparison structurally, not by translated UI text.
5. Keep priority feedback stronger; make positive/supporting feedback recede.
6. Preserve Light/Dark parity and mobile single-column continuation.
7. Add regression validator so future releases cannot silently drop the consistency layer.
