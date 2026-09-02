"""Integrity stamping for the generated development Listening catalog.

Deliberately dependency-free. The catalog loader, the importer and the CLI all
need this, and the CLI must be able to verify a committed artifact offline in CI
without pulling in a provider adapter or the network stack it depends on.

The artifact is committed rather than gitignored, so a clean checkout or a
container rebuild still has the development catalog without regenerating it from
a provider at startup. Because it is committed it also has to be tamper-evident:
humans edit the source CSV, never the generated JSON, and this hash is what
turns that rule from a comment into something the loader can enforce.
"""

from __future__ import annotations

import hashlib
import json
from collections.abc import Mapping
from typing import Any

GENERATOR = "scripts/build_listening_dev_catalog.py"
GENERATOR_VERSION = "1"


def manifest_content_hash(manifest: Mapping[str, Any]) -> str:
    """Hash the catalog content only, ignoring the provenance header.

    Sorted keys and fixed separators keep this stable across Python versions and
    across the order the generator happened to build its dictionaries in.
    """

    body = {"sources": manifest.get("sources", []), "lessons": manifest.get("lessons", [])}
    return hashlib.sha256(
        json.dumps(body, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode()
    ).hexdigest()


def file_digest(path) -> str:
    """Digest of one input source list, so a snapshot records what produced it."""

    return hashlib.sha256(path.read_bytes()).hexdigest()


def verify_manifest_integrity(manifest: Mapping[str, Any]) -> str:
    """Why this artifact is not trustworthy, or an empty string when intact."""

    recorded = str(manifest.get("content_hash") or "")
    if not recorded:
        return "generated catalog has no content_hash; regenerate it"
    if recorded != manifest_content_hash(manifest):
        return "generated catalog was edited by hand; edit the source CSV and regenerate"
    return ""
