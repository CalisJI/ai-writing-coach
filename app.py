import json
import random
import os
import re
import sqlite3
import statistics
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any

import requests
from fastapi import FastAPI, HTTPException
from fastapi.responses import HTMLResponse
from pydantic import BaseModel, Field

ROOT = Path(__file__).resolve().parent
DB_PATH = Path(os.getenv("WRITING_DB", ROOT / "data" / "writing.db"))
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://127.0.0.1:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "qwen3:8b")
REQUEST_TIMEOUT = int(os.getenv("OLLAMA_TIMEOUT", "180"))
ALLOW_FALLBACK = os.getenv("ALLOW_FALLBACK", "false").lower() in {"1", "true", "yes", "on"}
APP_VERSION = os.getenv(
    "APP_VERSION",
    (ROOT / "VERSION").read_text(encoding="utf-8").strip()
    if (ROOT / "VERSION").exists()
    else "dev",
)
SCHEMA_VERSION = 2

app = FastAPI(title="AI Writing Coach", version=APP_VERSION)

RUBRIC_WEIGHTS = {
    "grammar": 0.25,
    "vocabulary": 0.20,
    "coherence": 0.20,
    "task_achievement": 0.20,
    "naturalness": 0.15,
}

SYSTEM_PROMPT = """You are a strict, consistent English writing evaluator and tutor.
Evaluate the learner's ORIGINAL text, not a rewritten version.
Your job is to help the learner improve over time, so consistency and factual accuracy matter more than producing many corrections.
Score each dimension 0-100 using the anchors below.

SCORING ANCHORS
0-29: very limited control; meaning frequently breaks down.
30-44: basic control; frequent errors; simple language.
45-59: developing intermediate; meaning mostly clear but recurring errors and limited range.
60-74: solid intermediate/upper-intermediate; generally clear, some recurring errors and awkward phrasing.
75-89: advanced; good control, range and organization; errors are occasional and rarely impede meaning.
90-100: highly proficient; precise, natural, flexible and consistently well controlled.

DIMENSIONS
- grammar: accuracy and range of sentence structures, articles, tense, agreement, punctuation.
- vocabulary: range, precision, collocation, repetition, word form.
- coherence: logical flow, sentence/paragraph linking, clarity of progression.
- task_achievement: whether the prompt is fully addressed with enough relevant development.
- naturalness: idiomatic, native-like phrasing appropriate to context.

LANGUAGE AND ACCURACY RULES — MANDATORY
1. All explanations, summaries, strengths, priorities and mini-rules MUST be written in Vietnamese using the Latin alphabet. NEVER output Chinese Han characters, Japanese kana, Korean Hangul, or Chinese terminology.
2. English learner fragments and English corrections remain in English. Do not translate them.
3. The value of `fragment` MUST be copied EXACTLY from the learner's original text and MUST occur verbatim in that text.
4. Report an item only when you are confident it is genuinely incorrect or clearly unnatural at the requested target level. Fewer accurate corrections are better than many doubtful corrections.
5. Do NOT flag a spelling error unless the exact learner spelling is actually wrong.
6. `suggestion` must be a genuine correction or clearer alternative and should differ from `fragment`.
7. Be precise about articles. Generic `fashion` normally takes zero article: `I care about fashion`.
8. Do not manufacture grammar rules. If unsure, omit the error.
9. For each reported error, provide confidence from 0.0 to 1.0. Only report items with confidence >= 0.75.

Return ONLY valid JSON. No markdown.
JSON schema:
{
  "grammar": 0,
  "vocabulary": 0,
  "coherence": 0,
  "task_achievement": 0,
  "naturalness": 0,
  "cefr_estimate": "A1|A2|B1|B2|C1|C2",
  "summary_vi": "...",
  "strengths_vi": ["..."],
  "priorities_vi": ["..."],
  "errors": [
    {
      "category": "article|tense|agreement|word_choice|word_form|preposition|sentence_structure|punctuation|coherence|task|naturalness|spelling|other",
      "fragment": "exact learner fragment",
      "explanation_vi": "why it is a problem, in Vietnamese only",
      "suggestion": "a corrected or more natural English version",
      "mini_rule_vi": "short reusable rule in Vietnamese only",
      "confidence": 0.90
    }
  ]
}
Do not inflate scores because the learner tried hard.
"""


