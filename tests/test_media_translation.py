from __future__ import annotations

import asyncio
import inspect
import json
from dataclasses import replace
from typing import Any

import pytest
from fastapi import FastAPI

import writing_coach.media_api as media_api
import writing_coach.media_translation as media_translation
from writing_coach.ai.base import AIProviderResponseInvalid, AIProviderUnavailable, AIResult
from writing_coach.ai.capabilities import CAPABILITY_CATALOG
from writing_coach.core import language_registry
from writing_coach.core.support_languages import (
    SUPPORT_LANGUAGES,
    UnsupportedSupportLanguage,
    all_support_languages,
    normalize_support_language,
    support_language,
)
from writing_coach.media_api import MediaImportIn, MediaTranslationIn
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
    LEARNER_TRANSLATION_CAPABILITY,
    MAX_TRANSLATION_BATCH_CHARS,
    MAX_TRANSLATION_BATCH_SEGMENTS,
    MAX_TRANSLATION_BATCHES,
    MediaTranslationFailureKind,
    MediaTranslationService,
    MediaTranslationStatus,
    build_translation_batches,
)


def _media(
    source_language: str = "en",
    *,
    segment_count: int = 2,
    text_size: int = 12,
    transcript_available: bool = True,
) -> MediaLearningObject:
    asset_id = "media:test-asset"
    if not transcript_available:
        return MediaLearningObject(
            asset=MediaLearningAsset(
                asset_id=asset_id,
                source_url="https://example.invalid/media",
                source_provider="test",
                source_type="external-video",
                title="Test media",
                source_language="und",
                processing_state=MediaProcessingState.READY,
                transcript_available=False,
                translation_available=False,
            )
        )
    segments = tuple(
        TranscriptSegment(
            segment_id=f"segment-{index:04d}",
            order=index,
            start_ms=index * 1_000,
            end_ms=(index + 1) * 1_000,
            original_text=f"{index}:" + ("x" * text_size),
        )
        for index in range(segment_count)
    )
    transcript = MediaTranscript(asset_id, source_language, segments)
    return MediaLearningObject(
        asset=MediaLearningAsset(
            asset_id=asset_id,
            source_url="https://example.invalid/media",
            source_provider="test",
            source_type="external-video",
            title="Test media",
            source_language=source_language,
            processing_state=MediaProcessingState.READY,
            transcript_available=True,
            translation_available=False,
        ),
        transcript=transcript,
    )


class FakeGenerator:
    def __init__(
        self,
        actions: tuple[str, ...] = (),
        provenance: tuple[tuple[str, str], ...] = (),
    ) -> None:
        self.actions = actions
        self.provenance = provenance
        self.calls: list[dict[str, Any]] = []

    def __call__(self, **kwargs: Any) -> AIResult:
        self.calls.append(kwargs)
        call_index = len(self.calls) - 1
        action = self.actions[call_index] if call_index < len(self.actions) else "valid"
        if action == "exception":
            raise AIProviderUnavailable("provider detail must remain private")
        if action == "response_invalid":
            raise AIProviderResponseInvalid("raw malformed response must remain private")
        payload = json.loads(kwargs["messages"][1]["content"])
        translations = [
            {
                "segment_id": item["segment_id"],
                "translated_meaning": f"Meaning for {item['segment_id']}",
            }
            for item in reversed(payload["segments"])
        ]
        if action == "missing":
            translations.pop()
        elif action == "extra":
            translations.append(
                {"segment_id": "segment-extra", "translated_meaning": "Extra"}
            )
        elif action == "duplicate":
            translations[-1] = dict(translations[0])
        elif action == "empty":
            translations[0]["translated_meaning"] = " "
        elif action == "unknown":
            translations[0]["segment_id"] = "segment-unknown"
        elif action == "malformed":
            return AIResult(
                data={"unexpected": translations},
                provider="fake",
                model="fake-model",
                runtime={"raw_response": "must not be serialized"},
            )
        provider, model = (
            self.provenance[call_index]
            if call_index < len(self.provenance)
            else ("fake", "fake-model")
        )
        return AIResult(
            data={"translations": translations},
            provider=provider,
            model=model,
            runtime={"request_id": f"secret-{call_index}"},
        )


