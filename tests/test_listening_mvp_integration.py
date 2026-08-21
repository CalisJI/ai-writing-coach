from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import pytest

import writing_coach.media_api as media_api

from writing_coach.core.request_context import LANGUAGE_CODE_CTX
from writing_coach.media_api import MediaImportIn
from writing_coach.media_ingestion import (
    MediaAcquisition,
    MediaIngestionService,
    MediaPlayback,
)
from writing_coach.media_learning import (
    MediaLearningAsset,
    MediaLearningObject,
    MediaProcessingState,
    MediaTranscript,
    TranscriptSegment,
)
from writing_coach.media_translation import (

    MAX_TRANSLATION_BATCHES,
    MAX_TRANSLATION_BATCH_SEGMENTS,
    MediaTranslationService,
    TranslationProviderError,
)


SOURCE_URL = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
PLAYBACK_URL = "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"
LISTENING_MVP_RESPONSE_FIELDS = frozenset(
    {"asset", "playback", "transcript", "translations", "translation"}
)
ROOT = Path(__file__).resolve().parents[1]


def _media_object(
    source_language: str,
    *,
    segment_count: int = 2,
    transcript_available: bool = True,
) -> MediaLearningObject:
    asset_id = f"mvp-{source_language}"
    if not transcript_available:
        return MediaLearningObject(
            asset=MediaLearningAsset(
                asset_id=asset_id,
                source_url=SOURCE_URL,
                source_provider="youtube",
                source_type="external-video",
                title="Captionless MVP lesson",
                source_language="und",
                processing_state=MediaProcessingState.READY,
                transcript_available=False,
                translation_available=False,
            )
        )

    segments = tuple(
        TranscriptSegment(
            segment_id=f"{source_language}-segment-{index:03d}",
            order=index,
            start_ms=index * 1_000,
            end_ms=(index + 1) * 1_000,
            original_text=(
                f"English source segment {index}."
                if source_language == "en"
                else f"中文原文片段 {index}。"
            ),
        )
        for index in range(segment_count)
    )
    return MediaLearningObject(
        asset=MediaLearningAsset(
            asset_id=asset_id,
            source_url=SOURCE_URL,
            source_provider="youtube",
            source_type="external-video",
            title="Internal Listening MVP lesson",
            source_language=source_language,
            processing_state=MediaProcessingState.READY,
            duration_ms=segment_count * 1_000,
            transcript_available=True,
            translation_available=False,
        ),
        transcript=MediaTranscript(asset_id, source_language, segments),
    )


class FakeMediaAdapter:
    provider_id = "youtube"

    def __init__(
        self,
        *,
        segment_count: int = 2,
        transcript_available: bool = True,
        playback: MediaPlayback | None = None,
    ) -> None:
        self.segment_count = segment_count
        self.transcript_available = transcript_available
        self.playback = playback or MediaPlayback("youtube", "embed", PLAYBACK_URL)
        self.calls: list[tuple[str, str]] = []

    def recognizes(self, source_url: str) -> bool:
        return source_url == SOURCE_URL

    def acquire(self, source_url: str, source_language: str) -> MediaAcquisition:
        self.calls.append((source_url, source_language))
        return MediaAcquisition(
            media_object=_media_object(
                source_language,
                segment_count=self.segment_count,
                transcript_available=self.transcript_available,
            ),
            playback=self.playback,
        )


class FakeTranslationGenerator:
    engine_id = "local_test"
    model_version = "v1"

    def __init__(self, *, unavailable: bool = False) -> None:
        self.unavailable = unavailable
        self.calls: list[dict[str, Any]] = []

    def translate_batch(self, source_language, target_language, segments):
        self.calls.append({"source_language": source_language, "target_language": target_language, "segments": segments})
        if self.unavailable:
            raise TranslationProviderError("private provider failure must not reach learners")
        return {
            segment.segment_id: f"{target_language} meaning for {segment.segment_id}"
            for segment in reversed(segments)
        }


def _import_mvp_lesson(
    monkeypatch: pytest.MonkeyPatch,
    *,
    learning_language: str,
    support_language: str,
    adapter: FakeMediaAdapter | None = None,
    generator: FakeTranslationGenerator | None = None,
) -> tuple[dict[str, Any], FakeMediaAdapter, FakeTranslationGenerator]:
    selected_adapter = adapter or FakeMediaAdapter()
    selected_generator = generator or FakeTranslationGenerator()
    ingestion = MediaIngestionService(
        (selected_adapter,),
        source_language_supported=lambda code: code in {"en", "zh"},
    )
    monkeypatch.setattr(media_api, "_media_ingestion_service", ingestion)
    monkeypatch.setattr(
        media_api,
        "_media_translation_service",
        MediaTranslationService(selected_generator),
    )
    token = LANGUAGE_CODE_CTX.set(learning_language)
    try:
        response = media_api.import_media(
            MediaImportIn(source_url=SOURCE_URL, target_language=support_language)
        )
    finally:
        LANGUAGE_CODE_CTX.reset(token)
    return response, selected_adapter, selected_generator


