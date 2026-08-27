from writing_coach.becoming_practice import (
    build_practice_recommendation,
    personalize_generated_task,
)


def test_english_focus_recommendation_builds_backend_valid_targeted_task_context():
    recommendation = build_practice_recommendation(
        language="en",
        profile={"goal": "everyday", "style": "guided"},
        memory={
            "focus": {
                "category": "article",
                "status": "watch",
                "example": "I bought car yesterday.",
            }
        },
        target_level="B2",
    )

    assert recommendation["intent"] == "repair"
    assert recommendation["focus_category"] == "article"
    assert recommendation["focus_family"] == "grammar"
    assert recommendation["focus_status"] == "watch"
    assert recommendation["target_level"] == "B2"
    assert recommendation["task_type"] == "story"
    assert recommendation["topic"] == "daily life"
    assert recommendation["word_target"] == 150
    assert recommendation["evidence"] == "I bought car yesterday."
    assert recommendation["focus_instruction"]
    assert recommendation["reason"]


def test_chinese_focus_recommendation_preserves_language_and_level_adaptation():
    recommendation = build_practice_recommendation(
        language="zh",
        profile={"goal": "exam", "style": "concise"},
        memory={
            "focus": {
                "category": "aspect",
                "status": "improving",
                "example": "我昨天去了学校。",
            }
        },
        target_level="HSK3",
    )

    assert recommendation["intent"] == "reinforce"
    assert recommendation["focus_category"] == "aspect"
    assert recommendation["focus_family"] == "grammar"
    assert recommendation["focus_status"] == "improving"
    assert recommendation["target_level"] == "HSK3"
    assert recommendation["task_type"] == "hsk"
    assert recommendation["topic"] == "random"
    assert recommendation["word_target"] == 60
    assert recommendation["focus_label"] == "\u8bed\u6cd5\u4e0e\u53e5\u5b50\u7ed3\u6784"
    assert recommendation["evidence"] == "\u6211\u6628\u5929\u53bb\u4e86\u5b66\u6821\u3002"
    assert "\u6a21\u5f0f" in recommendation["reason"]
    assert recommendation["focus_instruction"]


def test_personalize_generated_task_keeps_focus_instruction_and_bounded_checklist():
    recommendation = {
        "focus_instruction": "Prioritize articles in this piece.",
        "intent": "repair",
        "focus_family": "grammar",
    }
    task = {
        "prompt": "Write a short paragraph.",
        "checklist": ["", "Use one example.", "Use one example.", "Add a conclusion.", "Check punctuation.", "Read it aloud."],
    }

    personalized = personalize_generated_task(task, recommendation)

    assert personalized["checklist"] == [
        "Prioritize articles in this piece.",
        "Use one example.",
        "Use one example.",
        "Add a conclusion.",
        "Check punctuation.",
    ]
    assert personalized["personalization"] == recommendation
    assert personalized["prompt"] == task["prompt"]
