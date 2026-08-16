from writing_coach.grammar_knowledge import validate_grammar_knowledge
from writing_coach.languages.english.grammar_course import GRAMMAR_COURSE as EN_COURSE
from writing_coach.languages.english.grammar_knowledge_base import GRAMMAR_KNOWLEDGE as EN_KB
from writing_coach.languages.chinese.grammar_course import GRAMMAR_COURSE as ZH_COURSE
from writing_coach.languages.chinese.grammar_knowledge_base import GRAMMAR_KNOWLEDGE as ZH_KB

REPRESENTATIVES = {
    "a1-be-am-is-are",
    "a2-present-perfect-vs-past-simple",
    "b1-passive-voice-present-and-past",
}


def test_full_rollout_has_exact_508_schema2_models():
    validate_grammar_knowledge(EN_COURSE, EN_KB)
    validate_grammar_knowledge(ZH_COURSE, ZH_KB)
    assert len(EN_KB) == 269
    assert len(ZH_KB) == 239
    assert len(EN_KB) + len(ZH_KB) == 508

    for language, knowledge in (("en", EN_KB), ("zh", ZH_KB)):
        for item in knowledge:
            model = item["learning_model"]
            assert model["schema_version"] == 2
            assert model["language_policy"]["target_language"] == language
            assert item["source"]["runtime_ai"] is False
            assert model["flow"] == [
                "notice", "understand", "pattern", "context",
                "compare", "apply", "recall", "transfer",
            ]
            assert model["completion"]["required_stages"] == [
                "apply", "recall", "transfer"
            ]


def test_human_reviewed_status_remains_distinct_from_structural_rollout():
    curated = {
        item["id"]
        for item in EN_KB
        if item["source"]["content_status"] == "curated"
    }
    assert curated == REPRESENTATIVES

    source_adapted = [
        item
        for item in [*EN_KB, *ZH_KB]
        if item["source"].get("universal_model_status") == "source-adapted-v1"
    ]
    assert len(source_adapted) == 505


def test_all_models_have_full_apply_recall_transfer_path():
    for item in [*EN_KB, *ZH_KB]:
        model = item["learning_model"]
        stages = {block["stage"] for block in model["blocks"]}
        types = {block["type"] for block in model["blocks"]}
        assert {"pattern", "context", "compare", "apply", "recall", "transfer"} <= stages
        assert {
            "scene", "contrast", "common_mistake", "exception",
            "micro_practice", "personal_practice", "recall",
            "memory_hook", "skill_transfer",
        } <= types


def test_chinese_source_adapted_models_use_word_order_pattern_capability():
    for item in ZH_KB:
        assert item["learning_model"]["language_policy"]["target_language"] == "zh"
        if item["source"].get("universal_model_status") == "source-adapted-v1":
            assert "word-order" in item["learning_model"]["capabilities"]
            pattern = [
                block
                for block in item["learning_model"]["blocks"]
                if block["stage"] == "pattern"
            ]
            assert any(block["type"] == "word_order" for block in pattern)


def test_english_source_adapted_models_use_formula_capability():
    for item in EN_KB:
        if item["id"] in REPRESENTATIVES:
            continue
        assert "formula" in item["learning_model"]["capabilities"]
        pattern = [
            block
            for block in item["learning_model"]["blocks"]
            if block["stage"] == "pattern"
        ]
        assert any(block["type"] == "formula" for block in pattern)
