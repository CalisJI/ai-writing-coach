from pathlib import Path
import pytest
from writing_coach.persistence.runtime import build_runtime
from writing_coach.persistence.auth_repository import SQLiteAuthRepository
from writing_coach.persistence.platform_repository import SQLitePlatformRepository
from writing_coach.product.repository import SQLiteProductRepository
from writing_coach.persistence.learning_repository import SQLiteLearningRepository
from writing_coach.persistence.specialized_repository import SQLiteSpecializedLearningRepository
from writing_coach.persistence.learning_repository import SQLiteLearningCacheRepository
import sqlite3

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

def test_environment_default_explicit_and_shadow_isolation(tmp_path, monkeypatch):
    monkeypatch.delenv('PERSISTENCE_BACKEND',raising=False); monkeypatch.setenv('POSTGRES_SHADOW_URL','postgresql+psycopg://shadow-example')
    assert make(tmp_path).backend == 'sqlite'
    monkeypatch.setenv('PERSISTENCE_BACKEND','sqlite'); assert make(tmp_path).backend == 'sqlite'

def test_auth_platform_fail_closed_and_injection(monkeypatch, tmp_path):
    import auth_support
    from writing_coach.ai import platform
    monkeypatch.setattr(auth_support,'_auth_repository',None); monkeypatch.setattr(platform,'_platform_repository',None)
    with pytest.raises(RuntimeError,match='Auth repository'): auth_support.auth_user('x')
    with pytest.raises(RuntimeError,match='Platform repository'): platform.init_platform_ai_db()
    runtime=make(tmp_path)
    auth_support.configure_auth_repository(runtime.auth_repository); platform.configure_platform_repository(runtime.platform_repository)
    assert auth_support._installed_auth_repository() is runtime.auth_repository
    assert platform._installed_platform_repository() is runtime.platform_repository

def test_cache_is_independent_of_authoritative_learning_repository(tmp_path):
    def connect():
        conn=sqlite3.connect(tmp_path/'cache.db'); conn.row_factory=sqlite3.Row; return conn
    cache=SQLiteLearningCacheRepository(connect); cache.initialize(); cache.put_dictionary('word',{'definition':'x'},'now')
    assert cache.get_dictionary('word')['payload_json']
