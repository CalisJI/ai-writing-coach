"""Secret-safe validation for production-like Cloudflare staging."""

from __future__ import annotations

import argparse
import os
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Mapping
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from writing_coach.core.deployment import CALLBACK_PATH, resolve_deployment_config


@dataclass(frozen=True)
class StagingReadinessReport:
    ok: bool
    passed: tuple[str, ...]
    errors: tuple[str, ...]


def _valid_runtime_url(value: str) -> bool:
    try:
        parsed = urlsplit(value)
        _ = parsed.port
    except ValueError:
        return False
    return bool(
        parsed.scheme == "postgresql+psycopg"
        and parsed.hostname
        and parsed.path.strip("/")
    )


def validate_public_staging_readiness(
    env: Mapping[str, str], *, require_tunnel: bool = True
) -> StagingReadinessReport:
    """Validate staging configuration without returning configured values."""
    passed: list[str] = []
    errors: list[str] = []

    try:
        deployment = resolve_deployment_config(env)
    except RuntimeError as exc:
        deployment = None
        errors.append(str(exc))
    else:
        if deployment.production:
            passed.append("APP_ENV resolves to production")
        else:
            errors.append("APP_ENV must resolve to production for public staging.")
        if deployment.auth_enabled:
            passed.append("Google OAuth configuration present")
        else:
            errors.append("Google OAuth configuration is required for public staging.")
        if str(env.get("SESSION_SECRET", "")).strip():
            passed.append("SESSION_SECRET present")
        else:
            errors.append("SESSION_SECRET is required for public staging.")
        if deployment.google_redirect_uri == deployment.public_base_url + CALLBACK_PATH:
            passed.append("canonical Google callback matches PUBLIC_BASE_URL")
        else:
            errors.append("Canonical Google callback does not match PUBLIC_BASE_URL.")

    backend = str(env.get("PERSISTENCE_BACKEND", "")).strip().casefold()
    if backend == "postgresql":
        passed.append("PERSISTENCE_BACKEND is postgresql")
    else:
        errors.append("PERSISTENCE_BACKEND must be exactly postgresql for public staging.")

    raw_runtime_url = str(env.get("POSTGRES_RUNTIME_URL", "")).strip()
    if not _valid_runtime_url(raw_runtime_url):
        errors.append(
            "POSTGRES_RUNTIME_URL must be a valid postgresql+psycopg URL with host and database."
        )
    else:
        passed.append("POSTGRES_RUNTIME_URL valid and present")

    # Deliberately do not read POSTGRES_SHADOW_URL as a runtime input.
    passed.append("POSTGRES_SHADOW_URL excluded from runtime selection")

    if str(env.get("APP_BIND_HOST", "")).strip() == "127.0.0.1":
        passed.append("APP_BIND_HOST is loopback-only")
    else:
        errors.append("APP_BIND_HOST must be 127.0.0.1 for public staging.")

    if require_tunnel:
        if str(env.get("CLOUDFLARE_TUNNEL_TOKEN", "")).strip():
            passed.append("CLOUDFLARE_TUNNEL_TOKEN present")
        else:
            errors.append("CLOUDFLARE_TUNNEL_TOKEN is required for tunnel staging.")

    return StagingReadinessReport(
        ok=not errors,
        passed=tuple(passed),
        errors=tuple(errors),
    )


def render_report(report: StagingReadinessReport) -> str:
    lines = [
        "PUBLIC STAGING READINESS PASS" if report.ok else "PUBLIC STAGING READINESS FAIL"
    ]
    lines.extend(f"PASS: {message}" for message in report.passed)
    lines.extend(f"FAIL: {message}" for message in report.errors)
    return "\n".join(lines)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--without-tunnel",
        action="store_true",
        help="Validate production application staging without requiring a tunnel token.",
    )
    args = parser.parse_args()
    report = validate_public_staging_readiness(
        os.environ, require_tunnel=not args.without_tunnel
    )
    print(render_report(report))
    return 0 if report.ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
