"""The canonical error envelope.

ORENA_BE_FE_MASTER_IMPLEMENTATION_SPEC §2.6 fixes one shape for every error the
frontend has to reason about::

    {"detail": {"category": "...", "message": "...",
                "retryable": false, "context": {}}}

and three rules around it:

- ``category`` is stable and semantic;
- frontend behaviour must not depend only on human text;
- retryability must be explicit for long-running/provider operations.

The frontend request wrapper already reads this shape. The backend mostly did
not produce it: of sixty-five ``HTTPException`` raises, fifty-two passed a bare
string, which FastAPI serialises as ``{"detail": "some sentence"}`` - leaving a
screen nothing to branch on but the sentence itself. And ``retryable`` appeared
nowhere at all, on either side, so a timeout and a malformed URL arrived at the
frontend looking exactly alike.

This module does not invent a category vocabulary. §2.6 warns against creating
dozens of arbitrary categories when a convention already exists, and one does:
``MediaImportCategory`` in media_ingestion. Categories stay the strings the
product already uses; what is added is the envelope around them and one honest
answer to "is trying again worth anything?".
"""

from __future__ import annotations

from collections.abc import Mapping
from typing import Any

from fastapi import HTTPException

__all__ = [
    "RETRYABLE_CATEGORIES",
    "error_detail",
    "orena_http_error",
    "is_retryable",
]


# Retrying helps when the failure was the provider or the moment, and not the
# request. A malformed URL is still malformed on the second attempt; a timeout
# may not be. Anything absent from this set is reported as not retryable, which
# is the safe direction to be wrong in: it never invites a learner to hammer a
# request that cannot succeed.
RETRYABLE_CATEGORIES: frozenset[str] = frozenset(
    {
        "provider_timeout",
        "provider_failure",
        "media_unavailable",
        "media_job_unavailable",
        "pronunciation_timeout",
        "pronunciation_provider_malformed",
        "translation_unavailable",
        "transcript_unavailable",
        "evaluation_unavailable",
    }
)


def is_retryable(category: str) -> bool:
    """Whether trying the same request again could plausibly succeed."""
    return str(category or "") in RETRYABLE_CATEGORIES


def error_detail(
    category: str,
    message: str,
    *,
    retryable: bool | None = None,
    context: Mapping[str, Any] | None = None,
) -> dict[str, Any]:
    """Build the §2.6 detail body.

    ``retryable`` is derived from the category unless a caller states it, so a
    category cannot mean "retry" in one route and "do not retry" in the next.
    """
    resolved = is_retryable(category) if retryable is None else bool(retryable)
    return {
        "category": str(category),
        "message": str(message),
        "retryable": resolved,
        "context": dict(context or {}),
    }


def orena_http_error(
    status_code: int,
    category: str,
    message: str,
    *,
    retryable: bool | None = None,
    context: Mapping[str, Any] | None = None,
) -> HTTPException:
    """An ``HTTPException`` carrying the canonical envelope.

    Raise the return value; it is built rather than raised here so a caller can
    still attach ``from exc`` and keep the original traceback.
    """
    return HTTPException(
        status_code,
        detail=error_detail(category, message, retryable=retryable, context=context),
    )
