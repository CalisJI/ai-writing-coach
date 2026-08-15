# Static, language-neutral Grammar Knowledge Base validation.
from __future__ import annotations

from collections.abc import Mapping, Sequence
from typing import Any

from writing_coach.grammar_learning_model import validate_grammar_learning_model


class GrammarKnowledgeInvalid(ValueError):
    pass


_INTERNAL_MARKERS = (
    "Authoritative target grammar point:",
    "Required learner outcome:",
    "Required contrast targets:",
    "Prerequisite context:",
    "Production evidence:",
    "Do not teach sibling module topics",
)


def _strings(value: Any):
    if isinstance(value, str):
        yield value
    elif isinstance(value, Mapping):
        for child in value.values():
            yield from _strings(child)
    elif isinstance(value, Sequence) and not isinstance(value, (str, bytes)):
        for child in value:
            yield from _strings(child)


def validate_grammar_knowledge(
    course: Sequence[Mapping[str, Any]],
    knowledge: Sequence[Mapping[str, Any]],
) -> None:
    if not isinstance(knowledge, Sequence) or isinstance(knowledge, (str, bytes)) or not knowledge:
        raise GrammarKnowledgeInvalid("Grammar knowledge must be a non-empty sequence.")

    course_by_id = {str(item["id"]): item for item in course}
    knowledge_by_id: dict[str, Mapping[str, Any]] = {}

    for position, entry in enumerate(knowledge, start=1):
        if not isinstance(entry, Mapping):
            raise GrammarKnowledgeInvalid(f"Knowledge item {position} must be a mapping.")

        grammar_id = entry.get("id")
        if not isinstance(grammar_id, str) or not grammar_id:
            raise GrammarKnowledgeInvalid(f"Knowledge item {position} needs a stable id.")
        if grammar_id in knowledge_by_id:
            raise GrammarKnowledgeInvalid(f"Duplicate grammar knowledge id: {grammar_id}")
        if grammar_id not in course_by_id:
            raise GrammarKnowledgeInvalid(f"Knowledge id is not in curriculum: {grammar_id}")

        lesson = course_by_id[grammar_id]
        for field in ("title", "level", "kind", "content_version"):
            if entry.get(field) != lesson.get(field):
                raise GrammarKnowledgeInvalid(
                    f"Knowledge '{grammar_id}' field '{field}' must match curriculum."
                )

        quick = entry.get("quick_reference")
        if not isinstance(quick, Mapping):
            raise GrammarKnowledgeInvalid(f"Knowledge '{grammar_id}' needs quick_reference.")
        if not isinstance(quick.get("summary_vi"), str) or not quick["summary_vi"].strip():
            raise GrammarKnowledgeInvalid(f"Knowledge '{grammar_id}' needs quick summary.")
        for field in ("aliases", "contrasts", "restrictions", "common_traps", "lookup_tags"):
            if not isinstance(quick.get(field), list):
                raise GrammarKnowledgeInvalid(
                    f"Knowledge '{grammar_id}' quick_reference.{field} must be a list."
                )

        teaching = entry.get("lesson")
        if not isinstance(teaching, Mapping):
            raise GrammarKnowledgeInvalid(f"Knowledge '{grammar_id}' needs lesson content.")
        required_lesson = (
            "explanation_vi", "rules", "contrasts", "exceptions", "examples",
            "mistakes", "guided_practice", "production_task_vi", "writing_tip_vi",
        )
        for field in required_lesson:
            if field not in teaching:
                raise GrammarKnowledgeInvalid(
                    f"Knowledge '{grammar_id}' lesson is missing '{field}'."
                )
        for field in ("rules", "contrasts", "exceptions", "examples", "mistakes", "guided_practice"):
            if not isinstance(teaching[field], list):
                raise GrammarKnowledgeInvalid(
                    f"Knowledge '{grammar_id}' lesson.{field} must be a list."
                )

        cross_skill = entry.get("cross_skill")
        if not isinstance(cross_skill, Mapping):
            raise GrammarKnowledgeInvalid(f"Knowledge '{grammar_id}' needs cross_skill metadata.")
        if cross_skill.get("grammar_id") != grammar_id:
            raise GrammarKnowledgeInvalid(f"Knowledge '{grammar_id}' cross_skill grammar_id mismatch.")
        if not isinstance(cross_skill.get("annotatable"), bool):
            raise GrammarKnowledgeInvalid(f"Knowledge '{grammar_id}' annotatable must be bool.")
        if not isinstance(cross_skill.get("lookup_terms"), list):
            raise GrammarKnowledgeInvalid(f"Knowledge '{grammar_id}' lookup_terms must be a list.")

        source = entry.get("source")
        if not isinstance(source, Mapping):
            raise GrammarKnowledgeInvalid(f"Knowledge '{grammar_id}' needs source metadata.")
        if source.get("runtime_ai") is not False:
            raise GrammarKnowledgeInvalid(f"Knowledge '{grammar_id}' must disable runtime AI.")
        if source.get("official_mapping") is not False:
            raise GrammarKnowledgeInvalid(
                f"Knowledge '{grammar_id}' must not claim official one-to-one mapping."
            )
        if source.get("content_status") not in {"foundation", "curated"}:
            raise GrammarKnowledgeInvalid(
                f"Knowledge '{grammar_id}' source.content_status must be foundation or curated."
            )

        learning_model = entry.get("learning_model")
        if learning_model is not None:
            validate_grammar_learning_model(
                learning_model,
                grammar_id=grammar_id,
                kind=str(entry.get("kind") or ""),
            )
        if source.get("content_status") == "curated" and learning_model is None:
            raise GrammarKnowledgeInvalid(
                f"Curated knowledge '{grammar_id}' requires a validated learning_model."
            )

        for text in _strings({
            "quick_reference": quick,
            "lesson": teaching,
            "learning_model": learning_model or {},
        }):
            if any(marker in text for marker in _INTERNAL_MARKERS):
                raise GrammarKnowledgeInvalid(
                    f"Knowledge '{grammar_id}' leaks internal syllabus metadata."
                )

        knowledge_by_id[grammar_id] = entry

    if set(knowledge_by_id) != set(course_by_id):
        missing = sorted(set(course_by_id) - set(knowledge_by_id))
        extra = sorted(set(knowledge_by_id) - set(course_by_id))
        raise GrammarKnowledgeInvalid(
            f"Grammar knowledge coverage mismatch; missing={missing[:5]} extra={extra[:5]}"
        )
