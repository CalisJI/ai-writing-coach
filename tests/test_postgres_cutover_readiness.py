"""Executable v1.3.6 regression tests; all PostgreSQL access is test-local."""
from __future__ import annotations

import importlib.util
import json
import sqlite3
import sys
from datetime import datetime, timezone
from pathlib import Path

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from writing_coach.persistence.cutover_verification import _time, compare_domain_parity
from writing_coach.persistence.ids import stable_uuid
from writing_coach.persistence.importer import Discovery
from writing_coach.persistence.models import Base, PlatformSetting, Subscription, UsageEvent, User

ROOT = Path(__file__).resolve().parents[1]


@pytest.fixture()
def rehearsal_module():
    spec = importlib.util.spec_from_file_location("cutover_rehearsal_test", ROOT / "scripts/postgres_cutover_rehearsal.py")
    module = importlib.util.module_from_spec(spec)
    assert spec.loader
    spec.loader.exec_module(module)
    return module


def test_verify_alembic_head_success_returns_evidence(monkeypatch, rehearsal_module) -> None:
    class Connection:
        def __enter__(self): return self
        def __exit__(self, *args): return False
    class Engine:
        def connect(self): return Connection()
    monkeypatch.setattr(rehearsal_module, "create_shadow_engine", lambda _url: Engine())
    monkeypatch.setattr(rehearsal_module.ScriptDirectory, "from_config", lambda _cfg: type("S", (), {"get_current_head": lambda self: "head"})())
    monkeypatch.setattr(rehearsal_module.MigrationContext, "configure", lambda _connection: type("C", (), {"get_current_revision": lambda self: "head"})())
    result = rehearsal_module.verify_alembic_head("postgresql+psycopg://redacted")
    assert result == {"step": "alembic-head-verification", "returncode": 0, "expected_revision": "head", "actual_revision": "head"}


def _head_dependencies(monkeypatch, module, expected: str, actual: str | None = None, error: Exception | None = None) -> None:
    class Connection:
        def __enter__(self): return self
        def __exit__(self, *args): return False
    class Engine:
        def connect(self):
            if error: raise error
            return Connection()
    monkeypatch.setattr(module, "create_shadow_engine", lambda _url: Engine())
    monkeypatch.setattr(module.ScriptDirectory, "from_config", lambda _cfg: type("S", (), {"get_current_head": lambda self: expected})())
    monkeypatch.setattr(module.MigrationContext, "configure", lambda _connection: type("C", (), {"get_current_revision": lambda self: actual})())


def test_verify_alembic_head_real_mismatch_includes_revisions(monkeypatch, rehearsal_module) -> None:
    _head_dependencies(monkeypatch, rehearsal_module, "expected-rev", "actual-rev")
    with pytest.raises(RuntimeError, match="expected-rev.*actual-rev"):
        rehearsal_module.verify_alembic_head("postgresql+psycopg://redacted")


@pytest.mark.parametrize("expected,actual,error", [("expected-rev", "actual-rev", None), ("expected-rev", None, RuntimeError("connection unavailable"))])
def test_final_head_failures_are_structured(monkeypatch, capsys, rehearsal_module, expected, actual, error) -> None:
    monkeypatch.setattr(rehearsal_module, "discover_sources", lambda _path: Discovery(data_root=Path("/data")))
    monkeypatch.setattr(rehearsal_module, "run", lambda label, command, completed: {"step": label, "returncode": 0})
    _head_dependencies(monkeypatch, rehearsal_module, expected, actual, error)
    monkeypatch.setattr(rehearsal_module, "shadow_url", lambda: "postgresql+psycopg://redacted")
    monkeypatch.setattr(sys, "argv", ["rehearsal"])
    with pytest.raises(SystemExit): rehearsal_module.main()
    output = capsys.readouterr().out
    report = json.loads(output)
    assert report["ok"] is False and report["runtime"] == "sqlite"
    assert report["completed_steps"]
    assert report["failing_step"]["step"] == "alembic-head-verification"
    assert "PASS" not in output
    if error is None: assert "expected-rev" in report["failing_step"]["error"] and "actual-rev" in report["failing_step"]["error"]


def test_orphan_preflight_prevents_subprocess(monkeypatch, capsys, rehearsal_module) -> None:
    monkeypatch.setattr(rehearsal_module, "discover_sources", lambda _path: Discovery(data_root=Path("/data"), orphan_user_dirs=["orphan-hash"]))
    monkeypatch.setattr(rehearsal_module, "run", lambda *args: pytest.fail("subprocess invoked after orphan preflight"))
    monkeypatch.setattr(sys, "argv", ["rehearsal"])
    with pytest.raises(SystemExit): rehearsal_module.main()
    output=capsys.readouterr().out
    report=json.loads(output)
    assert report["ok"] is False and report["failing_step"]["step"] == "source-discovery"
    assert "orphan-hash" in report["failing_step"]["orphan_user_dirs"]


