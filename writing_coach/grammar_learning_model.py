from __future__ import annotations

import re
from collections.abc import Mapping, Sequence
from typing import Any


class GrammarLearningModelInvalid(ValueError):
    pass


SCHEMA_VERSION = 2
LEGACY_SCHEMA_VERSION = 1
LEGACY_FLOW = ("notice", "understand", "connect", "compare", "apply", "recall", "transfer")
CANONICAL_FLOW = (
    "notice",
    "understand",
    "pattern",
    "context",
    "compare",
    "apply",
    "recall",
    "transfer",
)
SEMANTIC_ROLES = frozenset({
    "subject", "verb", "object", "noun", "pronoun", "adjective", "adverb",
    "modifier", "article", "determiner", "auxiliary", "preposition",
    "particle", "conjunction", "time", "location", "complement", "classifier",
    "negation", "marker", "changed", "error", "exception", "connector", "topic",
    "comment", "result", "case", "gender", "agreement", "stem", "ending",
    "honorific", "register",
})
INTERACTION_TYPES = frozenset({
    "choose", "reorder", "fill", "match", "transform", "compare",
    "classify", "identify", "build", "speak", "write",
})
ALLOWED_STAGES = frozenset((*LEGACY_FLOW, *CANONICAL_FLOW))
ALLOWED_BLOCK_TYPES = frozenset({
    "formula", "semantic_sentence", "transformation",
    "position", "word_order", "insertion", "particle_position",
    "timeline", "contrast", "scene", "sentence_builder",
    "agreement_map", "inflection_table",
    "common_mistake", "exception", "micro_practice",
    "personal_practice", "recall", "memory_hook", "skill_transfer",
})
EVIDENCE_BLOCK_TYPES = frozenset({
    "micro_practice", "personal_practice", "recall", "skill_transfer"
})
SKILLS = frozenset({"writing", "speaking", "reading", "listening"})
LOCALE_KEY_RE = re.compile(r"^(?:default|[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*)$")
CAPABILITY_RE = re.compile(r"^[a-z][a-z0-9]*(?:[-_][a-z0-9]+)*$")


def _is_list(value: Any) -> bool:
    return isinstance(value, Sequence) and not isinstance(value, (str, bytes))


def _mapping(value: Any, path: str) -> Mapping[str, Any]:
    if not isinstance(value, Mapping):
        raise GrammarLearningModelInvalid(f"{path} must be a mapping.")
    return value


def _list(value: Any, path: str, minimum: int = 0) -> Sequence[Any]:
    if not _is_list(value):
        raise GrammarLearningModelInvalid(f"{path} must be a list.")
    if len(value) < minimum:
        raise GrammarLearningModelInvalid(f"{path} needs at least {minimum} item(s).")
    return value


def _locale_key(value: Any, path: str) -> str:
    if not isinstance(value, str) or not LOCALE_KEY_RE.fullmatch(value):
        raise GrammarLearningModelInvalid(
            f"{path} must be 'default' or a BCP47-like language key."
        )
    return value


def _text(value: Any, path: str) -> None:
    if isinstance(value, str):
        if not value.strip():
            raise GrammarLearningModelInvalid(f"{path} must not be blank.")
        return
    if isinstance(value, Mapping):
        if not value:
            raise GrammarLearningModelInvalid(f"{path} localized text must not be empty.")
        for key in value:
            _locale_key(key, f"{path} locale key")
        if not any(isinstance(item, str) and item.strip() for item in value.values()):
            raise GrammarLearningModelInvalid(f"{path} needs non-empty localized text.")
        return
    raise GrammarLearningModelInvalid(f"{path} must be text or localized text.")


def _optional_text(value: Any, path: str) -> None:
    if value is not None:
        _text(value, path)


def _role(value: Any, path: str) -> None:
    if value not in SEMANTIC_ROLES:
        raise GrammarLearningModelInvalid(
            f"{path} must be one of {sorted(SEMANTIC_ROLES)}."
        )


