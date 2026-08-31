from writing_coach.becoming_practice import (
    build_practice_recommendation,
    personalize_generated_task,
)


def _run_next_practice(language, profile, memory, target_level):
    import app
    from writing_coach.core.request_context import LANGUAGE_CODE_CTX

    originals = {
        "get_learner_profile": app.get_learner_profile,
        "get_learning_memory": app.get_learning_memory,
        "generate_practice_task": app.generate_practice_task,
    }
    language_token = LANGUAGE_CODE_CTX.set(language)
    generated_payload = None
    try:
        app.get_learner_profile = lambda: profile
        app.get_learning_memory = lambda: memory

        def fake_task(payload):
            nonlocal generated_payload
            generated_payload = payload
            return {
                "title": "Targeted practice task",
                "instruction": "Write a focused response.",
                "checklist": ["Use the target pattern.", "Add one example."],
                "word_target": payload.word_target,
                "task_type": payload.task_type,
                "topic": payload.topic,
            }

        app.generate_practice_task = fake_task
        result = app.becoming_practice_next(app.PracticeNextIn(target_level=target_level))
        return result, generated_payload
    finally:
        for name, value in originals.items():
            setattr(app, name, value)
        LANGUAGE_CODE_CTX.reset(language_token)


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
    assert "\u6539\u5584\u4e2d" in recommendation["reason"]
    assert "improving" not in recommendation["reason"]
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


def test_next_practice_endpoint_preserves_english_recommendation_context():
    result, generated = _run_next_practice(
        "en",
        {"goal": "everyday", "style": "guided"},
        {"focus": {"category": "article", "status": "watch", "example": "I bought car."}},
        "B2",
    )

    assert result["target_level"] == "B2"
    assert result["task_type"] == "story"
    assert result["topic"] == "daily life"
    assert result["word_target"] == 150
    assert generated.target_cefr == "B2"
    assert generated.task_type == "story"
    assert generated.topic == "daily life"
    assert generated.word_target == 150
    assert result["personalization"]["intent"] == "repair"
    assert result["personalization"]["focus_family"] == "grammar"
    assert "Prioritize Article" in result["personalization"]["focus_instruction"]
    assert result["personalization"]["focus_instruction"] in result["prompt"]


def test_next_practice_endpoint_preserves_chinese_recommendation_context():
    result, generated = _run_next_practice(
        "zh",
        {"goal": "exam", "style": "guided"},
        {"focus": {"category": "aspect", "status": "improving", "example": "我昨天去了学校。"}},
        "HSK3",
    )

    assert result["target_level"] == "HSK3"
    assert result["task_type"] == "hsk"
    assert result["topic"] == "random"
    assert result["word_target"] == 80
    assert generated.target_cefr == "HSK3"
    assert generated.task_type == "hsk"
    assert generated.topic == "random"
    assert generated.word_target == 80
    assert result["personalization"]["intent"] == "reinforce"
    assert result["personalization"]["focus_family"] == "grammar"
    assert "\u91cd\u70b9" in result["personalization"]["focus_instruction"]
    assert result["personalization"]["focus_instruction"] in result["prompt"]
