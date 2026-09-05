from __future__ import annotations

import json
import os
import re
from typing import Any

from cryptography.fernet import Fernet, InvalidToken


MASTER_KEY_ENV = "AI_PROVIDER_SECRETS_KEY"
_PROVIDER_ID = re.compile(r"^[a-z][a-z0-9-]{1,39}$")


class ProviderCredentialStoreError(RuntimeError):
    """A provider credential cannot be safely read or written."""


def credential_setting_key(provider_id: str) -> str:
    normalized = str(provider_id or "").strip().casefold()
    if not _PROVIDER_ID.fullmatch(normalized):
        raise ProviderCredentialStoreError("Invalid provider identifier.")
    return f"ai.provider_credential.{normalized}"


def _encrypter() -> Fernet:
    raw_key = os.getenv(MASTER_KEY_ENV, "").strip()
    if not raw_key:
        raise ProviderCredentialStoreError(
            f"{MASTER_KEY_ENV} is required for UI-managed provider credentials."
        )
    try:
        return Fernet(raw_key.encode("ascii"))
    except (ValueError, UnicodeEncodeError) as exc:
        raise ProviderCredentialStoreError("Provider credential encryption is unavailable.") from exc


def encrypt_credentials(provider_id: str, credentials: dict[str, Any]) -> dict[str, Any]:
    payload = {
        "version": 1,
        "provider": str(provider_id).strip().casefold(),
        "ciphertext": _encrypter().encrypt(
            json.dumps(credentials, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
        ).decode("ascii"),
    }
    return payload


def decrypt_credentials(provider_id: str, envelope: object) -> dict[str, Any]:
    if not isinstance(envelope, dict) or envelope.get("version") != 1:
        raise ProviderCredentialStoreError("Stored provider credential is invalid.")
    if envelope.get("provider") != str(provider_id).strip().casefold():
        raise ProviderCredentialStoreError("Stored provider credential does not match provider.")
    ciphertext = envelope.get("ciphertext")
    if not isinstance(ciphertext, str) or not ciphertext:
        raise ProviderCredentialStoreError("Stored provider credential is invalid.")
    try:
        raw = _encrypter().decrypt(ciphertext.encode("ascii"))
        value = json.loads(raw.decode("utf-8"))
    except (InvalidToken, UnicodeError, ValueError, TypeError) as exc:
        raise ProviderCredentialStoreError("Stored provider credential cannot be decrypted.") from exc
    if not isinstance(value, dict):
        raise ProviderCredentialStoreError("Stored provider credential is invalid.")
    return value
