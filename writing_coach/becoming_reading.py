from __future__ import annotations

import json
import re
import sqlite3
from datetime import datetime
from typing import Any, Callable

from pydantic import BaseModel, Field


_db_factory: Callable[[], sqlite3.Connection] | None = None
_ai_generate: Callable[..., Any] | None = None


class ReadingGenerateIn(BaseModel):
    topic: str = Field(
        default="random",
        pattern=r"^(random|daily_life|work|science|culture|community)$",
    )
    target_level: str = Field(default="", max_length=12)
    recycle_library: bool = True


class ReadingAnswerIn(BaseModel):
    answers: list[int] = Field(min_length=1, max_length=8)


def configure_becoming_reading(
    db_factory: Callable[[], sqlite3.Connection],
    ai_generate: Callable[..., Any],
) -> None:
    global _db_factory, _ai_generate
    _db_factory = db_factory
    _ai_generate = ai_generate


def _db() -> sqlite3.Connection:
    if _db_factory is None:
        raise RuntimeError("BECOMING reading database factory is not installed")
    return _db_factory()


def _now() -> str:
    return datetime.now().astimezone().isoformat(timespec="seconds")


def _safe_json(value: Any, fallback: Any) -> Any:
    try:
        parsed = json.loads(value or "")
    except Exception:
        return fallback
    return parsed


def ensure_becoming_reading_schema(conn: sqlite3.Connection) -> None:
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS reading_sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            created_at TEXT NOT NULL,
            language_code TEXT NOT NULL,
            target_level TEXT NOT NULL,
            topic TEXT NOT NULL,
            learner_goal TEXT NOT NULL DEFAULT '',
            title TEXT NOT NULL,
            passage TEXT NOT NULL,
            questions_json TEXT NOT NULL,
            recycled_words_json TEXT NOT NULL DEFAULT '[]',
            generation_mode TEXT NOT NULL DEFAULT 'practice'
        )
        """
    )
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS reading_attempts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id INTEGER NOT NULL,
            created_at TEXT NOT NULL,
            answers_json TEXT NOT NULL,
            correct_count INTEGER NOT NULL,
            total INTEGER NOT NULL,
            FOREIGN KEY(session_id) REFERENCES reading_sessions(id)
        )
        """
    )
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_reading_sessions_created "
        "ON reading_sessions(created_at DESC)"
    )
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_reading_attempts_session "
        "ON reading_attempts(session_id, id DESC)"
    )
    conn.commit()


def _reading_length(language: str, level: str) -> tuple[int, str]:
    if language == "zh":
        target = {
            "HSK1": 120,
            "HSK2": 160,
            "HSK3": 220,
            "HSK4": 300,
            "HSK5": 420,
            "HSK6": 520,
            "HSK7-9": 650,
        }.get(level, 300)
        return target, "Chinese characters"

    target = {
        "A1": 140,
        "A2": 180,
        "B1": 240,
        "B2": 320,
        "C1": 420,
        "C2": 500,
    }.get(level, 320)
    return target, "words"


def _select_library_terms(conn: sqlite3.Connection, limit: int = 3) -> list[str]:
    try:
        rows = conn.execute(
            """
            SELECT s.word
            FROM saved_words s
            LEFT JOIN vocabulary_learning v
              ON lower(v.word) = lower(s.word)
            ORDER BY
              CASE
                WHEN v.next_review_at IS NULL OR v.next_review_at = '' THEN 0
                WHEN v.next_review_at <= ? THEN 0
                ELSE 1
              END,
              COALESCE(v.review_stage, 0) ASC,
              s.added_at DESC
            LIMIT ?
            """,
            (_now(), limit * 3),
        ).fetchall()
    except sqlite3.Error:
        return []

    output: list[str] = []
    for row in rows:
        term = " ".join(str(row["word"] or "").split())
        if not term or len(term) > 80:
            continue
        if term.casefold() in {item.casefold() for item in output}:
            continue
        output.append(term)
        if len(output) >= limit:
            break
    return output


def _term_occurs(passage: str, term: str) -> bool:
    source = str(passage or "")
    value = str(term or "").strip()
    if not value:
        return False

    # Han text does not use whitespace word boundaries reliably.
    if re.search(r"[\u3400-\u4DBF\u4E00-\u9FFF]", value):
        return value in source

    # For Latin terms, avoid claiming "art" was recycled from "start".
    pattern = rf"(?<![A-Za-z0-9]){re.escape(value)}(?![A-Za-z0-9])"
    return re.search(pattern, source, flags=re.IGNORECASE) is not None


