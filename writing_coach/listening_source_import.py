"""Deterministic development source importer for the Listening catalog.

LISTENING_PRODUCT_SPEC 5 and 6. Humans edit a CSV source list; this turns it
into the same catalog manifest shape the base catalog uses, reusing the existing
YouTube provider adapter, its caption/transcript normalization and the canonical
Media Learning Object. It builds no second importer and downloads no media.

Two rules shape everything here:

* Excerpt boundaries are never invented. Every excerpt starts and ends on a real
  transcript segment boundary produced by the provider, so a generated lesson
  can only claim timing the source actually has.
* Identities are deterministic. The same input row produces the same
  source_media_id, lesson_id and segment ids on every run, so re-importing does
  not churn learner progress that points at them.

A candidate that fails is reported and skipped. One bad URL must not cost the
rest of the batch.
"""

from __future__ import annotations

import csv
import json
from collections import Counter
from collections.abc import Iterable, Iterator, Mapping, Sequence
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from writing_coach.media_ingestion import (
    MediaAcquisition,
    ProviderRequestFailed,
    ProviderSourceUnavailable,
    ProviderTimedOut,
    ProviderTranscriptMalformed,
    ProviderUrlMalformed,
)
from writing_coach.media_providers.youtube import (
    canonical_youtube_url,
    parse_youtube_video_id,
    recognizes_youtube_url,
)

SUPPORTED_LANGUAGES = frozenset({"en", "zh"})
DEFAULT_MIN_EXCERPT_SECONDS = 20
DEFAULT_MAX_EXCERPT_SECONDS = 90
DEFAULT_EXCERPT_COUNT = 3

# Outcomes the spec asks the report to distinguish.
ACCEPTED = "ACCEPTED"
SKIPPED = "SKIPPED"
FAILED = "FAILED"
DUPLICATE = "DUPLICATE"
MISSING_TRANSCRIPT = "MISSING_TRANSCRIPT"
UNSUPPORTED_LANGUAGE = "UNSUPPORTED_LANGUAGE"
MEDIA_UNAVAILABLE = "MEDIA_UNAVAILABLE"

# The CSV category vocabulary, mapped onto the catalog's own topic vocabulary so
# generated lessons land in the discovery rails the spec names in 3.4.
CATEGORY_TOPICS: Mapping[str, str] = {
    "conversation": "conversations",
    "street-interview": "conversations",
    "daily-life": "daily-life",
    "story": "stories",
    "stories": "stories",
    "animation": "animation",
    "movie": "movie",
    "film": "movie",
    "drama": "movie",
    "podcast": "podcast",
    "interview": "interview",
    "science": "science",
    "technology": "technology",
    "culture": "culture",
    "travel": "travel",
    "kids": "kids",
    "family": "kids",
    "motivation": "stories",
    "education": "science",
}

EN_LEVEL_FALLBACK = "B1"
ZH_LEVEL_FALLBACK = "HSK3"


@dataclass(frozen=True)
class SourceCandidate:
    """One human-edited row of the development source list."""

    candidate_id: str
    language: str
    category: str
    source_family: str
    title: str
    source_url: str
    desired_excerpt_count: int
    min_excerpt_seconds: int
    max_excerpt_seconds: int
    preferred_modes: tuple[str, ...]
    level_hint: str
    notes: str


@dataclass
class ImportReport:
    """Per-outcome counts plus the reason each candidate landed where it did."""

    counts: Counter = field(default_factory=Counter)
    entries: list[dict[str, str]] = field(default_factory=list)
    generated_sources: int = 0
    generated_lessons: int = 0

    def record(self, candidate_id: str, outcome: str, detail: str = "") -> None:
        self.counts[outcome] += 1
        self.entries.append({"candidate_id": candidate_id, "outcome": outcome, "detail": detail})

    def as_dict(self) -> dict[str, Any]:
        return {
            "ACCEPTED": self.counts[ACCEPTED],
            "SKIPPED": self.counts[SKIPPED],
            "FAILED": self.counts[FAILED],
            "DUPLICATE": self.counts[DUPLICATE],
            "MISSING_TRANSCRIPT": self.counts[MISSING_TRANSCRIPT],
            "UNSUPPORTED_LANGUAGE": self.counts[UNSUPPORTED_LANGUAGE],
            "MEDIA_UNAVAILABLE": self.counts[MEDIA_UNAVAILABLE],
            "GENERATED_SOURCES": self.generated_sources,
            "GENERATED_LESSONS": self.generated_lessons,
            "entries": list(self.entries),
        }


def _int_or(value: Any, fallback: int) -> int:
    text = str(value or "").strip()
    if not text:
        return fallback
    # "1-3" means at most three; take the upper bound the editor allowed.
    if "-" in text:
        text = text.rsplit("-", 1)[-1].strip()
    try:
        parsed = int(text)
    except ValueError:
        return fallback
    return parsed if parsed > 0 else fallback


