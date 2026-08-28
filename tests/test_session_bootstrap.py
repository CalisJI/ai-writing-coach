"""ASGI contract tests for the compact authenticated session bootstrap."""

import asyncio
import base64
import json

import httpx
from itsdangerous import TimestampSigner

import app as app_module
import auth_support


def _session_cookie(**values: str) -> str:
    encoded = base64.b64encode(json.dumps(values).encode("utf-8"))
    return TimestampSigner(auth_support.SESSION_SECRET or "local-single-user-mode").sign(encoded).decode("utf-8")


def test_bootstrap_is_authenticated_versioned_compact_and_language_scoped(monkeypatch):
    monkeypatch.setattr(auth_support, "AUTH_ENABLED", True)
    monkeypatch.setattr(auth_support, "auth_user", lambda sub: {"google_sub": sub, "role": "user"})
    monkeypatch.setattr(auth_support, "ensure_user_db", lambda: None)

    async def exercise():
        transport = httpx.ASGITransport(app=app_module.app)
        async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
            responses = []
            for language in ("en", "zh"):
                client.cookies.set("writing_coach_session", _session_cookie(user_sub="user-1", language=language))
                responses.append(await client.get("/api/session/bootstrap"))
            return responses

    responses = asyncio.run(exercise())
    assert [response.status_code for response in responses] == [200, 200]
    for response, language in zip(responses, ("en", "zh")):
        payload = response.json()
        assert payload["version"] == "orena.session-bootstrap.v1"
        assert payload["authenticated"] is True
        assert payload["mode"] == "google"
        assert payload["user"] == {"role": "user", "is_admin": False}
        assert payload["language"]["active"] == language
        assert {item["code"] for item in payload["language"]["options"]} == {"en", "zh"}
        assert set(payload) == {"version", "authenticated", "mode", "user", "language"}
        assert response.headers["cache-control"] == "no-store"
        assert all(secret not in repr(payload) for secret in ("user-1", "@", "essay", "text"))


def test_bootstrap_rejects_missing_and_expired_sessions_without_identity(monkeypatch):
    monkeypatch.setattr(auth_support, "AUTH_ENABLED", True)
    monkeypatch.setattr(auth_support, "auth_user", lambda _sub: None)

    async def exercise():
        transport = httpx.ASGITransport(app=app_module.app)
        async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
            missing = await client.get("/api/session/bootstrap")
            client.cookies.set("writing_coach_session", "expired-or-invalid")
            expired = await client.get("/api/session/bootstrap")
            client.cookies.set(
                "writing_coach_session",
                _session_cookie(user_sub="unknown-user", language="en"),
            )
            unknown = await client.get("/api/session/bootstrap")
            return missing, expired, unknown

    responses = asyncio.run(exercise())
    assert [response.status_code for response in responses] == [401, 401, 401]
    for response in responses:
        assert response.json() == {"detail": "Authentication required"}
        assert all(secret not in response.text for secret in ("user-1", "email", "role", "language"))