class EssayIn(BaseModel):
    prompt: str = Field(default="", max_length=5000)
    text: str = Field(min_length=10, max_length=20000)
    target_cefr: str = Field(default="B2", pattern=r"^(A1|A2|B1|B2|C1|C2)$")
    parent_essay_id: int | None = Field(default=None, ge=1)


class TaskGenerateIn(BaseModel):
    task_type: str = Field(
        default="opinion",
        pattern=r"^(opinion|email|review|story|toeic)$",
    )
    topic: str = Field(default="random", min_length=1, max_length=120)
    target_cefr: str = Field(
        default="B2",
        pattern=r"^(A1|A2|B1|B2|C1|C2)$",
    )
    word_target: int = Field(default=150, ge=60, le=350)

def db() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def column_names(conn: sqlite3.Connection, table: str) -> set[str]:
    return {str(r["name"]) for r in conn.execute(f"PRAGMA table_info({table})").fetchall()}


def init_db() -> None:
    with db() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS essays (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                created_at TEXT NOT NULL,
                prompt TEXT NOT NULL,
                text TEXT NOT NULL,
                word_count INTEGER NOT NULL,
                target_cefr TEXT NOT NULL,
                grammar REAL NOT NULL,
                vocabulary REAL NOT NULL,
                coherence REAL NOT NULL,
                task_achievement REAL NOT NULL,
                naturalness REAL NOT NULL,
                overall REAL NOT NULL,
                cefr_estimate TEXT NOT NULL,
                evaluator TEXT NOT NULL,
                summary_vi TEXT NOT NULL,
                strengths_json TEXT NOT NULL,
                priorities_json TEXT NOT NULL,
                errors_json TEXT NOT NULL
            )
            """
        )
        cols = column_names(conn, "essays")
        if "series_id" not in cols:
            conn.execute("ALTER TABLE essays ADD COLUMN series_id INTEGER")
        if "revision_no" not in cols:
            conn.execute("ALTER TABLE essays ADD COLUMN revision_no INTEGER NOT NULL DEFAULT 1")
        if "parent_id" not in cols:
            conn.execute("ALTER TABLE essays ADD COLUMN parent_id INTEGER")
        conn.execute("UPDATE essays SET series_id = id WHERE series_id IS NULL")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_essays_series_revision ON essays(series_id, revision_no)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_essays_created_at ON essays(created_at)")
        conn.execute(f"PRAGMA user_version = {SCHEMA_VERSION}")
        conn.commit()


def weighted_overall(result: dict[str, Any]) -> float:
    score = sum(float(result[k]) * w for k, w in RUBRIC_WEIGHTS.items())
    return round(max(0, min(100, score)), 1)


def app_cefr(score: float) -> str:
    if score < 30:
        return "A1"
    if score < 45:
        return "A2"
    if score < 60:
        return "B1"
    if score < 75:
        return "B2"
    if score < 90:
        return "C1"
    return "C2"


def extract_json(text: str) -> dict[str, Any]:
    text = (text or "").strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```$", "", text)

    try:
        value = json.loads(text)
        if isinstance(value, dict):
            return value
    except json.JSONDecodeError:
        pass

    decoder = json.JSONDecoder()
    for pos, char in enumerate(text):
        if char != "{":
            continue
        try:
            value, _ = decoder.raw_decode(text[pos:])
        except json.JSONDecodeError:
            continue
        if isinstance(value, dict):
            return value

    raise json.JSONDecodeError(
        "No complete JSON object found in Ollama response",
        text,
        0,
    )

CJK_RE = re.compile(r"[\u3400-\u4DBF\u4E00-\u9FFF\u3040-\u30FF\uAC00-\uD7AF]")


def contains_cjk(text: str) -> bool:
    return bool(CJK_RE.search(text or ""))


def clean_vi_list(items: Any, limit: int = 6) -> list[str]:
    out: list[str] = []
    if not isinstance(items, list):
        return out
    for item in items:
        value = str(item)[:1000].strip()
        if value and not contains_cjk(value):
            out.append(value)
        if len(out) >= limit:
            break
    return out


def normalize_text(value: str) -> str:
    return re.sub(r"\s+", " ", value.strip()).casefold()


def validate_result(raw: dict[str, Any]) -> dict[str, Any]:
    result: dict[str, Any] = {}
    for key in RUBRIC_WEIGHTS:
        try:
            val = float(raw.get(key, 0))
        except (TypeError, ValueError):
            val = 0.0
        result[key] = round(max(0, min(100, val)), 1)

    result["cefr_estimate"] = str(raw.get("cefr_estimate", "B1"))
    if result["cefr_estimate"] not in {"A1", "A2", "B1", "B2", "C1", "C2"}:
        result["cefr_estimate"] = app_cefr(weighted_overall(result))

    summary = str(raw.get("summary_vi", ""))[:4000].strip()
    result["summary_vi"] = "" if contains_cjk(summary) else summary
    result["strengths_vi"] = clean_vi_list(raw.get("strengths_vi", []))
    result["priorities_vi"] = clean_vi_list(raw.get("priorities_vi", []))

    errors: list[dict[str, Any]] = []
    learner_text = str(raw.get("__learner_text", ""))
    for err in raw.get("errors", [])[:30]:
        if not isinstance(err, dict):
            continue
        fragment = str(err.get("fragment", ""))[:500].strip()
        explanation = str(err.get("explanation_vi", ""))[:2000].strip()
        suggestion = str(err.get("suggestion", ""))[:1000].strip()
        rule = str(err.get("mini_rule_vi", ""))[:1500].strip()
        try:
            confidence = float(err.get("confidence", 1.0))
        except (TypeError, ValueError):
            confidence = 0.0

        if confidence < 0.75:
            continue
        if not fragment or (learner_text and fragment not in learner_text):
            continue
        if contains_cjk(explanation) or contains_cjk(rule):
            continue
        if not suggestion or normalize_text(suggestion) == normalize_text(fragment):
            continue

        errors.append(
            {
                "category": str(err.get("category", "other"))[:50],
                "fragment": fragment,
                "explanation_vi": explanation,
                "suggestion": suggestion,
                "mini_rule_vi": rule,
                "confidence": round(max(0.0, min(1.0, confidence)), 2),
            }
        )
    result["errors"] = errors
    return result


def evaluate_with_ollama(payload: EssayIn) -> dict[str, Any]:
    user_prompt = (
        f"TARGET LEVEL: {payload.target_cefr}\n"
        "WRITING TASK:\n"
        f"{payload.prompt or '(Free writing — evaluate clarity, language control and naturalness.)'}\n\n"
        "LEARNER TEXT:\n"
        f"{payload.text}\n\n"
        "Evaluate the text using the fixed rubric. Identify recurring/reusable learning points, not just typos. "
        "Return one COMPLETE JSON object that matches the required schema."
    )

    evaluation_schema = {
        "type": "object",
        "properties": {
            "grammar": {"type": "number", "minimum": 0, "maximum": 100},
            "vocabulary": {"type": "number", "minimum": 0, "maximum": 100},
            "coherence": {"type": "number", "minimum": 0, "maximum": 100},
            "task_achievement": {"type": "number", "minimum": 0, "maximum": 100},
            "naturalness": {"type": "number", "minimum": 0, "maximum": 100},
            "cefr_estimate": {"type": "string", "enum": ["A1", "A2", "B1", "B2", "C1", "C2"]},
            "summary_vi": {"type": "string"},
            "strengths_vi": {"type": "array", "items": {"type": "string"}, "maxItems": 6},
            "priorities_vi": {"type": "array", "items": {"type": "string"}, "maxItems": 6},
            "errors": {
                "type": "array",
                "maxItems": 20,
                "items": {
                    "type": "object",
                    "properties": {
                        "category": {"type": "string"},
                        "fragment": {"type": "string"},
                        "explanation_vi": {"type": "string"},
                        "suggestion": {"type": "string"},
                        "mini_rule_vi": {"type": "string"},
                        "confidence": {"type": "number", "minimum": 0, "maximum": 1},
                    },
                    "required": [
                        "category", "fragment", "explanation_vi",
                        "suggestion", "mini_rule_vi", "confidence"
                    ],
                },
            },
        },
        "required": [
            "grammar", "vocabulary", "coherence", "task_achievement",
            "naturalness", "cefr_estimate", "summary_vi",
            "strengths_vi", "priorities_vi", "errors"
        ],
    }

    def request_once(num_predict: int) -> tuple[str, dict[str, Any]]:
        body = {
            "model": OLLAMA_MODEL,
            "stream": False,
            "think": False,
            "keep_alive": "30m",
            "format": evaluation_schema,
            "options": {
                "temperature": 0,
                "seed": 42,
                "num_ctx": 4096,
                "num_predict": num_predict,
            },
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
        }

        response = requests.post(
            f"{OLLAMA_URL}/api/chat",
            json=body,
            timeout=REQUEST_TIMEOUT,
        )
        response.raise_for_status()

        try:
            envelope = response.json()
        except ValueError as exc:
            preview = response.text[:300].replace("\n", " ")
            raise ValueError(
                f"Ollama API returned a non-JSON HTTP response: {preview}"
            ) from exc

        message = envelope.get("message")
        if not isinstance(message, dict):
            raise ValueError("Ollama response has no message object")

        content = message.get("content")
        if not isinstance(content, str) or not content.strip():
            raise ValueError("Ollama returned an empty evaluator response")

        return content, envelope

    content, envelope = request_once(1400)
    try:
        raw = extract_json(content)
    except json.JSONDecodeError:
        content, envelope = request_once(2400)
        raw = extract_json(content)

    raw["__learner_text"] = payload.text
    result = validate_result(raw)
    result["_runtime"] = {
        "done_reason": envelope.get("done_reason"),
        "total_duration_ns": envelope.get("total_duration"),
        "load_duration_ns": envelope.get("load_duration"),
        "prompt_eval_count": envelope.get("prompt_eval_count"),
        "eval_count": envelope.get("eval_count"),
        "eval_duration_ns": envelope.get("eval_duration"),
    }
    return result

def heuristic_fallback(payload: EssayIn) -> dict[str, Any]:
    text = payload.text.strip()
    words = re.findall(r"\b[\w'-]+\b", text)
    sentences = [s for s in re.split(r"[.!?]+", text) if s.strip()]
    wc = max(1, len(words))
    unique_ratio = len({w.lower() for w in words}) / wc
    scores = {
        "grammar": 54.0,
        "vocabulary": round(min(76.0, 48 + unique_ratio * 34), 1),
        "coherence": 56.0 if len(sentences) >= 3 else 48.0,
        "task_achievement": 60.0 if payload.prompt else 58.0,
        "naturalness": 52.0,
    }
    overall = weighted_overall(scores)
    return {
        **scores,
        "cefr_estimate": app_cefr(overall),
        "summary_vi": "Chế độ dự phòng chỉ dùng để kiểm tra luồng ứng dụng. Hãy chạy Ollama để nhận đánh giá AI thật.",
        "strengths_vi": ["Bài viết có đủ nội dung để lưu vào hồ sơ tiến bộ."],
        "priorities_vi": ["Kết nối Ollama để bật đánh giá đầy đủ."],
        "errors": [],
    }


def evaluate(payload: EssayIn) -> tuple[dict[str, Any], str]:
    try:
        return evaluate_with_ollama(payload), f"ollama:{OLLAMA_MODEL}"
    except (requests.ConnectionError, requests.Timeout) as exc:
        if ALLOW_FALLBACK:
            return heuristic_fallback(payload), "fallback-demo"
        raise HTTPException(
            status_code=503,
            detail=(
                f"Không kết nối được Ollama ({type(exc).__name__}). "
                "Kiểm tra Ollama service và OLLAMA_URL."
            ),
        ) from exc
    except requests.HTTPError as exc:
        if ALLOW_FALLBACK:
            return heuristic_fallback(payload), "fallback-demo"
        status = exc.response.status_code if exc.response is not None else "?"
        raise HTTPException(
            status_code=502,
            detail=f"Ollama trả HTTP {status}. Kiểm tra model và log Ollama.",
        ) from exc
    except (json.JSONDecodeError, ValueError, KeyError, TypeError) as exc:
        if ALLOW_FALLBACK:
            return heuristic_fallback(payload), "fallback-demo"
        raise HTTPException(
            status_code=502,
            detail=(
                "Ollama đã phản hồi nhưng dữ liệu đánh giá không phải JSON hợp lệ "
                "sau khi đã tự retry. Thử Evaluate lại hoặc kiểm tra log."
            ),
        ) from exc
    except Exception as exc:
        if ALLOW_FALLBACK:
            return heuristic_fallback(payload), "fallback-demo"
        raise HTTPException(
            status_code=500,
            detail=f"Lỗi evaluator không xác định ({type(exc).__name__}).",
        ) from exc

def row_to_dict(row: sqlite3.Row, detail: bool = False) -> dict[str, Any]:
    d = dict(row)
    if detail:
        d["strengths_vi"] = json.loads(d.pop("strengths_json"))
        d["priorities_vi"] = json.loads(d.pop("priorities_json"))
        d["errors"] = json.loads(d.pop("errors_json"))
    else:
        d.pop("strengths_json", None)
        d.pop("priorities_json", None)
        d.pop("errors_json", None)
        d.pop("text", None)
        d.pop("summary_vi", None)
    return d


def latest_series_rows(conn: sqlite3.Connection) -> list[sqlite3.Row]:
    return conn.execute(
        """
        SELECT e.*
        FROM essays e
        JOIN (
            SELECT series_id, MAX(revision_no) AS max_revision
            FROM essays
            GROUP BY series_id
        ) latest
        ON e.series_id = latest.series_id
        AND e.revision_no = latest.max_revision
        ORDER BY e.id ASC
        """
    ).fetchall()


def revision_delta(current: dict[str, Any], previous: sqlite3.Row | None) -> dict[str, float]:
    if not previous:
        return {}
    out: dict[str, float] = {}
    for key in [*RUBRIC_WEIGHTS.keys(), "overall"]:
        out[key] = round(float(current[key]) - float(previous[key]), 1)
    return out


def error_memory(rows: list[sqlite3.Row]) -> list[dict[str, Any]]:
    if not rows:
        return []
    ordered = sorted(rows, key=lambda r: int(r["id"]))
    midpoint = max(1, len(ordered) // 2)
    older_ids = {int(r["id"]) for r in ordered[:midpoint]}
    newer_ids = {int(r["id"]) for r in ordered[midpoint:]}
    by_cat: dict[str, dict[str, Any]] = {}
    now = datetime.now().astimezone()
    weekly_labels = []
    for offset in range(5, -1, -1):
        d = (now - timedelta(weeks=offset)).date()
        monday = d - timedelta(days=d.weekday())
        weekly_labels.append(monday.isoformat())

    for r in ordered:
        rid = int(r["id"])
        created = datetime.fromisoformat(r["created_at"]).astimezone()
        monday = (created.date() - timedelta(days=created.date().weekday())).isoformat()
        for err in json.loads(r["errors_json"]):
            cat = str(err.get("category", "other"))
            item = by_cat.setdefault(
                cat,
                {
                    "category": cat,
                    "total": 0,
                    "older": 0,
                    "newer": 0,
                    "first_seen": r["created_at"][:10],
                    "last_seen": r["created_at"][:10],
                    "weeks": {label: 0 for label in weekly_labels},
                },
            )
            item["total"] += 1
            item["last_seen"] = r["created_at"][:10]
            if rid in older_ids:
                item["older"] += 1
            if rid in newer_ids:
                item["newer"] += 1
            if monday in item["weeks"]:
                item["weeks"][monday] += 1

    output = []
    for item in by_cat.values():
        if item["total"] <= 1 and item["newer"] == 0:
            status = "historical"
        elif item["newer"] < item["older"]:
            status = "improving"
        elif item["older"] == 0 and item["newer"] > 0:
            status = "new"
        elif item["total"] >= 3:
            status = "recurring"
        else:
            status = "watch"
        item["status"] = status
        item["weekly"] = [{"week": k, "count": v} for k, v in item.pop("weeks").items()]
        output.append(item)
    return sorted(output, key=lambda x: (x["status"] == "improving", -x["total"]))


@app.on_event("startup")
def startup() -> None:
    init_db()


@app.get("/", response_class=HTMLResponse)
def home() -> str:
    return (ROOT / "templates" / "index.html").read_text(encoding="utf-8")


@app.get("/static/style.css")
def style() -> HTMLResponse:
    return HTMLResponse((ROOT / "static" / "style.css").read_text(encoding="utf-8"), media_type="text/css")


@app.get("/api/health")
def health() -> dict[str, Any]:
    ollama_ok = False
    models: list[str] = []
    try:
        r = requests.get(f"{OLLAMA_URL}/api/tags", timeout=2)
        ollama_ok = r.ok
        if r.ok:
            models = [m.get("name", "") for m in r.json().get("models", [])]
    except Exception:
        pass
    return {
        "ok": True,
        "version": APP_VERSION,
        "schema_version": SCHEMA_VERSION,
        "ollama": ollama_ok,
        "model": OLLAMA_MODEL,
        "available_models": models,
    }


TASK_TYPE_GUIDANCE = {
    "opinion": "an opinion essay that requires a clear position, reasons and at least one concrete example",
    "email": "a realistic email with a clear recipient, purpose and 2-3 points the learner must address",
    "review": "a review of a realistic product, service, place, event, podcast, film or experience with positives, negatives and a recommendation",
    "story": "a short story with a clear situation, development and ending; give a natural opening situation but do not write the story for the learner",
    "toeic": "a TOEIC-style practical writing task, preferably an email response or short opinion response with explicit points to address",
}

TASK_TOPICS = [
    "daily life",
    "work",
    "technology",
    "education",
    "travel",
    "environment",
    "culture and media",
    "shopping and services",
    "communication",
    "community",
]


def normalize_task_piece(value: Any, limit: int) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip()[:limit]


def fallback_practice_task(payload: TaskGenerateIn) -> dict[str, Any]:
    topic = payload.topic.strip()
    if topic.casefold() == "random":
        topic = random.choice(TASK_TOPICS)
    task_type = payload.task_type

    templates = {
        "opinion": (
            f"An opinion about {topic}",
            f"Some people believe that changes related to {topic} make everyday life better, while others disagree. "
            "Write an opinion response. State your position clearly, give at least two reasons, and support one reason with a specific example.",
            ["State a clear opinion", "Give at least two reasons", "Include one specific example"],
        ),
        "email": (
            f"An email about {topic}",
            f"You need to write an email about a recent situation involving {topic}. Explain what happened, describe what you need from the recipient, "
            "and suggest one practical next step. Use an appropriate opening and closing.",
            ["Explain the situation", "Make your request clear", "Suggest a next step", "Use an appropriate email tone"],
        ),
        "review": (
            f"A review related to {topic}",
            f"Write a review of a recent experience related to {topic}. Describe what you experienced, explain what you liked and disliked, "
            "and say whether you would recommend it to other people.",
            ["Describe the experience", "Give both a positive and a negative point", "Finish with a recommendation"],
        ),
        "story": (
            f"A short story about {topic}",
            f"Write a short story connected to {topic}. Begin with a situation where an ordinary plan suddenly changes. "
            "Show what happened next and finish with a clear ending.",
            ["Set the scene", "Describe a change or problem", "Show what happens next", "Give the story a clear ending"],
        ),
        "toeic": (
            f"A practical TOEIC-style task about {topic}",
            f"Your workplace or community is considering a change related to {topic}. Write a response explaining whether you support the change. "
            "Give two reasons and one practical example or consequence.",
            ["Give a clear position", "Provide two reasons", "Add a practical example or consequence"],
        ),
    }
    title, instruction, checklist = templates[task_type]
    return {
        "title": title,
        "instruction": instruction,
        "checklist": checklist,
        "word_target": payload.word_target,
        "task_type": task_type,
        "topic": topic,
        "source": "built-in",
    }


def generate_practice_task(payload: TaskGenerateIn) -> dict[str, Any]:
    requested_topic = payload.topic.strip()
    topic_instruction = (
        "Choose a fresh, concrete everyday topic yourself."
        if requested_topic.casefold() == "random"
        else f"Use this topic: {requested_topic}."
    )
    guidance = TASK_TYPE_GUIDANCE[payload.task_type]

    schema = {
        "type": "object",
        "properties": {
            "title": {"type": "string"},
            "instruction": {"type": "string"},
            "checklist": {
                "type": "array",
                "items": {"type": "string"},
                "minItems": 2,
                "maxItems": 5,
            },
            "topic": {"type": "string"},
        },
        "required": ["title", "instruction", "checklist", "topic"],
    }

    system = (
        "You create English writing practice tasks for language learners.\n"
        "Create exactly ONE task.\n"
        "The task itself must be written in clear English.\n"
        "Do not provide an answer, sample response, outline, vocabulary list, or hints that solve the task.\n"
        "Make the task realistic, specific enough to write about, and appropriate for the requested CEFR level.\n"
        "Avoid obscure specialist knowledge. The learner should be able to answer from everyday knowledge or imagination.\n"
        "Return only the requested structured JSON."
    )

    user = (
        f"CEFR level: {payload.target_cefr}\n"
        f"Task format: {guidance}\n"
        f"{topic_instruction}\n"
        f"Target response length: about {payload.word_target} words.\n"
        "Create a short title, one self-contained instruction, and a checklist of 2-5 things the learner must include."
    )

    body = {
        "model": OLLAMA_MODEL,
        "stream": False,
        "think": False,
        "keep_alive": "30m",
        "format": schema,
        "options": {
            "temperature": 0.75,
            "num_ctx": 2048,
            "num_predict": 500,
        },
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
    }

    try:
        response = requests.post(
            f"{OLLAMA_URL}/api/chat",
            json=body,
            timeout=min(REQUEST_TIMEOUT, 90),
        )
        response.raise_for_status()
        envelope = response.json()
        content = envelope.get("message", {}).get("content", "")
        raw = extract_json(content)

        title = normalize_task_piece(raw.get("title"), 140)
        instruction = normalize_task_piece(raw.get("instruction"), 1600)
        topic = normalize_task_piece(raw.get("topic"), 120)
        checklist = [
            normalize_task_piece(item, 240)
            for item in raw.get("checklist", [])
            if normalize_task_piece(item, 240)
        ][:5]

        if not title or not instruction or len(checklist) < 2:
            raise ValueError("Task generator returned incomplete structured output")

        return {
            "title": title,
            "instruction": instruction,
            "checklist": checklist,
            "word_target": payload.word_target,
            "task_type": payload.task_type,
            "topic": topic or requested_topic,
            "source": f"ollama:{OLLAMA_MODEL}",
        }
    except Exception:
        return fallback_practice_task(payload)


def task_as_prompt(task: dict[str, Any], target_cefr: str) -> str:
    checklist = "\n".join(f"- {item}" for item in task["checklist"])
    return (
        f"TASK: {task['title']}\n\n"
        f"{task['instruction']}\n\n"
        f"WHAT TO INCLUDE:\n{checklist}\n\n"
        f"TARGET LEVEL: {target_cefr}\n"
        f"TARGET LENGTH: about {task['word_target']} words"
    )


@app.post("/api/tasks/generate")
def api_generate_task(payload: TaskGenerateIn) -> dict[str, Any]:
    task = generate_practice_task(payload)
    return {
        **task,
        "prompt": task_as_prompt(task, payload.target_cefr),
    }

@app.post("/api/evaluate")
def api_evaluate(payload: EssayIn) -> dict[str, Any]:
    previous: sqlite3.Row | None = None
    series_id: int | None = None
    revision_no = 1

    if payload.parent_essay_id:
        with db() as conn:
            previous = conn.execute(
                "SELECT * FROM essays WHERE id = ?", (payload.parent_essay_id,)
            ).fetchone()
            if not previous:
                raise HTTPException(404, "Parent essay not found")
            series_id = int(previous["series_id"] or previous["id"])
            revision_no = int(
                conn.execute(
                    "SELECT COALESCE(MAX(revision_no), 0) + 1 FROM essays WHERE series_id = ?",
                    (series_id,),
                ).fetchone()[0]
            )

    result, evaluator = evaluate(payload)
    overall = weighted_overall(result)
    word_count = len(re.findall(r"\b[\w'-]+\b", payload.text))
    now = datetime.now().astimezone().isoformat(timespec="seconds")

    with db() as conn:
        cur = conn.execute(
            """
            INSERT INTO essays (
              created_at, prompt, text, word_count, target_cefr,
              grammar, vocabulary, coherence, task_achievement, naturalness,
              overall, cefr_estimate, evaluator, summary_vi,
              strengths_json, priorities_json, errors_json,
              series_id, revision_no, parent_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                now, payload.prompt, payload.text, word_count, payload.target_cefr,
                result["grammar"], result["vocabulary"], result["coherence"],
                result["task_achievement"], result["naturalness"], overall,
                result["cefr_estimate"], evaluator, result["summary_vi"],
                json.dumps(result["strengths_vi"], ensure_ascii=False),
                json.dumps(result["priorities_vi"], ensure_ascii=False),
                json.dumps(result["errors"], ensure_ascii=False),
                series_id, revision_no, payload.parent_essay_id,
            ),
        )
        essay_id = int(cur.lastrowid)
        if series_id is None:
            series_id = essay_id
            conn.execute("UPDATE essays SET series_id = ? WHERE id = ?", (series_id, essay_id))
        conn.commit()

    current_for_delta = {**result, "overall": overall}
    delta = revision_delta(current_for_delta, previous)
    return {
        "id": essay_id,
        "series_id": series_id,
        "revision_no": revision_no,
        "parent_id": payload.parent_essay_id,
        "overall": overall,
        "app_cefr": app_cefr(overall),
        "evaluator": evaluator,
        "delta": delta,
        **result,
    }


