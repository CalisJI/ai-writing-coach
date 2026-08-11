from writing_coach.becoming_practice import (
    build_practice_recommendation,
    personalize_generated_task,
)


def main() -> None:
    recurring = build_practice_recommendation(
        language="en",
        profile={"goal": "work", "style": "guided"},
        memory={
            "focus": {
                "category": "article",
                "status": "recurring",
                "example": "I bought a orange.",
            },
            "strengths": [],
        },
        target_level="B2",
    )
    assert recurring["intent"] == "repair"
    assert recurring["task_type"] == "email"
    assert recurring["topic"] == "work"
    assert recurring["focus_family"] == "grammar"
    assert recurring["word_target"] == 150

    chinese = build_practice_recommendation(
        language="zh",
        profile={"goal": "exam", "style": "concise"},
        memory={
            "focus": {
                "category": "word_order",
                "status": "improving",
                "example": "我昨天去商店了。",
            },
            "strengths": [],
        },
        target_level="HSK4",
    )
    assert chinese["intent"] == "reinforce"
    assert chinese["task_type"] == "hsk"
    assert chinese["word_target"] == 60
    assert chinese["focus_label"] == "词序"

    transfer = build_practice_recommendation(
        language="en",
        profile={"goal": "voice", "style": "deep"},
        memory={
            "focus": None,
            "strengths": [{
                "category": "coherence",
                "stage": "Stable",
                "example": "My main reason is simple.",
            }],
        },
        target_level="C1",
    )
    assert transfer["intent"] == "transfer"
    assert transfer["task_type"] == "opinion"
    assert transfer["word_target"] == 180

    task = personalize_generated_task(
        {"checklist": ["Give one example"], "title": "Test"},
        recurring,
    )
    assert task["checklist"][0] == recurring["focus_instruction"]
    assert task["personalization"]["focus_label"] == "Article"

    print("BECOMING Phase 5 personalized-practice self-test OK")


if __name__ == "__main__":
    main()