@pytest.mark.parametrize(("raw", "expected"), (("vi", "vi"), ("EN", "en"), (" zh ", "zh")))
def test_support_language_contract_normalizes_current_codes(raw: str, expected: str) -> None:
    assert normalize_support_language(raw) == expected
    assert support_language(raw).code == expected  # type: ignore[union-attr]


def test_support_language_contract_rejects_unknown_and_is_independent() -> None:
    with pytest.raises(UnsupportedSupportLanguage):
        normalize_support_language("fr")

    assert tuple(definition.code for definition in all_support_languages()) == (
        "vi",
        "en",
        "zh",
    )
    assert SUPPORT_LANGUAGES is not language_registry._REGISTRY
    assert support_language("vi") is not None
    assert language_registry.language("vi") is None


@pytest.mark.parametrize(
    ("source_language", "target_language"),
    (("en", "en"), ("zh", "zh"), ("zh-Hans", "zh")),
)
def test_same_language_translation_is_explicit_zero_call_noop(
    source_language: str,
    target_language: str,
) -> None:
    generator = FakeGenerator()
    original = _media(source_language)

    result = MediaTranslationService(generator).translate(original, target_language)

    assert result.status is MediaTranslationStatus.NOT_REQUIRED
    assert result.media_object is original
    assert result.media_object.translations == ()
    assert result.media_object.asset.translation_available is False
    assert result.provenance is None
    assert generator.calls == []


def test_transcript_unavailable_is_explicit_and_makes_zero_calls() -> None:
    generator = FakeGenerator()
    original = _media(transcript_available=False)

    result = MediaTranslationService(generator).translate(original, "vi")

    assert result.status is MediaTranslationStatus.TRANSCRIPT_UNAVAILABLE
    assert result.media_object is original
    assert result.media_object.transcript is None
    assert result.media_object.translations == ()
    assert generator.calls == []


@pytest.mark.parametrize(
    ("source_language", "target_language"),
    (("en", "vi"), ("zh", "vi"), ("en", "zh"), ("zh", "en")),
)
def test_en_and_zh_share_one_translation_service(
    source_language: str,
    target_language: str,
) -> None:
    generator = FakeGenerator()

    result = MediaTranslationService(generator).translate(
        _media(source_language), target_language
    )

    assert result.status is MediaTranslationStatus.READY
    assert all(
        translation.target_language == target_language
        for translation in result.media_object.translations
    )
    assert generator.calls[0]["capability_key"] == LEARNER_TRANSLATION_CAPABILITY
    assert target_language in generator.calls[0]["messages"][1]["content"]


def test_translation_output_maps_exact_ids_back_to_canonical_order() -> None:
    generator = FakeGenerator()
    original = _media("en", segment_count=3)
    original_transcript = original.transcript

    result = MediaTranslationService(generator).translate(original, "vi")

    assert result.status is MediaTranslationStatus.READY
    assert result.media_object.transcript is original_transcript
    assert result.media_object.asset == replace(original.asset, translation_available=True)
    assert [item.segment_id for item in result.media_object.translations] == [
        segment.segment_id for segment in original_transcript.segments  # type: ignore[union-attr]
    ]
    assert result.media_object.asset.translation_available is True
    assert original.asset.translation_available is False
    assert original.translations == ()


@pytest.mark.parametrize("action", ("missing", "extra", "duplicate", "empty", "unknown", "malformed"))
def test_malformed_translation_output_fails_atomically(action: str) -> None:
    original = _media("en", segment_count=3)
    generator = FakeGenerator((action,))

    result = MediaTranslationService(generator).translate(original, "vi")

    assert result.status is MediaTranslationStatus.UNAVAILABLE
    assert result.failure_kind is MediaTranslationFailureKind.MALFORMED_RESULT
    assert result.media_object is original
    assert result.media_object.translations == ()
    assert result.media_object.asset.translation_available is False
    assert len(generator.calls) == 1


def test_failed_later_batch_discards_all_partial_translations_without_retry() -> None:
    original = _media("en", segment_count=MAX_TRANSLATION_BATCH_SEGMENTS + 1)
    generator = FakeGenerator(("valid", "exception"))

    result = MediaTranslationService(generator).translate(original, "vi")

    assert result.status is MediaTranslationStatus.UNAVAILABLE
    assert result.failure_kind is MediaTranslationFailureKind.EXECUTION_UNAVAILABLE
    assert result.media_object is original
    assert result.media_object.translations == ()
    assert result.provenance is not None
    assert result.provenance.request_count == 2
    assert len(generator.calls) == 2


