from __future__ import annotations

import os

from sqlalchemy import Engine, create_engine

SHADOW_URL_ENV = "POSTGRES_SHADOW_URL"
RUNTIME_URL_ENV = "POSTGRES_RUNTIME_URL"


def shadow_url(value: str | None = None) -> str:
    """Return the explicitly configured shadow PostgreSQL URL.

    No default is provided: shadow operations remain explicit and this value
    is never used to select the authoritative application runtime.
    """

    url = (value if value is not None else os.getenv(SHADOW_URL_ENV, "")).strip()
    if not url:
        raise RuntimeError(
            f"{SHADOW_URL_ENV} is not configured for a shadow operation."
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
