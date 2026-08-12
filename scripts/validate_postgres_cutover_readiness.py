"""Structural guards for the non-active PostgreSQL cutover-readiness batch."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
errors: list[str] = []
def req(value: bool, message: str) -> None:
    if not value: errors.append(message)

req((ROOT / "VERSION").read_text(encoding="utf-8").strip() == "1.4.0", "v1.4.0 version missing")
req((ROOT / "BECOMING_FRONTEND_VERSION").read_text(encoding="utf-8").strip() == "2.15.7", "protected frontend changed")
app = (ROOT / "app.py").read_text(encoding="utf-8")
req("SQLiteLearningRepository" in app and "create_shadow_engine" not in app, "SQLite runtime is no longer explicit")
req("PostgresLearningRepository" not in app, "PostgreSQL runtime selected before v1.4.0")
for path in ["scripts/postgres_cutover_rehearsal.py", "docs/POSTGRES_CUTOVER_READINESS.md", "scripts/postgres_shadow.py", "scripts/persistence_readiness.py", "scripts/specialized_persistence.py"]:
    req((ROOT / path).is_file(), f"missing readiness artifact: {path}")
config = (ROOT / "writing_coach/persistence/config.py").read_text(encoding="utf-8")
req("pool_pre_ping=True" in config, "shadow stale-connection protection missing")
req("create_engine" not in app, "application must not create a PostgreSQL runtime engine")
for path, names in {
    "writing_coach/persistence/auth_repository.py": ("SQLiteAuthRepository", "PostgresAuthRepository"),
    "writing_coach/persistence/platform_repository.py": ("SQLitePlatformRepository", "PostgresPlatformRepository"),
    "writing_coach/product/repository.py": ("SQLiteProductRepository",),
    "writing_coach/persistence/product_repository.py": ("PostgresProductRepository",),
    "writing_coach/persistence/learning_repository.py": ("SQLiteLearningRepository", "PostgresLearningRepository"),
    "writing_coach/persistence/specialized_repository.py": ("SQLiteSpecializedLearningRepository", "PostgresSpecializedLearningRepository"),
}.items():
    source = (ROOT / path).read_text(encoding="utf-8")
    for name in names: req(name in source, f"missing repository: {name}")
req((ROOT / "scripts/postgres_cutover_domain_parity.py").is_file(), "domain parity command missing")
if errors:
    print("PostgreSQL cutover readiness validation FAILED")
    for error in errors: print(" -", error)
    raise SystemExit(1)
print("PostgreSQL cutover readiness structural validation OK")
print("SQLite runtime: ACTIVE / AUTHORITATIVE")
print("PostgreSQL repositories: READY / NOT SELECTED")
