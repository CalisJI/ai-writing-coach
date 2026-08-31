from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class PracticeNextIn(BaseModel):
    target_level: str = Field(default="", max_length=12)


_VALID_OUTCOME_STATUSES = {
    "improved", "needs_attention", "still_working", "held",
    "not_observed", "needs_more_evidence", "transferred",
}
_VALID_FAMILIES = {
    "grammar", "vocabulary", "coherence", "task_achievement",
    "naturalness", "expression",
}


def _humanize(value: Any) -> str:
    raw = str(value or "").strip().replace("-", " ").replace("_", " ")
    return " ".join(part.capitalize() for part in raw.split()) or "Expression"


def _focus_family(category: Any) -> str:
    value = str(category or "").casefold()
    if any(token in value for token in (
        "article", "verb", "tense", "grammar", "agreement", "preposition",
        "word order", "word_order", "particle", "measure word", "measure_word",
        "classifier", "aspect", "sentence structure", "sentence_structure",
    )):
        return "grammar"
    if any(token in value for token in (
        "vocabulary", "word choice", "word_choice", "collocation", "lexical",
        "precision", "repetition",
    )):
        return "vocabulary"
    if any(token in value for token in (
        "coherence", "organization", "organisation", "linking", "transition",
        "paragraph", "logic", "flow",
    )):
        return "coherence"
    if any(token in value for token in (
        "task", "relevance", "support", "development", "detail",
    )):
        return "task_achievement"
    if any(token in value for token in (
        "natural", "awkward", "idiomatic", "tone", "register",
    )):
        return "naturalness"
    return "expression"




def _focus_label(language: str, category: Any, family: str) -> str:
    raw = str(category or "").casefold().replace("-", "_").replace(" ", "_")
    if language != "zh":
        return _humanize(category)

    specific = {
        "word_order": "词序",
        "article": "冠词",
        "verb_form": "动词形式",
        "tense": "时态",
        "collocation": "搭配",
        "word_choice": "选词",
        "coherence": "衔接与结构",
        "naturalness": "自然表达",
        "task_achievement": "任务完成",
    }
    if raw in specific:
        return specific[raw]

    return {
        "grammar": "语法与句子结构",
        "vocabulary": "词汇与搭配",
        "coherence": "衔接与结构",
        "task_achievement": "任务完成",
        "naturalness": "自然表达",
        "expression": "清楚表达",
    }[family]


def _task_type(language: str, goal: str, focus_family: str) -> str:
    if goal == "exam":
        return "hsk" if language == "zh" else "toeic"
    if goal == "work":
        return "email"
    if goal == "voice":
        return "opinion"
    if focus_family in {"vocabulary", "naturalness"}:
        return "review"
    if focus_family == "grammar":
        return "story"
    return "opinion"


def _topic(goal: str, focus_family: str) -> str:
    if goal == "work":
        return "work"
    if goal == "exam":
        return "random"
    if goal == "voice":
        return "communication"
    if focus_family == "vocabulary":
        return "daily life"
    if focus_family == "naturalness":
        return "communication"
    if focus_family == "coherence":
        return "community"
    return "daily life"


def _word_target(language: str, target_level: str, style: str) -> int:
    if language == "zh":
        base = {
            "HSK1": 40, "HSK2": 60, "HSK3": 80, "HSK4": 80,
            "HSK5": 120, "HSK6": 180, "HSK7-9": 180,
        }.get(target_level, 80)
        if style == "concise":
            return 40 if base <= 60 else 60 if base <= 80 else 120
        if style == "deep":
            return 80 if base <= 60 else 120 if base <= 120 else 180
        return base

    base = {
        "A1": 100, "A2": 100, "B1": 120, "B2": 150,
        "C1": 180, "C2": 220,
    }.get(target_level, 150)
    if style == "concise":
        return 100 if base <= 150 else 120
    if style == "deep":
        return 150 if base <= 120 else 180 if base <= 180 else 220
    return base


def _stepped_word_target(language: str, current: int, direction: int) -> int:
    """Move one supported length option, never inventing an unsupported size."""
    options = [40, 60, 80, 120, 180, 250] if language == "zh" else [100, 120, 150, 180, 220, 280]
    nearest = min(range(len(options)), key=lambda index: abs(options[index] - int(current)))
    target_index = max(0, min(len(options) - 1, nearest + direction))
    return options[target_index]


def _integer(value: Any, *, minimum: int = 0) -> int | None:
    if isinstance(value, bool) or not isinstance(value, int) or value < minimum:
        return None
    return value


