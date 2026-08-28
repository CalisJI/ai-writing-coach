from __future__ import annotations

import asyncio
import json

import pytest
from fastapi import FastAPI, HTTPException

from writing_coach.speaking_evaluator import (
    SpeakingEvaluationInvalid,
    build_speaking_evaluation,
)
from writing_coach.core.request_context import LANGUAGE_CODE_CTX
from writing_coach.speech_api import (
    SpeakingAttemptIn,
    SpeakingEvaluationIn,
    configure_speaking_attempt_repository,
    evaluate_speaking,
    list_speaking_attempts,
    save_speaking_attempt,
    router as speech_router,
)


def _pronunciation(*, score_kind: str = "provider") -> dict:
    return {
        "provider": "azure-speech" if score_kind == "provider" else "demo-synthetic",
        "score_kind": score_kind,
        "locale": "en-US",
        "pron_score": 88,
        "accuracy_score": 88,
        "fluency_score": 82,
        "completeness_score": 96,
        "prosody_score": 84,
        "words": [
            {
                "word": "practise",
                "accuracy_score": 72,
                "error_type": "Mispronunciation",
                "phonemes": [{"phoneme": "æ", "accuracy_score": 65}],
            }
        ],
    }


def test_builds_separate_per_take_dimensions_and_evidence() -> None:
    result = build_speaking_evaluation(
        language="en",
        reference_text="I practise every day.",
        transcript_text="I practise every day.",
        transcription_confidence=93,
        content_match={
            "content_match": 92,
            "missing_tokens": [],
            "extra_tokens": ["really"],
        },
        pronunciation=_pronunciation(),
    )

    assert result["schema_version"] == 1
    assert result["locale"] == "en-US"
    assert result["dimensions"] == {
        "transcription_confidence": 93.0,
        "content_match": 92.0,
        "pronunciation": 88.0,
        "fluency": 82.0,
        "proficiency": None,
    }
    assert result["provenance"]["content_match"] == "deterministic_reference_alignment"
    assert result["provenance"]["pronunciation"] == "azure-speech"
    assert result["evidence"]["content"]["extra_tokens"] == ["really"]
    assert result["evidence"]["pronunciation"]["words"][0]["phonemes"][0]["phoneme"] == "æ"
    assert "clear_pronunciation" in result["highlights"]
    assert {item["kind"] for item in result["next_steps"]} == {"focus_words"}


def test_chinese_uses_chinese_locale_and_does_not_infer_proficiency() -> None:
    result = build_speaking_evaluation(
        language="ZH",
        reference_text="这是一个句子。",
        transcript_text="这是一个句子。",
        content_match=100,
    )

    assert result["language"] == "zh"
    assert result["locale"] == "zh-CN"
    assert result["dimensions"]["content_match"] == 100.0
    assert result["dimensions"]["proficiency"] is None
    assert result["provenance"]["proficiency"] == "not_assessed"
    assert result["evidence"]["pronunciation"]["words"] == []


def test_synthetic_demo_is_explicitly_non_assessment() -> None:
    result = build_speaking_evaluation(
        language="en",
        reference_text="Good morning.",
        transcript_text="Good morning.",
        content_match=100,
        pronunciation=_pronunciation(score_kind="synthetic_demo"),
    )

    assert result["evidence"]["synthetic_demo"] is True
    assert result["provenance"]["pronunciation"] == "synthetic_demo"
    assert result["dimensions"]["proficiency"] is None


def test_api_boundary_returns_transient_evaluation_envelope() -> None:
    payload = SpeakingEvaluationIn(
        language="en",
        reference_text="Good morning.",
        transcript_text="Good morning.",
        content_match={"content_match": 100},
        pronunciation=_pronunciation(),
        transcription_confidence=94,
    )

    result = evaluate_speaking(payload)

    assert result["language"] == "en"
    assert result["dimensions"]["transcription_confidence"] == 94.0
    assert result["dimensions"]["content_match"] == 100.0
    assert result["dimensions"]["pronunciation"] == 88.0
    assert result["dimensions"]["proficiency"] is None
    assert result["provenance"]["pronunciation"] == "azure-speech"
    assert result["evidence"]["reference_text"] == "Good morning."