def _topic_instruction(topic: str, goal: str, language: str) -> str:
    topic_map_en = {
        "daily_life": "everyday life and practical decisions",
        "work": "workplace communication or a realistic professional situation",
        "science": "an accessible science or technology idea",
        "culture": "culture, habits, media, or social customs",
        "community": "community life, public spaces, or local change",
        "random": "a concrete everyday, cultural, work, or science topic",
    }
    topic_map_zh = {
        "daily_life": "日常生活中的实际选择",
        "work": "真实的工作或职场沟通情境",
        "science": "适合学习者理解的科技或科学主题",
        "culture": "文化、生活习惯、媒体或社会习俗",
        "community": "社区生活、公共空间或城市变化",
        "random": "具体的日常、文化、工作或科技主题",
    }
    base = (topic_map_zh if language == "zh" else topic_map_en).get(
        topic, topic_map_en["random"]
    )
    if language == "zh":
        if goal == "exam":
            return f"{base}。结构可以有考试阅读的清晰信息层次，但不要声称这是官方 HSK 材料。"
        if goal == "work":
            return f"{base}。优先包含真实工作语境。"
        return base

    if goal == "exam":
        return (
            f"{base}. Use clear exam-style information structure, but do not claim "
            "the passage is official TOEIC, IELTS, or any other official exam material."
        )
    if goal == "work":
        return f"{base}. Prefer a realistic professional context."
    return base


def _schema(language: str) -> dict[str, Any]:
    return {
        "type": "object",
        "properties": {
            "title": {"type": "string"},
            "passage": {"type": "string"},
            "questions": {
                "type": "array",
                "minItems": 4,
                "maxItems": 4,
                "items": {
                    "type": "object",
                    "properties": {
                        "question": {"type": "string"},
                        "options": {
                            "type": "array",
                            "minItems": 4,
                            "maxItems": 4,
                            "items": {"type": "string"},
                        },
                        "correct_index": {
                            "type": "integer",
                            "minimum": 0,
                            "maximum": 3,
                        },
                        "explanation_vi": {"type": "string"},
                        "evidence_fragment": {"type": "string"},
                    },
                    "required": [
                        "question",
                        "options",
                        "correct_index",
                        "explanation_vi",
                        "evidence_fragment",
                    ],
                },
            },
        },
        "required": ["title", "passage", "questions"],
    }


def _validate_generated(raw: dict[str, Any]) -> dict[str, Any] | None:
    title = str(raw.get("title") or "").strip()[:240]
    passage = str(raw.get("passage") or "").strip()
    questions_raw = raw.get("questions")

    if not title or len(passage) < 120 or not isinstance(questions_raw, list):
        return None

    questions: list[dict[str, Any]] = []
    for idx, item in enumerate(questions_raw[:4]):
        if not isinstance(item, dict):
            return None

        question = str(item.get("question") or "").strip()[:1200]
        options = [
            str(value).strip()[:800]
            for value in (item.get("options") or [])[:4]
        ]
        try:
            correct_index = int(item.get("correct_index"))
        except (TypeError, ValueError):
            return None

        explanation = str(item.get("explanation_vi") or "").strip()[:1800]
        evidence = str(item.get("evidence_fragment") or "").strip()[:1200]

        if (
            not question
            or len(options) != 4
            or any(not value for value in options)
            or len({value.casefold() for value in options}) != 4
            or correct_index not in range(4)
            or not explanation
            or not evidence
            or evidence not in passage
        ):
            return None

        questions.append(
            {
                "id": idx + 1,
                "question": question,
                "options": options,
                "correct_index": correct_index,
                "explanation_vi": explanation,
                "evidence_fragment": evidence,
            }
        )

    if len(questions) != 4:
        return None

    return {
        "title": title,
        "passage": passage,
        "questions": questions,
    }


