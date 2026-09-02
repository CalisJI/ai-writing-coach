"""Versioned, rights-aware Listening catalog over canonical Media Learning.

The manifest separates source media, canonical timestamped segments, and
learner-facing excerpts.  Curators can therefore add or revise content without
editing a React screen or creating a second player/transcript architecture.
"""

from __future__ import annotations

import json
from collections.abc import Mapping
from dataclasses import dataclass
from pathlib import Path
from typing import Any
from urllib.parse import urlsplit

from writing_coach.media_ingestion import MediaPlayback
from writing_coach.media_learning import (
    MediaLearningAsset,
    MediaLearningObject,
    MediaProcessingState,
    MediaTranscript,
    SegmentTranslation,
    TranscriptSegment,
)


CATALOG_MANIFEST = Path(__file__).with_name("content") / "listening_catalog.v1.json"
CONTENT_STATUSES = frozenset({"DRAFT", "PROCESSING", "NEEDS_REVIEW", "READY", "PUBLISHED", "ARCHIVED"})
# Media and posters may only come from origins the rights review actually
# covered. media-player.js and the native adapter enforce the same list at the
# edge; validating here means an editorial pipeline cannot introduce a source
# the players would then have to reject.
REVIEWED_MEDIA_HOSTS = frozenset({"commons.wikimedia.org", "upload.wikimedia.org"})
PUBLIC_CONTENT_STATUS = "PUBLISHED"
EN_LEVELS = frozenset({"A1", "A2", "B1", "B2", "C1", "C2"})
ZH_LEVELS = frozenset({"HSK1", "HSK2", "HSK3", "HSK4", "HSK5", "HSK6", "HSK7-9"})
PRACTICE_MODES = frozenset({"listen", "active", "dictation", "shadowing"})


@dataclass(frozen=True)
class CatalogSource:
    source_media_id: str
    source_url: str
    source_provider: str
    source_type: str
    source_title: str
    source_creator: str
    language: str
    duration_ms: int
    playback: MediaPlayback
    license_name: str
    license_url: str
    provenance_url: str
    allowed_usage_type: str
    rights_review_status: str
    segments: tuple[Mapping[str, Any], ...]
    poster_url: str = ""


@dataclass(frozen=True)
class CuratedListeningLesson:
    lesson_id: str
    source: CatalogSource
    media_object: MediaLearningObject
    playback: MediaPlayback
    excerpt_start_ms: int
    excerpt_end_ms: int
    description: str
    topic: str
    subtopics: tuple[str, ...]
    estimated_level: str
    reviewed_level: str | None
    level_evidence: Mapping[str, str]
    available_modes: tuple[str, ...]
    content_status: str
    content_tags: tuple[str, ...]
    sections: tuple[str, ...]
    vocabulary: tuple[str, ...] = ()
    artwork: str = "listen"

    @property
    def duration_ms(self) -> int:
        return self.excerpt_end_ms - self.excerpt_start_ms

    @property
    def level(self) -> str:
        return self.reviewed_level or self.estimated_level

    @property
    def speech_speed(self) -> str | None:
        return self.level_evidence.get("speech_speed")

    @property
    def pinyin_by_segment(self) -> tuple[tuple[str, str], ...]:
        return tuple(
            (str(segment["segment_id"]), str(segment.get("pinyin") or ""))
            for segment in self.source.segments
            if segment.get("pinyin") and _segment_in_excerpt(segment, self.excerpt_start_ms, self.excerpt_end_ms)
        )


def _playback_url(playback: Mapping[str, Any], source_id: str) -> str:
    """Direct audio/video must be rights-reviewed; embeds keep provider rules."""

    url = _required_text(playback.get("url"), "playback url")
    if str(playback.get("kind") or "").strip() in {"audio", "video"}:
        return _reviewed_media_url(url, "playback url", source_id)
    return url


def _reviewed_media_url(value: Any, field: str, source_id: str) -> str:
    """An https URL on a rights-reviewed host, or a hard failure."""

    cleaned = str(value or "").strip()
    if not cleaned:
        return ""
    parsed = urlsplit(cleaned)
    if parsed.scheme != "https" or parsed.hostname not in REVIEWED_MEDIA_HOSTS:
        raise ValueError(
            f"Listening source {source_id} {field} must be an https URL on a rights-reviewed host."
        )
    return cleaned