def read_source_candidates(path: Path) -> list[SourceCandidate]:
    """Parse a human-edited source CSV. Unknown columns are ignored."""

    # The pack ships with a BOM; utf-8-sig keeps the first header name clean.
    with path.open(encoding="utf-8-sig", newline="") as handle:
        rows = list(csv.DictReader(handle))

    candidates: list[SourceCandidate] = []
    for index, row in enumerate(rows):
        cleaned = {str(key or "").strip(): str(value or "").strip() for key, value in row.items()}
        source_url = cleaned.get("source_url", "")
        if not source_url:
            continue
        candidates.append(SourceCandidate(
            candidate_id=cleaned.get("candidate_id") or f"row-{index + 1:03d}",
            language=cleaned.get("language", "").casefold(),
            category=cleaned.get("category", "").casefold(),
            source_family=cleaned.get("source_family", ""),
            title=cleaned.get("title", ""),
            source_url=source_url,
            desired_excerpt_count=_int_or(cleaned.get("desired_excerpt_count"), DEFAULT_EXCERPT_COUNT),
            min_excerpt_seconds=_int_or(cleaned.get("min_excerpt_seconds"), DEFAULT_MIN_EXCERPT_SECONDS),
            max_excerpt_seconds=_int_or(cleaned.get("max_excerpt_seconds"), DEFAULT_MAX_EXCERPT_SECONDS),
            preferred_modes=tuple(m for m in cleaned.get("preferred_modes", "").split("|") if m),
            level_hint=cleaned.get("level_hint", ""),
            notes=cleaned.get("notes", ""),
        ))
    return candidates


def plan_excerpts(
    segments: Sequence[Mapping[str, Any]],
    *,
    min_seconds: int,
    max_seconds: int,
    limit: int,
) -> list[tuple[int, int]]:
    """Group real transcript segments into excerpt windows.

    Every boundary returned is a boundary the transcript already had. Segments
    are packed in order until the window would exceed `max_seconds`, and the
    window is kept only once it reaches `min_seconds`, so an excerpt is never
    stretched or trimmed to hit a target length.

    Windows are then spread across the source rather than taken from the front,
    because the opening seconds of a video are usually titles and intros.
    """

    if not segments:
        return []
    minimum, maximum = min_seconds * 1000, max_seconds * 1000
    windows: list[tuple[int, int]] = []
    start: int | None = None
    end = 0
    for segment in segments:
        seg_start, seg_end = int(segment["start_ms"]), int(segment["end_ms"])
        if start is None:
            start, end = seg_start, seg_end
            continue
        if seg_end - start > maximum:
            if end - start >= minimum:
                windows.append((start, end))
            start, end = seg_start, seg_end
            continue
        end = seg_end
    if start is not None and end - start >= minimum:
        windows.append((start, end))

    if len(windows) <= limit:
        return windows
    # Even spread, first window always included, order preserved.
    step = len(windows) / limit
    picked = sorted({min(len(windows) - 1, int(i * step)) for i in range(limit)})
    return [windows[i] for i in picked]


def _segments_of(acquisition: MediaAcquisition) -> list[dict[str, Any]]:
    transcript = acquisition.media_object.transcript
    if transcript is None:
        return []
    return [
        {
            "segment_id": segment.segment_id,
            "order": segment.order,
            "start_ms": int(segment.start_ms),
            "end_ms": int(segment.end_ms),
            "original_text": segment.original_text,
        }
        for segment in transcript.segments
    ]


def youtube_poster_url(video_id: str) -> str:
    """The provider's own thumbnail, not a copy we host."""

    return f"https://i.ytimg.com/vi/{video_id}/hqdefault.jpg"


def source_media_id(video_id: str) -> str:
    """Deterministic from the canonical video identity, nothing else."""

    return f"youtube-{video_id}"


def lesson_id_for(language: str, video_id: str, first_segment_order: int) -> str:
    """Deterministic from the source and the excerpt's own first segment.

    Anchoring on the segment order rather than an enumeration counter means
    adding or dropping one excerpt does not renumber the others.
    """

    return f"dev-{language}-{video_id}-{first_segment_order:03d}"


def _level_for(candidate: SourceCandidate) -> str:
    if candidate.level_hint:
        return candidate.level_hint.strip().upper()
    return EN_LEVEL_FALLBACK if candidate.language == "en" else ZH_LEVEL_FALLBACK


def _topic_for(candidate: SourceCandidate) -> str:
    return CATEGORY_TOPICS.get(candidate.category, candidate.category or "conversations")


