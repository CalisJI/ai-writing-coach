"""Structural guards retained after the completed PostgreSQL cutover."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
errors: list[str] = []
def req(value: bool, message: str) -> None:
    if not value: errors.append(message)

req((ROOT / "VERSION").read_text(encoding="utf-8").strip() == "1.4.0", "v1.4.0 version missing")
app = (ROOT / "app.py").read_text(encoding="utf-8")
runtime = (ROOT / "writing_coach/persistence/runtime.py").read_text(encoding="utf-8")
req("build_runtime(" in app and "create_shadow_engine" not in app, "central runtime selection missing or shadow engine selected")
for name in ["PostgresAuthRepository", "PostgresPlatformRepository", "PostgresProductRepository", "PostgresLearningRepository", "PostgresSpecializedLearningRepository"]:
    req(f"{name}(engine)" in runtime, f"PostgreSQL runtime family missing: {name}")
req("create_runtime_engine" in runtime and "_verify_runtime_readiness" in runtime, "PostgreSQL runtime fail-closed readiness missing")
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
print("PostgreSQL runtime: AUTHORITATIVE / SELECTED BY PRODUCTION CONFIG")
print("SQLite: FROZEN ARCHIVE / ISOLATED DEVELOPMENT ADAPTER")