def _required_text(value: Any, field: str) -> str:
    cleaned = str(value or "").strip()
    if not cleaned:
        raise ValueError(f"Listening catalog {field} must not be empty.")
    return cleaned


def _string_tuple(value: Any, field: str) -> tuple[str, ...]:
    if not isinstance(value, list):
        raise ValueError(f"Listening catalog {field} must be a list.")
    items = tuple(_required_text(item, field) for item in value)
    if len(items) != len(set(items)):
        raise ValueError(f"Listening catalog {field} contains duplicates.")
    return items


def _segment_in_excerpt(segment: Mapping[str, Any], start_ms: int, end_ms: int) -> bool:
    return int(segment["start_ms"]) >= start_ms and int(segment["end_ms"]) <= end_ms


def _load_source(raw: Mapping[str, Any]) -> CatalogSource:
    source_id = _required_text(raw.get("source_media_id"), "source_media_id")
    language = _required_text(raw.get("language"), "language").casefold()
    if language not in {"en", "zh"}:
        raise ValueError(f"Listening source {source_id} has unsupported language {language}.")
    duration_ms = int(raw.get("duration_ms") or 0)
    if duration_ms <= 0:
        raise ValueError(f"Listening source {source_id} has an invalid duration.")

    playback = raw.get("playback")
    rights = raw.get("rights")
    segments = raw.get("segments")
    if not isinstance(playback, Mapping) or not isinstance(rights, Mapping) or not isinstance(segments, list) or not segments:
        raise ValueError(f"Listening source {source_id} is missing playback, rights, or segments.")
    if _required_text(rights.get("review_status"), "rights review_status") != "verified":
        raise ValueError(f"Listening source {source_id} has not passed rights review.")

    normalized_segments: list[Mapping[str, Any]] = []
    seen_segment_ids: set[str] = set()
    previous_end = -1
    for order, segment in enumerate(segments):
        if not isinstance(segment, Mapping):
            raise ValueError(f"Listening source {source_id} has an invalid segment.")
        segment_id = _required_text(segment.get("segment_id"), "segment_id")
        start_ms = int(segment.get("start_ms") or 0)
        end_ms = int(segment.get("end_ms") or 0)
        if segment_id in seen_segment_ids or start_ms < 0 or end_ms <= start_ms or end_ms > duration_ms or start_ms < previous_end:
            raise ValueError(f"Listening source {source_id} has invalid canonical segment timing.")
        seen_segment_ids.add(segment_id)
        previous_end = end_ms
        translations = segment.get("translations") or {}
        if not isinstance(translations, Mapping):
            raise ValueError(f"Listening segment {segment_id} has invalid translations.")
        normalized_segments.append({
            "segment_id": segment_id,
            "order": order,
            "start_ms": start_ms,
            "end_ms": end_ms,
            "original_text": _required_text(segment.get("original_text"), "original_text"),
            "pinyin": str(segment.get("pinyin") or "").strip(),
            "translations": {str(key).casefold(): _required_text(value, "translation") for key, value in translations.items()},
        })

    return CatalogSource(
        source_media_id=source_id,
        source_url=_required_text(raw.get("source_url"), "source_url"),
        source_provider=_required_text(raw.get("source_provider"), "source_provider"),
        source_type=_required_text(raw.get("source_type"), "source_type"),
        source_title=_required_text(raw.get("source_title"), "source_title"),
        source_creator=_required_text(raw.get("source_creator"), "source_creator"),
        language=language,
        duration_ms=duration_ms,
        playback=MediaPlayback(
            _required_text(playback.get("provider"), "playback provider"),
            _required_text(playback.get("kind"), "playback kind"),
            _playback_url(playback, source_id),
        ),
        license_name=_required_text(rights.get("license_name"), "license_name"),
        license_url=_required_text(rights.get("license_url"), "license_url"),
        provenance_url=_required_text(rights.get("provenance_url"), "provenance_url"),
        allowed_usage_type=_required_text(rights.get("allowed_usage_type"), "allowed_usage_type"),
        rights_review_status="verified",
        segments=tuple(normalized_segments),
        poster_url=_reviewed_media_url(raw.get("poster_url"), "poster_url", source_id),
    )


