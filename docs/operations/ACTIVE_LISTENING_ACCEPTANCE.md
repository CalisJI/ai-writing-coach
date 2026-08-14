# Active Listening Acceptance

M1.5 adds deterministic transcript-reconstruction practice to the existing
internal Listening workspace. It is an active-practice checkpoint, not
Listening completion, proficiency evaluation, or public release.

## Canonical media reuse

Follow and Active modes consume the same imported `MediaLearningObject`,
`MediaTranscript`, canonical segment ordering, timestamps, original text, and
exact-ID `SegmentTranslation` values. Active practice owns only transient
browser-session state keyed by `asset_id` and `segment_id`; it does not copy or
mutate canonical transcript or translation contracts.

One successful import creates one new in-memory practice session. A later
successful import for a different asset clears drafts, attempts, reveals, and
session summary state and selects that asset's first canonical segment. The
selected Follow/Active mode, playback rate, and Follow-mode Original/Meaning
preferences are preserved when the new lesson supports them. Overlapping
imports retain the M1.4 generation guard, so a stale response cannot replace
the newest media or initialize stale practice state.

## Deterministic text match

Evaluation is local, synchronous, deterministic, and provider-independent. It
performs no network or AI call.

Common normalization applies Unicode NFKC, normalizes common apostrophe and
dash variants, trims text, collapses whitespace, and ignores ordinary
punctuation as comparison units.

- English is case-insensitive and compares Unicode word/digit tokens while
  preserving internal apostrophes and hyphens. Contractions therefore remain
  meaningful lexical units.
- Chinese compares each Han character as one unit. Whitespace and ordinary
  punctuation do not dominate. Contiguous Latin/digit runs are preserved as
  case-insensitive units; no Pinyin or Traditional/Simplified conversion is
  generated.

Unit-level Levenshtein distance is authoritative:

```text
distance = edit_distance(expected_units, answer_units)
accuracy = round(clamp(1 - distance / max(expected_count, answer_count), 0, 1) * 100)
```

`100%` is labelled Exact match, `80–99%` Close match, and lower results Try
again. These are neutral transcript-match labels. Text match compares one
reconstruction with one canonical transcript segment; it is explicitly **not a
proficiency, mastery, CEFR, HSK, TOEIC, or IELTS score**.

## Check, Reveal, Retry, and navigation

- Before Check or Reveal, Active mode hides every canonical original and
  translated meaning while retaining timestamps and canonical selection.
- Check rejects empty input, evaluates the current canonical segment, records
  one checked attempt, and then shows the learner answer, original, available
  meaning, and Text match result.
- Reveal shows the original and available meaning without creating a score or
  checked attempt. Reveal-only segments are counted separately.
- Retry keeps the same segment, clears its draft, hides original and meaning,
  and preserves prior attempts and best Text match.
- Previous and Next use the canonical transcript order and stable segment IDs.
  Returning to a segment restores its current session presentation and attempt
  history. Replay always uses the selected canonical `start_ms`.
- Follow mode retains its independent Original and Meaning preferences when the
  learner enters and leaves Active mode.

Learner reconstruction text is escaped before HTML rendering. The textarea is
labelled, has a real `maxlength`, and Check uses form submission. Results and
validation use status semantics, disabled controls use the native disabled
state, and feedback is textual rather than color-only.

## Session summary policy

The non-persistent summary reports practiced segments / total segments, total
checked attempts, exact-match segment count, reveal-only segment count, and
average best Text match across segments with checked attempts. Reveal-only
segments count as practiced but are excluded from exact counts and checked
averages. Nothing is called long-term progress or mastery.

## Translation and media degradation

- `ready`: after Check or Reveal, show the canonical original and its exact-ID
  shared meaning.
- `not_required`: show the original and truthfully state that translation is
  not required; do not fabricate meaning.
- `unavailable`: Active practice remains usable from the source transcript;
  after Check or Reveal, explain that meaning is currently unavailable.
- `too_large`: Active practice remains usable without translation; after Check
  or Reveal, explain the size boundary.
- `transcript_unavailable`: Active practice is unavailable because there is no
  canonical answer. Playback may remain truthful in the existing passive state.
- playback unavailable: Follow remains truthful, but the Active control is
  disabled because the learner cannot perform the listening exercise.

## Bounded work

`MAX_LISTENING_RECONSTRUCTION_CHARS` is `2000`, exposed as the textarea
`maxlength` and enforced by the pure evaluator/session boundary.
`MAX_LISTENING_EVALUATION_UNITS` is `500` for both expected and learner units.
The dynamic-programming edit distance is `O(n*m)` time with `O(m)` row memory,
so the unit cap limits one evaluation to at most 250,000 comparison cells. An
oversized canonical segment is not truncated or scored; Active evaluation is
disabled for that segment while Follow remains available.

## Non-persistent session and explicit non-goals

M1.5 writes no practice state to local storage, files, SQLite, PostgreSQL, or a
repository. It adds no schema or Alembic revision. It adds no AI capability,
AI/provider evaluation, semantic paraphrase grading, persistence, spaced
repetition, recommendation engine, comprehension quiz, media download, audio
extraction, ASR, microphone, recording, pronunciation evaluation, Speaking
evaluation, or Shadowing implementation. Listening remains DEVELOPMENT,
internally available, and non-public.

## Offline verification

```bash
node scripts/test_active_listening.mjs
node scripts/test_listening_ui.mjs
python -m pytest -q -p no:cacheprovider tests/test_media_learning.py
python -m pytest -q -p no:cacheprovider tests/test_media_ingestion.py
python -m pytest -q -p no:cacheprovider tests/test_media_translation.py
python -m pytest -q -p no:cacheprovider tests/test_listening_mvp_integration.py
python -m pytest -q -p no:cacheprovider tests/test_ai_runtime.py
python -m pytest -q -p no:cacheprovider tests/test_governance_contract.py
```

All M1.5 tests use fakes and offline fixtures. They must not contact YouTube or
an AI provider and must not mutate production data.
