# Single authoritative persistence-family selection with fail-closed PostgreSQL.
from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path
from typing import Callable

from alembic import command
from alembic.config import Config
from alembic.runtime.migration import MigrationContext
from alembic.script import ScriptDirectory
from sqlalchemy import inspect

from writing_coach.persistence.auth_repository import (
    AuthRepository,
    PostgresAuthRepository,
    SQLiteAuthRepository,
)
from writing_coach.persistence.platform_repository import (
    PlatformRepository,
    PostgresPlatformRepository,
    SQLitePlatformRepository,
)
from writing_coach.product.repository import ProductRepository, SQLiteProductRepository
from writing_coach.persistence.product_repository import PostgresProductRepository
from writing_coach.persistence.learning_repository import (
    LearningRepository,
    PostgresLearningRepository,
    SQLiteLearningRepository,
)
from writing_coach.persistence.specialized_repository import (
    PostgresSpecializedLearningRepository,
    SpecializedLearningRepository,
    SQLiteSpecializedLearningRepository,
)
from writing_coach.persistence.config import create_runtime_engine, runtime_url


@dataclass(frozen=True)
class PersistenceRuntime:
    backend: str
    auth_repository: AuthRepository
    platform_repository: PlatformRepository
    product_repository: ProductRepository
    learning_repository: LearningRepository
    specialized_learning_repository: SpecializedLearningRepository
    engine: object | None = None


def _runtime_alembic_config(*, include_runtime_url: bool = False) -> Config:
    root = Path(__file__).parents[2]
    cfg = Config(str(root / "alembic.ini"))
    cfg.set_main_option("script_location", str(root / "migrations"))
    if include_runtime_url:
        cfg.set_main_option("sqlalchemy.url", runtime_url().replace("%", "%%"))
    return cfg


def _read_runtime_state(engine) -> tuple[str | None, set[str]]:
    with engine.connect() as connection:
        revision = MigrationContext.configure(connection).get_current_revision()
        tables = set(inspect(connection).get_table_names())
    return revision, tables


def _bootstrap_empty_runtime() -> None:
    command.upgrade(_runtime_alembic_config(include_runtime_url=True), "head")


def _verify_runtime_readiness(engine) -> None:
    expected = ScriptDirectory.from_config(_runtime_alembic_config()).get_current_head()
    try:
        actual, tables = _read_runtime_state(engine)
    except Exception as exc:
        raise RuntimeError("PostgreSQL runtime unavailable") from exc

    if actual is None and not tables:
        try:
            _bootstrap_empty_runtime()
            actual, tables = _read_runtime_state(engine)
        except Exception as exc:
            raise RuntimeError("PostgreSQL empty-runtime bootstrap failed") from exc

    if actual != expected:
        raise RuntimeError(
            f"PostgreSQL runtime Alembic revision mismatch: "
            f"expected {expected}, actual {actual}"
        )


def build_runtime(
    *,
    auth_db: Path,
    platform_db: Path,
    product_db: Path,
    learning_path: Callable[[], Path],
    backend: str | None = None,
) -> PersistenceRuntime:
    selected = (
        backend if backend is not None else os.getenv("PERSISTENCE_BACKEND", "sqlite")
    ).strip().casefold() or "sqlite"
    if selected == "postgresql":
        engine = create_runtime_engine()
        _verify_runtime_readiness(engine)
        return PersistenceRuntime(
            "postgresql",
            PostgresAuthRepository(engine),
            PostgresPlatformRepository(engine),
            PostgresProductRepository(engine),
            PostgresLearningRepository(engine),
            PostgresSpecializedLearningRepository(engine),
            engine,
        )
    if selected != "sqlite":
        raise RuntimeError(f"Unsupported PERSISTENCE_BACKEND: {selected!r}.")
    learning = SQLiteLearningRepository(learning_path)
    return PersistenceRuntime(
        "sqlite",
        SQLiteAuthRepository(auth_db),
        SQLitePlatformRepository(platform_db),
        SQLiteProductRepository(product_db),
        learning,
        SQLiteSpecializedLearningRepository(learning.connect),
    )
