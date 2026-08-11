from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def test_core_app_has_no_direct_learning_sql():
    app = (ROOT / "app.py").read_text(encoding="utf-8")
    assert "import sqlite3" not in app
    assert "sqlite3.connect" not in app
    assert "conn.execute(" not in app
    assert "SQLiteLearningRepository" in app
    assert "PostgresLearningRepository" not in app


def test_learning_repository_contract_and_no_cutover():
    repo = (ROOT / "writing_coach/persistence/learning_repository.py").read_text(encoding="utf-8")
    for token in [
        "class LearningRepository(Protocol)",
        "class SQLiteLearningRepository",
        "class PostgresLearningRepository",
        "class SQLiteLearningCacheRepository",
    ]:
        assert token in repo
    app = (ROOT / "app.py").read_text(encoding="utf-8")
    assert "create_shadow_engine" not in app


def test_specialized_adapters_remain_explicit_blocker():
    for rel in [
        "writing_coach/becoming_memory.py",
        "writing_coach/becoming_outcomes.py",
        "writing_coach/becoming_library.py",
        "writing_coach/becoming_reading.py",
        "writing_coach/becoming_linguistics.py",
    ]:
        assert "conn.execute(" in (ROOT / rel).read_text(encoding="utf-8")
