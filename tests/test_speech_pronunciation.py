from __future__ import annotations

import base64
import json

import pytest

from writing_coach.speech_pronunciation import (
    AzureSpeechPronunciationProvider,
    SpeechPronunciationMalformed,
)


class FakeResponse:
    def __init__(self, payload, status_code=200):
        self._payload = payload
        self.status_code = status_code

    def json(self):
        return self._payload


class FakeSession:
    def __init__(self, payload):
        self.payload = payload
        self.calls = []

    def post(self, url, **kwargs):
        self.calls.append((url, kwargs))
        return FakeResponse(self.payload)


def make_provider(payload):
    session = FakeSession(payload)
    provider = AzureSpeechPronunciationProvider(
        "secret",
        "eastus",
        session=session,
        normalizer=lambda data, **_: b"RIFFxxxxWAVE" + data,
    )
    return provider, session


def test_direct_rest_shape_and_en_us_prosody():
    payload = {
        "DisplayText": "Good morning.",
        "NBest": [{
            "Display": "Good morning.",
            "AccuracyScore": 91,
            "FluencyScore": 82,
            "CompletenessScore": 100,
            "PronScore": 90,
            "ProsodyScore": 78,
            "Words": [{
                "Word": "morning",
                "AccuracyScore": 58,
                "ErrorType": "Mispronunciation",
                "Phonemes": [{"Phoneme": "m", "AccuracyScore": 55}],
            }],
        }],
    }
    provider, session = make_provider(payload)
    result = provider.assess_bytes(
        b"webm",
        filename="take.webm",
        content_type="audio/webm",
        language="en",
        reference_text="Good morning.",
    )
    assert result.locale == "en-US"
    assert result.pron_score == 90.0
    assert result.accuracy_score == 91.0
    assert result.words[0].error_type == "Mispronunciation"

    _, call = session.calls[0]
    assert call["params"] == {"language": "en-US", "format": "detailed"}
    assert call["headers"]["EnableProsodyAssessment"] == "True"
    config = json.loads(base64.b64decode(call["headers"]["Pronunciation-Assessment"]))
    assert config["ReferenceText"] == "Good morning."
    assert config["Granularity"] == "Phoneme"


def test_nested_shape_and_zh_locale():
    payload = {
        "DisplayText": "你好。",
        "NBest": [{
            "Display": "你好。",
            "PronunciationAssessment": {
                "AccuracyScore": 88,
                "FluencyScore": 79,
                "CompletenessScore": 100,
                "PronScore": 87,
            },
            "Words": [{
                "Word": "你好",
                "PronunciationAssessment": {
                    "AccuracyScore": 84,
                    "ErrorType": "None",
                },
                "Phonemes": [{
                    "Phoneme": "n",
                    "PronunciationAssessment": {"AccuracyScore": 81},
                }],
            }],
        }],
    }
    provider, session = make_provider(payload)
    result = provider.assess_bytes(
        b"webm",
        filename="take.webm",
        content_type="audio/webm",
        language="zh",
        reference_text="你好。",
    )
    assert result.locale == "zh-CN"
    assert result.pron_score == 87.0
    assert result.prosody_score is None
    assert result.words[0].accuracy_score == 84.0
    _, call = session.calls[0]
    assert "EnableProsodyAssessment" not in call["headers"]


def test_reference_is_bounded():
    provider, _ = make_provider({"NBest": [{"PronScore": 50}]})
    with pytest.raises(SpeechPronunciationMalformed):
        provider.assess_bytes(
            b"webm",
            filename="take.webm",
            content_type="audio/webm",
            language="en",
            reference_text="x" * 1201,
        )
