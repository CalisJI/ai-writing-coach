from writing_coach.core.request_context import LANGUAGE_CODE_CTX
import app


def main() -> None:
    originals = {
        "get_learner_profile": app.get_learner_profile,
        "get_learning_memory": app.get_learning_memory,
        "list_practice_outcomes": app.list_practice_outcomes,
        "generate_practice_task": app.generate_practice_task,
    }
    generated = []
    try:
        app.get_learner_profile = lambda: {"goal": "everyday", "style": "guided"}
        app.get_learning_memory = lambda: {
            "focus": {"category": "article", "status": "watch", "example": "a orange"},
            "strengths": [],
        }
        app.list_practice_outcomes = lambda limit=8: {"items": [{
            "language": "en", "status": "improved", "focus_family": "grammar",
            "revision_no": 2, "previous_issue_count": 2, "issue_count": 0, "essay_id": 44,
        }]}

        def fake_task(payload):
            generated.append(payload)
            return {
                "title": "Focused practice",
                "instruction": "Write a focused response.",
                "checklist": [],
                "task_type": payload.task_type,
                "topic": payload.topic,
                "word_target": payload.word_target,
            }

        app.generate_practice_task = fake_task
        token = LANGUAGE_CODE_CTX.set("en")
        try:
            result = app.becoming_practice_next(app.PracticeNextIn(target_level="B2"))
        finally:
            LANGUAGE_CODE_CTX.reset(token)
        assert result["word_target"] == 180
        assert result["personalization"]["difficulty"]["state"] == "stretch"
        assert generated[-1].word_target == 180

        app.list_practice_outcomes = lambda limit=8: {"items": [{
            "language": "zh", "status": "still_working", "focus_family": "grammar",
            "revision_no": 1, "issue_count": 2, "essay_id": 45,
        }]}
        token = LANGUAGE_CODE_CTX.set("zh")
        try:
            result = app.becoming_practice_next(app.PracticeNextIn(target_level="HSK4"))
        finally:
            LANGUAGE_CODE_CTX.reset(token)
        assert result["word_target"] == 60
        assert result["personalization"]["difficulty"]["state"] == "scaffold"
        assert generated[-1].word_target == 60
        print("R16 adaptive Writing difficulty backend/handoff contract passed")
    finally:
        for name, value in originals.items():
            setattr(app, name, value)


if __name__ == "__main__":
    main()