def _fallback(language: str, level: str, topic: str) -> dict[str, Any]:
    if language == "zh":
        passage = (
            "周末的时候，小林常常去家附近的一家小咖啡店学习。过去，他一到店里就开始看手机，"
            "结果一个小时以后还没有完成作业。最近，他改变了习惯。他先把手机放进包里，然后写下"
            "今天最重要的两个任务。完成第一个任务以后，他才休息十分钟。小林发现，这个方法并没有"
            "让学习变得更轻松，但是让他更清楚自己为什么来这里。现在，他通常可以在回家以前完成"
            "大部分计划，也有时间和朋友聊天。"
        )
        return {
            "title": "小林的新学习习惯",
            "passage": passage,
            "questions": [
                {
                    "id": 1,
                    "question": "小林以前到咖啡店以后常常先做什么？",
                    "options": ["写两个任务", "看手机", "和朋友聊天", "马上回家"],
                    "correct_index": 1,
                    "explanation_vi": "Đoạn văn nói trước đây Tiểu Lâm thường bắt đầu bằng việc xem điện thoại.",
                    "evidence_fragment": "过去，他一到店里就开始看手机",
                },
                {
                    "id": 2,
                    "question": "小林现在先把什么放进包里？",
                    "options": ["作业", "咖啡", "手机", "笔记本"],
                    "correct_index": 2,
                    "explanation_vi": "Thói quen mới bắt đầu bằng việc cất điện thoại vào túi.",
                    "evidence_fragment": "他先把手机放进包里",
                },
                {
                    "id": 3,
                    "question": "完成第一个任务以后，他做什么？",
                    "options": ["休息十分钟", "回家", "再看一个小时手机", "去买新手机"],
                    "correct_index": 0,
                    "explanation_vi": "Sau nhiệm vụ đầu tiên, cậu ấy nghỉ mười phút.",
                    "evidence_fragment": "完成第一个任务以后，他才休息十分钟",
                },
                {
                    "id": 4,
                    "question": "这个新方法主要帮助小林什么？",
                    "options": ["完全不需要休息", "学习变得非常容易", "更清楚自己的学习目的", "不再和朋友聊天"],
                    "correct_index": 2,
                    "explanation_vi": "Điểm chính là phương pháp giúp cậu ấy rõ hơn về mục đích đến học.",
                    "evidence_fragment": "让他更清楚自己为什么来这里",
                },
            ],
        }

    passage = (
        "Maya used to begin every study session by opening several tabs at once. "
        "She checked messages, searched for background information, and changed music "
        "before she had decided what she actually needed to finish. The routine felt busy, "
        "but it often delayed the real work. Last month, she tried a simpler approach. "
        "Before opening her laptop, she wrote one clear task on a small card. She then worked "
        "on that task for twenty-five minutes without changing activities. The new routine "
        "did not make difficult work easy, but it made distraction easier to notice. "
        "By the end of the week, Maya was finishing more of the work she had planned and "
        "spending less time wondering where the evening had gone."
    )
    return {
        "title": "One Task Before Many Tabs",
        "passage": passage,
        "questions": [
            {
                "id": 1,
                "question": "What did Maya often do before deciding what to finish?",
                "options": [
                    "She closed her laptop.",
                    "She opened several tabs and checked different things.",
                    "She wrote a full weekly plan.",
                    "She studied for twenty-five minutes.",
                ],
                "correct_index": 1,
                "explanation_vi": "Đoạn đầu mô tả Maya mở nhiều tab, kiểm tra tin nhắn và đổi nhạc trước khi xác định việc chính.",
                "evidence_fragment": "She checked messages, searched for background information, and changed music before she had decided what she actually needed to finish.",
            },
            {
                "id": 2,
                "question": "What was the first step in Maya's new routine?",
                "options": [
                    "Writing one clear task on a card.",
                    "Changing the music.",
                    "Searching for more background information.",
                    "Answering every message.",
                ],
                "correct_index": 0,
                "explanation_vi": "Thói quen mới bắt đầu bằng việc viết ra một nhiệm vụ rõ ràng.",
                "evidence_fragment": "Before opening her laptop, she wrote one clear task on a small card.",
            },
            {
                "id": 3,
                "question": "What did the new routine make easier?",
                "options": [
                    "All difficult work.",
                    "Finding new music.",
                    "Noticing distraction.",
                    "Using more browser tabs.",
                ],
                "correct_index": 2,
                "explanation_vi": "Bài đọc không nói công việc trở nên dễ; nó nói sự xao nhãng dễ nhận ra hơn.",
                "evidence_fragment": "The new routine did not make difficult work easy, but it made distraction easier to notice.",
            },
            {
                "id": 4,
                "question": "What changed by the end of the week?",
                "options": [
                    "Maya stopped using a laptop.",
                    "Maya finished more planned work.",
                    "Maya studied only in the morning.",
                    "Maya stopped making plans.",
                ],
                "correct_index": 1,
                "explanation_vi": "Kết quả được nêu trực tiếp ở câu cuối.",
                "evidence_fragment": "Maya was finishing more of the work she had planned",
            },
        ],
    }


def _public_question(item: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": item["id"],
        "question": item["question"],
        "options": list(item["options"]),
    }