def test_api_boundary_rejects_invalid_evaluation_payload() -> None:
    from fastapi import HTTPException

    payload = SpeakingEvaluationIn(
        language="fr",
        reference_text="Bonjour.",
        transcript_text="Bonjour.",
    )

    with pytest.raises(HTTPException) as raised:
        evaluate_speaking(payload)

    assert raised.value.status_code == 422
    assert raised.value.detail["category"] == "speaking_evaluation_invalid"


def test_http_boundary_normalizes_over_limit_validation_to_canonical_error() -> None:
    application = FastAPI()
    application.include_router(speech_router)
    body = json.dumps({
        "language": "en",
        "reference_text": "x" * 1201,
        "transcript_text": "A line.",
    }).encode("utf-8")
    sent: list[dict] = []
    received = False

    async def receive() -> dict:
        nonlocal received
        if received:
            return {"type": "http.disconnect"}
        received = True
        return {"type": "http.request", "body": body, "more_body": False}

    async def send(message: dict) -> None:
        sent.append(message)

    async def invoke() -> None:
        await application(
            {
                "type": "http",
                "asgi": {"version": "3.0", "spec_version": "2.3"},
                "http_version": "1.1",
                "method": "POST",
                "scheme": "http",
                "path": "/api/speech/evaluation",
                "raw_path": b"/api/speech/evaluation",
                "query_string": b"",
                "headers": [
                    (b"content-type", b"application/json"),
                    (b"content-length", str(len(body)).encode("ascii")),
                ],
                "client": ("test", 1),
                "server": ("test", 80),
            },
            receive,
            send,
        )

    asyncio.run(invoke())
    response_body = next(message["body"] for message in sent if message["type"] == "http.response.body")
    payload = json.loads(response_body)
    assert next(message["status"] for message in sent if message["type"] == "http.response.start") == 422
    assert payload["detail"]["category"] == "speaking_evaluation_invalid"


def test_durable_attempt_route_persists_bounded_evidence_and_progress() -> None:
    class FakeRepository:
        def __init__(self) -> None:
            self.items: list[dict] = []

        def create_speaking_attempt_record(self, values: dict) -> dict:
            item = {"id": len(self.items) + 1, **values}
            self.items.append(item)
            return item

        def list_speaking_attempt_records(self, limit: int = 50) -> list[dict]:
            return list(reversed(self.items))[:limit]

        def speaking_progress(self) -> dict:
            items = self.list_speaking_attempt_records(100)
            return {"attempt_count": len(items), "proficiency": None}

    repository = FakeRepository()
    configure_speaking_attempt_repository(repository)
    language_token = LANGUAGE_CODE_CTX.set("zh")
    try:
        result = save_speaking_attempt(SpeakingAttemptIn(
            language="zh",
            take_id="take-zh-1",
            asset_id="asset-zh",
            segment_id="segment-zh-1",
            reference_text="你好。",
            transcript_text="你好。",
            evaluation={
                "dimensions": {"transcription_confidence": None, "content_match": 100, "pronunciation": 79, "fluency": None, "proficiency": None},
                "provenance": {"pronunciation": "azure-speech"},
                "evidence": {"pronunciation": {"words": [{"word": "你", "phonemes": [{"phoneme": "nǐ"}]}]}},
            },
        ))
        assert result["item"]["language"] == "zh"
        assert "audio" not in json.dumps(result["item"], ensure_ascii=False).lower()
        assert result["progress"]["attempt_count"] == 1
        listed = list_speaking_attempts()
        assert listed["items"][0]["segment_id"] == "segment-zh-1"
        assert listed["progress"]["proficiency"] is None
    finally:
        LANGUAGE_CODE_CTX.reset(language_token)
        configure_speaking_attempt_repository(None)


def test_durable_attempt_route_rejects_unsupported_proficiency_claim() -> None:
    class FakeRepository:
        def create_speaking_attempt_record(self, values: dict) -> dict:
            raise AssertionError("invalid attempt must not persist")

    configure_speaking_attempt_repository(FakeRepository())
    try:
        with pytest.raises(HTTPException) as raised:
            save_speaking_attempt(SpeakingAttemptIn(
                language="en", take_id="take-1", segment_id="segment-1",
                reference_text="Good morning.", transcript_text="Good morning.",
                evaluation={"dimensions": {"proficiency": 72}, "provenance": {}, "evidence": {}},
            ))
        assert raised.value.detail["category"] == "speaking_attempt_invalid"
    finally:
        configure_speaking_attempt_repository(None)


