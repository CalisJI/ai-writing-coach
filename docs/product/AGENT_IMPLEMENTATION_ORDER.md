# ORENA — AGENT IMPLEMENTATION ORDER

Immediate priority: **LISTENING PRODUCT COMPLETION — MEDIA LIBRARY + BULK SOURCE PIPELINE + DICTATION UX**.

## Batch L1 — Discovery redesign
Implement media-first Listening from `01_LISTENING_PRODUCT_SPEC.md`: dominant thumbnails, compact metadata, useful media sections, video-first ranking where appropriate. Responsive web accepted first; native follows as full port.

## Batch L2 — Development source importer
CSV/structured source-list importer reusing existing YouTube/Media Learning pipeline. Stable IDs, duplicate/missing-transcript reports, multiple excerpts/source, generated dev catalog, production default OFF.

## Batch L3 — Load real dev content
Use provided EN/ZH source CSVs. Do not stop after one video/language. Record failures instead of silently dropping them.

## Batch L4 — Dictation masked reconstruction
Keep evaluator. Build EN word-shape, ZH Hanzi slots, clear correct/wrong/missing/extra, Easy/Normal/Hard presentation policies, truthful hints/reveals.

## Batch L5 — Connected handoffs/persistence
Verify Listening↔Dictation, Listening↔Shadowing/Speaking, Dictionary/Vocabulary, Active Recall, resume/progress.

## Batch L6 — Native parity
Port approved responsive web completely.

## Batch L7 — Human QA
Human checks library appeal, real thumbnails, several EN/ZH videos, playback, transcript sync, Dictation, Shadowing and native/mobile.

Before every batch: `/resume-orena` → cross-skill contract → Listening spec → relevant code/tests → implement → test → update Project Memory if truth changed → coherent local commit. No auto-merge/deploy.

DO NOT hand-author 100 JSON lessons, build a second player/evaluator, ship EN-only shared features, call seed content a real catalog, or call automated playback tests human acceptance.
