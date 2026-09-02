"""Batch L2: the development curated source importer.

LISTENING_PRODUCT_SPEC 5-7. These use a fake provider adapter deliberately: the
importer's contract is what it does with what the adapter returns, and a test
that needed the network could not assert determinism or failure handling.
"""

from __future__ import annotations

import json
from pathlib import Path

from writing_coach.listening_catalog import dev_catalog_enabled, load_catalog
from writing_coach.listening_source_import import (
    SourceCandidate,
    build_dev_catalog,
    lesson_id_for,
    plan_excerpts,
    read_source_candidates,
    source_media_id,
    write_manifest,
)
from writing_coach.media_ingestion import (
    MediaAcquisition,
    MediaPlayback,
    ProviderRequestFailed,
    ProviderTranscriptMalformed,
)
from writing_coach.media_learning import (
    MediaLearningAsset,
    MediaLearningObject,
    MediaProcessingState,
    MediaTranscript,
    TranscriptSegment,
)

REPO = Path(__file__).resolve().parents[1]


def _segments(asset_id: str, count: int, seconds: int = 6) -> tuple[TranscriptSegment, ...]:
    return tuple(
        TranscriptSegment(f"{asset_id}:{index:03d}", index, index * seconds * 1000,
                          (index + 1) * seconds * 1000, f"line {index}")
        for index in range(count)
    )


class FakeAdapter:
    """Returns a real MediaLearningObject; raises for the URLs a test names."""

    def __init__(self, *, malformed: set[str] | None = None, unavailable: set[str] | None = None,
                 exploding: set[str] | None = None, segment_count: int = 40) -> None:
        self.malformed = malformed or set()
        self.unavailable = unavailable or set()
        self.exploding = exploding or set()
        self.segment_count = segment_count
        self.calls: list[tuple[str, str]] = []

    def acquire(self, source_url: str, source_language: str) -> MediaAcquisition:
        self.calls.append((source_url, source_language))
        video_id = source_url.rsplit("=", 1)[-1]
        if video_id in self.malformed:
            raise ProviderTranscriptMalformed()
        if video_id in self.unavailable:
            raise ProviderRequestFailed()
        if video_id in self.exploding:
            raise RuntimeError("provider exploded in an unexpected way")
        asset_id = f"youtube:{video_id}"
        segments = _segments(asset_id, self.segment_count)
        asset = MediaLearningAsset(
            asset_id=asset_id, source_url=source_url, source_provider="youtube",
            source_type="external-video", title=f"Title {video_id}",
            source_language=source_language, processing_state=MediaProcessingState.READY,
            duration_ms=None, transcript_available=bool(segments), translation_available=False,
        )
        return MediaAcquisition(
            media_object=MediaLearningObject(
                asset=asset,
                transcript=MediaTranscript(asset_id, source_language, segments) if segments else None,
            ),
            playback=MediaPlayback(provider="youtube", kind="embed",
                                   url=f"https://www.youtube-nocookie.com/embed/{video_id}"),
        )


def candidate(**over) -> SourceCandidate:
    base = dict(
        candidate_id="en-001", language="en", category="conversation",
        source_family="BBC Learning English", title="How to introduce yourself",
        source_url="https://www.youtube.com/watch?v=I_tRSrPru94",
        desired_excerpt_count=3, min_excerpt_seconds=20, max_excerpt_seconds=90,
        preferred_modes=("listen", "dictation", "shadowing"), level_hint="", notes="",
    )
    base.update(over)
    return SourceCandidate(**base)


# --- the shipped source lists parse, both languages -------------------------

def test_the_human_source_csvs_parse_into_candidates() -> None:
    for name, language, expected in (
        ("listening_sources_en_dev_100.csv", "en", 100),
        ("listening_sources_zh_dev_100.csv", "zh", 100),
    ):
        rows = read_source_candidates(REPO / "writing_coach/content" / name)
        assert len(rows) == expected
        assert {row.language for row in rows} == {language}
        assert all(row.source_url.startswith("https://www.youtube.com/") for row in rows)
        # The BOM must not leak into the first column name.
        assert all(row.candidate_id and not row.candidate_id.startswith("﻿") for row in rows)
        assert all(row.max_excerpt_seconds >= row.min_excerpt_seconds > 0 for row in rows)


# --- watch and Shorts both resolve to the same pipeline ---------------------

def test_watch_and_shorts_urls_are_both_imported() -> None:
    adapter = FakeAdapter()
    manifest, report = build_dev_catalog([
        candidate(candidate_id="watch", source_url="https://www.youtube.com/watch?v=dQw4w9WgXcQ"),
        candidate(candidate_id="shorts", source_url="https://www.youtube.com/shorts/aBcDeFgHiJk"),
    ], adapter)

    assert report.as_dict()["ACCEPTED"] == 2
    ids = {source["source_media_id"] for source in manifest["sources"]}
    assert ids == {"youtube-dQw4w9WgXcQ", "youtube-aBcDeFgHiJk"}
    # A Shorts URL is canonicalised before acquisition, so one identity per video.
    assert all(url.startswith("https://www.youtube.com/watch?v=") for url, _ in adapter.calls)