def _validate_reading_aid(item: Mapping[str, Any], path: str) -> None:
    # `pinyin` remains accepted only as a migration alias. Shared UI/rendering
    # uses generic reading-aid terminology and never branches on Chinese.
    for field in ("reading_aid", "transliteration", "pronunciation_guide", "pinyin"):
        _optional_text(item.get(field), f"{path}.{field}")


def _validate_parts(payload: Mapping[str, Any], path: str) -> None:
    for i, raw in enumerate(_list(payload.get("parts"), f"{path}.parts", 2)):
        item = _mapping(raw, f"{path}.parts[{i}]")
        _text(item.get("text"), f"{path}.parts[{i}].text")
        _role(item.get("role"), f"{path}.parts[{i}].role")
        _optional_text(item.get("label"), f"{path}.parts[{i}].label")
        _validate_reading_aid(item, f"{path}.parts[{i}]")


def _validate_segments(payload: Mapping[str, Any], path: str) -> None:
    for i, raw in enumerate(_list(payload.get("segments"), f"{path}.segments", 2)):
        item = _mapping(raw, f"{path}.segments[{i}]")
        _text(item.get("text"), f"{path}.segments[{i}].text")
        _role(item.get("role"), f"{path}.segments[{i}].role")
        for field in ("label", "meaning"):
            _optional_text(item.get(field), f"{path}.segments[{i}].{field}")
        _validate_reading_aid(item, f"{path}.segments[{i}]")
        if item.get("inserted") is not None and not isinstance(item["inserted"], bool):
            raise GrammarLearningModelInvalid(
                f"{path}.segments[{i}].inserted must be bool."
            )


def _validate_transformation(payload: Mapping[str, Any], path: str) -> None:
    _text(payload.get("from"), f"{path}.from")
    _text(payload.get("to"), f"{path}.to")
    for i, step in enumerate(_list(payload.get("steps", []), f"{path}.steps")):
        _text(step, f"{path}.steps[{i}]")


def _validate_timeline(payload: Mapping[str, Any], path: str) -> None:
    allowed = {"before", "past", "now", "ongoing", "future", "after", "context"}
    for i, raw in enumerate(_list(payload.get("events"), f"{path}.events", 2)):
        item = _mapping(raw, f"{path}.events[{i}]")
        _text(item.get("label"), f"{path}.events[{i}].label")
        _optional_text(item.get("note"), f"{path}.events[{i}].note")
        if item.get("position") not in allowed:
            raise GrammarLearningModelInvalid(
                f"{path}.events[{i}].position must be one of {sorted(allowed)}."
            )


def _validate_contrast(payload: Mapping[str, Any], path: str) -> None:
    for i, raw in enumerate(_list(payload.get("items"), f"{path}.items", 2)):
        item = _mapping(raw, f"{path}.items[{i}]")
        _text(item.get("label"), f"{path}.items[{i}].label")
        _text(item.get("text"), f"{path}.items[{i}].text")
        for field in ("note", "meaning"):
            _optional_text(item.get(field), f"{path}.items[{i}].{field}")
        _validate_reading_aid(item, f"{path}.items[{i}]")


def _validate_scene(payload: Mapping[str, Any], path: str) -> None:
    _optional_text(payload.get("setup"), f"{path}.setup")
    for i, raw in enumerate(_list(payload.get("lines"), f"{path}.lines", 1)):
        item = _mapping(raw, f"{path}.lines[{i}]")
        _text(item.get("text"), f"{path}.lines[{i}].text")
        for field in ("speaker", "meaning"):
            _optional_text(item.get(field), f"{path}.lines[{i}].{field}")
        _validate_reading_aid(item, f"{path}.lines[{i}]")


