"""Replay Writing benchmark results or enter the explicitly gated live path."""

from __future__ import annotations

from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from writing_coach.writing_evaluation_benchmark_runner import cli_main  # noqa: E402


if __name__ == "__main__":
    raise SystemExit(cli_main())