# --- one source, several excerpts, only on real boundaries ------------------

def test_one_source_yields_multiple_excerpts_on_real_boundaries() -> None:
    adapter = FakeAdapter(segment_count=60)  # 6 minutes of 6s segments
    manifest, report = build_dev_catalog([candidate(desired_excerpt_count=3)], adapter)

    lessons = manifest["lessons"]
    assert len(lessons) == 3, "a long source should produce several excerpts"
    assert report.as_dict()["GENERATED_SOURCES"] == 1
    assert report.as_dict()["GENERATED_LESSONS"] == 3

    boundaries = {int(s["start_ms"]) for s in manifest["sources"][0]["segments"]}
    ends = {int(s["end_ms"]) for s in manifest["sources"][0]["segments"]}
    for lesson in lessons:
        # Spec 6: never fabricate excerpt timestamps.
        assert lesson["excerpt_start_ms"] in boundaries
        assert lesson["excerpt_end_ms"] in ends
        length = lesson["excerpt_end_ms"] - lesson["excerpt_start_ms"]
        assert 20_000 <= length <= 90_000, f"excerpt of {length}ms outside the editor's range"

    # Excerpts do not all come from the opening of the video.
    assert len({lesson["excerpt_start_ms"] for lesson in lessons}) == 3


def test_excerpt_planning_never_invents_a_boundary() -> None:
    segments = [{"start_ms": i * 5000, "end_ms": (i + 1) * 5000} for i in range(20)]
    windows = plan_excerpts(segments, min_seconds=20, max_seconds=30, limit=5)
    assert windows, "a 100s transcript must yield at least one 20-30s window"
    starts = {s["start_ms"] for s in segments}
    for start, end in windows:
        assert start in starts and end in {s["end_ms"] for s in segments}
        assert 20_000 <= end - start <= 30_000

    # Too short to reach the minimum: produce nothing rather than pad.
    assert plan_excerpts(segments[:2], min_seconds=60, max_seconds=90, limit=3) == []
    assert plan_excerpts([], min_seconds=20, max_seconds=90, limit=3) == []


# --- deterministic identities, stable across reruns -------------------------

def test_identities_are_deterministic_and_survive_a_rerun() -> None:
    rows = [candidate(), candidate(candidate_id="en-002",
                                   source_url="https://www.youtube.com/watch?v=31y2Bq1RYQA")]
    first, _ = build_dev_catalog(rows, FakeAdapter())
    second, _ = build_dev_catalog(rows, FakeAdapter())

    assert first == second, "re-running the importer must not change the manifest"
    assert source_media_id("dQw4w9WgXcQ") == "youtube-dQw4w9WgXcQ"
    assert lesson_id_for("en", "dQw4w9WgXcQ", 7) == "dev-en-dQw4w9WgXcQ-007"

    # Segment identities come from the provider and stay attached.
    segment_ids = [s["segment_id"] for s in first["sources"][0]["segments"]]
    assert segment_ids == sorted(segment_ids)
    assert all(sid.startswith("youtube:") for sid in segment_ids)

    # Dropping the second row does not renumber the first row's lessons.
    trimmed, _ = build_dev_catalog(rows[:1], FakeAdapter())
    kept = {lesson["lesson_id"] for lesson in trimmed["lessons"]}
    assert kept <= {lesson["lesson_id"] for lesson in first["lessons"]}


# --- failures are reported, never fatal -------------------------------------

def test_a_failing_candidate_does_not_break_the_batch() -> None:
    rows = [
        candidate(candidate_id="ok", source_url="https://www.youtube.com/watch?v=aaaaaaaaaaa"),
        candidate(candidate_id="dupe", source_url="https://www.youtube.com/watch?v=aaaaaaaaaaa"),
        candidate(candidate_id="no-transcript", source_url="https://www.youtube.com/watch?v=bbbbbbbbbbb"),
        candidate(candidate_id="unavailable", source_url="https://www.youtube.com/watch?v=ccccccccccc"),
        candidate(candidate_id="boom", source_url="https://www.youtube.com/watch?v=ddddddddddd"),
        candidate(candidate_id="other-language", language="fr"),
        candidate(candidate_id="not-a-provider", source_url="https://vimeo.com/12345"),
        candidate(candidate_id="last", source_url="https://www.youtube.com/watch?v=eeeeeeeeeee"),
    ]
    adapter = FakeAdapter(malformed={"bbbbbbbbbbb"}, unavailable={"ccccccccccc"},
                          exploding={"ddddddddddd"})
    manifest, report = build_dev_catalog(rows, adapter)
    summary = report.as_dict()

    assert summary["ACCEPTED"] == 2, "the batch continues past every failure"
    assert summary["DUPLICATE"] == 1
    assert summary["MISSING_TRANSCRIPT"] == 1
    assert summary["MEDIA_UNAVAILABLE"] == 1
    assert summary["FAILED"] == 1, "an unexpected provider error is caught, not raised"
    assert summary["UNSUPPORTED_LANGUAGE"] == 1
    assert summary["SKIPPED"] == 1
    assert summary["GENERATED_SOURCES"] == 2

    outcomes = {entry["candidate_id"]: entry["outcome"] for entry in summary["entries"]}
    assert outcomes["last"] == "ACCEPTED", "a later candidate still runs after an exception"
    assert outcomes["dupe"] == "DUPLICATE"