def _domain_fixture(tmp_path: Path, subscription_end: str, usage_at: str, auth_email: str = "a@example.com"):
    product=tmp_path/"product.db"; platform=tmp_path/"platform.db"
    with sqlite3.connect(product) as c:
        c.execute("CREATE TABLE subscriptions (user_key,plan_id,status,provider,external_customer_id,external_subscription_id,current_period_end)")
        c.execute("CREATE TABLE usage_events (id,user_key,feature,amount,request_id,occurred_at)")
        c.execute("INSERT INTO subscriptions VALUES ('C','pro','active','p','customer','sub',?)",(subscription_end,))
        c.execute("INSERT INTO usage_events VALUES (1,'C','writing',2,'r',?)",(usage_at,))
    with sqlite3.connect(platform) as c:
        c.execute("CREATE TABLE platform_ai_config (provider,model)"); c.execute("INSERT INTO platform_ai_config VALUES ('openai','model')")
    engine=create_engine("sqlite://")
    Base.metadata.create_all(engine)
    with Session(engine) as s, s.begin():
        for key,email,name,role in [("A",auth_email,"A","user"),("B","b@example.com","B","admin"),("C","","","user")]: s.add(User(id=stable_uuid("user",key),user_key=key,email=email,name=name,picture="",role=role,created_at=datetime.now(timezone.utc),last_login=None))
        s.add(Subscription(id=stable_uuid("subscription","C"),user_id=stable_uuid("user","C"),plan_id="pro",status="active",provider="p",external_customer_id="customer",external_subscription_id="sub",current_period_end=datetime.fromisoformat(subscription_end.replace("Z","+00:00")),updated_at=datetime.now(timezone.utc)))
        s.add(UsageEvent(id=stable_uuid("usage-legacy","C",1),user_id=stable_uuid("user","C"),feature="writing",amount=2,request_id="r",occurred_at=datetime.fromisoformat(usage_at.replace("Z","+00:00"))))
        s.add(PlatformSetting(key="ai.active_selection",value={"provider":"openai","model":"model"},updated_at=datetime.now(timezone.utc),updated_by=""))
    return engine, Discovery(data_root=tmp_path, auth_users=[{"google_sub":"A","email":auth_email,"name":"A","role":"user"},{"google_sub":"B","email":"b@example.com","name":"B","role":"admin"}], product_db=product, platform_db=platform)


def test_timestamp_semantics_and_product_only_user(tmp_path: Path) -> None:
    engine, discovery=_domain_fixture(tmp_path,"2026-01-02T00:00:00+00:00","2026-01-01T01:00:00+00:00")
    # The canonicalizer preserves instant equality across PostgreSQL offsets.
    assert _time("2026-01-02T00:00:00+00:00") == _time("2026-01-01T19:00:00-05:00")
    assert _time("2026-01-01T01:00:00+00:00") == _time("2025-12-31T20:00:00-05:00")
    # SQLite fixtures do not retain offsets, so store the equivalent UTC values.
    with Session(engine) as s, s.begin():
        s.get(Subscription,stable_uuid("subscription","C")).current_period_end=datetime(2026,1,2,tzinfo=timezone.utc)
        s.get(UsageEvent,stable_uuid("usage-legacy","C",1)).occurred_at=datetime(2026,1,1,1,tzinfo=timezone.utc)
    assert compare_domain_parity(engine,discovery)["ok"]
    with Session(engine) as s, s.begin(): s.get(Subscription,stable_uuid("subscription","C")).current_period_end=datetime(2027,1,1,tzinfo=timezone.utc)
    assert not compare_domain_parity(engine,discovery)["ok"]
    with Session(engine) as s, s.begin(): s.get(Subscription,stable_uuid("subscription","C")).current_period_end=datetime(2026,1,2,tzinfo=timezone.utc); s.get(UsageEvent,stable_uuid("usage-legacy","C",1)).occurred_at=datetime(2027,1,1,tzinfo=timezone.utc)
    assert not compare_domain_parity(engine,discovery)["ok"]


def test_real_auth_source_field_mismatch_fails(tmp_path: Path) -> None:
    engine, discovery=_domain_fixture(tmp_path,"2026-01-02T00:00:00Z","2026-01-01T01:00:00Z", auth_email="a@example.com")
    with Session(engine) as s, s.begin(): s.get(User,stable_uuid("user","A")).email="wrong@example.com"
    assert any(item["domain"] == "auth" for item in compare_domain_parity(engine,discovery)["mismatches"])
