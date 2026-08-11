from __future__ import annotations

import sqlite3
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Protocol

from sqlalchemy import Engine
from sqlalchemy.orm import Session

from writing_coach.persistence.config import create_shadow_engine
from writing_coach.persistence.models import PlatformSetting


@dataclass(frozen=True)
class AISelectionRecord:
    provider: str
    model: str
    updated_at: str = ""
    updated_by: str = ""


class PlatformRepository(Protocol):
    def initialize(self) -> None: ...
    def get_ai_selection(self) -> AISelectionRecord | None: ...
    def set_ai_selection(self, *, provider: str, model: str, updated_by: str = "") -> None: ...


class SQLitePlatformRepository:
    """Current authoritative platform-config store behind a repository boundary."""

    def __init__(self, path: Path) -> None:
        self.path = path

    def connect(self) -> sqlite3.Connection:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        conn = sqlite3.connect(self.path)
        conn.row_factory = sqlite3.Row
        return conn

    def initialize(self) -> None:
        with self.connect() as conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS platform_ai_config (
                    id INTEGER PRIMARY KEY CHECK (id = 1),
                    provider TEXT NOT NULL,
                    model TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    updated_by_sub TEXT NOT NULL DEFAULT ''
                )
                """
            )
            conn.commit()

    def get_ai_selection(self) -> AISelectionRecord | None:
        with self.connect() as conn:
            row = conn.execute(
                "SELECT provider, model, updated_at, updated_by_sub FROM platform_ai_config WHERE id = 1"
            ).fetchone()
        if not row:
            return None
        return AISelectionRecord(
            provider=str(row["provider"]),
            model=str(row["model"]),
            updated_at=str(row["updated_at"]),
            updated_by=str(row["updated_by_sub"]),
        )

    def set_ai_selection(self, *, provider: str, model: str, updated_by: str = "") -> None:
        now = datetime.now().astimezone().isoformat(timespec="seconds")
        with self.connect() as conn:
            conn.execute(
                """
                INSERT INTO platform_ai_config(id, provider, model, updated_at, updated_by_sub)
                VALUES (1, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                  provider = excluded.provider,
                  model = excluded.model,
                  updated_at = excluded.updated_at,
                  updated_by_sub = excluded.updated_by_sub
                """,
                (provider, model, now, updated_by),
            )
            conn.commit()


class PostgresPlatformRepository:
    """PostgreSQL platform-config contract; not selected at runtime yet."""

    KEY = "ai.active_selection"

    def __init__(self, engine: Engine | None = None, *, url: str | None = None) -> None:
        self.engine = engine or create_shadow_engine(url)

    def initialize(self) -> None:
        # Alembic owns schema creation.
        return None

    def get_ai_selection(self) -> AISelectionRecord | None:
        with Session(self.engine) as session:
            row = session.get(PlatformSetting, self.KEY)
            if row is None:
                return None
            value = row.value if isinstance(row.value, dict) else {}
            return AISelectionRecord(
                provider=str(value.get("provider") or ""),
                model=str(value.get("model") or ""),
                updated_at=row.updated_at.isoformat(),
                updated_by=row.updated_by,
            )

    def set_ai_selection(self, *, provider: str, model: str, updated_by: str = "") -> None:
        now = datetime.now(timezone.utc)
        with Session(self.engine) as session, session.begin():
            row = session.get(PlatformSetting, self.KEY)
            value = {"provider": provider, "model": model}
            if row is None:
                session.add(
                    PlatformSetting(
                        key=self.KEY,
                        value=value,
                        updated_at=now,
                        updated_by=updated_by,
                    )
                )
            else:
                row.value = value
                row.updated_at = now
                row.updated_by = updated_by
