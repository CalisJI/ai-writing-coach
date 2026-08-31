# Orena Mobile Release Checklist

Status: **LOCAL PREPARATION / RELEASE GATE OPEN**

## Complete in the repository

- [x] Android/iOS Expo configuration, identifiers, orientation, microphone
      usage text, deep-link scheme, and EAS development/preview/production
      profiles are secret-free.
- [x] EN/ZH learner routes, server-authoritative API boundaries, transient audio
      handling, and truthful degraded states have focused tests.
- [x] Privacy/data-handling inventory and store metadata templates are present.
- [x] Vendor-neutral diagnostics boundary rejects learner content, raw audio,
      session material, authorization data, provider secrets, and arbitrary
      metadata by construction.
- [x] Local lint, strict TypeScript, focused diagnostics, API, lifecycle, and
      route regressions are runnable without production credentials.

## Human/release gates (not performed)

- [ ] Configure production OAuth redirect registration.
- [ ] Provide Apple/Google signing and store credentials.
- [ ] Run Android device and iOS simulator/device QA, including microphone,
      interruption, portrait, landscape, and tablet checks.
- [ ] Run authenticated non-production API/provider validation.
- [ ] Decide whether to activate a diagnostics vendor and complete its privacy
      review; no vendor activation is included here.
- [ ] Review legal/privacy disclosures, screenshots, age rating, store listing,
      and public release decision.
- [ ] Build signed artifacts and submit to TestFlight/Google Play.

No checklist item authorizes deployment, provider activation, billing, OAuth
production changes, or public release.