def _validate_builder(payload: Mapping[str, Any], path: str) -> None:
    for i, raw in enumerate(_list(payload.get("slots"), f"{path}.slots", 2)):
        slot = _mapping(raw, f"{path}.slots[{i}]")
        _text(slot.get("label"), f"{path}.slots[{i}].label")
        for j, option in enumerate(
            _list(slot.get("options"), f"{path}.slots[{i}].options", 1)
        ):
            _text(option, f"{path}.slots[{i}].options[{j}]")


def _validate_inflection_table(payload: Mapping[str, Any], path: str) -> None:
    headers = _list(payload.get("headers", []), f"{path}.headers")
    for i, header in enumerate(headers):
        _text(header, f"{path}.headers[{i}]")
    rows = _list(payload.get("rows"), f"{path}.rows", 1)
    for i, raw in enumerate(rows):
        row = _mapping(raw, f"{path}.rows[{i}]")
        _text(row.get("label"), f"{path}.rows[{i}].label")
        cells = _list(row.get("cells"), f"{path}.rows[{i}].cells", 1)
        for j, cell in enumerate(cells):
            _text(cell, f"{path}.rows[{i}].cells[{j}]")


def _validate_prompt(payload: Mapping[str, Any], path: str) -> None:
    _text(payload.get("prompt"), f"{path}.prompt")
    for field in ("placeholder", "answer", "explanation"):
        _optional_text(payload.get(field), f"{path}.{field}")


def _validate_common_mistake(payload: Mapping[str, Any], path: str) -> None:
    _text(payload.get("incorrect"), f"{path}.incorrect")
    _text(payload.get("why"), f"{path}.why")
    _text(payload.get("correct"), f"{path}.correct")
    _optional_text(payload.get("context"), f"{path}.context")


def _validate_exception(payload: Mapping[str, Any], path: str) -> None:
    _text(payload.get("rule"), f"{path}.rule")
    _text(payload.get("exception"), f"{path}.exception")
    _text(payload.get("why"), f"{path}.why")
    _optional_text(payload.get("context"), f"{path}.context")


def _validate_micro_practice(payload: Mapping[str, Any], path: str) -> None:
    interaction = payload.get("interaction")
    if interaction not in INTERACTION_TYPES:
        raise GrammarLearningModelInvalid(
            f"{path}.interaction must be one of {sorted(INTERACTION_TYPES)}."
        )
    _text(payload.get("prompt"), f"{path}.prompt")
    _optional_text(payload.get("placeholder"), f"{path}.placeholder")
    _optional_text(payload.get("explanation"), f"{path}.explanation")

    if interaction in {"choose", "compare", "classify", "identify"}:
        for i, option in enumerate(_list(payload.get("options"), f"{path}.options", 2)):
            _text(option, f"{path}.options[{i}]")
        _text(payload.get("answer"), f"{path}.answer")
    elif interaction in {"reorder", "build"}:
        for i, token in enumerate(_list(payload.get("tokens"), f"{path}.tokens", 2)):
            _text(token, f"{path}.tokens[{i}]")
        _text(payload.get("answer"), f"{path}.answer")
    elif interaction == "match":
        for i, raw in enumerate(_list(payload.get("pairs"), f"{path}.pairs", 2)):
            pair = _mapping(raw, f"{path}.pairs[{i}]")
            _text(pair.get("left"), f"{path}.pairs[{i}].left")
            _text(pair.get("right"), f"{path}.pairs[{i}].right")
    elif interaction in {"fill", "transform"}:
        _text(payload.get("answer"), f"{path}.answer")
    elif interaction in {"speak", "write"}:
        _optional_text(payload.get("answer"), f"{path}.answer")


def _validate_memory(payload: Mapping[str, Any], path: str) -> None:
    _text(payload.get("cue"), f"{path}.cue")
    _text(payload.get("remember"), f"{path}.remember")


