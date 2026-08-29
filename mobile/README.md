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
a truthful localized error boundary, and the R19-B API/session bootstrap
boundary. R19-C adds SecureStore-backed native sessions and a system-browser
OAuth handoff; audio and learner flows remain reserved for later R19 clusters.

The interface locale starts from the device language (`zh` selects Chinese;
other or unavailable device locales fall back to English) and can be changed
through the accessible EN/ZH selector in Profile. This is UI presentation
state and is independent from the server-authoritative learning language.

Public configuration names are `EXPO_PUBLIC_API_BASE_URL` and
`EXPO_PUBLIC_APP_ENV`; no private credentials belong in this workspace.

R19-B's typed API client is the single network boundary. It normalizes and
validates `GET /api/session/bootstrap` (`orena.session-bootstrap.v1`), attaches
the backend-compatible `writing_coach_session` cookie when supplied by the
native session layer, uses bounded no-store reads, supports cancellation and timeout handling, and maps
network, authentication, permission, server, rejection, and invalid-response
failures to safe categories without retaining response bodies. A missing or
invalid `EXPO_PUBLIC_API_BASE_URL` renders the truthful unavailable shell
state; a server 401 renders signed-out navigation. Bootstrap data is query
state with zero stale time and is never treated as local session authority.

R19-C keeps the reusable signed cookie in Expo SecureStore with device-bound
keychain accessibility. Restore reads SecureStore before bootstrap validation;
expired or invalid bootstrap responses clear the local cookie, and logout
best-effort calls the server `/auth/logout` endpoint before clearing it locally
(the current signed-cookie server cannot revoke a cookie held by the native
client). Native
sign-in uses the system browser and the `orena://auth/callback` deep-link
boundary. The backend owns OAuth state, nonce, and provider PKCE; the app also
binds the one-use handoff to a cryptographic verifier generated on-device.
The app exchanges that handoff for the signed cookie; native logout reports
local clearing truthfully until a durable server revocation store is adopted.
The development
harness remains available without production OAuth registration or credentials.

Android package and iOS bundle identifiers default to `org.chillpickle.orena`.
`eas.json` contains development, preview, and production build profiles without
signing material. Store credentials, signing, OAuth registration, and device or
Xcode-only validation remain human actions.
