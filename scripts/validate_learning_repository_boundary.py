from __future__ import annotations

import ast
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def req(condition: bool, message: str) -> None:
    if not condition:
        raise SystemExit("Learning repository boundary validation FAILED: " + message)


def text(rel: str) -> str:
    return (ROOT / rel).read_text(encoding="utf-8")


def main() -> None:
    req((ROOT / "VERSION").read_text(encoding="utf-8").strip() == "1.3.2", "app version must be 1.3.2")
    req((ROOT / "BECOMING_FRONTEND_VERSION").read_text(encoding="utf-8").strip() == "2.15.7", "frontend must remain 2.15.7")

    app = text("app.py")
    repo = text("writing_coach/persistence/learning_repository.py")

    req("import sqlite3" not in app, "app.py still imports sqlite3")
    req("sqlite3.connect" not in app, "app.py still opens SQLite directly")
    req("conn.execute(" not in app, "app.py still owns learning SQL")
    req("SQLiteLearningRepository" in app, "SQLite learning repository is not selected")
    req("PostgresLearningRepository" not in app, "PostgreSQL learning repository activated before cutover")
    req("create_shadow_engine" not in app, "app.py activated PostgreSQL before cutover")

    for token in [
        "class LearningRepository(Protocol)",
        "class SQLiteLearningRepository",
        "class PostgresLearningRepository",
        "class SQLiteLearningCacheRepository",
    ]:
        req(token in repo, f"learning repository contract missing: {token}")

    # Core API persistence paths must delegate through the selected repository.
    for token in [
        "_learning_repository.create_essay(",
        "_learning_repository.list_essays(",
        "_learning_repository.get_essay(",
        "_learning_repository.delete_series_for_essay(",
        "_learning_repository.completed_grammar_ids()",
        "_learning_repository.set_grammar_completed(",
        "_learning_repository.list_saved_words()",
        "_learning_repository.upsert_saved_word(",
        "_learning_cache.get_dictionary(",
        "_learning_cache.get_grammar_lesson(",
    ]:
        req(token in app, f"core learning path does not delegate: {token}")

    # Specialized BECOMING services are intentionally still SQLite adapters in
    # this batch. Their direct SQL remains the next cutover blocker and must be
    # visible rather than silently bypassing the repository migration plan.
    specialized = [
        "writing_coach/becoming_memory.py",
        "writing_coach/becoming_outcomes.py",
        "writing_coach/becoming_library.py",
        "writing_coach/becoming_reading.py",
        "writing_coach/becoming_linguistics.py",
    ]
    specialized_sql = []
    for rel in specialized:
        src = text(rel)
        if "conn.execute(" in src:
            specialized_sql.append(rel)
    req(specialized_sql == specialized, "specialized SQLite adapter inventory changed unexpectedly")

    # sqlite3.connect is allowed only in explicit repository/migration/verification
    # adapters. Core app and service orchestration may not open DBs directly.
    actual_connectors: set[str] = set()
    for path in [ROOT / "app.py", *sorted((ROOT / "writing_coach").rglob("*.py"))]:
        if path.name.endswith("_selftest.py") or path.name == "selftest.py":
            continue
        tree = ast.parse(path.read_text(encoding="utf-8"), filename=str(path))
        for node in ast.walk(tree):
            if not isinstance(node, ast.Call) or not isinstance(node.func, ast.Attribute):
                continue
            if isinstance(node.func.value, ast.Name) and node.func.value.id == "sqlite3" and node.func.attr == "connect":
                actual_connectors.add(path.relative_to(ROOT).as_posix())
    allowed = {
        "writing_coach/product/repository.py",
        "writing_coach/persistence/auth_repository.py",
        "writing_coach/persistence/platform_repository.py",
        "writing_coach/persistence/learning_repository.py",
        "writing_coach/persistence/importer.py",
        "writing_coach/persistence/read_compare.py",
    }
    req(actual_connectors <= allowed, f"unexpected SQLite connector bypasses: {sorted(actual_connectors - allowed)}")

    for rel in [
        "writing_coach/persistence/learning_repository.py",
        "writing_coach/persistence/learning_repository_selftest.py",
        "docs/LEARNING_REPOSITORY_BOUNDARY.md",
    ]:
        req((ROOT / rel).is_file(), f"missing learning-boundary artifact: {rel}")

    print("BECOMING learning core repository boundary validation OK")
    print("Core app direct SQLite SQL: REMOVED")
    print("Learning runtime selection: SQLiteLearningRepository")
    print("PostgreSQL core implementation: PRESENT / NOT SELECTED")
    print("Specialized BECOMING service adapters: PARTIAL / next cutover blocker")
    print("Runtime cutover: NOT ENABLED")


if __name__ == "__main__":
    main()
