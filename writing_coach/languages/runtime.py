from __future__ import annotations

import re

from writing_coach.core.request_context import current_language_code
from writing_coach.languages.chinese.grammar_course import (
    GRAMMAR_BY_ID as CHINESE_GRAMMAR_BY_ID,
    GRAMMAR_COURSE as CHINESE_GRAMMAR_COURSE,
)
from writing_coach.languages.chinese.profile import (
    ERROR_CATEGORIES as CHINESE_ERROR_CATEGORIES,
    PROFILE as CHINESE_PROFILE,
    RUBRIC_WEIGHTS as CHINESE_RUBRIC_WEIGHTS,
    SYSTEM_PROMPT as CHINESE_SYSTEM_PROMPT,
    score_to_level as chinese_score_to_level,
)
from writing_coach.languages.english.grammar_course import (
    GRAMMAR_BY_ID as ENGLISH_GRAMMAR_BY_ID,
    GRAMMAR_COURSE as ENGLISH_GRAMMAR_COURSE,
)
from writing_coach.languages.english.profile import (
    ERROR_CATEGORIES as ENGLISH_ERROR_CATEGORIES,
    PROFILE as ENGLISH_PROFILE,
    RUBRIC_WEIGHTS as ENGLISH_RUBRIC_WEIGHTS,
    SYSTEM_PROMPT as ENGLISH_SYSTEM_PROMPT,
    score_to_level as english_score_to_level,
)


def active_language_code() -> str:
    return "zh" if current_language_code() == "zh" else "en"


def is_chinese() -> bool:
    return active_language_code() == "zh"


def active_profile():
    return CHINESE_PROFILE if is_chinese() else ENGLISH_PROFILE


def active_levels() -> tuple[str, ...]:
    return active_profile().levels


def active_rubric_weights() -> dict[str, float]:
    return CHINESE_RUBRIC_WEIGHTS if is_chinese() else ENGLISH_RUBRIC_WEIGHTS


def active_error_categories() -> tuple[str, ...]:
    return CHINESE_ERROR_CATEGORIES if is_chinese() else ENGLISH_ERROR_CATEGORIES


def active_system_prompt() -> str:
    return CHINESE_SYSTEM_PROMPT if is_chinese() else ENGLISH_SYSTEM_PROMPT


def active_score_to_level(score: float) -> str:
    return chinese_score_to_level(score) if is_chinese() else english_score_to_level(score)


def validate_target_level(level: str) -> str:
    value = (level or "").strip().upper()
    levels = active_levels()
    for candidate in levels:
        if candidate.upper() == value:
            return candidate
    return levels[min(3, len(levels) - 1)]


def writing_unit_count(text: str) -> int:
    if is_chinese():
        han = re.findall(r"[\u3400-\u4DBF\u4E00-\u9FFF]", text or "")
        # A Latin writing unit needs an alphabetic component; numeric-only
        # sequences are not Chinese writing units.
        latin = re.findall(r"[A-Za-z]+(?:['-][A-Za-z0-9]+)*", text or "")
        return len(han) + len(latin)
    return len(re.findall(r"\b[\w'-]+\b", text or ""))


def writing_unit_label() -> str:
    return "characters" if is_chinese() else "words"


def active_grammar_course() -> list[dict]:
    return CHINESE_GRAMMAR_COURSE if is_chinese() else ENGLISH_GRAMMAR_COURSE


def active_grammar_by_id() -> dict[str, dict]:
    return CHINESE_GRAMMAR_BY_ID if is_chinese() else ENGLISH_GRAMMAR_BY_ID


def grammar_level_names() -> dict[str, str]:
    if is_chinese():
        return {
            "HSK1": "Foundation",
            "HSK2": "Basic",
            "HSK3": "Lower-intermediate",
            "HSK4": "Intermediate",
            "HSK5": "Upper-intermediate",
            "HSK6": "Advanced",
            "HSK7-9": "Advanced mastery",
        }
    return {
        "A1": "Foundation",
        "A2": "Core",
        "B1": "Intermediate",
        "B2": "Upper-intermediate",
        "C1": "Advanced",
        "C2": "Mastery",
    }


def grammar_lesson_prompts(lesson: dict) -> tuple[str, str]:
    language = "Chinese" if is_chinese() else "English"
    scope = "\n".join(f"- {item}" for item in lesson.get("scope", []))
    contrasts = "\n".join(f"- {item}" for item in lesson.get("contrasts", [])) or "- none specified"
    restrictions = "\n".join(f"- {item}" for item in lesson.get("restrictions", [])) or "- none specified"
    traps = "\n".join(f"- {item}" for item in lesson.get("common_traps", [])) or "- none specified"
    prerequisites = ", ".join(lesson.get("prerequisites", [])) or "none"
    blueprint = lesson.get("practice_blueprint", {})

    if is_chinese():
        system = (
            "You create substantial original Chinese grammar lessons for Vietnamese learners. "
            "The supplied Orena syllabus scope is authoritative. Do not introduce grammar from a later band. "
            "Explain in Vietnamese. Chinese examples use natural Simplified Chinese, accurate tone-mark pinyin, "
            "and Vietnamese meaning. Explain form, function, word order, scope, contrasts, restrictions and register. "
            "Do not copy HSK books, commercial textbooks, websites, or official test items. "
            "Do not claim Orena lesson boundaries are official HSK mappings."
        )
    else:
        system = (
            "You create substantial original English grammar lessons for Vietnamese learners. "
            "The supplied Orena syllabus scope is authoritative. Do not introduce grammar from a later CEFR band. "
            "Explain in Vietnamese while English examples remain in English. Explain form, meaning, use, contrasts, "
            "restrictions, exceptions and register. Do not copy Destination, commercial textbooks, websites or tests. "
            "Do not claim Orena lesson boundaries are official CEFR mappings."
        )

    user = (
        f"LANGUAGE: {language}\n"
        f"LEVEL: {lesson['level']}\n"
        f"ITEM KIND: {lesson.get('kind','lesson')}\n"
        f"MODULE: {lesson.get('module','')}\n"
        f"TOPIC: {lesson['title']}\n"
        f"OBJECTIVE: {lesson['objective_vi']}\n"
        f"PREREQUISITES: {prerequisites}\n\n"
        f"LOCKED SYLLABUS SCOPE:\n{scope}\n\n"
        f"CONTRAST TARGETS:\n{contrasts}\n\n"
        f"RESTRICTIONS:\n{restrictions}\n\n"
        f"VIETNAMESE-LEARNER TRAPS:\n{traps}\n\n"
        f"PRACTICE BLUEPRINT: {blueprint}\n\n"
        "Build a complete teaching unit, not a short note. Include reusable rules, meaningful contrasts, "
        "real restrictions/exceptions, varied original examples, common mistakes, graded guided practice "
        "(recognition -> controlled -> contrast -> correction/transformation), and an original production task. "
        "Every answer explanation must teach why the answer works. Stay inside the locked scope."
    )
    return system, user

