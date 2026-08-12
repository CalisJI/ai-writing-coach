from __future__ import annotations

import os

from sqlalchemy import Engine, create_engine

SHADOW_URL_ENV = "POSTGRES_SHADOW_URL"
RUNTIME_URL_ENV = "POSTGRES_RUNTIME_URL"


def shadow_url(value: str | None = None) -> str:
    """Return the explicitly configured shadow PostgreSQL URL.

    No default is provided on purpose: the application must not silently
    switch away from SQLite just because this foundation exists.
    """

    url = (value if value is not None else os.getenv(SHADOW_URL_ENV, "")).strip()
    if not url:
        raise RuntimeError(
            f"{SHADOW_URL_ENV} is not configured. SQLite remains the active store."
        )
    if not url.startswith("postgresql+psycopg://"):
        raise RuntimeError(
            f"{SHADOW_URL_ENV} must use postgresql+psycopg://; got {url.split(':', 1)[0]!r}."
        )
    return url


def create_shadow_engine(value: str | None = None) -> Engine:
    return create_engine(
        shadow_url(value),
        pool_pre_ping=True,
        future=True,
    )

def runtime_url(value: str | None = None) -> str:
    url=(value if value is not None else os.getenv(RUNTIME_URL_ENV, "")).strip()
    if not url: raise RuntimeError(f"{RUNTIME_URL_ENV} is required for PostgreSQL runtime.")
    if not url.startswith("postgresql+psycopg://"): raise RuntimeError(f"{RUNTIME_URL_ENV} must use postgresql+psycopg://.")
    return url

def create_runtime_engine(value: str | None = None) -> Engine:
    return create_engine(runtime_url(value), pool_pre_ping=True, future=True)