def _media_object(source: CatalogSource, title: str, start_ms: int, end_ms: int) -> MediaLearningObject:
    selected = tuple(segment for segment in source.segments if _segment_in_excerpt(segment, start_ms, end_ms))
    if not selected:
        raise ValueError(f"Listening excerpt {title} contains no complete canonical segment.")
    transcript = tuple(
        TranscriptSegment(
            str(segment["segment_id"]),
            int(segment["order"]),
            int(segment["start_ms"]),
            int(segment["end_ms"]),
            str(segment["original_text"]),
        )
        for segment in selected
    )
    translations = tuple(
        SegmentTranslation(str(segment["segment_id"]), language, text)
        for segment in selected
        for language, text in dict(segment["translations"]).items()
    )
    return MediaLearningObject(
        MediaLearningAsset(
            asset_id=source.source_media_id,
            source_url=source.source_url,
            source_provider=source.source_provider,
            source_type=source.source_type,
            title=title,
            source_language=source.language,
            processing_state=MediaProcessingState.READY,
            duration_ms=source.duration_ms,
            transcript_available=True,
            translation_available=bool(translations),
        ),
        MediaTranscript(source.source_media_id, source.language, transcript),
        translations,
    )


def load_catalog_manifest(path: Path = CATALOG_MANIFEST) -> tuple[Mapping[str, CatalogSource], tuple[CuratedListeningLesson, ...]]:
    raw = json.loads(path.read_text(encoding="utf-8"))
    if raw.get("schema_version") != 1 or not isinstance(raw.get("sources"), list) or not isinstance(raw.get("lessons"), list):
        raise ValueError("Listening catalog manifest schema is unsupported.")

    source_list = tuple(_load_source(item) for item in raw["sources"])
    if len({item.source_media_id for item in source_list}) != len(source_list):
        raise ValueError("Listening catalog source identities must be unique.")
    sources = {item.source_media_id: item for item in source_list}

    lessons: list[CuratedListeningLesson] = []
    seen_lesson_ids: set[str] = set()
    for raw_lesson in raw["lessons"]:
        lesson_id = _required_text(raw_lesson.get("lesson_id"), "lesson_id")
        source_id = _required_text(raw_lesson.get("source_media_id"), "source_media_id")
        source = sources.get(source_id)
        if lesson_id in seen_lesson_ids or source is None:
            raise ValueError(f"Listening lesson {lesson_id} has a duplicate or unknown source.")
        seen_lesson_ids.add(lesson_id)

        status = _required_text(raw_lesson.get("status"), "status").upper()
        if status not in CONTENT_STATUSES:
            raise ValueError(f"Listening lesson {lesson_id} has invalid lifecycle status.")
        start_ms = int(raw_lesson.get("excerpt_start_ms") or 0)
        end_ms = int(raw_lesson.get("excerpt_end_ms") or 0)
        if start_ms < 0 or end_ms <= start_ms or end_ms > source.duration_ms:
            raise ValueError(f"Listening lesson {lesson_id} has invalid excerpt bounds.")

        estimated_level = _required_text(raw_lesson.get("estimated_level"), "estimated_level").upper()
        reviewed_raw = str(raw_lesson.get("reviewed_level") or "").strip().upper()
        reviewed_level = reviewed_raw or None
        allowed_levels = EN_LEVELS if source.language == "en" else ZH_LEVELS
        if estimated_level not in allowed_levels or (reviewed_level and reviewed_level not in allowed_levels):
            raise ValueError(f"Listening lesson {lesson_id} has an invalid canonical level.")
        evidence = raw_lesson.get("level_evidence")
        if not isinstance(evidence, Mapping) or not all(str(value).strip() for value in evidence.values()):
            raise ValueError(f"Listening lesson {lesson_id} lacks explainable level evidence.")

        modes = _string_tuple(raw_lesson.get("available_modes"), "available_modes")
        if not modes or not set(modes).issubset(PRACTICE_MODES) or "listen" not in modes:
            raise ValueError(f"Listening lesson {lesson_id} has invalid practice modes.")
        tags = _string_tuple(raw_lesson.get("tags"), "tags")
        if not tags:
            raise ValueError(f"Listening lesson {lesson_id} needs at least one discovery tag.")
        title = _required_text(raw_lesson.get("title"), "title")
        lesson = CuratedListeningLesson(
            lesson_id=lesson_id,
            source=source,
            media_object=_media_object(source, title, start_ms, end_ms),
            playback=source.playback,
            excerpt_start_ms=start_ms,
            excerpt_end_ms=end_ms,
            description=_required_text(raw_lesson.get("description"), "description"),
            topic=_required_text(raw_lesson.get("topic"), "topic"),
            subtopics=_string_tuple(raw_lesson.get("subtopics"), "subtopics"),
            estimated_level=estimated_level,
            reviewed_level=reviewed_level,
            level_evidence={str(key): str(value).strip() for key, value in evidence.items()},
            available_modes=modes,
            content_status=status,
            content_tags=tags,
            sections=_string_tuple(raw_lesson.get("sections"), "sections"),
            vocabulary=_string_tuple(raw_lesson.get("vocabulary"), "vocabulary"),
            artwork=_required_text(raw_lesson.get("artwork"), "artwork"),
        )
        lessons.append(lesson)
    return sources, tuple(lessons)


