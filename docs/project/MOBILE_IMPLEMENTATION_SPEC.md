# Orena Native Mobile Implementation Specification

Status: **APPROVED / CANONICAL FOR R19-R21**

This document is the implementation contract for Orena's native Android and iOS
client. Every R19-R21 task, Worker directive, review, and acceptance decision
must read and follow this document together with `ROADMAP.md`,
`ARCHITECTURE_INVARIANTS.md`, `PROJECT_STATE.md`, and
`CURRENT_HANDOFF.md`.

The purpose of this specification is to let an execution-focused Worker
implement safely without inventing product or architecture decisions.

## 1. Product direction

Orena mobile is a real native client, not a packaged web page.

Approved stack:

- React Native;
- Expo;
- TypeScript with strict mode;
- Expo Router for navigation;
- Android and iOS from one product codebase;
- the existing Orena backend remains authoritative;
- the existing PostgreSQL-backed learner/product state remains authoritative;
- EN and ZH are first-class mobile languages in every shared flow;
- server-managed AI/provider secrets remain server-side;
- no WebView as the primary learner application shell.

R18 is the API/mobile-readiness foundation. R19-R21 build the actual mobile
product on top of those contracts.

## 2. Non-negotiable architecture

Mobile must not create a second learning architecture.

Do not duplicate or redefine:

- Writing scoring or evaluation semantics;
- Speaking/pronunciation/proficiency semantics;
- Reading evaluation semantics;
- Grammar concept IDs, Grammar curriculum, or Grammar renderer source truth;
- Media Learning asset/segment identity;
- learner progress authority;
- subscription/entitlement truth;
- provider routing or AI capability configuration;
- production authentication authority.

Mobile may add platform adapters only for genuine native concerns such as
navigation, secure storage, app lifecycle, network status, microphone/audio,
permissions, deep links, and device-safe UI layout.

## 3. Workspace and source layout

Create the application in a dedicated workspace:

```text
mobile/
├── app/
│   ├── _layout.tsx
│   ├── index.tsx
│   ├── (auth)/
│   └── (app)/
├── src/
│   ├── api/
│   │   ├── client.ts
│   │   ├── contracts/
│   │   └── errors.ts
│   ├── auth/
│   ├── components/
│   ├── features/
│   │   ├── home/
│   │   ├── writing/
│   │   ├── review/
│   │   ├── grammar/
│   │   ├── reading/
│   │   ├── listening/
│   │   ├── speaking/
│   │   ├── library/
│   │   ├── journey/
│   │   └── profile/
│   ├── i18n/
│   ├── media/
│   ├── query/
│   ├── storage/
│   ├── theme/
│   ├── types/
│   └── utils/
├── assets/
├── app.config.ts
├── eas.json
├── package.json
├── tsconfig.json
└── README.md
```

Equivalent organization is acceptable only when it preserves the same
boundaries. Do not scatter API calls, storage access, provider configuration,
or permissions directly across screen components.

## 4. Dependency direction

Preferred baseline libraries for the selected compatible stable Expo SDK set:

- `expo-router` for navigation;
- `expo-secure-store` for reusable sensitive session material;
- `@react-native-async-storage/async-storage` only for non-sensitive
  preferences/cache metadata;
- TanStack Query for server-state fetching, caching, retry policy, and
  invalidation;
- `expo-localization` plus a shared i18n layer for EN/ZH;
- the current Expo-supported native audio package, preferring `expo-audio` when
  supported by the selected SDK;
- Expo network/app-state primitives where sufficient;
- Zod or an equivalent runtime validator at high-risk mobile/API boundaries.

Do not add Redux or another global state framework by default. Add one only
when a concrete cross-feature state requirement cannot be handled cleanly by
React state, query state, and small domain stores.

Dependency versions must come from one mutually compatible Expo SDK set. Do not
mix arbitrary React Native package versions.

## 5. Environment and secrets

Client-distributable configuration may use Expo public environment variables:

```text
EXPO_PUBLIC_API_BASE_URL
EXPO_PUBLIC_APP_ENV
```