ENGLISH_TASK_GUIDANCE = {
    "opinion": "an opinion essay that requires a clear position, reasons and at least one concrete example",
    "email": "a realistic email with a clear recipient, purpose and 2-3 points the learner must address",
    "review": "a review of a realistic product, service, place, event, podcast, film or experience with positives, negatives and a recommendation",
    "story": "a short story with a clear situation, development and ending; give a natural opening situation but do not write the story for the learner",
    "toeic": "a TOEIC-style practical writing task, preferably an email response or short opinion response with explicit points to address",
}

CHINESE_TASK_GUIDANCE = {
    "opinion": "一篇适合目标HSK学习水平的短观点作文，需要明确观点、理由和至少一个具体例子",
    "email": "一封自然、实用的中文邮件或消息，需要说明对象、目的和2-3个必须回应的要点",
    "review": "一项看图、描述人物/地点/经历或评价日常事物的写作任务",
    "story": "一个简短中文故事任务，要有清楚的情境、发展和结尾，不要替学习者写答案",
    "hsk": "一个HSK风格的中文写作练习，重点练习句子组织、看图/给词写句子或短文表达；不是官方真题",
}


def task_guidance(task_type: str) -> str:
    if is_chinese():
        return CHINESE_TASK_GUIDANCE.get(task_type, CHINESE_TASK_GUIDANCE["opinion"])
    return ENGLISH_TASK_GUIDANCE.get(task_type, ENGLISH_TASK_GUIDANCE["opinion"])


def task_system_prompt() -> str:
    if is_chinese():
        return (
            "你为越南中文学习者创建中文写作练习。"
            "只创建一个任务。任务本身必须用清楚、自然的简体中文书写。"
            "不要给答案、范文或会直接解决任务的提示。"
            "任务要符合目标HSK学习水平，并避免冷门专业知识。"
            "若是HSK风格任务，要明确说明它只是练习，不声称是官方真题。"
            "Return only the requested structured JSON."
        )
    return (
        "You create English writing practice tasks for language learners.\n"
        "Create exactly ONE task.\n"
        "The task itself must be written in clear English.\n"
        "Do not provide an answer, sample response, outline, vocabulary list, or hints that solve the task.\n"
        "Make the task realistic, specific enough to write about, and appropriate for the requested CEFR level.\n"
        "Avoid obscure specialist knowledge. The learner should be able to answer from everyday knowledge or imagination.\n"
        "Return only the requested structured JSON."
    )


def task_user_prompt(level: str, guidance: str, topic_instruction: str, target_length: int) -> str:
    if is_chinese():
        return (
            f"学习水平: {level}\n"
            f"任务形式: {guidance}\n"
            f"{topic_instruction}\n"
            f"建议长度: 大约 {target_length} 个汉字/书写单位。\n"
            "创建一个简短标题、一段完整任务说明，以及2-5个学习者必须包含的要点。"
        )
    return (
        f"CEFR level: {level}\n"
        f"Task format: {guidance}\n"
        f"{topic_instruction}\n"
        f"Target response length: about {target_length} words.\n"
        "Create a short title, one self-contained instruction, and a checklist of 2-5 things the learner must include."
    )


def topic_instruction(topic: str) -> str:
    if is_chinese():
        if topic.casefold() == "random":
            return "请自己选择一个具体、常见、适合日常表达的新主题。"
        labels = {
            "daily life": "日常生活",
            "work": "工作",
            "technology": "科技",
            "education": "教育",
            "travel": "旅行",
            "environment": "环境",
            "culture and media": "文化与媒体",
            "shopping and services": "购物与服务",
            "communication": "沟通",
            "community": "社区",
        }
        return f"主题: {labels.get(topic, topic)}。"
    return (
        "Choose a fresh, concrete everyday topic yourself."
        if topic.casefold() == "random"
        else f"Use this topic: {topic}."
    )


def progress_bands() -> list[tuple[float, str]]:
    if is_chinese():
        return [
            (25, "HSK2"),
            (40, "HSK3"),
            (55, "HSK4"),
            (68, "HSK5"),
            (80, "HSK6"),
            (90, "HSK7-9"),
        ]
    return [
        (30, "A2"),
        (45, "B1"),
        (60, "B2"),
        (75, "C1"),
        (90, "C2"),
    ]