def _assert_shared_workspace_contract(
    response: dict[str, Any],
    *,
    learning_language: str,
    support_language: str,
) -> None:
    assert set(response) == LISTENING_MVP_RESPONSE_FIELDS
    assert response["asset"]["source_language"] == learning_language
    assert response["asset"]["translation_available"] is True
    assert response["playback"] == {
        "provider": "youtube",
        "kind": "embed",
        "url": PLAYBACK_URL,
    }
    transcript = response["transcript"]
    translations = response["translations"]
    assert transcript["source_language"] == learning_language
    assert response["translation"]["status"] == "ready"
    assert response["translation"]["target_language"] == support_language
    assert response["translation"]["source"] == {
        "capability_key": "local_translation",
        "provider": "local_test",
        "model": "v1",
        "request_count": 1,
    }
    segment_ids = [segment["segment_id"] for segment in transcript["segments"]]
    translation_ids = [item["segment_id"] for item in translations]
    assert len(translations) == len(transcript["segments"])
    assert translation_ids == segment_ids
    assert len(translation_ids) == len(set(translation_ids))
    assert all(item["target_language"] == support_language for item in translations)
    assert [segment["start_ms"] for segment in transcript["segments"]] == [0, 1_000]
    assert [segment["end_ms"] for segment in transcript["segments"]] == [1_000, 2_000]
    expected_marker = "English source" if learning_language == "en" else "中文原文"
    assert all(expected_marker in segment["original_text"] for segment in transcript["segments"])


@pytest.mark.parametrize(
    ("learning_language", "support_language"),
    (("en", "vi"), ("zh", "vi"), ("en", "zh")),
)
def test_real_backend_response_satisfies_one_shared_listening_workspace_contract(
    monkeypatch: pytest.MonkeyPatch,
    learning_language: str,
    support_language: str,
) -> None:
    response, adapter, generator = _import_mvp_lesson(
        monkeypatch,
        learning_language=learning_language,
        support_language=support_language,
    )

    _assert_shared_workspace_contract(
        response,
        learning_language=learning_language,
        support_language=support_language,
    )
    assert adapter.calls == [(SOURCE_URL, learning_language)]
    assert [call["target_language"] for call in generator.calls] == [support_language]


def test_same_language_is_truthful_non_blocking_and_zero_call(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    response, _adapter, generator = _import_mvp_lesson(
        monkeypatch,
        learning_language="en",
        support_language="en",
    )

    assert response["translation"]["status"] == "not_required"
    assert response["asset"]["translation_available"] is False
    assert response["translations"] == []
    assert response["transcript"]["segments"]
    assert response["playback"]["url"] == PLAYBACK_URL
    assert generator.calls == []


def test_transcript_unavailable_is_truthful_non_blocking_and_zero_call(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    response, _adapter, generator = _import_mvp_lesson(
        monkeypatch,
        learning_language="zh",
        support_language="vi",
        adapter=FakeMediaAdapter(transcript_available=False),
    )

    assert response["translation"]["status"] == "transcript_unavailable"
    assert response["asset"]["transcript_available"] is False
    assert response["asset"]["translation_available"] is False
    assert response["transcript"] is None
    assert response["translations"] == []
    assert response["playback"]["url"] == PLAYBACK_URL
    assert generator.calls == []


def test_too_large_translation_preserves_the_original_lesson_without_calls(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    segment_count = MAX_TRANSLATION_BATCH_SEGMENTS * MAX_TRANSLATION_BATCHES + 1
    response, _adapter, generator = _import_mvp_lesson(
        monkeypatch,
        learning_language="en",
        support_language="vi",
        adapter=FakeMediaAdapter(segment_count=segment_count),
    )

    assert response["translation"]["status"] == "too_large"
    assert response["asset"]["translation_available"] is False
    assert len(response["transcript"]["segments"]) == segment_count
    assert response["translations"] == []
    assert response["playback"]["url"] == PLAYBACK_URL
    assert generator.calls == []


def test_translation_unavailable_preserves_lesson_and_redacts_provider_failure(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    response, _adapter, generator = _import_mvp_lesson(
        monkeypatch,
        learning_language="zh",
        support_language="vi",
        generator=FakeTranslationGenerator(unavailable=True),
    )

    assert response["translation"]["status"] == "unavailable"
    assert response["translation"]["failure_kind"] == "execution_unavailable"
    assert response["asset"]["translation_available"] is False
    assert response["transcript"]["segments"]
    assert response["translations"] == []
    assert response["playback"]["url"] == PLAYBACK_URL
    assert len(generator.calls) == 1
    assert "private provider failure" not in json.dumps(response)


def test_internal_mvp_acceptance_document_preserves_scope_and_human_gate() -> None:
    document = (ROOT / "docs/operations/LISTENING_MVP_ACCEPTANCE.md").read_text(
        encoding="utf-8"
    )
    normalized = " ".join(document.split()).casefold()

    for required in (
        "english learning context",
        "chinese learning context",
        "previous / next",
        "0.75x, 1x, and 1.25x",
        "not_required",
        "transcript_unavailable",
        "too_large",
        "optional human-gated real-media smoke",
    ):
        assert required in normalized
    assert "not listening completion or public release" in normalized
    assert "learner_translation" in document
    assert "docker compose down -v" not in document
