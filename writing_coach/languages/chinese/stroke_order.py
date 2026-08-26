"""Deterministic Hanzi stroke-order lookup.

A Chinese language adapter in the sense of `ARCHITECTURE_INVARIANTS.md`:
stroke order is a genuine linguistic property of Han script, so it lives here
rather than in a shared learner path. There is no AI in this module. Every
answer comes from the vendored Make Me a Hanzi data in `stroke_data/`, and a
character that is not in that data is reported as unavailable rather than
guessed — `UPGRADE_REGRESSION_RULES.md` §33.
"""

from __future__ import annotations

import json
import zlib
from functools import lru_cache
from pathlib import Path
from typing import Any

DATA_DIR = Path(__file__).resolve().parent / "stroke_data"
INDEX_PATH = DATA_DIR / "hanzi_strokes.index.json"
PACK_PATH = DATA_DIR / "hanzi_strokes.pack"

EXPECTED_FORMAT = "orena.hanzi-strokes.v1"

# The two ranges the learner-facing Han filter accepts. The vendored pack is
# built to cover exactly these, so "not a Han character" and "no stroke data"
# stay two distinguishable answers.
HAN_RANGES = ((0x3400, 0x4DBF), (0x4E00, 0x9FFF))

# The upstream glyph box. Renderers need it to place the paths, and it is a
# property of the data rather than of any one surface, so it travels with it.
GLYPH_SIZE = 1024

MAX_CHARACTERS = 20


class StrokeDataUnavailable(RuntimeError):
    """The vendored pack is missing or unreadable."""


def is_han(character: str) -> bool:
    if len(character) != 1:
        return False
    point = ord(character)
    return any(low <= point <= high for low, high in HAN_RANGES)


@lru_cache(maxsize=1)
def _index() -> dict[str, list[int]]:
    if not INDEX_PATH.is_file() or not PACK_PATH.is_file():
        raise StrokeDataUnavailable("Hanzi stroke data is not installed.")

    try:
        payload = json.loads(INDEX_PATH.read_text(encoding="utf-8"))
    except (OSError, ValueError) as exc:
        raise StrokeDataUnavailable("Hanzi stroke index is unreadable.") from exc

    if payload.get("format") != EXPECTED_FORMAT:
        raise StrokeDataUnavailable(
            f"Hanzi stroke index format {payload.get('format')!r} is not {EXPECTED_FORMAT!r}.",
        )

    offsets = payload.get("offsets")
    if not isinstance(offsets, dict) or not offsets:
        raise StrokeDataUnavailable("Hanzi stroke index carries no characters.")
    return offsets


def installed() -> bool:
    """Whether the vendored pack is present and loadable."""
    try:
        _index()
    except StrokeDataUnavailable:
        return False
    return True


def coverage() -> int:
    """How many characters the vendored pack covers."""
    return len(_index())


@lru_cache(maxsize=512)
def character_strokes(character: str) -> dict[str, Any] | None:
    """Stroke data for one character, or None when the pack does not carry it."""
    if not is_han(character):
        return None

    location = _index().get(character)
    if not location:
        return None

    offset, length = location
    try:
        with PACK_PATH.open("rb") as handle:
            handle.seek(offset)
            blob = handle.read(length)
        record = json.loads(zlib.decompress(blob).decode("utf-8"))
    except (OSError, ValueError, zlib.error) as exc:
        raise StrokeDataUnavailable("Hanzi stroke pack is unreadable.") from exc

    strokes = record["strokes"]
    return {
        "character": character,
        "stroke_count": len(strokes),
        "stroke_paths": strokes,
        "medians": record["medians"],
        "radical_strokes": record.get("radStrokes") or [],
    }


def stroke_order_for(word: str) -> dict[str, Any]:
    """Stroke data for every Han character in `word`, in reading order.

    Characters are returned in the order they occur, duplicates included, so a
    caller can walk a word and a step diagram in step with each other. Anything
    the pack does not carry is named in `unavailable` instead of being dropped
    silently.
    """
    characters: list[dict[str, Any]] = []
    unavailable: list[str] = []

    for character in str(word or ""):
        if not is_han(character):
            continue
        if len(characters) + len(unavailable) >= MAX_CHARACTERS:
            break
        data = character_strokes(character)
        if data is None:
            unavailable.append(character)
        else:
            characters.append(data)

    return {
        "word": str(word or ""),
        "glyph_size": GLYPH_SIZE,
        "characters": characters,
        "unavailable": unavailable,
        "source": "make-me-a-hanzi",
    }
