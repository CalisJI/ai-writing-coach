from __future__ import annotations

import pytest

from writing_coach.speaking_evaluator import (
    SpeakingEvaluationInvalid,
    build_speaking_evaluation,
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


def test_phoneme_only_weakness_is_actionable_without_flagging_clean_words() -> None:
    pronunciation = _pronunciation()
    pronunciation["words"] = [
        {
            "word": "steady",
            "accuracy_score": 99,
            "error_type": " None ",
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
