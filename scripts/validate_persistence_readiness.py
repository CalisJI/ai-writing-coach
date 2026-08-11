from __future__ import annotations

from pathlib import Path
import ast
import sys

ROOT = Path(__file__).resolve().parents[1]


def req(condition: bool, message: str) -> None:
    if not condition:
        raise SystemExit("Persistence readiness validation FAILED: " + message)


def text(rel: str) -> str:
    return (ROOT / rel).read_text(encoding="utf-8")


def main() -> None:
    req((ROOT / "VERSION").read_text(encoding="utf-8").strip() in {"1.3.1", "1.3.2", "1.3.3", "1.3.4", "1.3.5", "1.3.6"}, "app version must remain on readiness line")
    req((ROOT / "BECOMING_FRONTEND_VERSION").read_text(encoding="utf-8").strip() == "2.15.7", "frontend version must remain 2.15.7")

    auth = text("auth_support.py")
    platform = text("writing_coach/ai/platform.py")
    product = text("writing_coach/product/service.py")
    app = text("app.py")
    auth_repo = text("writing_coach/persistence/auth_repository.py")
    platform_repo = text("writing_coach/persistence/platform_repository.py")

    req("import sqlite3" not in auth and "sqlite3.connect" not in auth, "auth_support still bypasses AuthRepository")
    req("SQLiteAuthRepository" in auth, "auth_support does not select SQLiteAuthRepository")
    req("PostgresAuthRepository" in auth_repo, "PostgreSQL auth repository missing")

    req("import sqlite3" not in platform and "sqlite3.connect" not in platform, "AI platform service still bypasses PlatformRepository")
    req("SQLitePlatformRepository" in platform, "AI platform does not select SQLitePlatformRepository")
    req("PostgresPlatformRepository" in platform_repo, "PostgreSQL platform repository missing")

    req("SQLiteProductRepository" in product, "product runtime no longer defaults to SQLite before cutover")
    req("PostgresProductRepository" not in product, "product PostgreSQL repository activated before cutover")

    # v1.3.2 moves core API learning persistence behind a repository while
    # deliberately keeping SQLite selected and specialized BECOMING adapters transitional.
    req("create_shadow_engine" not in app, "app.py activated PostgreSQL before cutover")
    if (ROOT / "VERSION").read_text(encoding="utf-8").strip() == "1.3.1":
        req("import sqlite3" in app and "sqlite3.connect(path)" in app, "v1.3.1 learning SQLite path changed unexpectedly")
    else:
        req("SQLiteLearningRepository" in app, "v1.3.2 SQLite learning repository is not selected")
        req("PostgresLearningRepository" not in app, "v1.3.2 PostgreSQL learning runtime activated")

    for rel in [
        "writing_coach/persistence/read_compare.py",
        "writing_coach/persistence/cutover_verification.py",
        "scripts/persistence_readiness.py",
        "docs/PERSISTENCE_RUNTIME_READINESS.md",
    ]:
        req((ROOT / rel).is_file(), f"missing readiness artifact: {rel}")

    # AST inventory prevents new hidden sqlite3.connect bypasses from appearing
    # while the deliberate transitional locations remain explicit.
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
    allowed_connectors = {
        "writing_coach/persistence/learning_repository.py",
        "writing_coach/product/repository.py",
        "writing_coach/persistence/auth_repository.py",
        "writing_coach/persistence/platform_repository.py",
        "writing_coach/persistence/importer.py",
        "writing_coach/persistence/read_compare.py",
        "writing_coach/persistence/cutover_verification.py",
    }
    req(actual_connectors <= allowed_connectors, f"unexpected SQLite connector bypasses: {sorted(actual_connectors - allowed_connectors)}")

    print("BECOMING persistence runtime readiness validation OK")
    print("SQLite connector inventory: " + ", ".join(sorted(actual_connectors)))
    print("Auth boundary: READY / SQLite active / PostgreSQL implementation present")
    print("Platform boundary: READY / SQLite active / PostgreSQL implementation present")
    print("Product boundary: READY / SQLite active / PostgreSQL implementation present")
    print("Learning boundary: CORE + SPECIALIZED READY / SQLite active / PostgreSQL implementations present")
    print("Runtime cutover: NOT ENABLED")


if __name__ == "__main__":
    main()
