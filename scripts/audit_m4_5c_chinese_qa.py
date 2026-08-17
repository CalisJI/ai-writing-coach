"""Deterministic M4.5C Chinese curriculum audit and bounded review repair."""
from __future__ import annotations

import argparse
from copy import deepcopy
import json
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
ZH_CURRICULUM = ROOT / "writing_coach/languages/chinese/grammar_curriculum.json"
ZH_KNOWLEDGE = ROOT / "writing_coach/languages/chinese/grammar_knowledge.json"
EN_KNOWLEDGE = ROOT / "writing_coach/languages/english/grammar_knowledge.json"


def _load(path: Path) -> list[dict[str, Any]]:
    return json.loads(path.read_text(encoding="utf-8"))


def _replace_json_value(
    text: str,
    key: str,
    value: Any,
    *,
    start: int = 0,
) -> str:
    marker = json.dumps(key, ensure_ascii=False) + ":"
    key_at = text.index(marker, start)
    value_at = key_at + len(marker)
    while text[value_at].isspace():
        value_at += 1
    opening = text[value_at]
    if opening not in "[{":
        raise ValueError(f"Expected structured value for {key}")
    closing = "]" if opening == "[" else "}"
    depth = 0
    in_string = False
    escaped = False
    end = value_at
    while end < len(text):
        char = text[end]
        if in_string:
            if escaped:
                escaped = False
            elif char == "\\":
                escaped = True
            elif char == '"':
                in_string = False
        elif char == '"':
            in_string = True
        elif char == opening:
            depth += 1
        elif char == closing:
            depth -= 1
            if depth == 0:
                end += 1
                break
        end += 1
    indent = " " * (value_at - (text.rfind("\n", 0, value_at) + 1))
    rendered = json.dumps(value, ensure_ascii=False, indent=2)
    rendered = rendered.replace("\n", "\n" + indent)
    return text[:value_at] + rendered + text[end:]


def _replace_item(raw: str, lesson_id: str, replacement: str) -> str:
    marker = f'  {{\n    "id": "{lesson_id}",'
    start = raw.index(marker)
    next_start = raw.find('\n  {\n    "id": "', start + len(marker))
    end = len(raw) - 2 if next_start < 0 else next_start
    return raw[:start] + replacement + raw[end:]


def _item_block(raw: str, lesson_id: str) -> str:
    marker = f'  {{\n    "id": "{lesson_id}",'
    start = raw.index(marker)
    next_start = raw.find('\n  {\n    "id": "', start + len(marker))
    end = len(raw) - 2 if next_start < 0 else next_start
    return raw[start:end]


def _review_mistakes(
    course_item: dict[str, Any],
    knowledge_by_id: dict[str, dict[str, Any]],
) -> list[dict[str, Any]]:
    prerequisites = [
        knowledge_by_id[item]
        for item in course_item["prerequisites"]
        if item in knowledge_by_id
    ]
    if not prerequisites:
        raise ValueError(f"{course_item['id']} has no resolvable prerequisites")
    candidates = [
        deepcopy(mistake)
        for item in prerequisites
        for mistake in item["lesson"]["mistakes"]
    ]
    selected = [candidates[0]]
    for candidate in reversed(candidates):
        if candidate["incorrect"] != selected[0]["incorrect"]:
            selected.append(candidate)
            break
    if len(selected) != 2:
        raise ValueError(f"{course_item['id']} lacks two distinct prerequisite mistakes")
    return selected


