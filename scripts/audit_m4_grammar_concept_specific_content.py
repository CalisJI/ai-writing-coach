from __future__ import annotations

import json
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
paths={
    "en": ROOT/"writing_coach/languages/english/grammar_knowledge.json",
    "zh": ROOT/"writing_coach/languages/chinese/grammar_knowledge.json",
}
expected={"en":269,"zh":239}
curated={"a1-be-am-is-are","a2-present-perfect-vs-past-simple","b1-passive-voice-present-and-past"}

total=0
source_backed=0
for language,path in paths.items():
    data=json.loads(path.read_text(encoding="utf-8"))
    assert len(data)==expected[language], (language,len(data))
    for item in data:
        total+=1
        model=item.get("learning_model")
        assert isinstance(model,dict), item["id"]
        assert model.get("schema_version")==2, item["id"]
        assert model.get("language_policy",{}).get("target_language")==language, item["id"]
        assert model.get("flow")==[
            "notice","understand","pattern","context","compare","apply","recall","transfer"
        ], item["id"]
        assert item.get("source",{}).get("runtime_ai") is False, item["id"]
        authoring=model.get("authoring",{})
        assert authoring.get("status")=="source-backed-concept-specific", item["id"]
        if item["id"] in curated:
            assert authoring.get("human_expert_validation")=="representative-reviewed"
        else:
            assert authoring.get("human_expert_validation")=="pending"
        blocks=model.get("blocks",[])
        types={x.get("type") for x in blocks if isinstance(x,dict)}
        stages={x.get("stage") for x in blocks if isinstance(x,dict)}
        assert {"scene","common_mistake","micro_practice","personal_practice","recall","memory_hook","skill_transfer"} <= types, item["id"]
        assert {"context","apply","recall","transfer"} <= stages, item["id"]
        assert {"formula","word_order","semantic_sentence","transformation","timeline"} & types, item["id"]
        source_backed+=1

assert total==508,total
assert source_backed==508,source_backed
print("M4_GRAMMAR_CONCEPT_SPECIFIC_CONTENT_AUDIT=PASS")
print("TOTAL=508/508")
print("RUNTIME_AI=0")
print("SOURCE_BACKED=508/508")
print("EXPERT_REVIEWED=3")
print("EXPERT_VALIDATION_PENDING=505")