def test_durable_attempt_route_rejects_raw_audio_evidence() -> None:
    class FakeRepository:
        def create_speaking_attempt_record(self, values: dict) -> dict:
            raise AssertionError("raw audio evidence must not persist")

    configure_speaking_attempt_repository(FakeRepository())
    try:
        with pytest.raises(HTTPException) as raised:
            save_speaking_attempt(SpeakingAttemptIn(
                language="en", take_id="take-audio", segment_id="segment-1",
                reference_text="Good morning.", transcript_text="Good morning.",
                evaluation={
                    "dimensions": {"content_match": 100, "proficiency": None},
                    "provenance": {},
                    "evidence": {"raw_audio": "base64-not-accepted"},
                },
            ))
        assert raised.value.detail["category"] == "speaking_attempt_invalid"
    finally:
        configure_speaking_attempt_repository(None)


def test_durable_attempt_route_rejects_neutral_key_raw_audio_provenance() -> None:
    class FakeRepository:
        def create_speaking_attempt_record(self, values: dict) -> dict:
            raise AssertionError("raw audio provenance must not persist")

    configure_speaking_attempt_repository(FakeRepository())
    try:
        with pytest.raises(HTTPException) as raised:
            save_speaking_attempt(SpeakingAttemptIn(
                language="en", take_id="take-provenance-audio", segment_id="segment-1",
                reference_text="Good morning.", transcript_text="Good morning.",
                evaluation={
                    "dimensions": {"content_match": 100, "proficiency": None},
                    "provenance": {"recording": "base64-not-accepted"},
                    "evidence": {},
                },
            ))
        assert raised.value.detail["category"] == "speaking_attempt_invalid"
    finally:
        configure_speaking_attempt_repository(None)


def test_durable_attempt_route_rejects_language_scope_mismatch() -> None:
    class FakeRepository:
        def create_speaking_attempt_record(self, values: dict) -> dict:
            raise AssertionError("mismatched language must not persist")

    configure_speaking_attempt_repository(FakeRepository())
    token = LANGUAGE_CODE_CTX.set("en")
    try:
        with pytest.raises(HTTPException) as raised:
            save_speaking_attempt(SpeakingAttemptIn(
                language="zh", take_id="take-mismatch", segment_id="segment-1",
                reference_text="你好。", transcript_text="你好。",
                evaluation={"dimensions": {"content_match": 100, "proficiency": None}, "provenance": {}, "evidence": {}},
            ))
        assert raised.value.detail["category"] == "speaking_attempt_invalid"
    finally:
        LANGUAGE_CODE_CTX.reset(token)
        configure_speaking_attempt_repository(None)


def test_phoneme_only_weakness_is_actionable_without_flagging_clean_words() -> None:
    pronunciation = _pronunciation()
    pronunciation["words"] = [
        {
            "word": "steady",
            "accuracy_score": 99,
            "error_type": " NONE ",
            "phonemes": [{"phoneme": "e", "accuracy_score": 98}],
        },
        {
            "word": "idea",
            "accuracy_score": 99,
            "error_type": "None",
            "phonemes": [{"phoneme": "i", "accuracy_score": 68}],
        },
    ]

    result = build_speaking_evaluation(
        language="en",
        reference_text="A steady idea.",
        transcript_text="A steady idea.",
        content_match=100,
        pronunciation=pronunciation,
    )

    assert result["next_steps"] == [{"kind": "focus_words", "words": ["idea"]}]
    assert result["evidence"]["pronunciation"]["words"][0]["error_type"] == "None"


@pytest.mark.parametrize(
    ("kwargs", "message"),
    [
        ({"language": "fr"}, "language"),
        ({"language": "en", "reference_text": "x" * 1201}, "reference_text"),
        ({"language": "en", "transcription_confidence": 101}, "transcription_confidence"),
        ({"language": "en", "content_match": True}, "content_match"),
        ({"language": "en", "content_match": {"missing_tokens": "word"}}, "missing_tokens"),
    ],
)
def test_rejects_unsafe_or_unsupported_payloads(kwargs: dict, message: str) -> None:
    base = {
        "reference_text": "A line.",
        "transcript_text": "A line.",
    }
    base.update(kwargs)
    with pytest.raises(SpeakingEvaluationInvalid, match=message):
        build_speaking_evaluation(**base)