def _repair_review_item(
    item_block: str,
    item: dict[str, Any],
    new_mistakes: list[dict[str, Any]],
) -> str:
    updated = deepcopy(item)
    updated["quick_reference"]["common_traps"] = [
        mistake["why"] for mistake in new_mistakes
    ]
    updated["lesson"]["mistakes"] = new_mistakes
    practice = updated["lesson"]["guided_practice"]
    repair = next(
        (task for task in practice if task["type"] in {"correction", "repair"}),
        None,
    )
    if repair is None:
        raise ValueError(f"{item['id']} has no correction practice")
    first = new_mistakes[0]
    repair["prompt"] = f"Sửa lỗi: {first['incorrect']}"
    repair["answer"] = first["correct"]
    repair["explanation"] = first["why"]

    common_mistake = next(
        block
        for block in updated["learning_model"]["blocks"]
        if block["type"] == "common_mistake"
    )
    common_mistake["payload"] = {
        "incorrect": first["incorrect"],
        "why": {"vi": first["why"], "default": first["why"]},
        "corrected": first["correct"],
        "correct": first["correct"],
        "context": {
            "vi": first.get("context", ""),
            "default": first.get("context", ""),
        },
    }

    quick_at = item_block.index('    "quick_reference": {')
    item_block = _replace_json_value(
        item_block,
        "common_traps",
        updated["quick_reference"]["common_traps"],
        start=quick_at,
    )
    lesson_at = item_block.index('    "lesson": {')
    item_block = _replace_json_value(
        item_block, "mistakes", new_mistakes, start=lesson_at
    )
    item_block = _replace_json_value(
        item_block, "guided_practice", practice, start=lesson_at
    )

    block_id = f'{item["id"]}-mistake'
    id_at = item_block.index(f'"id": "{block_id}"')
    object_start = item_block.rfind("        {", 0, id_at)
    object_end = item_block.index("\n        }", id_at) + len("\n        }")
    rendered = json.dumps(common_mistake, ensure_ascii=False, indent=2)
    rendered = "        " + rendered.replace("\n", "\n        ")
    return item_block[:object_start] + rendered + item_block[object_end:]


def apply_review_repairs() -> int:
    course = _load(ZH_CURRICULUM)
    knowledge = _load(ZH_KNOWLEDGE)
    knowledge_by_id = {item["id"]: item for item in knowledge}
    raw = ZH_KNOWLEDGE.read_text(encoding="utf-8").replace("\r\n", "\n")
    changed = 0
    for course_item in course:
        if course_item["kind"] not in {"review", "checkpoint"}:
            continue
        lesson_id = course_item["id"]
        new_mistakes = _review_mistakes(course_item, knowledge_by_id)
        item = knowledge_by_id[lesson_id]
        if item["lesson"]["mistakes"] == new_mistakes:
            continue
        block = _item_block(raw, lesson_id)
        raw = _replace_item(
            raw,
            lesson_id,
            _repair_review_item(block, item, new_mistakes),
        )
        changed += 1
    ZH_KNOWLEDGE.write_text(raw, encoding="utf-8", newline="\n")
    return changed


def audit() -> dict[str, int]:
    course = _load(ZH_CURRICULUM)
    knowledge = _load(ZH_KNOWLEDGE)
    english = _load(EN_KNOWLEDGE)
    by_id = {item["id"]: item for item in knowledge}
    if len(english) != 269:
        raise ValueError(f"English regression: expected 269, found {len(english)}")
    if len(course) != 239 or len(knowledge) != 239:
        raise ValueError("Chinese curriculum must contain exactly 239 entries")
    if set(by_id) != {item["id"] for item in course}:
        raise ValueError("Chinese curriculum and knowledge IDs differ")
    if any(item["source"]["runtime_ai"] is not False for item in knowledge):
        raise ValueError("Chinese grammar runtime AI must remain disabled")
    for item in knowledge:
        for example in item["lesson"]["examples"]:
            if not example["target"].strip() or not example["pinyin"].strip():
                raise ValueError(f"{item['id']} has missing example or Pinyin")
            if any(char.isdigit() for char in example["pinyin"]):
                raise ValueError(f"{item['id']} has numbered rather than tone-mark Pinyin")
    for course_item in course:
        if course_item["kind"] not in {"review", "checkpoint"}:
            continue
        expected = _review_mistakes(course_item, by_id)
        actual = by_id[course_item["id"]]["lesson"]["mistakes"]
        if actual != expected:
            raise ValueError(
                f"{course_item['id']} review mistakes are outside its prerequisite set"
            )
    return {
        "english_lessons": len(english),
        "chinese_lessons": len(knowledge),
        "levels": len({item["level"] for item in course}),
        "runtime_ai": 0,
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply-reviewed-repairs", action="store_true")
    args = parser.parse_args()
    if args.apply_reviewed_repairs:
        print(f"REVIEW_ENTRIES_REPAIRED={apply_review_repairs()}")
    result = audit()
    for key, value in result.items():
        print(f"{key.upper()}={value}")
    print("ORENA_M4_5C_STATIC_AUDIT=PASS")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
