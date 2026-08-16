from pathlib import Path

import pytest

from writing_coach.core.language_registry import all_languages
from writing_coach.grammar_learning_model import (
    GrammarLearningModelInvalid,
    validate_grammar_learning_model,
)
from writing_coach.languages.grammar_registry import (
    GrammarProviderUnavailable,
    grammar_provider,
    grammar_provider_codes,
)


def universal_model():
    return {
        "schema_version": 2,
        "flow": [
            "notice", "understand", "pattern", "context",
            "compare", "apply", "recall", "transfer",
        ],
        "language_policy": {
            "target_language": "ja",
            "explanation_languages": ["en", "vi", "ja"],
            "translation_languages": ["en", "vi"],
        },
        "capabilities": ["particle", "word-order", "context-scene"],
        "hook": {"prompt": {"en": "Notice the form.", "ja": "形に注目。"}},
        "meaning": {
            "summary": {"en": "The form marks the topic."},
            "mental_model": {"en": "Meaning first."},
            "use_when": [{"en": "Use it in context."}],
        },
        "blocks": [
            {
                "id": "pattern",
                "type": "formula",
                "stage": "pattern",
                "title": {"en": "Pattern"},
                "payload": {
                    "parts": [
                        {"text": "A", "role": "topic"},
                        {"text": "marker", "role": "particle"},
                    ]
                },
            },
            {
                "id": "context",
                "type": "scene",
                "stage": "context",
                "title": {"en": "Context"},
                "payload": {"lines": [{"text": "Target-language example."}]},
            },
            {
                "id": "compare",
                "type": "contrast",
                "stage": "compare",
                "title": {"en": "Compare"},
                "payload": {
                    "items": [
                        {"label": "A", "text": "One"},
                        {"label": "B", "text": "Two"},
                    ]
                },
            },
            {
                "id": "apply",
                "type": "personal_practice",
                "stage": "apply",
                "title": {"en": "Apply"},
                "payload": {"prompt": {"en": "Use it yourself."}},
            },
            {
                "id": "recall",
                "type": "recall",
                "stage": "recall",
                "title": {"en": "Recall"},
                "payload": {"prompt": {"en": "Recall it."}},
            },
            {
                "id": "transfer",
                "type": "skill_transfer",
                "stage": "transfer",
                "title": {"en": "Transfer"},
                "payload": {"skills": {"writing": {"en": "Use it in writing."}}},
            },
        ],
        "completion": {"required_stages": ["apply", "recall", "transfer"]},
    }


def test_current_enabled_grammar_languages_have_registered_providers():
    enabled = {
        item.code
        for item in all_languages()
        if item.enabled and "grammar" in item.capabilities
    }
    assert set(grammar_provider_codes()) == enabled
    for code in enabled:
        provider = grammar_provider(code)
        assert provider.code == code
        assert provider.course
        assert provider.by_id
        assert provider.knowledge_by_id


def test_unknown_language_never_silently_falls_back_to_english_grammar():
    with pytest.raises(GrammarProviderUnavailable):
        grammar_provider("ja")


def test_schema_v2_accepts_future_locale_keys_and_capability_driven_flow():
    validate_grammar_learning_model(
        universal_model(),
        grammar_id="ja.topic.example",
        kind="lesson",
    )


def test_schema_v2_requires_language_policy_and_capabilities():
    model = universal_model()
    model.pop("language_policy")
    with pytest.raises(GrammarLearningModelInvalid, match="language_policy"):
        validate_grammar_learning_model(model, grammar_id="broken", kind="lesson")

    model = universal_model()
    model["capabilities"] = []
    with pytest.raises(GrammarLearningModelInvalid, match="capabilities"):
        validate_grammar_learning_model(model, grammar_id="broken", kind="lesson")


def test_grammar_runtime_no_longer_selects_course_by_chinese_else_english():
    source = Path("writing_coach/languages/runtime.py").read_text(encoding="utf-8")
    assert "CHINESE_GRAMMAR_COURSE" not in source
    assert "ENGLISH_GRAMMAR_COURSE" not in source
    assert "active_grammar_provider" in source
