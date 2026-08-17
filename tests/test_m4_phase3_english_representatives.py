from writing_coach.grammar_knowledge import validate_grammar_knowledge
from writing_coach.languages.english.grammar_course import GRAMMAR_COURSE
from writing_coach.languages.english.grammar_knowledge_base import (
    GRAMMAR_KNOWLEDGE,
    GRAMMAR_KNOWLEDGE_BY_ID,
)

TARGETS = {
    "a1-be-am-is-are",
    "a2-present-perfect-vs-past-simple",
    "b1-passive-voice-present-and-past",
}


def block_types(grammar_id):
    return {
        block["type"]
        for block in GRAMMAR_KNOWLEDGE_BY_ID[grammar_id]["learning_model"]["blocks"]
    }


def test_phase3_exactly_three_english_entries_are_curated():
    validate_grammar_knowledge(GRAMMAR_COURSE, GRAMMAR_KNOWLEDGE)
    curated = {
        item["id"] for item in GRAMMAR_KNOWLEDGE
        if item["source"]["content_status"] == "curated"
    }
    assert curated == TARGETS


def test_a1_be_represents_beginner_formula_and_sentence_change():
    assert {
        "formula", "semantic_sentence", "scene", "transformation", "contrast",
        "common_mistake", "micro_practice", "personal_practice",
        "recall", "memory_hook", "skill_transfer",
    } <= block_types("a1-be-am-is-are")


def test_a2_represents_time_viewpoint_not_signal_word_only():
    item = GRAMMAR_KNOWLEDGE_BY_ID["a2-present-perfect-vs-past-simple"]
    assert {"timeline", "contrast", "common_mistake", "micro_practice"} <= block_types(item["id"])
    text = repr(item["learning_model"]).lower()
    assert "closed" in text
    assert "now" in text
    assert "yesterday" in text


def test_b1_passive_represents_information_focus_and_transformation():
    item = GRAMMAR_KNOWLEDGE_BY_ID["b1-passive-voice-present-and-past"]
    assert {
        "formula", "semantic_sentence", "transformation", "sentence_builder",
        "common_mistake", "exception",
    } <= block_types(item["id"])
    text = repr(item["learning_model"]).lower()
    assert "focus" in text
    assert "by-agent" in text or "by + agent" in text


def test_all_representatives_require_apply_recall_transfer_evidence():
    for grammar_id in TARGETS:
        model = GRAMMAR_KNOWLEDGE_BY_ID[grammar_id]["learning_model"]
        assert model["completion"]["required_stages"] == ["apply", "recall", "transfer"]
        assert {"personal_practice", "recall", "skill_transfer"} <= block_types(grammar_id)
