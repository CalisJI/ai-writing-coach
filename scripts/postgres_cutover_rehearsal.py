"""Repeatable PostgreSQL shadow rehearsal. It never selects PostgreSQL at runtime."""
from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))
from writing_coach.persistence.importer import discover_sources


def run(label: str, command: list[str]) -> dict[str, object]:
    completed = subprocess.run(command, cwd=ROOT, text=True, capture_output=True)
    report = {"step": label, "returncode": completed.returncode}
    if completed.returncode:
        report["stderr"] = completed.stderr[-4000:]
        report["stdout"] = completed.stdout[-4000:]
        print(json.dumps({"ok": False, "steps": [report]}, indent=2))
        raise SystemExit(f"Cutover rehearsal failed at {label}; SQLite remains authoritative.")
    return report


def main() -> None:
    parser = argparse.ArgumentParser(description="Run the PostgreSQL shadow cutover rehearsal without runtime cutover.")
    parser.add_argument("--data-root", default="/data")
    parser.add_argument("--url", default="")
    args = parser.parse_args()
    common = ["--data-root", args.data_root]
    if args.url:
        common += ["--url", args.url]
    steps = []
    discovery = discover_sources(Path(args.data_root))
    if discovery.orphan_user_dirs:
        print(json.dumps({"ok": False, "steps": steps, "failing_step": "source-discovery", "orphan_user_dirs": discovery.orphan_user_dirs, "runtime": "sqlite"}, indent=2))
        raise SystemExit("Orphan SQLite user sources found; SQLite remains authoritative.")
    # migrate performs Alembic upgrade, idempotent import, and aggregate parity.
    steps.append(run("migrate-import-pass-1", [sys.executable, "scripts/postgres_shadow.py", "migrate", *common]))
    steps.append(run("domain-semantic-parity-pass-1", [sys.executable, "scripts/postgres_cutover_domain_parity.py", *common]))
    steps.append(run("core-scoped-parity-pass-1", [sys.executable, "scripts/persistence_readiness.py", "shadow-compare", *common]))
    steps.append(run("specialized-scoped-parity-pass-1", [sys.executable, "scripts/specialized_persistence.py", "shadow-compare", *common]))
    steps.append(run("migrate-import-pass-2", [sys.executable, "scripts/postgres_shadow.py", "migrate", *common]))
    steps.append(run("domain-semantic-parity-pass-2", [sys.executable, "scripts/postgres_cutover_domain_parity.py", *common]))
    steps.append(run("core-scoped-parity-pass-2", [sys.executable, "scripts/persistence_readiness.py", "shadow-compare", *common]))
    steps.append(run("specialized-scoped-parity-pass-2", [sys.executable, "scripts/specialized_persistence.py", "shadow-compare", *common]))
    print(json.dumps({"ok": True, "runtime": "sqlite", "steps": steps}, indent=2))
    print("PostgreSQL cutover rehearsal PASS. PostgreSQL runtime remains NOT SELECTED.")


if __name__ == "__main__":
    main()
