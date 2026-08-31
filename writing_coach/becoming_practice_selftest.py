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

    improved = build_practice_recommendation(
        language="en",
        profile={"goal": "everyday", "style": "guided"},
        memory={"focus": {"category": "article", "status": "watch"}},
        target_level="B2",
        outcomes=[{
            "language": "en", "status": "improved", "focus_family": "grammar",
            "revision_no": 2, "previous_issue_count": 2, "issue_count": 0,
            "essay_id": 21,
        }],
    )
    assert improved["difficulty"]["state"] == "stretch"
    assert improved["difficulty"]["word_target"] == 180
    assert improved["difficulty"]["length_delta"] == 30
    assert improved["difficulty"]["provenance"]["essay_id"] == 21

    revision_evidence = build_practice_recommendation(
        language="en",
        profile={"goal": "everyday", "style": "guided"},
        memory={
            "focus": {"category": "article", "status": "watch"},
            "revision_wins": [{"revisions": 2, "overall_delta": 5.0, "error_delta": -1, "latest_id": 23}],
        },
        target_level="B2",
        outcomes=[],
    )
    assert revision_evidence["difficulty"]["state"] == "stretch"
    assert revision_evidence["difficulty"]["provenance"]["source"] == "revision_win"

    unresolved = build_practice_recommendation(
        language="zh",
        profile={"goal": "everyday", "style": "guided"},
        memory={"focus": {"category": "aspect", "status": "watch"}},
        target_level="HSK4",
        outcomes=[{
            "language": "zh", "status": "still_working", "focus_family": "grammar",
            "revision_no": 1, "issue_count": 2, "essay_id": 22,
        }],
    )
    assert unresolved["difficulty"]["state"] == "scaffold"
    assert unresolved["difficulty"]["word_target"] == 60
    assert unresolved["difficulty"]["length_delta"] == -20

    insufficient = build_practice_recommendation(
        language="en",
        profile={"goal": "everyday", "style": "guided"},
        memory={"focus": {"category": "article", "status": "watch"}},
        target_level="B2",
        outcomes=[
            {"language": "zh", "status": "improved", "focus_family": "grammar", "revision_no": 2, "previous_issue_count": 2, "issue_count": 0},
            {"language": "en", "status": "improved", "focus_family": "grammar", "revision_no": 1, "previous_issue_count": 2, "issue_count": 0},
            {"language": "en", "status": "still_working", "focus_family": {"bad": True}, "revision_no": 1, "issue_count": 2},
        ],
    )
    assert insufficient["difficulty"]["state"] == "insufficient"
    assert insufficient["difficulty"]["provenance"]["source"] == "none"

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