def test_provider_schema_failure_is_a_safe_malformed_result() -> None:
    generator = FakeGenerator(("response_invalid",))

    result = MediaTranslationService(generator).translate(_media("en"), "vi")

    assert result.status is MediaTranslationStatus.UNAVAILABLE
    assert result.failure_kind is MediaTranslationFailureKind.MALFORMED_RESULT
    assert result.media_object.translations == ()
    assert result.provenance is not None
    assert result.provenance.request_count == 1
    assert len(generator.calls) == 1


def test_batch_boundaries_are_deterministic_and_not_one_call_per_segment() -> None:
    original = _media("en", segment_count=MAX_TRANSLATION_BATCH_SEGMENTS + 1)
    transcript = original.transcript

    first = build_translation_batches(transcript.segments)  # type: ignore[union-attr]
    second = build_translation_batches(transcript.segments)  # type: ignore[union-attr]
    generator = FakeGenerator()
    result = MediaTranslationService(generator).translate(original, "vi")

    assert first == second
    assert first is not None
    assert [len(batch) for batch in first] == [MAX_TRANSLATION_BATCH_SEGMENTS, 1]
    assert result.status is MediaTranslationStatus.READY
    assert len(generator.calls) == 2
    assert len(generator.calls) < len(transcript.segments)  # type: ignore[union-attr]
    assert result.provenance is not None
    assert result.provenance.request_count == 2


def test_oversized_transcript_is_rejected_before_any_ai_request() -> None:
    generator = FakeGenerator()
    original = _media(
        "en",
        segment_count=(MAX_TRANSLATION_BATCH_SEGMENTS * MAX_TRANSLATION_BATCHES) + 1,
    )

    result = MediaTranslationService(generator).translate(original, "vi")

    assert result.status is MediaTranslationStatus.TOO_LARGE
    assert result.media_object is original
    assert generator.calls == []


def test_exact_maximum_batch_count_succeeds_with_bounded_request_count() -> None:
    generator = FakeGenerator()
    original = _media(
        "en",
        segment_count=MAX_TRANSLATION_BATCH_SEGMENTS * MAX_TRANSLATION_BATCHES,
    )

    result = MediaTranslationService(generator).translate(original, "vi")

    assert result.status is MediaTranslationStatus.READY
    assert len(generator.calls) == MAX_TRANSLATION_BATCHES
    assert result.provenance is not None
    assert result.provenance.request_count == MAX_TRANSLATION_BATCHES


def test_single_oversized_segment_is_rejected_before_any_ai_request() -> None:
    generator = FakeGenerator()
    original = _media("en", text_size=MAX_TRANSLATION_BATCH_CHARS + 1)

    result = MediaTranslationService(generator).translate(original, "vi")

    assert result.status is MediaTranslationStatus.TOO_LARGE
    assert generator.calls == []


def test_every_request_uses_exact_existing_capability_and_shared_prompt_contract() -> None:
    generator = FakeGenerator()
    result = MediaTranslationService(generator).translate(_media("zh"), "vi")

    assert result.status is MediaTranslationStatus.READY
    assert {call["capability_key"] for call in generator.calls} == {
        "learner_translation"
    }
    assert "Vietnamese" in generator.calls[0]["messages"][0]["content"]
    assert "Pinyin" in generator.calls[0]["messages"][0]["content"]
    assert "media_translation" not in CAPABILITY_CATALOG
    assert "media_translation_en" not in CAPABILITY_CATALOG
    assert "media_translation_zh" not in CAPABILITY_CATALOG


def test_inconsistent_provider_model_provenance_fails_atomically() -> None:
    generator = FakeGenerator(
        provenance=(("fake", "model-a"), ("fake", "model-b"))
    )
    original = _media("en", segment_count=MAX_TRANSLATION_BATCH_SEGMENTS + 1)

    result = MediaTranslationService(generator).translate(original, "vi")

    assert result.status is MediaTranslationStatus.UNAVAILABLE
    assert result.failure_kind is MediaTranslationFailureKind.INCONSISTENT_PROVENANCE
    assert result.media_object is original
    assert result.provenance is not None
    assert result.provenance.provider is None
    assert result.provenance.model is None
    assert result.provenance.request_count == 2
    assert len(generator.calls) == 2


