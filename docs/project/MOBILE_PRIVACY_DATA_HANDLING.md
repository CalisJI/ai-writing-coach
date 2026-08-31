# Orena Mobile Privacy and Data Handling

Status: **LOCAL PREPARATION / NO PRODUCTION COLLECTION ACTIVATED**

This inventory describes the native client boundary. The Orena backend and
PostgreSQL remain authoritative; this document does not authorize a new data
store, telemetry vendor, or production release.

| Surface | Data touched | Local handling | Persistence/egress |
| --- | --- | --- | --- |
| Microphone and Speaking | Temporary recording URI and provider response | Native recording is transient; interrupted/cancelled takes are released | Audio is uploaded only to the existing authenticated evaluation API when the learner submits; raw audio is not persisted by the app or account store |
| Session | Signed session cookie and bootstrap state | Cookie uses Expo SecureStore; bootstrap is query state | Cookie is attached only to the configured API; never logged or sent to diagnostics |
| Learner drafts | Explicitly permitted writing recovery state | Existing handoff/local draft boundaries only | No new diagnostics or analytics persistence; server evaluation remains authoritative |
| Query/cache state | Bounded mutable API cache and immutable reference cache | TanStack Query/cache policies and ETag behavior | Mutable learner data is not treated as an authority and is not sent to telemetry |
| Network | Request category, timeout/cancellation, and bounded lifecycle events | API client maps failures to safe categories | Diagnostics accepts only the closed event schema; no URL, body, headers, token, essay, transcript, audio, or provider key |
| Preferences | Theme and interface locale | Local UI preference state | Not learner progress or entitlement authority |

The mobile diagnostics module is vendor-neutral and allowlisted by construction.
It is not connected to a collector. Any future adapter must preserve the closed
schema and undergo a separate privacy/release decision.

Learners can use the app without granting microphone permission until Speaking
is requested. Denial or restriction leaves other learning routes available.
