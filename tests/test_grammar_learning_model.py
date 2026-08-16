from copy import deepcopy

import pytest

from writing_coach.grammar_learning_model import (
    GrammarLearningModelInvalid,
    validate_grammar_learning_model,
)
from writing_coach.grammar_knowledge import (
    GrammarKnowledgeInvalid,
    validate_grammar_knowledge,
)


def _model():
    return {
        "schema_version": 1,
        "flow": ["notice","understand","connect","compare","apply","recall","transfer"],
        "hook": {"prompt": {"vi": "Nhìn ý nghĩa trước."}},
        "meaning": {
            "summary": {"vi": "Kết nối ý nghĩa với ngữ cảnh."},
            "mental_model": {"vi": "Ý nghĩa trước, công thức sau."},
            "use_when": [{"vi": "Khi target phù hợp với ngữ cảnh."}],
        },
        "blocks": [
            {"id":"formula","type":"formula","stage":"understand","title":{"vi":"Công thức"},"payload":{"parts":[{"text":"have/has","role":"auxiliary"},{"text":"V3","role":"verb"}]}},
            {"id":"scene","type":"scene","stage":"connect","title":{"vi":"Ngữ cảnh"},"payload":{"lines":[{"text":"I have lived here for three years."}]}},
            {"id":"contrast","type":"contrast","stage":"compare","title":{"vi":"Phân biệt"},"payload":{"items":[{"label":"A","text":"I have lived here."},{"label":"B","text":"I lived there."}]}},
            {"id":"mistake","type":"common_mistake","stage":"compare","title":{"vi":"Lỗi thường gặp"},"payload":{"incorrect":"I have lived there yesterday.","why":{"vi":"Yesterday là mốc quá khứ đã kết thúc."},"correct":"I lived there yesterday."}},
            {"id":"apply","type":"personal_practice","stage":"apply","title":{"vi":"Áp dụng"},"payload":{"prompt":{"vi":"Viết một câu thật về bạn."}}},
            {"id":"recall","type":"recall","stage":"recall","title":{"vi":"Gợi nhớ"},"payload":{"prompt":{"vi":"have/has + ?"},"answer":"V3"}},
            {"id":"transfer","type":"skill_transfer","stage":"transfer","title":{"vi":"Chuyển giao"},"payload":{"skills":{"writing":{"vi":"Dùng trong một câu Writing."}}}},
        ],
        "completion": {"required_stages": ["apply","recall","transfer"]},
    }


def test_learning_model_accepts_complete_lesson_flow():
    validate_grammar_learning_model(_model(), grammar_id="en-test", kind="lesson")


def test_lesson_flow_cannot_skip_recall():
    model = _model()
    model["flow"].remove("recall")
    with pytest.raises(GrammarLearningModelInvalid):
        validate_grammar_learning_model(model, grammar_id="broken", kind="lesson")


def test_completion_requires_evidence_stage():
    model = _model()
    model["blocks"] = [x for x in model["blocks"] if x["type"] != "recall"]
    with pytest.raises(GrammarLearningModelInvalid):
        validate_grammar_learning_model(model, grammar_id="broken", kind="lesson")


def test_foundation_remains_compatible_but_curated_requires_learning_model():
    course = [{"id":"x","title":"X","level":"A1","kind":"lesson","content_version":2}]
    base = {
        "id":"x","title":"X","level":"A1","kind":"lesson","content_version":2,
        "quick_reference":{"summary_vi":"x","aliases":[],"contrasts":[],"restrictions":[],"common_traps":[],"lookup_tags":[]},
        "lesson":{"explanation_vi":"x","rules":[],"contrasts":[],"exceptions":[],"examples":[],"mistakes":[],"guided_practice":[],"production_task_vi":"x","writing_tip_vi":"x"},
        "cross_skill":{"grammar_id":"x","annotatable":True,"lookup_terms":[]},
        "source":{"runtime_ai":False,"official_mapping":False,"content_status":"foundation"},
    }
    validate_grammar_knowledge(course,[base])

    curated=deepcopy(base)
    curated["source"]["content_status"]="curated"
    with pytest.raises(GrammarKnowledgeInvalid):
        validate_grammar_knowledge(course,[curated])

    curated["learning_model"]=_model()
    validate_grammar_knowledge(course,[curated])