@app.get("/api/essays")
def essays(limit: int = 200) -> list[dict[str, Any]]:
    limit = min(max(1, limit), 500)
    with db() as conn:
        rows = conn.execute("SELECT * FROM essays ORDER BY id DESC LIMIT ?", (limit,)).fetchall()
    return [row_to_dict(r) for r in rows]


@app.get("/api/essays/{essay_id}")
def essay_detail(essay_id: int) -> dict[str, Any]:
    with db() as conn:
        row = conn.execute("SELECT * FROM essays WHERE id = ?", (essay_id,)).fetchone()
        if not row:
            raise HTTPException(404, "Essay not found")
        series_rows = conn.execute(
            "SELECT id, revision_no, overall, created_at FROM essays WHERE series_id = ? ORDER BY revision_no",
            (row["series_id"],),
        ).fetchall()
    d = row_to_dict(row, detail=True)
    d["revisions"] = [dict(r) for r in series_rows]
    return d


@app.delete("/api/essays/{essay_id}")
def delete_essay(essay_id: int) -> dict[str, bool]:
    with db() as conn:
        row = conn.execute("SELECT series_id FROM essays WHERE id = ?", (essay_id,)).fetchone()
        if not row:
            return {"deleted": False}
        conn.execute("DELETE FROM essays WHERE series_id = ?", (row["series_id"],))
        conn.commit()
    return {"deleted": True}