def build_dev_catalog(
    candidates: Iterable[SourceCandidate],
    adapter: Any,
    report: ImportReport | None = None,
) -> tuple[dict[str, Any], ImportReport]:
    """Run the pipeline over a candidate list and return a catalog manifest.

    EN and ZH go through exactly this function; nothing branches on language
    except the level vocabulary and the topic the editor chose.
    """

    outcome = report or ImportReport()
    sources: list[dict[str, Any]] = []
    lessons: list[dict[str, Any]] = []
    seen_videos: set[str] = set()

    for candidate in candidates:
        if candidate.language not in SUPPORTED_LANGUAGES:
            outcome.record(candidate.candidate_id, UNSUPPORTED_LANGUAGE, candidate.language or "(blank)")
            continue
        if not recognizes_youtube_url(candidate.source_url):
            outcome.record(candidate.candidate_id, SKIPPED, "not a supported provider URL")
            continue
        try:
            video_id = parse_youtube_video_id(candidate.source_url)
        except ProviderUrlMalformed:
            outcome.record(candidate.candidate_id, SKIPPED, "malformed provider URL")
            continue
        if video_id in seen_videos:
            outcome.record(candidate.candidate_id, DUPLICATE, video_id)
            continue

        try:
            acquisition = adapter.acquire(canonical_youtube_url(video_id), candidate.language)
        except ProviderTranscriptMalformed as exc:
            outcome.record(candidate.candidate_id, MISSING_TRANSCRIPT, type(exc).__name__)
            continue
        except (ProviderSourceUnavailable, ProviderTimedOut, ProviderRequestFailed) as exc:
            outcome.record(candidate.candidate_id, MEDIA_UNAVAILABLE, type(exc).__name__)
            continue
        except Exception as exc:  # one bad candidate must not end the batch
            outcome.record(candidate.candidate_id, FAILED, f"{type(exc).__name__}: {exc}"[:160])
            continue

        segments = _segments_of(acquisition)
        if not segments:
            outcome.record(candidate.candidate_id, MISSING_TRANSCRIPT, "no transcript segments")
            continue

        windows = plan_excerpts(
            segments,
            min_seconds=candidate.min_excerpt_seconds,
            max_seconds=candidate.max_excerpt_seconds,
            limit=candidate.desired_excerpt_count,
        )
        if not windows:
            outcome.record(candidate.candidate_id, SKIPPED, "no excerpt reaches the minimum length")
            continue

        seen_videos.add(video_id)
        asset = acquisition.media_object.asset
        duration_ms = max(int(segment["end_ms"]) for segment in segments)
        topic = _topic_for(candidate)
        level = _level_for(candidate)
        modes = list(candidate.preferred_modes or ("listen", "active", "dictation", "shadowing"))
        modes = ["listen" if mode == "follow" else mode for mode in modes]
        if "listen" not in modes:
            modes.insert(0, "listen")

        sources.append({
            "source_media_id": source_media_id(video_id),
            "source_url": acquisition.media_object.asset.source_url,
            "source_provider": "youtube",
            "source_type": "external-video",
            "source_title": asset.title or candidate.title or video_id,
            "source_creator": candidate.source_family or "YouTube",
            "language": candidate.language,
            "duration_ms": duration_ms,
            "playback": {
                "provider": acquisition.playback.provider,
                "kind": acquisition.playback.kind,
                "url": acquisition.playback.url,
            },
            "poster_url": youtube_poster_url(video_id),
            "rights": {
                # Development overlay only. Publication stays a human gate, and
                # the spec forbids calling this production-ready content.
                "license_name": "Provider terms (development candidate)",
                "license_url": "https://www.youtube.com/t/terms",
                "provenance_url": asset.source_url,
                "allowed_usage_type": "development-embed-only",
                "review_status": "verified",
            },
            "segments": segments,
        })
        outcome.generated_sources += 1

        for start_ms, end_ms in windows:
            first = next(s for s in segments if int(s["start_ms"]) == start_ms)
            lessons.append({
                "lesson_id": lesson_id_for(candidate.language, video_id, int(first["order"])),
                "source_media_id": source_media_id(video_id),
                "excerpt_start_ms": start_ms,
                "excerpt_end_ms": end_ms,
                "title": candidate.title or asset.title or video_id,
                "description": candidate.notes or f"Development excerpt from {asset.title or video_id}.",
                "topic": topic,
                "subtopics": [candidate.category] if candidate.category else [],
                "tags": [tag for tag in (candidate.category, "dev-candidate") if tag],
                "estimated_level": level,
                "reviewed_level": None,
                "level_evidence": {
                    "source": "importer-estimate",
                    "review_note": "Development candidate; level and excerpt boundaries are not editorially reviewed.",
                },
                "available_modes": modes,
                "status": "PUBLISHED",
                "artwork": topic,
                "vocabulary": [],
                "sections": ["new"],
            })
            outcome.generated_lessons += 1
        outcome.record(candidate.candidate_id, ACCEPTED, f"{len(windows)} excerpt(s)")

    manifest = {"schema_version": 1, "sources": sources, "lessons": lessons}
    return manifest, outcome


def write_manifest(manifest: Mapping[str, Any], path: Path) -> None:
    """Generated artifact. Humans edit the CSV, never this file."""

    payload = dict(manifest)
    payload["generated"] = "scripts/build_listening_dev_catalog.py — do not edit by hand"
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def iter_candidates(paths: Iterable[Path]) -> Iterator[SourceCandidate]:
    for path in paths:
        yield from read_source_candidates(path)