def _validate_transfer(payload: Mapping[str, Any], path: str) -> None:
    skills = _mapping(payload.get("skills"), f"{path}.skills")
    if not skills:
        raise GrammarLearningModelInvalid(f"{path}.skills must not be empty.")
    unknown = set(skills) - SKILLS
    if unknown:
        raise GrammarLearningModelInvalid(f"{path}.skills unsupported: {sorted(unknown)}")
    for skill, prompt in skills.items():
        _text(prompt, f"{path}.skills.{skill}")


def _validate_payload(block_type: str, payload: Mapping[str, Any], path: str) -> None:
    if block_type == "formula":
        _validate_parts(payload, path)
    elif block_type in {
        "semantic_sentence", "position", "word_order",
        "insertion", "particle_position", "agreement_map",
    }:
        _validate_segments(payload, path)
    elif block_type == "transformation":
        _validate_transformation(payload, path)
    elif block_type == "timeline":
        _validate_timeline(payload, path)
    elif block_type == "contrast":
        _validate_contrast(payload, path)
    elif block_type == "scene":
        _validate_scene(payload, path)
    elif block_type == "sentence_builder":
        _validate_builder(payload, path)
    elif block_type == "inflection_table":
        _validate_inflection_table(payload, path)
    elif block_type == "common_mistake":
        _validate_common_mistake(payload, path)
    elif block_type == "exception":
        _validate_exception(payload, path)
    elif block_type == "micro_practice":
        _validate_micro_practice(payload, path)
    elif block_type in {"personal_practice", "recall"}:
        _validate_prompt(payload, path)
    elif block_type == "memory_hook":
        _validate_memory(payload, path)
    elif block_type == "skill_transfer":
        _validate_transfer(payload, path)


def _validate_language_policy(model: Mapping[str, Any]) -> None:
    policy = _mapping(model.get("language_policy"), "learning_model.language_policy")
    _locale_key(policy.get("target_language"), "learning_model.language_policy.target_language")
    for field in ("explanation_languages", "translation_languages"):
        values = _list(policy.get(field), f"learning_model.language_policy.{field}", 1)
        for i, value in enumerate(values):
            _locale_key(value, f"learning_model.language_policy.{field}[{i}]")


def _validate_capabilities(model: Mapping[str, Any]) -> None:
    capabilities = _list(model.get("capabilities"), "learning_model.capabilities", 1)
    seen: set[str] = set()
    for i, raw in enumerate(capabilities):
        if not isinstance(raw, str) or not CAPABILITY_RE.fullmatch(raw):
            raise GrammarLearningModelInvalid(
                f"learning_model.capabilities[{i}] must be a normalized capability id."
            )
        if raw in seen:
            raise GrammarLearningModelInvalid(
                f"learning_model.capabilities repeats '{raw}'."
            )
        seen.add(raw)


