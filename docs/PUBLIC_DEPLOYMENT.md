# BECOMING Public Deployment Contract

## Deployment modes

The app uses configuration rather than source edits to choose its public origin.

| Mode | Required public origin | Authentication |
| --- | --- | --- |
| Local development | `APP_ENV=development`; `PUBLIC_BASE_URL` defaults to `http://127.0.0.1:8000` | Google OAuth is optional; local developer mode remains available when it is unset. |
| Public deployment | `APP_ENV=production`; HTTPS `PUBLIC_BASE_URL` | Google OAuth and `SESSION_SECRET` are mandatory. |

`APP_ENV=public` and `APP_ENV=prod` are accepted aliases for production.

## Required public configuration

```env
APP_ENV=production
APP_BIND_HOST=127.0.0.1
PUBLIC_BASE_URL=https://becoming.example.com
SESSION_SECRET=replace-with-a-long-random-secret
GOOGLE_CLIENT_ID=google-client-id
GOOGLE_CLIENT_SECRET=google-client-secret
CLOUDFLARE_TUNNEL_TOKEN=cloudflare-tunnel-token
```

Do not commit `.env`. Keep all values above in the deployment environment or a
local untracked `.env` file.

Production refuses to start when its origin is missing, HTTP, or local; when
Google OAuth is absent; or when `SESSION_SECRET` is missing. It never falls
back to the local-admin mode in production.

## Google OAuth callback

By default the callback is derived as:

```text
PUBLIC_BASE_URL + /auth/google/callback
```

For example, `https://becoming.example.com` becomes
`https://becoming.example.com/auth/google/callback`.

`GOOGLE_REDIRECT_URI` is an optional explicit override. It must be an absolute
HTTP(S) URL ending exactly in `/auth/google/callback` on the same normalized
origin as `PUBLIC_BASE_URL`. It is retained for compatibility with existing
configuration, not for a distinct callback host.

In Google Cloud Console, add the public callback URI as an Authorized redirect
URI. Local and public callback URIs can coexist in the same OAuth client, for
example `http://127.0.0.1:8000/auth/google/callback` and the HTTPS public URI.

## Cloudflare Tunnel

Expected path:

```text
Internet → Cloudflare HTTPS → Cloudflare Tunnel → writing-coach container
```

Start public mode:

```powershell
docker compose --profile public up -d --build
```

Set `APP_BIND_HOST=127.0.0.1` for public mode so the host port is loopback-only.
Cloudflared reaches the container over the Compose network; do not publish port
8000 or Ollama to the internet. Callback and cookie configuration use
`PUBLIC_BASE_URL`, so the app does not trust arbitrary `Forwarded` or
`X-Forwarded-*` request headers.

## Health and readiness

- `GET /api/health` is a liveness/status endpoint.
- `GET /api/readiness` reports only non-sensitive deployment readiness fields:
  `ready`, `environment`, and `auth_enabled`.

Neither endpoint returns secrets, callback values, API keys, or credentials.

## CORS and host handling

The browser application is same-origin, so no CORS middleware is configured
and no permissive wildcard origin is required. The public callback origin comes
from `PUBLIC_BASE_URL`; the application does not infer it from arbitrary proxy
headers. Configure Cloudflare and the tunnel to route only the intended public
hostname.

## Local startup

```powershell
Copy-Item .env.example .env
docker compose up -d --build
```

The default local origin is `http://127.0.0.1:8000`. Google OAuth may remain
unset for local developer mode. The default `APP_BIND_HOST=0.0.0.0` preserves
direct LAN/Tailscale access; use a host-specific `PUBLIC_BASE_URL` only when
the browser and OAuth callback need that origin.

## Persistent-data responsibility

SQLite runtime data is stored in the `ai-writing-coach-data` Docker volume.
PostgreSQL shadow data is stored in `ai-writing-coach-postgres-data`. Back up
both volumes before host maintenance or upgrades. Do not use `docker compose
down -v` unless intentional data deletion has been approved. SQLite remains
authoritative; the PostgreSQL volume is shadow verification data only.