# --- EN and ZH run the identical pipeline -----------------------------------

def test_en_and_zh_use_the_same_pipeline() -> None:
    adapter = FakeAdapter()
    manifest, report = build_dev_catalog([
        candidate(candidate_id="en-001", language="en",
                  source_url="https://www.youtube.com/watch?v=eeeeeeeeeee"),
        candidate(candidate_id="zh-001", language="zh", category="street-interview",
                  source_url="https://www.youtube.com/watch?v=zzzzzzzzzzz"),
    ], adapter)

    assert report.as_dict()["ACCEPTED"] == 2
    languages = {source["language"] for source in manifest["sources"]}
    assert languages == {"en", "zh"}
    # The transcript language reaches the adapter, not a hardcoded default.
    assert {lang for _, lang in adapter.calls} == {"en", "zh"}
    levels = {lesson["estimated_level"] for lesson in manifest["lessons"]}
    assert levels == {"B1", "HSK3"}, "each language falls back to its own level vocabulary"
    assert all(lesson["reviewed_level"] is None for lesson in manifest["lessons"])


# --- the generated manifest loads through the canonical catalog -------------

def test_generated_manifest_loads_as_a_dev_overlay(tmp_path: Path) -> None:
    manifest, _ = build_dev_catalog([candidate()], FakeAdapter())
    dev_path = tmp_path / "listening_catalog.dev.generated.json"
    write_manifest(manifest, dev_path)

    written = json.loads(dev_path.read_text(encoding="utf-8"))
    assert "do not edit by hand" in written["generated"]

    base_only, base_lessons = load_catalog(dev_path=dev_path, env={})
    with_dev, dev_lessons = load_catalog(
        dev_path=dev_path, env={"ENABLE_DEV_LISTENING_CATALOG": "1"})

    assert len(dev_lessons) > len(base_lessons), "the overlay adds lessons"
    assert set(base_only) <= set(with_dev), "the overlay never removes a base source"
    generated = {lesson.lesson_id for lesson in dev_lessons} - {lesson.lesson_id for lesson in base_lessons}
    assert generated and all(lesson_id.startswith("dev-") for lesson_id in generated)

    # The generated lesson is a real, playable, poster-backed catalog entry.
    lesson = next(item for item in dev_lessons if item.lesson_id in generated)
    assert lesson.playback.kind == "embed"
    assert lesson.source.poster_url.startswith("https://i.ytimg.com/")
    assert lesson.excerpt_end_ms > lesson.excerpt_start_ms


# --- the overlay is off unless a developer opts in --------------------------

def test_dev_overlay_defaults_off_and_is_refused_in_production(tmp_path: Path) -> None:
    assert dev_catalog_enabled({}) is False, "no flag means no overlay"
    assert dev_catalog_enabled({"ENABLE_DEV_LISTENING_CATALOG": "0"}) is False
    assert dev_catalog_enabled({"ENABLE_DEV_LISTENING_CATALOG": ""}) is False
    assert dev_catalog_enabled({"ENABLE_DEV_LISTENING_CATALOG": "1"}) is True
    assert dev_catalog_enabled({"ENABLE_DEV_LISTENING_CATALOG": "true"}) is True

    # Spec 7: production must not be one environment variable away from serving
    # generated development content.
    for flag in ("1", "true", "yes", "on"):
        assert dev_catalog_enabled({
            "ENABLE_DEV_LISTENING_CATALOG": flag, "APP_ENV": "production",
        }) is False

    manifest, _ = build_dev_catalog([candidate()], FakeAdapter())
    dev_path = tmp_path / "dev.json"
    write_manifest(manifest, dev_path)
    _, production_lessons = load_catalog(
        dev_path=dev_path,
        env={"ENABLE_DEV_LISTENING_CATALOG": "1", "APP_ENV": "production"},
    )
    assert not [item for item in production_lessons if item.lesson_id.startswith("dev-")]


def test_dev_overlay_cannot_redefine_a_reviewed_base_lesson(tmp_path: Path) -> None:
    manifest, _ = build_dev_catalog([candidate()], FakeAdapter())
    # A hostile or careless generated file claiming a base lesson id.
    manifest["lessons"][0]["lesson_id"] = "en-science-cosmic-calendar"
    dev_path = tmp_path / "dev.json"
    write_manifest(manifest, dev_path)

    _, lessons = load_catalog(dev_path=dev_path, env={"ENABLE_DEV_LISTENING_CATALOG": "1"})
    clash = [item for item in lessons if item.lesson_id == "en-science-cosmic-calendar"]
    assert len(clash) == 1
    assert clash[0].source.source_provider == "wikimedia-commons", "the reviewed lesson wins"