def validate_grammar_learning_model(
    model: Mapping[str, Any],
    *,
    grammar_id: str,
    kind: str,
) -> None:
    if not isinstance(model, Mapping):
        raise GrammarLearningModelInvalid(
            f"Knowledge '{grammar_id}' learning_model must be a mapping."
        )

    version = model.get("schema_version")
    if version not in {LEGACY_SCHEMA_VERSION, SCHEMA_VERSION}:
        raise GrammarLearningModelInvalid(
            f"Knowledge '{grammar_id}' learning_model.schema_version must be "
            f"{LEGACY_SCHEMA_VERSION} or {SCHEMA_VERSION}."
        )

    canonical_flow = LEGACY_FLOW if version == LEGACY_SCHEMA_VERSION else CANONICAL_FLOW
    if version == SCHEMA_VERSION:
        _validate_language_policy(model)
        _validate_capabilities(model)

    flow = list(_list(model.get("flow"), "learning_model.flow", 1))
    if any(stage not in set(canonical_flow) for stage in flow):
        raise GrammarLearningModelInvalid(f"Knowledge '{grammar_id}' has unsupported stage.")
    if len(set(flow)) != len(flow):
        raise GrammarLearningModelInvalid(f"Knowledge '{grammar_id}' repeats stages.")
    if flow != [stage for stage in canonical_flow if stage in flow]:
        raise GrammarLearningModelInvalid(
            f"Knowledge '{grammar_id}' flow must preserve canonical order."
        )
    if kind == "lesson" and tuple(flow) != canonical_flow:
        required_label = (
            "NOTICE → UNDERSTAND → CONNECT → COMPARE → APPLY → RECALL → TRANSFER"
            if version == LEGACY_SCHEMA_VERSION
            else "NOTICE → UNDERSTAND → SEE THE PATTERN → SEE IT IN CONTEXT → "
                 "COMPARE → APPLY → RECALL → TRANSFER"
        )
        raise GrammarLearningModelInvalid(
            f"Lesson '{grammar_id}' must use {required_label}."
        )

    hook = _mapping(model.get("hook"), "learning_model.hook")
    _text(hook.get("prompt"), "learning_model.hook.prompt")
    _optional_text(hook.get("eyebrow"), "learning_model.hook.eyebrow")

    meaning = _mapping(model.get("meaning"), "learning_model.meaning")
    _text(meaning.get("summary"), "learning_model.meaning.summary")
    _text(meaning.get("mental_model"), "learning_model.meaning.mental_model")
    for i, item in enumerate(
        _list(meaning.get("use_when"), "learning_model.meaning.use_when", 1)
    ):
        _text(item, f"learning_model.meaning.use_when[{i}]")

    blocks = _list(model.get("blocks"), "learning_model.blocks", 1)
    seen_ids: set[str] = set()
    represented = {"notice", "understand"}
    evidence: set[str] = set()

    for i, raw in enumerate(blocks):
        path = f"learning_model.blocks[{i}]"
        block = _mapping(raw, path)
        block_id = block.get("id")
        if not isinstance(block_id, str) or not block_id.strip():
            raise GrammarLearningModelInvalid(f"{path}.id is required.")
        if block_id in seen_ids:
            raise GrammarLearningModelInvalid(f"Duplicate block id '{block_id}'.")
        seen_ids.add(block_id)

        block_type = block.get("type")
        if block_type not in ALLOWED_BLOCK_TYPES:
            raise GrammarLearningModelInvalid(f"{path}.type unsupported.")
        stage = block.get("stage")
        if stage not in flow:
            raise GrammarLearningModelInvalid(f"{path}.stage must exist in flow.")
        represented.add(str(stage))
        _text(block.get("title"), f"{path}.title")
        _optional_text(block.get("instruction"), f"{path}.instruction")
        _validate_payload(
            str(block_type),
            _mapping(block.get("payload"), f"{path}.payload"),
            f"{path}.payload",
        )
        if block_type in EVIDENCE_BLOCK_TYPES:
            evidence.add(str(stage))

    missing = [stage for stage in flow if stage not in represented]
    if missing:
        raise GrammarLearningModelInvalid(
            f"Knowledge '{grammar_id}' has learning stages with no content: {missing}"
        )

    completion = _mapping(model.get("completion"), "learning_model.completion")
    required = list(_list(
        completion.get("required_stages"),
        "learning_model.completion.required_stages",
        1,
    ))
    if any(stage not in flow for stage in required):
        raise GrammarLearningModelInvalid("Completion stages must be in learning flow.")
    if kind == "lesson" and not {"apply", "recall", "transfer"}.issubset(set(required)):
        raise GrammarLearningModelInvalid(
            f"Lesson '{grammar_id}' completion must require APPLY, RECALL and TRANSFER."
        )
    missing_evidence = [stage for stage in required if stage not in evidence]
    if missing_evidence:
        raise GrammarLearningModelInvalid(
            f"Knowledge '{grammar_id}' completion stages lack learner-input evidence: "
            f"{missing_evidence}"
        )
