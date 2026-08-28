"""Read-only, fail-closed selection of one cross-skill learning cue.

The selector deliberately returns provenance and a concrete handoff only.  It
never synthesizes a shared score, mastery, or completion claim.
"""
from __future__ import annotations

from typing import Any


def _text(value: Any, *, limit: int = 260) -> str:
    return value.strip()[:limit] if isinstance(value, str) else ""


def _language_ok(item: Any, language: str) -> bool:
    if not isinstance(item, dict) or not isinstance(language, str) or not language.strip():
        return False
    for key in ("language", "language_code", "learning_language"):
        if key in item:
            value = item[key]
            return isinstance(value, str) and value.strip().casefold() == language.strip().casefold()
    return False


def _none() -> dict[str, Any]:
    return {"available": False, "state": "none", "source": "none", "provenance": {}, "evidence": "", "action": None}


def _writing(cue: Any, language: str) -> dict[str, Any] | None:
    if not isinstance(cue, dict) or cue.get("available") is not True or not _language_ok(cue, language):
        return None
    essay_id = cue.get("essay_id")
    evidence = _text(cue.get("evidence"))
    if not isinstance(essay_id, int) or essay_id <= 0 or not evidence:
        return None
    return {"available": True, "state": "transfer", "source": "writing", "provenance": {"source": "writing", "record_id": essay_id, "language": language}, "evidence": evidence, "action": {"kind": "review", "essay_id": essay_id}}


def _reading(rows: Any, language: str) -> dict[str, Any] | None:
    if not isinstance(rows, list):
        return None
    for item in rows:
        if not isinstance(item, dict) or not _language_ok(item, language):
            continue
        session_id = item.get("id")
        attempt = item.get("latest_attempt")
        if not isinstance(session_id, int) or session_id <= 0 or not isinstance(attempt, dict):
            continue
        correct, total = attempt.get("correct_count"), attempt.get("total")
        if not isinstance(correct, int) or isinstance(correct, bool) or not isinstance(total, int) or isinstance(total, bool) or total <= 0 or correct < 0 or correct > total:
            continue
        title = _text(item.get("title")) or _text(item.get("topic"))
        if not title:
            continue
        return {"available": True, "state": "transfer", "source": "reading", "provenance": {"source": "reading", "record_id": session_id, "language": language, "attempt_id": attempt.get("id")}, "evidence": title, "action": {"kind": "reading", "session_id": session_id}}
    return None


def _listening(rows: Any, language: str) -> dict[str, Any] | None:
    if not isinstance(rows, list):
        return None
    for item in rows:
        if not isinstance(item, dict) or not _language_ok(item, language):
            continue
        asset, segment = _text(item.get("asset_id"), limit=255), _text(item.get("segment_id"), limit=255)
        source_url, title = _text(item.get("source_url"), limit=1000), _text(item.get("title"))
        if not asset or not segment:
            continue
        revealed = item.get("revealed") is True
        checked = item.get("checked_attempt_count")
        if not revealed and not (isinstance(checked, int) and not isinstance(checked, bool) and checked > 0):
            continue
        action = {"kind": "listening", "asset_id": asset, "segment_id": segment, "title": title}
        if source_url:
            action["source_url"] = source_url
        return {"available": True, "state": "transfer", "source": "listening", "provenance": {"source": "listening", "record_id": _text(item.get("id"), limit=120), "language": language, "asset_id": asset, "segment_id": segment}, "evidence": title or segment, "action": action}
    return None


def _speaking(rows: Any, language: str) -> dict[str, Any] | None:
    if not isinstance(rows, list):
        return None
    for item in rows:
        if not isinstance(item, dict) or not _language_ok(item, language):
            continue
        asset, segment = _text(item.get("asset_id"), limit=255), _text(item.get("segment_id"), limit=255)
        transcript, reference = _text(item.get("transcript_text")), _text(item.get("reference_text"))
        if not asset or not segment or not transcript or not reference:
            continue
        dimensions = item.get("dimensions")
        if not isinstance(dimensions, dict) or not dimensions:
            continue
        return {"available": True, "state": "transfer", "source": "speaking", "provenance": {"source": "speaking", "record_id": _text(item.get("id"), limit=120), "language": language, "asset_id": asset, "segment_id": segment}, "evidence": reference, "action": {"kind": "speaking", "asset_id": asset, "segment_id": segment}}
    return None


def select_cross_skill_cue(*, language: str, writing: Any = None, reading: Any = None, listening: Any = None, speaking: Any = None) -> dict[str, Any]:
    """Select the first bounded cue in deterministic source order."""
    for candidate in (_writing(writing, language), _reading(reading, language), _listening(listening, language), _speaking(speaking, language)):
        if candidate is not None:
            return candidate
    return _none()


if __name__ == "__main__":
    cue = select_cross_skill_cue(language="en", reading=[{"id": 2, "language": "en", "title": "Travel", "latest_attempt": {"correct_count": 3, "total": 4}}])
    assert cue["source"] == "reading" and cue["action"]["session_id"] == 2
    assert select_cross_skill_cue(language="zh", reading=[{"id": 2, "language": "en", "title": "Travel", "latest_attempt": {"correct_count": 3, "total": 4}}])["available"] is False
    print("cross-skill transfer selftest: PASS")
