from __future__ import annotations

import pytest
from fastapi import HTTPException

from writing_coach import media_interaction


def test_validated_annotations_preserve_literal_order_and_offsets() -> None:
    source = "我今天在学校学习中文。"
    raw = [
        {"fragment": "我", "pos": "pronoun", "pronunciation": "wǒ", "lemma": "我"},
        {"fragment": "今天", "pos": "noun", "pronunciation": "jīntiān", "lemma": "今天"},
        {"fragment": "学校", "pos": "noun", "pronunciation": "xuéxiào", "lemma": "学校"},
        {"fragment": "学习", "pos": "verb", "pronunciation": "xuéxí", "lemma": "学习"},
        {"fragment": "中文", "pos": "noun", "pronunciation": "Zhōngwén", "lemma": "中文"},
    ]

    annotations = media_interaction._validated_annotations(source, raw)

    assert [item["fragment"] for item in annotations] == [
        "我",
        "今天",
        "学校",
        "学习",
        "中文",
    ]
    assert all(source[item["start"] : item["end"]] == item["fragment"] for item in annotations)
    assert annotations[1]["start"] == source.index("今天")
    assert annotations[-1]["end"] == source.index("中文") + len("中文")


def test_validated_annotations_drop_hallucinated_or_out_of_order_fragments() -> None:
    source = "I really like this book."
    raw = [
        {"fragment": "I", "pos": "pronoun", "pronunciation": "", "lemma": "I"},
        {"fragment": "book", "pos": "noun", "pronunciation": "", "lemma": "book"},
        {"fragment": "like", "pos": "verb", "pronunciation": "", "lemma": "like"},
        {"fragment": "missing", "pos": "noun", "pronunciation": "", "lemma": "missing"},
    ]

    annotations = media_interaction._validated_annotations(source, raw)

    assert [item["fragment"] for item in annotations] == ["I", "book"]


def test_annotate_media_text_uses_contextual_chinese_reading_aid(monkeypatch) -> None:
    monkeypatch.setattr(media_interaction, "current_language_code", lambda: "zh")
    monkeypatch.setattr(
        media_interaction,
        "_run_structured",
        lambda *args, **kwargs: {
            "annotations": [
                {
                    "fragment": "葡萄牙",
                    "pos": "proper_noun",
                    "pronunciation": "Pútáoyá",
                    "lemma": "葡萄牙",
                },
                {
                    "fragment": "工作",
                    "pos": "verb",
                    "pronunciation": "gōngzuò",
                    "lemma": "工作",
                },
            ]
        },
    )

    payload = media_interaction.annotate_media_text(
        media_interaction.MediaAnnotateIn(
            text="我在葡萄牙工作。",
            source_language="zh-CN",
        )
    )

    assert payload["source_language"] == "zh"
    assert payload["reading_aid"] == "pinyin"
    assert [item["fragment"] for item in payload["annotations"]] == ["葡萄牙", "工作"]


def test_media_interaction_rejects_cross_language_annotation(monkeypatch) -> None:
    monkeypatch.setattr(media_interaction, "current_language_code", lambda: "en")

    with pytest.raises(HTTPException) as exc:
        media_interaction.annotate_media_text(
            media_interaction.MediaAnnotateIn(
                text="你好",
                source_language="zh",
            )
        )

    assert exc.value.status_code == 409


def test_explain_media_text_uses_requested_support_language(monkeypatch) -> None:
    monkeypatch.setattr(media_interaction, "current_language_code", lambda: "en")
    observed = {}

    def fake_run(capability_key, *, messages, schema, max_output_tokens):
        observed["capability_key"] = capability_key
        observed["system"] = messages[0]["content"]
        return {
            "summary": "Cụm này diễn tả một thói quen.",
            "natural_translation": "Tôi thường đi bộ đến trường.",
            "grammar_notes": ["usually đứng trước động từ thường."],
            "vocabulary": [
                {
                    "fragment": "usually",
                    "meaning": "thường",
                    "pos": "adverb",
                    "pronunciation": "",
                }
            ],
            "usage_note": "Dùng cho hành động xảy ra thường xuyên.",
        }

    monkeypatch.setattr(media_interaction, "_run_structured", fake_run)

    payload = media_interaction.explain_media_text(
        media_interaction.MediaExplainIn(
            text="I usually walk to school.",
            source_language="en",
            target_language="vi",
            context="On weekdays, I usually walk to school.",
        )
    )

    assert observed["capability_key"] == "learner_dictionary"
    assert "Explain in Vietnamese" in observed["system"]
    assert payload["target_language"] == "vi"
    assert payload["vocabulary"][0]["fragment"] == "usually"
