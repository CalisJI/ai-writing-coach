"""Single authoritative persistence-family selection with fail-closed PostgreSQL."""
from __future__ import annotations
import os
from dataclasses import dataclass
from pathlib import Path
from typing import Callable
from writing_coach.persistence.auth_repository import AuthRepository, SQLiteAuthRepository
from writing_coach.persistence.platform_repository import PlatformRepository, SQLitePlatformRepository
from writing_coach.product.repository import ProductRepository, SQLiteProductRepository
from writing_coach.persistence.learning_repository import LearningRepository, SQLiteLearningRepository
from writing_coach.persistence.specialized_repository import SpecializedLearningRepository, SQLiteSpecializedLearningRepository
from writing_coach.persistence.auth_repository import PostgresAuthRepository
from writing_coach.persistence.platform_repository import PostgresPlatformRepository
from writing_coach.persistence.product_repository import PostgresProductRepository
from writing_coach.persistence.learning_repository import PostgresLearningRepository
from writing_coach.persistence.specialized_repository import PostgresSpecializedLearningRepository
from writing_coach.persistence.config import create_runtime_engine
from alembic.config import Config
from alembic.script import ScriptDirectory
from alembic.runtime.migration import MigrationContext

@dataclass(frozen=True)
class PersistenceRuntime:
    backend: str
    auth_repository: AuthRepository
    platform_repository: PlatformRepository
    product_repository: ProductRepository
    learning_repository: LearningRepository
    specialized_learning_repository: SpecializedLearningRepository
    engine: object | None = None

def _verify_runtime_readiness(engine) -> None:
    cfg=Config(str(Path(__file__).parents[2]/'alembic.ini')); cfg.set_main_option('script_location',str(Path(__file__).parents[2]/'migrations'))
    expected=ScriptDirectory.from_config(cfg).get_current_head()
    try:
        with engine.connect() as connection:
            actual=MigrationContext.configure(connection).get_current_revision()
    except Exception as exc: raise RuntimeError('PostgreSQL runtime unavailable') from exc
    if actual != expected: raise RuntimeError(f'PostgreSQL runtime Alembic revision mismatch: expected {expected}, actual {actual}')

def build_runtime(*, auth_db: Path, platform_db: Path, product_db: Path, learning_path: Callable[[], Path], backend: str | None = None) -> PersistenceRuntime:
    selected=(backend if backend is not None else os.getenv('PERSISTENCE_BACKEND','sqlite')).strip().casefold() or 'sqlite'
    if selected == 'postgresql':
        engine=create_runtime_engine(); _verify_runtime_readiness(engine)
        return PersistenceRuntime('postgresql',PostgresAuthRepository(engine),PostgresPlatformRepository(engine),PostgresProductRepository(engine),PostgresLearningRepository(engine),PostgresSpecializedLearningRepository(engine),engine)
    if selected != 'sqlite': raise RuntimeError(f'Unsupported PERSISTENCE_BACKEND: {selected!r}.')
    learning=SQLiteLearningRepository(learning_path)
    return PersistenceRuntime('sqlite',SQLiteAuthRepository(auth_db),SQLitePlatformRepository(platform_db),SQLiteProductRepository(product_db),learning,SQLiteSpecializedLearningRepository(learning.connect))