CATALOG_SOURCES, CATALOG = load_catalog_manifest()


def catalog_lesson(lesson_id: str) -> CuratedListeningLesson | None:
    return next(
        (lesson for lesson in CATALOG if lesson.lesson_id == lesson_id and lesson.content_status == PUBLIC_CONTENT_STATUS),
        None,
    )


def catalog_lessons(
    *, language: str | None = None, level: str | None = None, topic: str | None = None, tag: str | None = None,
) -> tuple[CuratedListeningLesson, ...]:
    language_key = (language or "").strip().casefold()
    level_key = (level or "").strip().casefold()
    topic_key = (topic or "").strip().casefold()
    tag_key = (tag or "").strip().casefold()
    return tuple(
        lesson
        for lesson in CATALOG
        if lesson.content_status == PUBLIC_CONTENT_STATUS
        and (not language_key or lesson.source.language.casefold() == language_key)
        and (not level_key or lesson.level.casefold() == level_key)
        and (
            not topic_key
            or lesson.topic.casefold() == topic_key
            or topic_key in {value.casefold() for value in lesson.subtopics}
        )
        and (not tag_key or tag_key in {value.casefold() for value in lesson.content_tags})
    )


def translated_media_object(lesson: CuratedListeningLesson, target_language: str) -> MediaLearningObject:
    """Project one support language without duplicating canonical segments."""
    target = target_language.strip().casefold()
    translations = tuple(
        item for item in lesson.media_object.translations if item.target_language.casefold() == target
    )
    asset = lesson.media_object.asset
    return MediaLearningObject(
        MediaLearningAsset(
            asset_id=asset.asset_id,
            source_url=asset.source_url,
            source_provider=asset.source_provider,
            source_type=asset.source_type,
            title=asset.title,
            source_language=asset.source_language,
            processing_state=asset.processing_state,
            duration_ms=asset.duration_ms,
            transcript_available=True,
            translation_available=bool(translations),
        ),
        lesson.media_object.transcript,
        translations,
    )


def lesson_metadata(lesson: CuratedListeningLesson) -> dict[str, object]:
    source = lesson.source
    return {
        "lesson_id": lesson.lesson_id,
        "media_object_id": source.source_media_id,
        "title": lesson.media_object.asset.title,
        "description": lesson.description,
        "language": source.language,
        "topic": lesson.topic,
        "subtopics": list(lesson.subtopics),
        "level": lesson.level,
        "estimated_level": lesson.estimated_level,
        "reviewed_level": lesson.reviewed_level,
        "level_source": "editorial-review" if lesson.reviewed_level else "deterministic-estimate",
        "level_evidence": dict(lesson.level_evidence),
        "duration_ms": lesson.duration_ms,
        "excerpt_start_ms": lesson.excerpt_start_ms,
        "excerpt_end_ms": lesson.excerpt_end_ms,
        "available_modes": list(lesson.available_modes),
        "content_tags": list(lesson.content_tags),
        "vocabulary": list(lesson.vocabulary),
        "speech_speed": lesson.speech_speed,
        "artwork": lesson.artwork,
        "poster_url": source.poster_url,
        "playback_kind": source.playback.kind,
        "published_state": lesson.content_status.casefold(),
        "source": {
            "source_media_id": source.source_media_id,
            "provider": source.source_provider,
            "type": source.source_type,
            "title": source.source_title,
            "creator": source.source_creator,
            "source_url": source.source_url,
            "provenance_url": source.provenance_url,
            "license": source.license_name,
            "license_url": source.license_url,
            "allowed_usage_type": source.allowed_usage_type,
            "rights_review_status": source.rights_review_status,
        },
    }
