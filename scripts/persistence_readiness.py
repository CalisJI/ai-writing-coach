from __future__ import annotations

import argparse
import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from writing_coach.persistence.config import create_shadow_engine, shadow_url
from writing_coach.persistence.importer import discover_sources
from writing_coach.persistence.read_compare import compare_scoped_reads


def main() -> None:
    parser = argparse.ArgumentParser(description="BECOMING persistence runtime-readiness checks")
    parser.add_argument("command", choices=["shadow-compare"])
    parser.add_argument("--data-root", default="/data")
    parser.add_argument("--url", default="")
    args = parser.parse_args()

    if args.command == "shadow-compare":
        discovery = discover_sources(Path(args.data_root))
        engine = create_shadow_engine(args.url or shadow_url())
        report = compare_scoped_reads(engine, discovery)
        print(json.dumps(report, ensure_ascii=False, indent=2))
        if not report["ok"]:
            raise SystemExit("Scoped SQLite/PostgreSQL read parity FAILED")
        print("Scoped SQLite/PostgreSQL read parity: PASS")


if __name__ == "__main__":
    main()
