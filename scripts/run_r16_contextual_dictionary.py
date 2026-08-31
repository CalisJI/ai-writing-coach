from fastapi import HTTPException

from writing_coach import media_interaction


def main() -> None:
    original_language = media_interaction.current_language_code
    original_runner = media_interaction._run_structured
    try:
        media_interaction.current_language_code = lambda: "en"
        media_interaction._run_structured = lambda *args, **kwargs: {
            "summary": "A repeated weekday habit.",
            "natural_translation": "Tôi thường đi bộ.",
            "grammar_notes": [],
            "vocabulary": [],
            "usage_note": "",
        }
        result = media_interaction.contextual_dictionary(
            media_interaction.ContextualDictionaryIn(
                text="usually",
                context="I usually walk to school.",
                source_language="en",
                target_language="vi",
            )
        )
        assert result["available"] is True
        assert result["claim"] == "contextual_dictionary"
        try:
            media_interaction.contextual_dictionary(
                media_interaction.ContextualDictionaryIn(
                    text="学习", context="我喜欢学习。", source_language="zh", target_language="vi"
                )
            )
        except HTTPException as exc:
            assert exc.status_code == 409
        else:
            raise AssertionError("request language mismatch was accepted")
        try:
            media_interaction.contextual_dictionary(
                media_interaction.ContextualDictionaryIn(
                    text="usually", context="I walk to school.", source_language="en", target_language="vi"
                )
            )
        except HTTPException as exc:
            assert exc.status_code == 422
        else:
            raise AssertionError("context not containing selected text was accepted")
        try:
            media_interaction.contextual_dictionary(
                media_interaction.ContextualDictionaryIn(
                    text="   ", context="I usually walk to school.", source_language="en", target_language="vi"
                )
            )
        except HTTPException as exc:
            assert exc.status_code == 422
        else:
            raise AssertionError("blank selected text was accepted")

        media_interaction.current_language_code = lambda: "zh"
        media_interaction._run_structured = lambda *args, **kwargs: (_ for _ in ()).throw(HTTPException(503, "unavailable"))
        unavailable = media_interaction.contextual_dictionary(
            media_interaction.ContextualDictionaryIn(
                text="学习", context="我喜欢学习。", source_language="zh", target_language="vi"
            )
        )
        assert unavailable["available"] is False
        assert unavailable["claim"] == "contextual_dictionary_unavailable"

        media_interaction._run_structured = lambda *args, **kwargs: {}
        empty = media_interaction.contextual_dictionary(
            media_interaction.ContextualDictionaryIn(
                text="学习", context="我喜欢学习。", source_language="zh", target_language="vi"
            )
        )
        assert empty["available"] is False
        assert empty["claim"] == "contextual_dictionary_unavailable"
        print("R16 contextual dictionary backend contract passed")
    finally:
        media_interaction.current_language_code = original_language
        media_interaction._run_structured = original_runner


if __name__ == "__main__":
    main()
