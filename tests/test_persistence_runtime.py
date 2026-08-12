from pathlib import Path
import pytest
from writing_coach.persistence.runtime import build_runtime
from writing_coach.persistence.auth_repository import SQLiteAuthRepository
from writing_coach.persistence.platform_repository import SQLitePlatformRepository
from writing_coach.product.repository import SQLiteProductRepository
from writing_coach.persistence.learning_repository import SQLiteLearningRepository
from writing_coach.persistence.specialized_repository import SQLiteSpecializedLearningRepository
from writing_coach.persistence.auth_repository import PostgresAuthRepository
from writing_coach.persistence.platform_repository import PostgresPlatformRepository
from writing_coach.persistence.product_repository import PostgresProductRepository
from writing_coach.persistence.learning_repository import PostgresLearningRepository
from writing_coach.persistence.specialized_repository import PostgresSpecializedLearningRepository
import writing_coach.persistence.runtime as runtime_module
from writing_coach.persistence.learning_repository import SQLiteLearningCacheRepository
from writing_coach.product.service import ProductService
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
    with pytest.raises(RuntimeError,match='POSTGRES_RUNTIME_URL'): make(tmp_path,'postgresql')

def test_environment_default_explicit_and_shadow_isolation(tmp_path, monkeypatch):
    monkeypatch.delenv('PERSISTENCE_BACKEND',raising=False); monkeypatch.setenv('POSTGRES_SHADOW_URL','postgresql+psycopg://shadow-example')
    assert make(tmp_path).backend == 'sqlite'
    monkeypatch.setenv('PERSISTENCE_BACKEND','sqlite'); assert make(tmp_path).backend == 'sqlite'
    monkeypatch.delenv('PERSISTENCE_BACKEND'); monkeypatch.setenv('POSTGRES_RUNTIME_URL','postgresql+psycopg://runtime-example'); assert make(tmp_path).backend == 'sqlite'

def test_postgres_runtime_shared_engine_and_no_sqlite_fallback(tmp_path, monkeypatch):
    class Connection:
        def __enter__(self): return self
        def __exit__(self,*args): return False
    class Engine:
        def connect(self): return Connection()
    engine=Engine()
    monkeypatch.setattr(runtime_module,'create_runtime_engine',lambda:engine)
    monkeypatch.setattr(runtime_module,'_verify_runtime_readiness',lambda value: None)
    for name in ('SQLiteAuthRepository','SQLitePlatformRepository','SQLiteProductRepository','SQLiteLearningRepository','SQLiteSpecializedLearningRepository'):
        monkeypatch.setattr(runtime_module,name,lambda *a,**k: pytest.fail('SQLite constructed in PostgreSQL branch'))
    value=make(tmp_path,'postgresql')
    assert value.backend == 'postgresql' and value.engine is engine
    assert all(isinstance(item, kind) for item,kind in [(value.auth_repository,PostgresAuthRepository),(value.platform_repository,PostgresPlatformRepository),(value.product_repository,PostgresProductRepository),(value.learning_repository,PostgresLearningRepository),(value.specialized_learning_repository,PostgresSpecializedLearningRepository)])
    assert all(item.engine is engine for item in [value.auth_repository,value.platform_repository,value.product_repository,value.learning_repository,value.specialized_learning_repository])

def test_real_runtime_readiness_connectivity_failure():
    class Engine:
        def connect(self): raise OSError('offline')
    with pytest.raises(RuntimeError,match='PostgreSQL runtime unavailable'):
        runtime_module._verify_runtime_readiness(Engine())

def test_real_runtime_readiness_success_and_mismatch(monkeypatch):
    class Connection:
        def __enter__(self): return self
        def __exit__(self,*args): return False
    class Engine:
        def connect(self): return Connection()
    monkeypatch.setattr(runtime_module.ScriptDirectory,'from_config',lambda cfg:type('S',(),{'get_current_head':lambda self:'head-123'})())
    monkeypatch.setattr(runtime_module.MigrationContext,'configure',lambda conn:type('C',(),{'get_current_revision':lambda self:'head-123'})())
    assert runtime_module._verify_runtime_readiness(Engine()) is None
    monkeypatch.setattr(runtime_module.MigrationContext,'configure',lambda conn:type('C',(),{'get_current_revision':lambda self:'old-456'})())
    with pytest.raises(RuntimeError,match='expected head-123, actual old-456'):
        runtime_module._verify_runtime_readiness(Engine())

@pytest.mark.parametrize('url',[None,'sqlite:///wrong.db','postgresql://missing-psycopg'])
def test_runtime_url_missing_or_invalid_fails_before_engine(tmp_path,monkeypatch,url):
    monkeypatch.setenv('PERSISTENCE_BACKEND','postgresql')
    if url is None: monkeypatch.delenv('POSTGRES_RUNTIME_URL',raising=False)
    else: monkeypatch.setenv('POSTGRES_RUNTIME_URL',url)
    with pytest.raises(RuntimeError): make(tmp_path)

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

def test_product_service_fail_closed_and_injection():
    service=ProductService()
    with pytest.raises(RuntimeError,match='Product repository'): service.plan_for_user('user')
    class Repo:
        def get_subscription(self,key): self.key=key; return None
        def monthly_usage(self,**kwargs): return 0
    repo=Repo(); service.repository=repo
    service.plan_for_user('injected')
    assert repo.key == 'injected'

def test_backend_aware_app_initialization(monkeypatch):
    import app
    class Item:
        def __init__(self): self.calls=[]
        def initialize(self,*args,**kwargs): self.calls.append((args,kwargs))
    learning=Item(); specialized=Item(); cache=Item()
    monkeypatch.setattr(app,'_learning_repository',learning); monkeypatch.setattr(app,'_specialized_learning_repository',specialized); monkeypatch.setattr(app,'_learning_cache',cache)
    monkeypatch.setattr(app,'_persistence_runtime',type('R',(),{'backend':'sqlite'})()); app.init_db()
    assert learning.calls and specialized.calls and cache.calls
    learning.calls.clear(); specialized.calls.clear(); cache.calls.clear()
    monkeypatch.setattr(app,'_persistence_runtime',type('R',(),{'backend':'postgresql'})()); app.init_db()
    assert not learning.calls and not specialized.calls and cache.calls