def _verified_outcome(value: Any, language: str) -> dict[str, Any] | None:
    if not isinstance(value, dict) or isinstance(value, list):
        return None
    evidence_language = str(value.get("language") or "").strip().casefold()
    if evidence_language and evidence_language != language:
        return None
    status = str(value.get("status") or "").strip().casefold()
    family = str(value.get("focus_family") or "").strip().casefold()
    revision_no = _integer(value.get("revision_no"), minimum=1)
    issue_count = _integer(value.get("issue_count"), minimum=0)
    previous = value.get("previous_issue_count")
    if previous is not None:
        previous = _integer(previous, minimum=0)
    if status not in _VALID_OUTCOME_STATUSES or family not in _VALID_FAMILIES:
        return None
    if revision_no is None or issue_count is None:
        return None
    if status == "improved" and (
        revision_no < 2 or previous is None or issue_count >= previous
    ):
        return None
    if status in {"needs_attention", "still_working"} and issue_count <= 0:
        return None
    essay_id = _integer(value.get("essay_id"), minimum=1)
    return {
        "status": status,
        "focus_family": family,
        "revision_no": revision_no,
        "issue_count": issue_count,
        "previous_issue_count": previous,
        "essay_id": essay_id,
    }


def _verified_revision_win(value: Any, language: str) -> dict[str, Any] | None:
    if not isinstance(value, dict) or isinstance(value, list):
        return None
    evidence_language = str(value.get("language") or "").strip().casefold()
    if evidence_language and evidence_language != language:
        return None
    revisions = _integer(value.get("revisions"), minimum=2)
    latest_id = _integer(value.get("latest_id"), minimum=1)
    overall_delta = value.get("overall_delta")
    error_delta = value.get("error_delta")
    if isinstance(overall_delta, bool) or not isinstance(overall_delta, (int, float)):
        return None
    if isinstance(error_delta, bool) or not isinstance(error_delta, int):
        return None
    if (
        revisions is None or latest_id is None
        or not overall_delta > 0
        or error_delta > 0
    ):
        return None
    return {
        "status": "improved",
        "revision_no": revisions,
        "issue_count": max(0, error_delta),
        "previous_issue_count": max(0, -error_delta),
        "essay_id": latest_id,
        "focus_family": "expression",
    }


def _difficulty_decision(
    *, language: str, base_word_target: int, outcomes: Any, revision_wins: Any,
) -> dict[str, Any]:
    valid = []
    if isinstance(outcomes, list):
        for item in outcomes[:8]:
            normalized = _verified_outcome(item, language)
            if normalized:
                valid.append(normalized)
    evidence_source = "practice_outcome"
    evidence = valid[0] if valid else None
    if evidence is None and isinstance(revision_wins, list):
        for item in revision_wins[:8]:
            normalized = _verified_revision_win(item, language)
            if normalized:
                evidence = normalized
                evidence_source = "revision_win"
                valid.append(normalized)
                break
    if evidence and evidence["status"] == "improved":
        word_target = _stepped_word_target(language, base_word_target, 1)
        state = "stretch"
        delta = word_target - base_word_target
    elif evidence and evidence["status"] in {"needs_attention", "still_working"}:
        word_target = _stepped_word_target(language, base_word_target, -1)
        state = "scaffold"
        delta = word_target - base_word_target
    elif evidence:
        word_target = base_word_target
        state = "hold"
        delta = 0
    else:
        word_target = base_word_target
        state = "insufficient"
        delta = 0

    provenance = {
        "source": evidence_source if evidence else "none",
        "evidence_count": len(valid),
    }
    if evidence:
        provenance.update({
            "status": evidence["status"],
            "focus_family": evidence["focus_family"],
            "revision_no": evidence["revision_no"],
            "issue_count": evidence["issue_count"],
            "previous_issue_count": evidence["previous_issue_count"],
        })
        if evidence["essay_id"] is not None:
            provenance["essay_id"] = evidence["essay_id"]
    return {
        "state": state,
        "word_target": word_target,
        "length_delta": delta,
        "provenance": provenance,
    }


def _focus_instruction(language: str, family: str, category: str, intent: str) -> str:
    if language == "zh":
        base = {
            "grammar": "写作时重点检查词序、虚词和句子结构，但不要为了避免错误而把句子写得过短。",
            "vocabulary": "优先选择自然、准确、你真正会使用的词语和搭配，不要为了显得高级而强行换词。",
            "coherence": "先表达一个清楚的主旨，再用有逻辑关系的理由、细节或例子支持它。",
            "task_achievement": "完整回应任务要求，并至少用一个具体细节把主要观点发展出来。",
            "naturalness": "优先使用自然直接的中文表达，避免逐字翻译或不必要的正式表达。",
            "expression": "先把意思表达清楚，再检查是否有一个可以重复改进的表达模式。",
        }[family]
        if intent == "transfer":
            return f"保持你已经表现稳定的“{category}”，同时把它迁移到一个新的写作情境。"
        if intent == "reinforce":
            return f"继续巩固“{category}”：{base}"
        return f"本次只优先关注“{category}”：{base}"

    base = {
        "grammar": "Pay special attention to sentence structure and the grammar pattern you have recently repeated, without making every sentence unnaturally short.",
        "vocabulary": "Choose precise, natural words and collocations you would realistically use; do not force advanced vocabulary.",
        "coherence": "State one clear main idea, then support it with logically connected reasons, details, or an example.",
        "task_achievement": "Answer every relevant part of the task and develop the main point with at least one concrete detail.",
        "naturalness": "Prefer natural, direct phrasing over translated or unnecessarily formal sentences.",
        "expression": "Express the real idea first, then notice one reusable pattern you can improve.",
    }[family]
    if intent == "transfer":
        return f"Keep your existing strength in {category} while transferring it to a new writing context."
    if intent == "reinforce":
        return f"Reinforce {category}: {base}"
    return f"Prioritize {category} in this piece: {base}"


