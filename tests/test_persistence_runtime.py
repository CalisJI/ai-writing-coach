from pathlib import Path
import pytest
from writing_coach.persistence.runtime import build_runtime
from writing_coach.persistence.auth_repository import SQLiteAuthRepository
from writing_coach.persistence.platform_repository import SQLitePlatformRepository
from writing_coach.product.repository import SQLiteProductRepository
from writing_coach.persistence.learning_repository import SQLiteLearningRepository
from writing_coach.persistence.specialized_repository import SQLiteSpecializedLearningRepository

def make(tmp_path, backend=None):
    return build_runtime(auth_db=tmp_path/'auth.db', platform_db=tmp_path/'platform.db', product_db=tmp_path/'product.db', learning_path=lambda: tmp_path/'writing.db', backend=backend)
def test_default_and_explicit_sqlite_are_atomic(tmp_path):
    for value in (None,'sqlite'):
        runtime=make(tmp_path,value)
        assert runtime.backend == 'sqlite'
        assert isinstance(runtime.auth_repository,SQLiteAuthRepository)
        assert isinstance(runtime.platform_repository,SQLitePlatformRepository)
        assert isinstance(runtime.product_repository,SQLiteProductRepository)
        assert isinstance(runtime.learning_repository,SQLiteLearningRepository)
        assert isinstance(runtime.specialized_learning_repository,SQLiteSpecializedLearningRepository)
def test_invalid_and_postgres_fail_without_bundle(tmp_path):
    with pytest.raises(RuntimeError,match='Unsupported'): make(tmp_path,'invalid')
    with pytest.raises(RuntimeError,match='cutover is not enabled'): make(tmp_path,'postgresql')