Never place private credentials in mobile source, `.env`, app config, EAS public
variables, logs, fixtures, or snapshots. This includes AI provider keys,
`SESSION_SECRET`, database credentials, OAuth client secrets, Apple private
keys, Google Play service-account keys, and billing private keys.

If a real credential is missing:

1. define only the required variable/config name;
2. implement validation and the non-secret integration boundary;
3. use mocks/fakes/local fixtures for tests;
4. record the future live check in `.overnight/human-actions.md`;
5. continue autonomous work.

A missing credential is not a reason to stop unrelated development.

## 6. API client contract

All mobile network access goes through one typed client layer.

The client must provide:

- base URL normalization;
- request timeout;
- JSON handling;
- approved authentication/session attachment;
- cancellation where lifecycle makes it relevant;
- stable mapping for network unavailable, timeout, authentication required,
  permission denied, server unavailable, invalid response, and unknown failure;
- no raw provider error leakage;
- no logging of credentials, session material, learner essays, transcript
  payloads, raw audio, or authorization headers;
- explicit retry policy; do not blindly retry mutations.

Consume existing server contracts instead of introducing mobile-only
equivalents, especially:

- `GET /api/session/bootstrap`;
- R18 immutable/versioned reference-data cache and ETag behavior;
- compact resumable media-import status responses.

If an existing API is too web-specific, add the smallest shared server contract
that benefits any client. Do not move domain logic into mobile.

## 7. Server-state and local-state policy

Server authority includes authentication, learner progress, skill outcomes,
Grammar truth, Library/Journey progress, plans/entitlements/usage, and canonical
Media Learning assets/segments.

Allowed local state includes theme preference when not server-owned, navigation
UI state, explicitly permitted draft recovery, bounded cache metadata,
immutable/versioned reference data, and transient recording/playback state.

Mutable server data cached locally remains a cache, never a second authority.
Large dictionary, stroke, transcript, audio, or media datasets are not bundled
when server contracts already provide them.

## 8. Authentication and session design

Native authentication must preserve backend authority.

Rules:

- use the system browser/platform authorization flow, not an embedded login
  WebView;
- use authorization-code + PKCE or an equivalent backend-controlled native
  OAuth handoff;
- use deep links/app links/universal links for return to the app;
- never embed an OAuth client secret;
- reusable sensitive session material uses OS-backed secure storage;
- AsyncStorage is not acceptable for reusable secrets;
- bootstrap authenticated state through the canonical session/bootstrap
  contract;
- logout clears local sensitive material and invalidates the server session when
  supported;
- expired/invalid restore falls back to a truthful signed-out state.

R19 must provide a development-safe session/auth harness so implementation can
proceed without production OAuth credentials.

Production OAuth redirect registration, console changes, and real production
credentials are deferred human actions.

## 9. Navigation

Use Expo Router.

Required route groups cover signed-out/auth, authenticated learner shell, Home,
Writing, Review, Grammar, Reading, Listening, Speaking/Shadowing, Library,
Journey, and Profile/Settings.

Preserve stable source context during cross-feature handoffs. Android hardware
back and iOS navigation behavior must remain predictable.

## 10. Theme, visual system, and accessibility

Mobile belongs visually to Orena but uses native layout primitives.

Requirements:

- derive native tokens from the existing Orena identity rather than copying web
  CSS;
- light/dark/system theme;
- safe areas;
- system text scaling within usable layout bounds;
- accessible labels/roles/states;
- practical touch targets;
- screen-reader ordering;
- reduced motion for non-essential animation;
- keyboard avoidance for Writing;
- representative portrait, landscape, and tablet checks.

EN and ZH are verified in the same acceptance cluster.

## 11. Localization

All shared learner-visible behavior is EN/ZH from first implementation.

Use shared message IDs and shared screen logic. Language adapters are only for
genuine linguistic differences. Server-authoritative learning language and
language-scoped learner evidence remain separate from interface-language
presentation choices.

## 12. Network and degraded states

Every feature must truthfully handle loading, refresh, offline, timeout,
authentication expiry, product rejection, server unavailable, provider-backed
feature unavailable, empty data, and safe stale-cache states where policy
permits.