def _session_payload(row: sqlite3.Row, include_answers: bool = False) -> dict[str, Any]:
    questions = _safe_json(row["questions_json"], [])
    public_questions = (
        questions
        if include_answers
        else [_public_question(item) for item in questions]
    )
    return {
        "id": int(row["id"]),
        "created_at": str(row["created_at"]),
        "language_code": str(row["language_code"]),
        "target_level": str(row["target_level"]),
        "topic": str(row["topic"]),
        "learner_goal": str(row["learner_goal"] or ""),
        "title": str(row["title"]),
        "passage": str(row["passage"]),
        "questions": public_questions,
        "recycled_words": _safe_json(row["recycled_words_json"], []),
        "generation_mode": str(row["generation_mode"] or "practice"),
    }


def create_reading_session(
    payload: ReadingGenerateIn,
    *,
    language_code: str,
    target_level: str,
    learner_profile: dict[str, Any] | None = None,
) -> dict[str, Any]:
    learner_profile = learner_profile or {}
    goal = str(learner_profile.get("goal") or "everyday")
    length, unit = _reading_length(language_code, target_level)

    with _db() as conn:
        ensure_becoming_reading_schema(conn)
        library_terms = (
            _select_library_terms(conn, 3)
            if payload.recycle_library
            else []
        )

    recycled_instruction = ""
    if library_terms:
        if language_code == "zh":
            recycled_instruction = (
                "如果自然，请在文章中使用这些学习者已经保存的词语："
                + "、".join(library_terms)
                + "。不要为了强行使用词语而破坏自然表达。"
            )
        else:
            recycled_instruction = (
                "When natural, reuse these learner-saved words or phrases in the passage: "
                + "; ".join(library_terms)
                + ". Do not force them into unnatural sentences."
            )

    if language_code == "zh":
        system = (
            "你为越南学习者生成中文阅读练习。文章必须自然、清楚，并符合给定 HSK 学习水平。"
            "生成四道单选题。每道题必须能从文章中的一段精确文字找到证据。"
            "evidence_fragment 必须逐字出现在 passage 中。explanation_vi 用简洁越南语解释答案。"
            "不要声称材料来自官方 HSK。"
        )
        user = (
            f"目标水平：{target_level}\n"
            f"长度：大约 {length} 个汉字\n"
            f"主题：{_topic_instruction(payload.topic, goal, language_code)}\n"
            f"{recycled_instruction}\n"
            "生成一篇完整阅读文章和四道理解题。题目应测试主旨、细节、推断或词义中的不同能力，"
            "但答案必须能由文章支持。"
        )
    else:
        system = (
            "You create compact English reading practice for a Vietnamese language learner. "
            "Write a natural passage appropriate for the requested CEFR target. "
            "Create exactly four multiple-choice comprehension questions. "
            "Every question must have a verbatim evidence_fragment that occurs in the passage. "
            "Use concise Vietnamese in explanation_vi. "
            "Do not claim the material is official TOEIC, IELTS, Cambridge, or any other official exam content."
        )
        user = (
            f"Target level: {target_level}\n"
            f"Length: about {length} {unit}\n"
            f"Topic: {_topic_instruction(payload.topic, goal, language_code)}\n"
            f"{recycled_instruction}\n"
            "Generate one complete passage and four comprehension questions. "
            "Vary the questions across main idea, detail, inference, or meaning-in-context, "
            "while keeping every answer grounded in the passage."
        )

    generated: dict[str, Any] | None = None
    generation_mode = "built-in"

    if _ai_generate is not None:
        try:
            result = _ai_generate(
                messages=[
                    {"role": "system", "content": system},
                    {"role": "user", "content": user},
                ],
                schema=_schema(language_code),
                max_output_tokens=2200,
                temperature=0.35,
            )
            data = getattr(result, "data", result)
            if isinstance(data, dict):
                generated = _validate_generated(data)
                if generated:
                    generation_mode = "generated"
        except Exception:
            generated = None

    if generated is None:
        generated = _fallback(language_code, target_level, payload.topic)

    passage = generated["passage"]
    actual_recycled = [
        term
        for term in library_terms
        if _term_occurs(passage, term)
    ]

    now = _now()
    with _db() as conn:
        ensure_becoming_reading_schema(conn)
        cur = conn.execute(
            """
            INSERT INTO reading_sessions(
                created_at, language_code, target_level, topic, learner_goal,
                title, passage, questions_json, recycled_words_json, generation_mode
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                now,
                language_code,
                target_level,
                payload.topic,
                goal,
                generated["title"],
                passage,
                json.dumps(generated["questions"], ensure_ascii=False),
                json.dumps(actual_recycled, ensure_ascii=False),
                generation_mode,
            ),
        )
        session_id = int(cur.lastrowid)
        conn.commit()
        row = conn.execute(
            "SELECT * FROM reading_sessions WHERE id = ?",
            (session_id,),
        ).fetchone()

    return _session_payload(row)


def get_reading_session(session_id: int) -> dict[str, Any]:
    with _db() as conn:
        ensure_becoming_reading_schema(conn)
        row = conn.execute(
            "SELECT * FROM reading_sessions WHERE id = ?",
            (session_id,),
        ).fetchone()
        if not row:
            return {"found": False, "session": None}

        attempt = conn.execute(
            """
            SELECT correct_count, total, created_at
            FROM reading_attempts
            WHERE session_id = ?
            ORDER BY id DESC
            LIMIT 1
            """,
            (session_id,),
        ).fetchone()

    payload = _session_payload(row)
    if attempt:
        payload["latest_attempt"] = {
            "correct_count": int(attempt["correct_count"]),
            "total": int(attempt["total"]),
            "created_at": str(attempt["created_at"]),
        }
    return {"found": True, "session": payload}


def list_reading_sessions(limit: int = 8) -> dict[str, Any]:
    limit = min(max(int(limit or 8), 1), 30)
    with _db() as conn:
        ensure_becoming_reading_schema(conn)
        rows = conn.execute(
            """
            SELECT
              s.*,
              (
                SELECT correct_count
                FROM reading_attempts a
                WHERE a.session_id = s.id
                ORDER BY a.id DESC
                LIMIT 1
              ) AS last_correct,
              (
                SELECT total
                FROM reading_attempts a
                WHERE a.session_id = s.id
                ORDER BY a.id DESC
                LIMIT 1
              ) AS last_total
            FROM reading_sessions s
            ORDER BY s.id DESC
            LIMIT ?
            """,
            (limit,),
        ).fetchall()

    items = []
    for row in rows:
        item = {
            "id": int(row["id"]),
            "created_at": str(row["created_at"]),
            "target_level": str(row["target_level"]),
            "topic": str(row["topic"]),
            "title": str(row["title"]),
            "recycled_words": _safe_json(row["recycled_words_json"], []),
            "generation_mode": str(row["generation_mode"]),
            "latest_attempt": None,
        }
        if row["last_total"] is not None:
            item["latest_attempt"] = {
                "correct_count": int(row["last_correct"]),
                "total": int(row["last_total"]),
            }
        items.append(item)

    return {"items": items}


def submit_reading_answers(
    session_id: int,
    payload: ReadingAnswerIn,
) -> dict[str, Any]:
    with _db() as conn:
        ensure_becoming_reading_schema(conn)
        row = conn.execute(
            "SELECT * FROM reading_sessions WHERE id = ?",
            (session_id,),
        ).fetchone()
        if not row:
            return {"found": False}

        questions = _safe_json(row["questions_json"], [])
        if len(payload.answers) != len(questions):
            return {
                "found": True,
                "valid": False,
                "message": f"Expected {len(questions)} answers.",
            }
        if any(int(value) not in range(4) for value in payload.answers):
            return {
                "found": True,
                "valid": False,
                "message": "Each reading answer must be an option index from 0 to 3.",
            }

        results = []
        correct_count = 0
        for index, question in enumerate(questions):
            selected = int(payload.answers[index])
            correct_index = int(question["correct_index"])
            correct = selected == correct_index
            if correct:
                correct_count += 1
            results.append(
                {
                    "id": int(question["id"]),
                    "question": str(question["question"]),
                    "options": list(question["options"]),
                    "selected_index": selected,
                    "correct_index": correct_index,
                    "correct": correct,
                    "explanation_vi": str(question["explanation_vi"]),
                    "evidence_fragment": str(question["evidence_fragment"]),
                }
            )

        now = _now()
        conn.execute(
            """
            INSERT INTO reading_attempts(
                session_id, created_at, answers_json, correct_count, total
            )
            VALUES (?, ?, ?, ?, ?)
            """,
            (
                session_id,
                now,
                json.dumps(payload.answers),
                correct_count,
                len(questions),
            ),
        )
        conn.commit()

    return {
        "found": True,
        "valid": True,
        "session_id": session_id,
        "correct_count": correct_count,
        "total": len(questions),
        "accuracy": round(correct_count / len(questions), 3) if questions else 0.0,
        "results": results,
        "claim": "comprehension_check_only",
    }
