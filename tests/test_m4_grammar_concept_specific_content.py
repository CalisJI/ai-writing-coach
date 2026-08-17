import json
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]

def _load(language):
    name="english" if language=="en" else "chinese"
    path=ROOT/f"writing_coach/languages/{name}/grammar_knowledge.json"
    return json.loads(path.read_text(encoding="utf-8"))

def test_all_508_are_source_backed_concept_specific_schema2():
    en=_load("en")
    zh=_load("zh")
    assert len(en)==269
    assert len(zh)==239
    assert len(en)+len(zh)==508
    for language,items in (("en",en),("zh",zh)):
        for item in items:
            model=item["learning_model"]
            assert model["schema_version"]==2
            assert model["language_policy"]["target_language"]==language
            assert model["authoring"]["status"]=="source-backed-concept-specific"
            assert item["source"]["runtime_ai"] is False

def test_every_lesson_has_real_learning_evidence_path():
    for item in [*_load("en"),*_load("zh")]:
        blocks=item["learning_model"]["blocks"]
        types={x["type"] for x in blocks}
        stages={x["stage"] for x in blocks}
        assert {"scene","common_mistake","micro_practice","personal_practice","recall","memory_hook","skill_transfer"} <= types
        assert {"context","apply","recall","transfer"} <= stages
        assert {"formula","word_order","semantic_sentence","transformation","timeline"} & types
