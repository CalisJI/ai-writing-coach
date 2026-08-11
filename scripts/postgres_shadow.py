from __future__ import annotations

import argparse
import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from alembic import command
from alembic.config import Config

from writing_coach.persistence.config import create_shadow_engine, shadow_url
from writing_coach.persistence.importer import discover_sources, import_to_engine, source_counts
from writing_coach.persistence.verification import verify_shadow


def _alembic(url: str) -> None:
    cfg = Config(str(ROOT / "alembic.ini"))
    cfg.set_main_option("script_location", str(ROOT / "migrations"))
    cfg.set_main_option("sqlalchemy.url", url.replace("%", "%%"))
    command.upgrade(cfg, "head")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="BECOMING PostgreSQL shadow migration tooling (no app cutover)."
    )
    parser.add_argument("command", choices=["plan", "migrate", "verify"])
    parser.add_argument("--data-root", default="/data")
    parser.add_argument("--url", default="")
    args = parser.parse_args()

    discovery = discover_sources(Path(args.data_root))
    source = source_counts(discovery)

    print("BECOMING PostgreSQL shadow foundation")
    print("Mode:", args.command)
    print("Data root:", discovery.data_root)
    print("Learning DBs:", len(discovery.learning_sources))
    print("Orphan user directories:", len(discovery.orphan_user_dirs))
    if discovery.orphan_user_dirs:
        print("WARNING: orphan user directories are not imported automatically:")
        for item in discovery.orphan_user_dirs:
            print(" -", item)
    print("Source persistent counts:")
    print(json.dumps(source.as_dict(), indent=2))

    if args.command == "plan":
        print("PLAN ONLY: no PostgreSQL connection and no writes performed.")
        return

    url = shadow_url(args.url or None)
    engine = create_shadow_engine(url)

    if args.command == "migrate":
        print("Applying Alembic shadow schema...")
        _alembic(url)
        print("Importing SQLite data idempotently...")
        target = import_to_engine(engine, discovery)
        print("Target counts after import:")
        print(json.dumps(target.as_dict(), indent=2))

    result = verify_shadow(engine, discovery)
    print("Verification:")
    print(json.dumps({"source": result.source, "target": result.target, "mismatches": result.mismatches}, indent=2))
    if not result.ok:
        raise SystemExit("Shadow verification FAILED. SQLite remains authoritative; do not cut over.")
    print("Shadow verification PASS. SQLite is STILL the active application store.")


if __name__ == "__main__":
    main()
