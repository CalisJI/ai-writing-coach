# Internal Listening MVP Acceptance

M1.4 accepts the passive, internal Listening MVP when one authenticated learner
flow connects the reviewed shared Media Learning backend to the existing
Listening workspace without duplicating media or transcript state. This is an
internal acceptance checkpoint, not Listening completion or public release.

## Acceptance flow

For both English and Chinese learning contexts, an internal learner can:

1. open the internal Listening route;
2. submit a supported external-media URL to `POST /api/media-learning/import`;
3. receive provider-hosted playback and the canonical source transcript;
4. view complete support-language meanings when translation is ready;
5. select a stable segment, move Previous / Next, and replay its canonical
   timestamp;
6. use 0.75x, 1x, and 1.25x playback rates;
7. independently show or hide original text and translated meaning; and
8. continue following the original lesson through truthful degraded states.

The EN acceptance flow uses an English learning context and Vietnamese support
language. The ZH acceptance flow uses a Chinese learning context and Vietnamese
support language. A cross-support check also covers English source content with
Simplified Chinese meaning. All three use the same API, Media Learning Object,
translation capability, response shape, and Listening controller.

## Translation and degraded states

- `ready`: every canonical segment has one exact-ID translation and Meaning is
  usable.
- `not_required`: no translation is fabricated; the Meaning control is disabled
  and the workspace says translation is not required.
- `transcript_unavailable`: playback may remain available, but the workspace
  truthfully reports that no usable transcript exists.
- `too_large`: playback and original transcript remain usable; Meaning is
  safely unavailable and no partial translation is shown.
- `unavailable`: playback and original transcript remain usable without leaking
  provider errors or AI runtime details.

Unsupported sources, unavailable media, provider timeout/failure, unsupported
source language, and playback-unavailable responses must remain learner-safe.
The UI must never render raw exceptions or `[object Object]`.

## Controller and playback acceptance

When imports overlap, only the newest request may update the lesson. A successful
new import resets the selected segment to its first canonical ID and clears the
transient error. Learner preference-like controls—playback rate and Original /
Meaning visibility—remain unchanged for the new lesson.

Previous is disabled on the first segment and Next on the last. Invalid segment
selection is ignored. Replay uses the selected segment's server-owned
`start_ms`. YouTube commands remain restricted to the validated
`youtube-nocookie.com` embed origin; unsupported playback providers receive no
YouTube commands.

## Explicit non-goals

M1.4 adds no Active Listening exercises, scoring, dictation, comprehension
quiz, persistence, media download, translation cache, Shadowing activation,
recording, microphone access, ASR, pronunciation evaluation, new AI capability,
schema/Alembic work, or public Listening release. The disabled Shadowing
affordance remains informational. `learner_translation` is the only translation
capability.

## Local offline verification

Run with application dependencies installed:

```bash
python -m pytest -q -p no:cacheprovider tests/test_media_learning.py
python -m pytest -q -p no:cacheprovider tests/test_media_ingestion.py
python -m pytest -q -p no:cacheprovider tests/test_media_translation.py
python -m pytest -q -p no:cacheprovider tests/test_listening_mvp_integration.py
python -m pytest -q -p no:cacheprovider tests/test_ai_runtime.py
python -m pytest -q -p no:cacheprovider tests/test_governance_contract.py
node scripts/test_listening_ui.mjs
```

These tests use fakes and must not call YouTube or a live AI provider.

## Optional human-gated real-media smoke

Only after explicit human authorization, use a non-sensitive public test video
and an approved internal test account in an already configured environment.
Verify the EN and ZH flows, translation states, controls, and degraded behavior
through the browser's authenticated session. Do not paste credentials into the
terminal or this document, do not expose provider responses, and do not change
production capability configuration as part of the smoke. Stop on unexpected
cost, credential, data, or deployment impact.