@app.get("/api/error-memory")
def api_error_memory() -> dict[str, Any]:
    with db() as conn:
        rows = conn.execute("SELECT * FROM essays ORDER BY id ASC").fetchall()
    return {"items": error_memory(rows), "revision_count": len(rows)}


@app.get("/api/dashboard")
def dashboard() -> dict[str, Any]:
    with db() as conn:
        all_revision_rows = conn.execute("SELECT * FROM essays ORDER BY id ASC").fetchall()
        rows = latest_series_rows(conn)

    if not rows:
        return {
            "essay_count": 0,
            "revision_count": 0,
            "skill_score": 0,
            "cefr": "—",
            "streak": 0,
            "recent_average": 0,
            "trend": [],
            "metrics": {},
            "error_counts": {},
            "error_memory": [],
            "next_level": None,
            "version": APP_VERSION,
        }

    latest = [dict(r) for r in rows]
    recent = latest[-10:]
    weights = list(range(1, len(recent) + 1))
    skill_score = round(
        sum(float(r["overall"]) * w for r, w in zip(recent, weights)) / sum(weights), 1
    )

    metrics = {
        m: round(statistics.mean(float(r[m]) for r in recent), 1)
        for m in RUBRIC_WEIGHTS
    }

    error_counts: dict[str, int] = {}
    for r in recent:
        for err in json.loads(r["errors_json"]):
            cat = err.get("category", "other")
            error_counts[cat] = error_counts.get(cat, 0) + 1
    error_counts = dict(sorted(error_counts.items(), key=lambda kv: kv[1], reverse=True))

    dates = sorted({datetime.fromisoformat(r["created_at"]).date() for r in latest})
    streak = 0
    if dates:
        d = dates[-1]
        today = datetime.now().astimezone().date()
        if d in {today, today - timedelta(days=1)}:
            streak = 1
            for prev in reversed(dates[:-1]):
                if prev == d - timedelta(days=1):
                    streak += 1
                    d = prev
                elif prev < d - timedelta(days=1):
                    break

    bands = [(30, "A2"), (45, "B1"), (60, "B2"), (75, "C1"), (90, "C2")]
    next_level = None
    for threshold, level in bands:
        if skill_score < threshold:
            next_level = {
                "level": level,
                "threshold": threshold,
                "remaining": round(threshold - skill_score, 1),
            }
            break

    trend = [
        {
            "id": r["id"],
            "series_id": r["series_id"],
            "revision_no": r["revision_no"],
            "date": r["created_at"][:10],
            "overall": r["overall"],
        }
        for r in latest[-20:]
    ]

    return {
        "essay_count": len(latest),
        "revision_count": len(all_revision_rows),
        "skill_score": skill_score,
        "cefr": app_cefr(skill_score),
        "streak": streak,
        "recent_average": round(
            statistics.mean(float(r["overall"]) for r in recent), 1
        ),
        "trend": trend,
        "metrics": metrics,
        "error_counts": error_counts,
        "error_memory": error_memory(all_revision_rows)[:8],
        "next_level": next_level,
        "version": APP_VERSION,
    }
