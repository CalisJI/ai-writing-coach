from __future__ import annotations

import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Protocol

from sqlalchemy import Engine, func, select
from sqlalchemy.orm import Session

from writing_coach.persistence.config import create_shadow_engine
from writing_coach.persistence.ids import stable_uuid
from writing_coach.persistence.models import User


class AuthRepository(Protocol):
    def initialize(self, admin_emails: set[str]) -> None: ...
    def get_user(self, google_sub: str) -> dict[str, Any] | None: ...
    def upsert_user(self, info: dict[str, Any], admin_emails: set[str]) -> dict[str, Any]: ...


class SQLiteAuthRepository:
    """Current authoritative authentication store behind a repository boundary."""

    def __init__(self, path: Path) -> None:
        self.path = path

    def connect(self) -> sqlite3.Connection:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        conn = sqlite3.connect(self.path)
        conn.row_factory = sqlite3.Row
        return conn

    def initialize(self, admin_emails: set[str]) -> None:
        with self.connect() as conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS users (
                    google_sub TEXT PRIMARY KEY,
                    email TEXT NOT NULL UNIQUE,
                    name TEXT NOT NULL DEFAULT '',
                    picture TEXT NOT NULL DEFAULT '',
                    created_at TEXT NOT NULL,
                    last_login TEXT NOT NULL
                )
                """
            )
            cols = {str(r["name"]) for r in conn.execute("PRAGMA table_info(users)").fetchall()}
            if "role" not in cols:
                conn.execute("ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user'")
            for email in admin_emails:
                conn.execute("UPDATE users SET role='admin' WHERE lower(email)=?", (email,))
            conn.commit()

    def get_user(self, google_sub: str) -> dict[str, Any] | None:
        if not google_sub:
            return None
        with self.connect() as conn:
            row = conn.execute("SELECT * FROM users WHERE google_sub = ?", (google_sub,)).fetchone()
        return dict(row) if row else None

    def upsert_user(self, info: dict[str, Any], admin_emails: set[str]) -> dict[str, Any]:
        sub = str(info.get("sub") or "")
        email = str(info.get("email") or "").strip()
        name = str(info.get("name") or "").strip()
        picture = str(info.get("picture") or "").strip()
        if not sub or not email:
            raise ValueError("Google account did not provide a valid subject/email.")
        now = datetime.now().astimezone().isoformat(timespec="seconds")
        with self.connect() as conn:
            conn.execute(
                """
                INSERT INTO users(google_sub,email,name,picture,created_at,last_login)
                VALUES(?,?,?,?,?,?)
                ON CONFLICT(google_sub) DO UPDATE SET
                  email=excluded.email,name=excluded.name,picture=excluded.picture,last_login=excluded.last_login
                """,
                (sub, email, name, picture, now, now),
            )
            if email.casefold() in admin_emails:
                conn.execute("UPDATE users SET role='admin' WHERE google_sub=?", (sub,))
            conn.commit()
        return self.get_user(sub) or {}


class PostgresAuthRepository:
    """PostgreSQL implementation of the auth contract; not selected at runtime yet."""

    def __init__(self, engine: Engine | None = None, *, url: str | None = None) -> None:
        self.engine = engine or create_shadow_engine(url)

    def _id(self, google_sub: str):
        return stable_uuid("user", google_sub)

    def initialize(self, admin_emails: set[str]) -> None:
        # Alembic owns schema creation. This method only synchronizes configured admin roles.
        if not admin_emails:
            return
        with Session(self.engine) as session, session.begin():
            rows = session.scalars(select(User).where(func.lower(User.email).in_(sorted(admin_emails)))).all()
            for row in rows:
                row.role = "admin"

    @staticmethod
    def _payload(row: User) -> dict[str, Any]:
        return {
            "google_sub": row.user_key,
            "email": row.email,
            "name": row.name,
            "picture": row.picture,
            "created_at": row.created_at.isoformat(),
            "last_login": row.last_login.isoformat() if row.last_login else "",
            "role": row.role,
        }

    def get_user(self, google_sub: str) -> dict[str, Any] | None:
        if not google_sub:
            return None
        with Session(self.engine) as session:
            row = session.get(User, self._id(google_sub))
            return self._payload(row) if row else None

    def upsert_user(self, info: dict[str, Any], admin_emails: set[str]) -> dict[str, Any]:
        sub = str(info.get("sub") or "")
        email = str(info.get("email") or "").strip()
        name = str(info.get("name") or "").strip()
        picture = str(info.get("picture") or "").strip()
        if not sub or not email:
            raise ValueError("Google account did not provide a valid subject/email.")
        now = datetime.now(timezone.utc)
        with Session(self.engine) as session, session.begin():
            uid = self._id(sub)
            row = session.get(User, uid)
            if row is None:
                row = User(
                    id=uid,
                    user_key=sub,
                    email=email,
                    name=name,
                    picture=picture,
                    role="admin" if email.casefold() in admin_emails else "user",
                    created_at=now,
                    last_login=now,
                )
                session.add(row)
            else:
                row.email = email
                row.name = name
                row.picture = picture
                row.last_login = now
                if email.casefold() in admin_emails:
                    row.role = "admin"
            session.flush()
            payload = self._payload(row)
        return payload
