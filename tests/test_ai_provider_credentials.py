from __future__ import annotations

import json
import secrets
from types import SimpleNamespace

import pytest
from cryptography.fernet import Fernet
from fastapi import Request, Response

from writing_coach.ai.credentials import (
    MASTER_KEY_ENV,
    ProviderCredentialStoreError,
    decrypt_credentials,
    encrypt_credentials,
)
from writing_coach.persistence.platform_repository import SQLitePlatformRepository

import writing_coach.ai.platform as platform_module


def test_provider_credential_round_trip_is_encrypted(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv(MASTER_KEY_ENV, Fernet.generate_key().decode("ascii"))
    secret = "token-" + secrets.token_urlsafe(12)

    envelope = encrypt_credentials(
        "gemini",
        {"api_key": secret, "base_url": "https://provider.example/v1"},
    )

    assert envelope["provider"] == "gemini"
    assert secret not in json.dumps(envelope)
    assert decrypt_credentials("gemini", envelope)["api_key"] == secret


def test_provider_credential_requires_the_bootstrap_key(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv(MASTER_KEY_ENV, raising=False)

    with pytest.raises(ProviderCredentialStoreError):
        encrypt_credentials("gemini", {"api_key": "token-" + secrets.token_urlsafe(12)})


def test_sqlite_repository_persists_only_the_encrypted_envelope(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path,
) -> None:
    monkeypatch.setenv(MASTER_KEY_ENV, Fernet.generate_key().decode("ascii"))
    secret = "token-" + secrets.token_urlsafe(12)
    repository = SQLitePlatformRepository(tmp_path / "platform.db")
    repository.initialize()
    envelope = encrypt_credentials("gemini", {"api_key": secret, "models": ["gemini-2.5-flash"]})

    repository.set_provider_credential("gemini", envelope, updated_by="qa-admin")

    stored = repository.get_provider_credential("gemini")
    assert stored == envelope
    assert secret not in json.dumps(stored)
    assert decrypt_credentials("gemini", stored)["api_key"] == secret

    with repository.connect() as connection:
        row = connection.execute(
            "SELECT value_json FROM platform_settings WHERE key = ?",
            ("ai.provider_credential.gemini",),
        ).fetchone()
    assert row is not None
    assert secret not in str(row["value_json"])


def test_save_route_never_returns_the_submitted_secret(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv(MASTER_KEY_ENV, Fernet.generate_key().decode("ascii"))
    secret = "token-" + secrets.token_urlsafe(12)

    class Repository:
        def __init__(self) -> None:
            self.value = None

        def get_provider_credential(self, _provider_id):
            return self.value

        def set_provider_credential(self, _provider_id, value, *, updated_by=""):
            self.value = value

    repository = Repository()
    provider = SimpleNamespace(
        id="gemini",
        name="Gemini API",
        kind="cloud",
        secret_mode="server-managed",
        configured=True,
        base_url="https://generativelanguage.googleapis.com/v1beta/openai",
        default_model="gemini-2.5-flash",
        list_models=lambda: ["gemini-2.5-flash"],
    )
    monkeypatch.setattr(platform_module, "_platform_repository", repository)
    monkeypatch.setattr(platform_module, "_admin_guard", lambda _request: {"google_sub": "qa-admin"})
    monkeypatch.setattr(platform_module, "providers", lambda: {"gemini": provider})
    monkeypatch.setattr(platform_module, "_credential_test", lambda _provider_id, _values: ["gemini-2.5-flash"])
    request = Request(
        {
            "type": "http",
            "method": "PUT",
            "path": "/api/admin/ai/credentials/gemini",
            "headers": [(b"host", b"testserver"), (b"origin", b"http://testserver")],
        }
    )

    result = platform_module.admin_ai_provider_credential_save(
        "gemini",
        platform_module.ProviderCredentialIn(
            api_key=secret,
            base_url="https://generativelanguage.googleapis.com/v1beta/openai",
            models=["gemini-2.5-flash"],
            default_model="gemini-2.5-flash",
        ),
        request,
        Response(),
    )

    assert secret not in json.dumps(result)
    assert result["secret_saved"] is True
    assert result["secret_exposed"] is False
    assert secret not in json.dumps(repository.value)


def test_connection_test_discovers_models_without_manual_model_values(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv(MASTER_KEY_ENV, Fernet.generate_key().decode("ascii"))
    secret = "token-" + secrets.token_urlsafe(12)
    provider = SimpleNamespace(
        id="gemini",
        name="Gemini API",
        kind="cloud",
        secret_mode="server-managed",
        configured=True,
        base_url="https://generativelanguage.googleapis.com/v1beta/openai",
    )
    monkeypatch.setattr(platform_module, "_platform_repository", None)
    monkeypatch.setattr(platform_module, "_admin_guard", lambda _request: {"google_sub": "qa-admin"})
    monkeypatch.setattr(platform_module, "providers", lambda: {"gemini": provider})
    monkeypatch.setattr(
        platform_module,
        "_credential_test",
        lambda _provider_id, values: ["gemini-2.5-flash"] if not values["models"] else [],
    )
    request = Request(
        {
            "type": "http",
            "method": "POST",
            "path": "/api/admin/ai/credentials/gemini/test",
            "headers": [(b"host", b"testserver"), (b"origin", b"http://testserver")],
        }
    )

    result = platform_module.admin_ai_provider_credential_test(
        "gemini",
        platform_module.ProviderCredentialIn(
            api_key=secret,
            base_url="https://generativelanguage.googleapis.com/v1beta/openai",
            models=[],
            default_model="",
        ),
        request,
        Response(),
    )

    assert result == {
        "ok": True,
        "provider": "gemini",
        "models": ["gemini-2.5-flash"],
        "secret_saved": False,
    }
