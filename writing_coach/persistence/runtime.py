"""Single authoritative persistence-family selection; Phase A is SQLite-only."""
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

@dataclass(frozen=True)
class PersistenceRuntime:
    backend: str
    auth_repository: AuthRepository
    platform_repository: PlatformRepository
    product_repository: ProductRepository
    learning_repository: LearningRepository
    specialized_learning_repository: SpecializedLearningRepository

def build_runtime(*, auth_db: Path, platform_db: Path, product_db: Path, learning_path: Callable[[], Path], backend: str | None = None) -> PersistenceRuntime:
    selected=(backend if backend is not None else os.getenv('PERSISTENCE_BACKEND','sqlite')).strip().casefold() or 'sqlite'
    if selected == 'postgresql': raise RuntimeError('PostgreSQL runtime cutover is not enabled in this phase.')
    if selected != 'sqlite': raise RuntimeError(f'Unsupported PERSISTENCE_BACKEND: {selected!r}.')
    learning=SQLiteLearningRepository(learning_path)
    return PersistenceRuntime('sqlite',SQLiteAuthRepository(auth_db),SQLitePlatformRepository(platform_db),SQLiteProductRepository(product_db),learning,SQLiteSpecializedLearningRepository(learning.connect))
