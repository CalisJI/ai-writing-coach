# Orena native mobile foundation

This directory is the native Android/iOS shell for Orena. It is React Native +
Expo + TypeScript with Expo Router; it is not a WebView wrapper and contains no
learning-domain implementation. The existing Orena backend remains the source
of truth for later vertical slices.

## Local commands

```sh
npm ci
npm run lint
npm run typecheck
npm test
npx expo start
npx expo run:android
npx expo run:ios
```

`npm run validate` runs lint, strict typecheck, and the focused shell tests.

The shell currently provides signed-out and authenticated route groups through
an in-memory development harness. It includes safe-area support, automatic
system/light/dark theme behavior, shared EN/ZH messages, accessible controls,
and a truthful localized error boundary. API/session bootstrap, secure session
storage, OAuth, audio, and learner flows are intentionally reserved for later
R19 clusters.

The interface locale starts from the device language (`zh` selects Chinese;
other or unavailable device locales fall back to English) and can be changed
through the accessible EN/ZH selector in Profile. This is UI presentation
state and is independent from the server-authoritative learning language.

Public configuration names are `EXPO_PUBLIC_API_BASE_URL` and
`EXPO_PUBLIC_APP_ENV`; no private credentials belong in this workspace.

Android package and iOS bundle identifiers default to `org.chillpickle.orena`.
`eas.json` contains development, preview, and production build profiles without
signing material. Store credentials, signing, OAuth registration, and device or
Xcode-only validation remain human actions.