Do not present saved/completed/mastery/scoring success after a failed request
unless the server confirmed it. Automatic retry is bounded to safe idempotent
reads unless mutation idempotency is explicitly proven.

## 13. Cache and ETag policy

Consume R18 cache semantics.

- immutable/versioned reference data may be cached using server metadata;
- preserve ETag/If-None-Match behavior where supported;
- 304 reuses the matching cached representation;
- mutable/provider-backed no-store responses remain no-store;
- authentication and sensitive learner data are never immutable cache;
- invalidation follows source version/server policy.

## 14. App lifecycle and resume

Handle foreground/background without fabricating completion.

At minimum:

- detach/cancel requests where appropriate;
- restore shell from secure session state;
- revalidate server-authoritative state after meaningful foreground return;
- preserve only approved local drafts/transient context;
- never leave microphone capture running unexpectedly in background;
- resume media/practice using canonical asset/segment identifiers.

## 15. Audio and microphone

Speaking and Shadowing require real native permission handling.

- request permission at point of need;
- configure Android runtime/manifest and iOS usage descriptions;
- localize denied/restricted/unavailable states;
- raw learner audio remains transient by default;
- do not add raw-audio account persistence;
- handle interruption, cancellation, backgrounding, failed upload/transcription;
- release playback/recording resources;
- preserve existing ASR/evaluator authority;
- transcript match, pronunciation, fluency, and proficiency remain separate
  dimensions.

## 16. Android build contract

R19 makes Android development reproducible.

Expected commands or equivalent scripts:

```text
cd mobile
npm ci
npm run lint
npm run typecheck
npm test
npx expo start
npx expo run:android
```

Android configuration includes:

- stable development application ID policy;
- default production identifier target `org.chillpickle.orena` unless an
  existing registered identifier conflicts;
- adaptive icon/splash configuration;
- required network/microphone/deep-link permissions;
- EAS development, preview, and production profiles;
- AAB-oriented production preparation;
- dev/preview artifact path where supported;
- no signing key in the repository.

If Android Studio/JDK/SDK is unavailable, prepare source, configuration, tests,
and EAS/prebuild validation, record the missing tool, and continue.

## 17. iOS build contract

The same source tree remains iOS-ready from the start.

iOS configuration includes:

- default bundle identifier target `org.chillpickle.orena` unless an existing
  registered identifier conflicts;
- display name/version/build-number policy;
- microphone usage description;
- URL scheme/universal-link design;
- secure storage/keychain behavior;
- EAS development, preview, production profiles;
- simulator-compatible configuration where possible;
- no certificate, provisioning profile, Apple private key, or App Store Connect
  credential in the repository.

On Windows, inability to run Xcode/iOS Simulator is not a blocker. Complete
portable TypeScript/static checks, Expo config validation, shared tests,
platform-conditional source review, portable prebuild/config generation, EAS
configuration, iOS permission/deep-link metadata, and mocked contract tests.
Record later macOS/Xcode/device validation as a human action.

## 18. EAS build profiles

Prepare `eas.json` with:

- `development`: development client/internal development;
- `preview`: internal QA artifact;
- `production`: store-oriented release configuration.

Production profile existence does not authorize certificate creation, signed
production build, submission, or release. No secret value belongs in committed
`eas.json`.

## 19. Testing contract

R19 baseline:

- TypeScript strict check;
- ESLint;
- unit tests for API/session/error/storage boundaries;
- EN/ZH localization-key coverage;
- navigation/auth boundary tests;
- cache/ETag tests;
- offline/timeout/auth-expiry tests;
- microphone permission tests with platform mocks;
- Android/iOS configuration validation;
- no-secret static checks.

R20 adds vertical-slice tests. R21 adds representative E2E/release QA once useful
flows exist. Reviewer runs targeted mobile tests first and avoids unrelated full
web/backend suites unless a shared contract changed.

## 20. R19 acceptance clusters

Do not split R19 into tiny one-file commits.

### R19-A — Workspace and native shell

