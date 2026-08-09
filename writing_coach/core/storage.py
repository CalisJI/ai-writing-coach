from __future__ import annotations

import hashlib
import os
import shutil
from pathlib import Path

from writing_coach.core.language_registry import DEFAULT_LANGUAGE


def user_hash(user_key: str) -> str:
    return hashlib.sha256(user_key.encode("utf-8")).hexdigest()[:24]


def _safe_language(language_code: str | None) -> str:
    value = (language_code or DEFAULT_LANGUAGE).strip().casefold()
    if not value or not value.replace("-", "").isalnum():
        return DEFAULT_LANGUAGE
    return value


def _atomic_copy_once(source: Path, target: Path) -> None:
    if target.exists() or not source.exists():
        return
    target.parent.mkdir(parents=True, exist_ok=True)
    temp = target.with_suffix(target.suffix + f".migrating-{os.getpid()}")
    try:
        shutil.copy2(source, temp)
        os.replace(temp, target)
    finally:
        if temp.exists():
            temp.unlink(missing_ok=True)


def resolve_language_db_path(
    *,
    user_key: str,
    language_code: str,
    legacy_db: Path,
    user_data_root: Path,
    auth_enabled: bool,
) -> Path:
    """Resolve one canonical SQLite DB for one user + one language."""

    lang = _safe_language(language_code)

    if not auth_enabled or not user_key or user_key == "legacy":
        if lang == DEFAULT_LANGUAGE:
            return legacy_db
        return legacy_db.parent / "languages" / lang / "writing.db"

    root = user_data_root / user_hash(user_key)
    canonical = root / lang / "writing.db"

    # v0.8 authenticated English DB compatibility.
    if lang == DEFAULT_LANGUAGE:
        _atomic_copy_once(root / "writing.db", canonical)

    return canonical