def test_semantic_role_vocabulary_is_locked():
    model = _model()
    model["blocks"][0]["payload"]["parts"][0]["role"] = "made_up_role"
    with pytest.raises(GrammarLearningModelInvalid, match="must be one of"):
        validate_grammar_learning_model(model, grammar_id="bad-role", kind="lesson")


def test_common_mistake_requires_why_when_present():
    model = _model()
    mistake = next(b for b in model["blocks"] if b["type"] == "common_mistake")
    mistake["payload"]["why"] = " "
    with pytest.raises(GrammarLearningModelInvalid, match="why"):
        validate_grammar_learning_model(model, grammar_id="no-why", kind="lesson")


def test_learning_model_can_omit_mistake_when_legacy_lesson_has_none():
    model = _model()
    model["blocks"] = [b for b in model["blocks"] if b["type"] != "common_mistake"]
    validate_grammar_learning_model(model, grammar_id="no-legacy-mistake", kind="lesson")


def test_micro_practice_requires_explicit_supported_interaction():
    model = _model()
    model["blocks"].insert(-2, {
        "id":"micro","type":"micro_practice","stage":"apply","title":{"vi":"Chọn"},
        "payload":{"interaction":"choose","prompt":{"vi":"Chọn câu đúng."},"options":["A","B"],"answer":"A"},
    })
    validate_grammar_learning_model(model, grammar_id="micro-ok", kind="lesson")
    next(b for b in model["blocks"] if b["id"] == "micro")["payload"]["interaction"] = "generic_textarea"
    with pytest.raises(GrammarLearningModelInvalid, match="interaction"):
        validate_grammar_learning_model(model, grammar_id="micro-bad", kind="lesson")




def test_curated_knowledge_preserves_legacy_mistakes_and_exceptions():
    course = [{"id":"x","title":"X","level":"A1","kind":"lesson","content_version":2}]
    base = {
        "id":"x","title":"X","level":"A1","kind":"lesson","content_version":2,
        "quick_reference":{
            "summary_vi":"x","aliases":[],"contrasts":[],"restrictions":[],
            "common_traps":[],"lookup_tags":[],
        },
        "lesson":{
            "explanation_vi":"x","rules":[],"contrasts":[],"exceptions":[],
            "examples":[],"mistakes":["legacy mistake"],"guided_practice":[],
            "production_task_vi":"x","writing_tip_vi":"x",
        },
        "cross_skill":{"grammar_id":"x","annotatable":True,"lookup_terms":[]},
        "source":{"runtime_ai":False,"official_mapping":False,"content_status":"curated"},
        "learning_model":_model(),
    }
    without_mistake = deepcopy(base)
    without_mistake["learning_model"]["blocks"] = [
        b for b in without_mistake["learning_model"]["blocks"]
        if b["type"] != "common_mistake"
    ]
    with pytest.raises(GrammarKnowledgeInvalid, match="lesson.mistakes"):
        validate_grammar_knowledge(course, [without_mistake])

    validate_grammar_knowledge(course, [deepcopy(base)])

    with_exception = deepcopy(base)
    with_exception["lesson"]["mistakes"] = []
    with_exception["lesson"]["exceptions"] = ["legacy exception"]
    with pytest.raises(GrammarKnowledgeInvalid, match="lesson.exceptions"):
        validate_grammar_knowledge(course, [with_exception])

    with_exception["learning_model"]["blocks"].append({
        "id":"exception",
        "type":"exception",
        "stage":"compare",
        "title":{"vi":"Ngoại lệ"},
        "payload":{
            "rule":{"vi":"Quy tắc chung"},
            "exception":{"vi":"Trường hợp ngoại lệ"},
            "why":{"vi":"Giải thích vì sao ngoại lệ tồn tại"},
        },
    })
    validate_grammar_knowledge(course, [with_exception])