Expo + TypeScript workspace, Expo Router, Android/iOS app config,
authenticated/signed-out shell, theme, EN/ZH foundation, safe areas,
accessibility baseline, error boundary, lint/typecheck/unit-test commands.

### R19-B — API and session bootstrap

Typed API client, public environment config, normalized errors,
timeout/offline behavior, session bootstrap, query-state foundation, and
representative contract tests.

### R19-C — Native authentication/session

Secure storage abstraction, restore/logout/expiry behavior, deep-link/auth
callback architecture, development-safe auth harness, and deferred production
OAuth actions.

### R19-D — Native media capability boundary

Microphone permission, recording/playback service boundary, Android/iOS
configuration, transient-audio behavior, denial/interruption/error states, and
tests/mocks.

### R19-E — Cache, lifecycle, and resume

Immutable reference-data cache, ETag revalidation, network reconnect,
foreground/background revalidation, canonical media/practice resume identity,
and no local authority drift.

### R19-F — Reproducible Android/iOS build preparation

Expo config validation, Android dev/prebuild path, iOS portable config/prebuild
path, EAS profiles, build/test scripts, package/bundle/version policy,
CI-ready commands, and human-action recording for unavailable host
tools/signing/store credentials.

## 21. R20 learner-flow parity order

Implement coherent native vertical slices in this order unless a real dependency
requires a bounded change:

1. Home + onboarding + next-practice/return-to-practice;
2. Writing → Evaluate → Review → Grammar targeted practice → Revise;
3. Reading → comprehension → contextual dictionary → saved word/Library;
4. Listening Follow/Active practice + durable resume;
5. Speaking recording/evaluation + pronunciation evidence + Shadowing return;
6. Grammar + Library/Active Recall + Journey + Profile/Settings;
7. cross-skill parity, accessibility, poor-network, orientation/tablet, and
   regression closeout.

A vertical slice includes shared API integration, EN/ZH, loading/degraded
states, accessibility, and tests. A lone label/button/API wrapper/localization
key is not an independent milestone.

## 22. R21 release-readiness scope

Autonomous work completed before asking the human coordinator:

- package/bundle identifiers and version/build-number policy;
- icon/splash configuration using approved/existing assets or explicit
  placeholders;
- production-safe environment separation;
- deep-link/OAuth configuration code;
- Android/iOS permission declarations;
- EAS profiles;
- CI/release scripts with no secrets;
- privacy/data-handling checklist;
- crash/error diagnostics boundary with redaction;
- R15-compatible mobile entitlement/store-purchase integration scaffolding
  without billing activation;
- Android/iOS QA matrix;
- store-listing/privacy metadata templates;
- release checklist separating local acceptance from production action.

Deferred human-only actions:

- Apple Developer/App Store Connect credentials;
- Google Play credentials/service account;
- certificates/provisioning/signing keys;
- production OAuth console changes;
- production provider/API credentials or activation;
- billing/store-purchase activation;
- TestFlight/App Store submission;
- Google Play internal/production submission;
- public release decision;
- macOS/Xcode/physical iOS validation when unavailable.

## 23. Human-action policy

Human-only prerequisites are recorded in:

```text
.overnight/human-actions.md
```

Record only the action/tool/credential name, why it is needed, and the exact
future validation it unlocks. Never record secret values.

After recording a human action, continue another autonomous task whenever one
exists in R19-R21. Only when no coherent autonomous non-production task remains
may the controller return idle.

## 24. Definition of Done

A mobile cluster is complete only when:

- implementation is coherent end-to-end for that cluster;
- EN/ZH shared behavior is present where learner-visible;
- Android and iOS configuration implications are handled together;
- no secret was added;
- server/domain authority is preserved;
- targeted tests pass;
- TypeScript/lint checks pass for touched mobile code;
- truthful degraded states are covered;
- Reviewer independently checks the diff against this specification;
- unavailable human-only validation is recorded, not falsely marked PASS.

A local mobile acceptance PASS never implies public skill promotion, provider
activation, billing activation, signed store release, or production deployment.
