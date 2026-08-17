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

PATTERN_BLOCK_TYPES = {
    "formula",
    "word_order",
    "semantic_sentence",
    "transformation",
    "timeline",
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


def test_human_reviewed_status_remains_distinct_from_concept_specific_rollout():
    curated = {
        item["id"]
        for item in EN_KB
        if item["source"]["content_status"] == "curated"
    }
    assert curated == REPRESENTATIVES

    reviewed = 0
    pending = 0
    for item in [*EN_KB, *ZH_KB]:
        authoring = item["learning_model"].get("authoring", {})
        assert authoring.get("status") == "source-backed-concept-specific"
        validation = authoring.get("human_expert_validation")
        if validation == "representative-reviewed":
            reviewed += 1
        elif validation == "pending":
            pending += 1
        else:
            raise AssertionError(
                f"Unexpected human_expert_validation for {item['id']}: {validation!r}"
            )

    assert reviewed == 3
    assert pending == 505


def test_all_models_have_full_apply_recall_transfer_path():
    for item in [*EN_KB, *ZH_KB]:
        model = item["learning_model"]
        stages = {block["stage"] for block in model["blocks"]}
        types = {block["type"] for block in model["blocks"]}
        assert {"pattern", "context", "compare", "apply", "recall", "transfer"} <= stages
        assert {
            "scene", "common_mistake", "micro_practice", "personal_practice",
            "recall", "memory_hook", "skill_transfer",
        } <= types


def test_concept_specific_models_use_supported_pattern_visuals():
    for item in [*EN_KB, *ZH_KB]:
        pattern = [
            block
            for block in item["learning_model"]["blocks"]
            if block["stage"] == "pattern"
        ]
        assert pattern, item["id"]
        assert any(block["type"] in PATTERN_BLOCK_TYPES for block in pattern), item["id"]