def test_media_translation_has_no_direct_provider_routing_or_network_dependency() -> None:
    source = inspect.getsource(media_translation).casefold()

    assert "active_selection" not in source
    assert "build_providers" not in source
    assert "requests" not in source
    assert "openai" not in source
    assert "deepseek" not in source
    assert "ollama" not in source
    assert "gemini" not in source
    assert "fallback" not in source


class FakeIngestionService:
    def __init__(self, media_object: MediaLearningObject) -> None:
        self.media_object = media_object
        self.calls: list[tuple[str, str, str]] = []

    def import_media(
        self, source_url: str, target_language: str, source_language: str
    ) -> MediaAcquisition:
        self.calls.append((source_url, target_language, source_language))
        return MediaAcquisition(
            media_object=self.media_object,
            playback=MediaPlayback("youtube", "embed", "https://example.invalid/embed"),
        )


def _api_response(
    monkeypatch: pytest.MonkeyPatch,
    media_object: MediaLearningObject,
    generator: FakeGenerator,
    target_language: str = "vi",
) -> dict[str, Any]:
    ingestion = FakeIngestionService(media_object)
    monkeypatch.setattr(media_api, "_media_ingestion_service", ingestion)
    monkeypatch.setattr(
        media_api,
        "_media_translation_service",
        MediaTranslationService(generator),
    )
    return media_api.import_media(
        MediaImportIn(
            source_url="https://example.invalid/media",
            target_language=target_language,
        )
    )


def _translation_request(media_object: MediaLearningObject) -> MediaTranslationIn:
    transcript = media_object.transcript
    assert transcript is not None
    asset = media_object.asset
    return MediaTranslationIn(
        target_language="vi",
        asset={
            "asset_id": asset.asset_id,
            "source_url": asset.source_url,
            "source_provider": asset.source_provider,
            "source_type": asset.source_type,
            "title": asset.title,
            "source_language": asset.source_language,
            "processing_state": asset.processing_state.value,
            "duration_ms": asset.duration_ms,
            "transcript_available": asset.transcript_available,
        },
        transcript={
            "asset_id": transcript.asset_id,
            "source_language": transcript.source_language,
            "segments": [
                {
                    "segment_id": segment.segment_id,
                    "order": segment.order,
                    "start_ms": segment.start_ms,
                    "end_ms": segment.end_ms,
                    "original_text": segment.original_text,
                }
                for segment in transcript.segments
            ],
        },
    )


