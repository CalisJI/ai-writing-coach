from __future__ import annotations

import uuid

NAMESPACE = uuid.UUID("1f29f431-4f46-4c32-9e59-2be7f6e5d882")


def stable_uuid(*parts: object) -> uuid.UUID:
    value = ":".join(str(part) for part in parts)
    return uuid.uuid5(NAMESPACE, value)
