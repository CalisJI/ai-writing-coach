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
            {"id":"formula","type":"formula","stage":"understand","title":{"vi":"Công thức"},"payload":{"parts":[{"text":"have/has","role":"marker"},{"text":"V3","role":"action"}]}},
            {"id":"scene","type":"scene","stage":"connect","title":{"vi":"Ngữ cảnh"},"payload":{"lines":[{"text":"I have lived here for three years."}]}},
            {"id":"contrast","type":"contrast","stage":"compare","title":{"vi":"Phân biệt"},"payload":{"items":[{"label":"A","text":"I have lived here."},{"label":"B","text":"I lived there."}]}},
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
