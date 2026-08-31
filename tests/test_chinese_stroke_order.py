"""Stroke order is data, not opinion.

The product rule these tests hold is `UPGRADE_REGRESSION_RULES.md` §33: never
claim verified stroke order unless verified stroke data exists. So the two
things worth pinning are that the vendored data really is present and intact,
and that a character it does not carry is reported as unavailable rather than
approximated.
"""

from __future__ import annotations

import hashlib
import json

import pytest
from fastapi import HTTPException

from app import api_chinese_stroke_order
from writing_coach.languages.chinese import stroke_order


def test_pack_is_installed_and_covers_everyday_chinese() -> None:
    assert stroke_order.installed()
    # Make Me a Hanzi carries ~9.5k characters; anything far below that means a
    # partial or truncated pack was committed.
    assert stroke_order.coverage() > 9000


def test_pack_matches_the_digest_its_index_records() -> None:
    index = json.loads(stroke_order.INDEX_PATH.read_text(encoding="utf-8"))
    digest = hashlib.sha256(stroke_order.PACK_PATH.read_bytes()).hexdigest()
    assert digest == index["pack_sha256"]


def test_index_covers_exactly_the_range_the_learner_filter_accepts() -> None:
    # "Not a Han character" and "no stroke data for this character" must stay
    # two distinguishable answers, which only holds while the pack covers the
    # same ranges the frontend filters on.
    index = json.loads(stroke_order.INDEX_PATH.read_text(encoding="utf-8"))
    assert all(stroke_order.is_han(character) for character in index["offsets"])


@pytest.mark.parametrize(
    ("character", "strokes"),
    [
        ("一", 1),
        ("习", 3),
        ("学", 8),
        ("我", 7),
    ],
)
def test_known_stroke_counts(character: str, strokes: int) -> None:
    entry = stroke_order.character_strokes(character)
    assert entry is not None
    assert entry["stroke_count"] == strokes
    assert len(entry["stroke_paths"]) == strokes
    # One median per stroke: the renderer walks them in step, and a mismatch
    # would animate one stroke along another's path.
    assert len(entry["medians"]) == strokes


def test_every_stroke_path_is_a_real_svg_path() -> None:
    entry = stroke_order.character_strokes("学")
    assert entry is not None
    for path in entry["stroke_paths"]:
        assert path.startswith("M ")
    for median in entry["medians"]:
        assert len(median) >= 2
        assert all(len(point) == 2 for point in median)


def test_word_lookup_keeps_reading_order_and_duplicates() -> None:
    result = stroke_order.stroke_order_for("好好学习")
    assert [entry["character"] for entry in result["characters"]] == ["好", "好", "学", "习"]
    assert result["unavailable"] == []
    assert result["glyph_size"] == stroke_order.GLYPH_SIZE


def test_non_han_input_yields_nothing_rather_than_an_error() -> None:
    result = stroke_order.stroke_order_for("hello, world 123")
    assert result["characters"] == []
    assert result["unavailable"] == []


def test_a_character_outside_the_pack_is_named_not_invented() -> None:
    # U+4DBF is inside the accepted Han range but has no glyph in the data.
    result = stroke_order.stroke_order_for("䶿")
    assert result["characters"] == []
    assert result["unavailable"] == ["䶿"]


def test_word_length_is_bounded() -> None:
    result = stroke_order.stroke_order_for("学" * 40)
    assert len(result["characters"]) == stroke_order.MAX_CHARACTERS


def test_route_returns_the_provider_payload() -> None:
    payload = api_chinese_stroke_order("学习")
    assert [entry["character"] for entry in payload["characters"]] == ["学", "习"]
    assert payload["source"] == "make-me-a-hanzi"


def test_route_reports_missing_data_through_the_canonical_envelope(monkeypatch) -> None:
    def unavailable(_word: str) -> dict:
        raise stroke_order.StrokeDataUnavailable("pack missing")

    monkeypatch.setattr(stroke_order, "stroke_order_for", unavailable)

    with pytest.raises(HTTPException) as raised:
        api_chinese_stroke_order("学")

    assert raised.value.status_code == 503
    assert raised.value.detail["category"] == "stroke_data_unavailable"
    # A pack that is not installed does not install itself on a second request.
    assert raised.value.detail["retryable"] is False