def build_practice_recommendation(
    *,
    language: str,
    profile: dict[str, Any] | None,
    memory: dict[str, Any] | None,
    target_level: str = "",
    outcomes: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    profile = profile or {}
    memory = memory or {}

    goal = str(profile.get("goal") or "everyday")
    style = str(profile.get("style") or "guided")
    focus = memory.get("focus") if isinstance(memory.get("focus"), dict) else None
    strengths = memory.get("strengths") if isinstance(memory.get("strengths"), list) else []
    strength = strengths[0] if strengths and isinstance(strengths[0], dict) else None

    if focus:
        category_raw = str(focus.get("category") or "expression")
        family = _focus_family(category_raw)
        category = _focus_label(language, category_raw, family)
        status = str(focus.get("status") or "watch")
        intent = "reinforce" if status == "improving" else "repair"
        evidence = str(focus.get("example") or "")
        if language == "zh":
            status_copy = {
                "improving": "\u6539\u5584\u4e2d",
                "watch": "\u5f85\u89c2\u5bdf",
                "recurring": "\u53cd\u590d\u51fa\u73b0",
                "new": "\u65b0\u51fa\u73b0",
                "resolved": "\u5df2\u89e3\u51b3",
                "active": "\u5f53\u524d\u6d3b\u8dc3",
                "historical": "\u5386\u53f2\u8bc1\u636e",
            }.get(status, "\u9700\u8981\u5173\u6ce8")
            reason = (
                f"这个模式目前是“{status_copy}”。Orena 根据重复写作证据把它作为下一次练习重点，"
                "而不是同时追踪所有小错误。"
            )
        else:
            reason = (
                f"This pattern is currently {status}. Orena selected it from repeated writing evidence "
                "instead of asking you to chase every small issue at once."
            )
    elif strength:
        category_raw = str(strength.get("category") or "expression")
        family = _focus_family(category_raw)
        category = _focus_label(language, category_raw, family)
        intent = "transfer"
        evidence = str(strength.get("example") or "")
        stage = str(strength.get("stage") or "Developing")
        if language == "zh":
            reason = (
                f"“{category}”已经达到 {stage}。下一步不是继续刷分，而是把这个优点迁移到新的表达情境。"
            )
        else:
            reason = (
                f"{category} is currently {stage}. The next useful step is to transfer that strength "
                "into a different writing context rather than simply collecting another score."
            )
    else:
        category_raw = "expression"
        category = "Clear Expression" if language != "zh" else "清楚表达"
        family = "expression"
        intent = "baseline"
        evidence = ""
        reason = (
            "Orena 还没有足够的重复证据。先完成一篇短写作，建立可以比较的基线。"
            if language == "zh"
            else "Orena does not have enough repeated evidence yet. A short real writing sample will create the next useful baseline."
        )

    task_type = _task_type(language, goal, family)
    topic = _topic(goal, family)
    target = target_level or ("HSK4" if language == "zh" else "B2")
    word_target = _word_target(language, target, style)
    difficulty = _difficulty_decision(
        language=language,
        base_word_target=word_target,
        outcomes=outcomes if outcomes is not None else memory.get("practice_outcomes", []),
        revision_wins=memory.get("revision_wins", []),
    )
    word_target = difficulty["word_target"]
    focus_instruction = _focus_instruction(language, family, category, intent)

    if language == "zh":
        action_label = {
            "repair": "练习这个重点",
            "reinforce": "继续巩固",
            "transfer": "把优点迁移到新情境",
            "baseline": "开始一次基线写作",
        }[intent]
    else:
        action_label = {
            "repair": "Practice this focus",
            "reinforce": "Reinforce this pattern",
            "transfer": "Transfer this strength",
            "baseline": "Create a baseline",
        }[intent]

    return {
        "language": language,
        "intent": intent,
        "focus_category": category_raw,
        "focus_label": category,
        "focus_family": family,
        "focus_status": str(focus.get("status") or "") if focus else "",
        "evidence": evidence,
        "goal": goal,
        "guidance_style": style,
        "task_type": task_type,
        "topic": topic,
        "target_level": target,
        "word_target": word_target,
        "difficulty": difficulty,
        "reason": reason,
        "focus_instruction": focus_instruction,
        "action_label": action_label,
    }


def personalize_generated_task(
    task: dict[str, Any],
    recommendation: dict[str, Any],
) -> dict[str, Any]:
    result = dict(task)
    checklist = [
        str(item).strip()
        for item in result.get("checklist", [])
        if str(item).strip()
    ]
    focus_instruction = str(recommendation.get("focus_instruction") or "").strip()

    if focus_instruction:
        checklist = [focus_instruction, *[item for item in checklist if item != focus_instruction]]

    result["checklist"] = checklist[:5]
    result["personalization"] = dict(recommendation)
    return result
