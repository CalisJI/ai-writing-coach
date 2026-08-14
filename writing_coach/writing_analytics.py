"""Pure read-time contracts for persisted Writing analytics."""

from __future__ import annotations

import json
from collections.abc import Mapping, Sequence
from typing import Any


def parse_persisted_error_events(
    raw_errors_json: Any,
    *,
    error_categories: Sequence[str],
) -> list[dict[str, Any]]:
    """Return valid, per-revision error events in deterministic stored order."""
    try:
        items = json.loads(raw_errors_json)
    except (TypeError, json.JSONDecodeError):
        return []
    if not isinstance(items, list):
        return []

    allowed = set(error_categories)
    events: list[dict[str, Any]] = []
    seen: set[tuple[str, str]] = set()
    for item in items:
        if not isinstance(item, Mapping):
            continue
        category = item.get("category")
        fragment = item.get("fragment")
        if not isinstance(category, str) or category not in allowed:
            continue
        if not isinstance(fragment, str) or not fragment:
            continue
        identity = (category, fragment)
        if identity in seen:
            continue
        seen.add(identity)
        events.append(dict(item))
    return events