def test_api_translate_reuses_the_canonical_transcript_without_reimporting(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    original = _media("en", segment_count=3)
    generator = FakeGenerator()
    monkeypatch.setattr(media_api, "_media_ingestion_service", None)
    monkeypatch.setattr(
        media_api,
        "_media_translation_service",
        MediaTranslationService(generator),
    )

    response = media_api.translate_media(_translation_request(original))

    assert response["translation"]["status"] == "ready"
    assert [item["segment_id"] for item in response["translations"]] == [
        segment.segment_id for segment in original.transcript.segments  # type: ignore[union-attr]
    ]
    assert response["transcript"]["segments"] == [
        {
            "segment_id": segment.segment_id,
            "order": segment.order,
            "start_ms": segment.start_ms,
            "end_ms": segment.end_ms,
            "original_text": segment.original_text,
            "words": [],
        }
        for segment in original.transcript.segments  # type: ignore[union-attr]
    ]
    assert len(generator.calls) == 1


def test_invalid_api_target_language_preserves_structured_http_contract(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    class CountingAdapter:
        provider_id = "test"

        def __init__(self) -> None:
            self.calls: list[str] = []

        def recognizes(self, source_url: str) -> bool:
            self.calls.append(f"recognizes:{source_url}")
            return True

        def acquire(self, source_url: str, source_language: str) -> MediaAcquisition:
            self.calls.append(f"acquire:{source_url}:{source_language}")
            raise AssertionError("Invalid support language reached media acquisition")

    class CountingTranslationService:
        def __init__(self) -> None:
            self.calls: list[tuple[MediaLearningObject, str]] = []

        def translate(
            self, media_object: MediaLearningObject, target_language: str
        ) -> MediaTranslationResult:
            self.calls.append((media_object, target_language))
            raise AssertionError("Invalid support language reached translation")

    adapter = CountingAdapter()
    translation = CountingTranslationService()
    ingestion = MediaIngestionService((adapter,), lambda _language: True)
    monkeypatch.setattr(media_api, "_media_ingestion_service", ingestion)
    monkeypatch.setattr(media_api, "_media_translation_service", translation)
    application = FastAPI()
    application.include_router(media_api.router)

    request_body = json.dumps(
        {
            "source_url": "https://example.invalid/media",
            "target_language": "fr",
        }
    ).encode()
    sent: list[dict[str, Any]] = []
    request_sent = False

    async def receive() -> dict[str, Any]:
        nonlocal request_sent
        if request_sent:
            return {"type": "http.disconnect"}
        request_sent = True
        return {"type": "http.request", "body": request_body, "more_body": False}

    async def send(message: dict[str, Any]) -> None:
        sent.append(message)

    asyncio.run(
        application(
            {
                "type": "http",
                "asgi": {"version": "3.0"},
                "http_version": "1.1",
                "method": "POST",
                "scheme": "http",
                "path": "/api/media-learning/import",
                "raw_path": b"/api/media-learning/import",
                "query_string": b"",
                "headers": [
                    (b"content-type", b"application/json"),
                    (b"content-length", str(len(request_body)).encode()),
                ],
                "client": ("test", 123),
                "server": ("test", 80),
                "root_path": "",
            },
            receive,
            send,
        )
    )

    response_start = next(
        message for message in sent if message["type"] == "http.response.start"
    )
    response_body = b"".join(
        message.get("body", b"")
        for message in sent
        if message["type"] == "http.response.body"
    )
    assert response_start["status"] == 422
    assert json.loads(response_body) == {
        "detail": {
            "category": "invalid_target_language",
            "message": "Choose a valid support language.",
        }
    }
    assert adapter.calls == []
    assert translation.calls == []


def test_api_ready_response_preserves_pv2_fields_and_safe_provenance(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    generator = FakeGenerator(provenance=(("HTTPS://user:secret@example", "token=secret"),))

    response = _api_response(monkeypatch, _media("en"), generator)

    assert response["translation"] == {
        "status": "ready",
        "target_language": "vi",
        "source": {
            "capability_key": "learner_translation",
            "provider": "redacted",
            "request_count": 1,
        },
        "failure_kind": None,
    }
    assert response["asset"]["translation_available"] is True
    assert response["playback"]["kind"] == "embed"
    assert response["transcript"]["segments"]
    assert len(response["translations"]) == len(response["transcript"]["segments"])
    serialized = json.dumps(response)
    assert "token=secret" not in serialized
    assert "user:secret" not in serialized
    assert "request_id" not in serialized


def test_api_translation_failure_preserves_successful_ingestion(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    response = _api_response(
        monkeypatch,
        _media("en"),
        FakeGenerator(("exception",)),
    )

    assert response["translation"]["status"] == "unavailable"
    assert response["translation"]["failure_kind"] == "execution_unavailable"
    assert response["asset"]["translation_available"] is False
    assert response["transcript"]["segments"]
    assert response["playback"]["url"] == "https://example.invalid/embed"
    assert response["translations"] == []
    assert "provider detail" not in json.dumps(response)


def test_api_too_large_status_preserves_playback_without_spending_requests(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    generator = FakeGenerator()
    response = _api_response(
        monkeypatch,
        _media(
            "en",
            segment_count=(MAX_TRANSLATION_BATCH_SEGMENTS * MAX_TRANSLATION_BATCHES)
            + 1,
        ),
        generator,
    )

    assert response["translation"]["status"] == "too_large"
    assert response["playback"]["kind"] == "embed"
    assert response["transcript"]["segments"]
    assert response["translations"] == []
    assert generator.calls == []


def test_api_noop_and_no_transcript_states_are_truthful(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    same_generator = FakeGenerator()
    same = _api_response(monkeypatch, _media("en"), same_generator, "en")
    assert same["translation"]["status"] == "not_required"
    assert same["translations"] == []
    assert same_generator.calls == []

    missing_generator = FakeGenerator()
    missing = _api_response(
        monkeypatch,
        _media(transcript_available=False),
        missing_generator,
    )
    assert missing["translation"]["status"] == "transcript_unavailable"
    assert missing["transcript"] is None
    assert missing["translations"] == []
    assert missing_generator.calls == []
