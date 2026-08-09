import json
import random
import os
import re
import sqlite3
import statistics
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any
from urllib.parse import quote

import requests
from grammar_course import GRAMMAR_COURSE, GRAMMAR_BY_ID
from auth_support import AUTH_ENABLED, current_db_path, install_auth
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
SCHEMA_VERSION = 5

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

class ImproveIn(BaseModel):
    text: str = Field(min_length=10, max_length=20000)
    target_cefr: str = Field(default="B2", pattern=r"^(A1|A2|B1|B2|C1|C2)$")
    mode: str = Field(default="polish", pattern=r"^(correct|grammar|vocabulary|polish)$")


class TranslateIn(BaseModel):
    text: str = Field(min_length=1, max_length=800)


class SaveWordIn(BaseModel):
    word: str = Field(min_length=1, max_length=80)
    phonetic: str = Field(default="", max_length=120)
    part_of_speech: str = Field(default="", max_length=80)
    definition: str = Field(default="", max_length=1200)
    translation_vi: str = Field(default="", max_length=1200)

def db() -> sqlite3.Connection:
    path = current_db_path(DB_PATH)
    path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(path)
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

        conn.execute(
            '''
            CREATE TABLE IF NOT EXISTS dictionary_cache (
                word TEXT PRIMARY KEY,
                payload_json TEXT NOT NULL,
                fetched_at TEXT NOT NULL
            )
            '''
        )
        conn.execute(
            '''
            CREATE TABLE IF NOT EXISTS saved_words (
                word TEXT PRIMARY KEY,
                phonetic TEXT NOT NULL DEFAULT '',
                part_of_speech TEXT NOT NULL DEFAULT '',
                definition TEXT NOT NULL DEFAULT '',
                added_at TEXT NOT NULL
            )
            '''
        )
        saved_cols = column_names(conn, "saved_words")
        if "translation_vi" not in saved_cols:
            conn.execute("ALTER TABLE saved_words ADD COLUMN translation_vi TEXT NOT NULL DEFAULT ''")
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS grammar_progress (
                lesson_id TEXT PRIMARY KEY,
                completed_at TEXT NOT NULL
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS grammar_lesson_cache (
                lesson_id TEXT PRIMARY KEY,
                content_json TEXT NOT NULL,
                generated_at TEXT NOT NULL
            )
            """
        )
        conn.execute(f"PRAGMA user_version = {SCHEMA_VERSION}")
        conn.commit()



install_auth(app, init_db)

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


def model_family(model_name: str) -> str:
    name = (model_name or "").casefold()
    if "qwen" in name:
        return "qwen"
    if "llama" in name:
        return "llama"
    if "mistral" in name:
        return "mistral"
    if "gemma" in name:
        return "gemma"
    if "phi" in name:
        return "phi"
    return "generic"


def mascot_for_model(model_name: str) -> dict[str, str]:
    family = model_family(model_name)
    mascots = {
        "qwen": {
            "emoji": "🦉",
            "name": "Qwen Owl",
            "subtitle": "Calm reader and detail hunter",
            "mood": "Focused",
        },
        "llama": {
            "emoji": "🦙",
            "name": "Llama Scout",
            "subtitle": "Patient guide for long writing sessions",
            "mood": "Steady",
        },
        "mistral": {
            "emoji": "🌬️",
            "name": "Mistral Breeze",
            "subtitle": "Fast, light and idea-friendly",
            "mood": "Swift",
        },
        "gemma": {
            "emoji": "💎",
            "name": "Gemma Spark",
            "subtitle": "Compact helper with sharp feedback",
            "mood": "Bright",
        },
        "phi": {
            "emoji": "🧠",
            "name": "Phi Fox",
            "subtitle": "Small but clever problem-solver",
            "mood": "Clever",
        },
        "generic": {
            "emoji": "🤖",
            "name": "Coach Bot",
            "subtitle": "Your local writing companion",
            "mood": "Ready",
        },
    }
    return mascots[family]

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
    mascot = mascot_for_model(OLLAMA_MODEL)
    return {
        "ok": True,
        "version": APP_VERSION,
        "schema_version": SCHEMA_VERSION,
        "ollama": ollama_ok,
        "model": OLLAMA_MODEL,
        "model_family": model_family(OLLAMA_MODEL),
        "mascot": mascot,
        "available_models": models,
        "auth_enabled": AUTH_ENABLED,
        "auth_provider": "google" if AUTH_ENABLED else "local",
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

GRAMMAR_LIBRARY = [{'id': 'a1-sentence-basics', 'level': 'A1', 'category': 'Sentence basics', 'title': 'Building a clear English sentence', 'summary_vi': 'Nắm trật tự chủ ngữ - động từ - tân ngữ và cách tạo câu khẳng định, phủ định, câu hỏi.', 'explanation_vi': 'Tiếng Anh phụ thuộc nhiều vào trật tự từ. Một câu cơ bản thường cần chủ ngữ rõ ràng và động từ chia phù hợp.', 'rules': ['Câu khẳng định cơ bản: Subject + Verb + Object/Complement.', 'Phủ định với động từ thường dùng do/does + not ở hiện tại đơn.', 'Câu hỏi thường đưa trợ động từ lên trước chủ ngữ.'], 'examples': [{'en': 'I work in Ho Chi Minh City.', 'vi': 'Tôi làm việc ở Thành phố Hồ Chí Minh.'}, {'en': 'Do you use this app every day?', 'vi': 'Bạn có dùng ứng dụng này mỗi ngày không?'}], 'mistakes': ['Thiếu chủ ngữ trong câu hoàn chỉnh.', 'Dùng hai động từ đã chia cạnh nhau mà không có cấu trúc phù hợp.']}, {'id': 'a1-be-have', 'level': 'A1', 'category': 'Core verbs', 'title': 'Be and have without confusion', 'summary_vi': 'Phân biệt khi nào dùng be, have và động từ thường.', 'explanation_vi': 'Be thường nối chủ ngữ với tính từ/danh từ hoặc dùng trong tiếp diễn và bị động. Have thường diễn tả sở hữu hoặc trải nghiệm.', 'rules': ['Be + adjective/noun: She is tired. He is an engineer.', 'Have + noun: I have a meeting.', 'Không thêm be trước động từ thường trong hiện tại đơn.'], 'examples': [{'en': 'The room is quiet.', 'vi': 'Căn phòng yên tĩnh.'}, {'en': 'We have two options.', 'vi': 'Chúng ta có hai lựa chọn.'}], 'mistakes': ['I am work every day. → I work every day.', 'She have a car. → She has a car.']}, {'id': 'a1-present-simple', 'level': 'A1', 'category': 'Tenses', 'title': 'Present simple for habits and facts', 'summary_vi': 'Dùng hiện tại đơn cho thói quen, sự thật và lịch trình.', 'explanation_vi': 'Đây là thì rất quan trọng trong writing vì nó xuất hiện trong mô tả thói quen, ý kiến chung và thông tin mang tính ổn định.', 'rules': ['I/you/we/they + base verb.', 'He/she/it + verb-s/es.', 'Dùng do/does cho câu hỏi và phủ định với động từ thường.'], 'examples': [{'en': 'Technology changes the way we communicate.', 'vi': 'Công nghệ thay đổi cách chúng ta giao tiếp.'}, {'en': 'My team meets every Monday.', 'vi': 'Nhóm của tôi họp mỗi thứ Hai.'}], 'mistakes': ['He work every day. → He works every day.', "She doesn't likes it. → She doesn't like it."]}, {'id': 'a1-articles', 'level': 'A1', 'category': 'Articles', 'title': 'A, an, the and zero article', 'summary_vi': 'Hiểu khi nào danh từ cần a/an, the hoặc không dùng mạo từ.', 'explanation_vi': 'Mạo từ phụ thuộc vào việc danh từ có đếm được không, số ít hay số nhiều, và người đọc đã biết đối tượng đó chưa.', 'rules': ['A/an: một danh từ đếm được số ít chưa xác định.', 'The: đối tượng cụ thể hoặc đã được nhắc tới.', 'Zero article: thường dùng cho danh từ số nhiều hoặc không đếm được khi nói chung.'], 'examples': [{'en': 'I bought a book. The book is about design.', 'vi': 'Tôi mua một cuốn sách. Cuốn sách đó nói về thiết kế.'}, {'en': 'Fashion changes quickly.', 'vi': 'Thời trang thay đổi nhanh.'}], 'mistakes': ['I like the music. khi nói về âm nhạc nói chung → I like music.', 'She bought book. → She bought a book.']}, {'id': 'a2-simple-continuous', 'level': 'A2', 'category': 'Tenses', 'title': 'Present simple vs present continuous', 'summary_vi': 'Phân biệt thói quen với hành động đang diễn ra hoặc tình huống tạm thời.', 'explanation_vi': 'Present simple nhấn mạnh điều thường xuyên hoặc ổn định. Present continuous nhấn mạnh điều đang diễn ra quanh thời điểm hiện tại.', 'rules': ['Present simple: habits, facts, stable states.', 'Present continuous: happening now, temporary situations, changing trends.', 'Stative verbs như know, believe, need thường không dùng ở continuous.'], 'examples': [{'en': 'I usually work from home.', 'vi': 'Tôi thường làm việc ở nhà.'}, {'en': 'This month, I am working at the office.', 'vi': 'Tháng này tôi đang làm việc ở văn phòng.'}], 'mistakes': ['I am knowing the answer. → I know the answer.']}, {'id': 'a2-past-simple', 'level': 'A2', 'category': 'Tenses', 'title': 'Past simple for finished events', 'summary_vi': 'Kể lại sự việc đã hoàn tất trong quá khứ với mốc thời gian rõ.', 'explanation_vi': 'Past simple là nền tảng của review, story và mô tả trải nghiệm đã kết thúc.', 'rules': ['Dùng verb-ed hoặc dạng quá khứ bất quy tắc.', 'Did + base verb cho câu hỏi/phủ định.', 'Dấu hiệu phổ biến: yesterday, last week, in 2025, two days ago.'], 'examples': [{'en': 'I visited Da Nang last year.', 'vi': 'Tôi đã đến Đà Nẵng năm ngoái.'}, {'en': 'The meeting ended at 4 p.m.', 'vi': 'Cuộc họp kết thúc lúc 4 giờ chiều.'}], 'mistakes': ["I didn't went. → I didn't go."]}, {'id': 'a2-countability', 'level': 'A2', 'category': 'Nouns', 'title': 'Countable and uncountable nouns', 'summary_vi': 'Tránh các lỗi như informations, advices và dùng lượng từ chính xác hơn.', 'explanation_vi': 'Danh từ không đếm được không dùng trực tiếp với a/an và thường không thêm -s khi mang nghĩa chung.', 'rules': ['Many/few với danh từ đếm được.', 'Much/little với danh từ không đếm được.', 'A lot of dùng linh hoạt với cả hai loại.'], 'examples': [{'en': 'I received some useful information.', 'vi': 'Tôi nhận được một số thông tin hữu ích.'}, {'en': 'There are many reasons to improve.', 'vi': 'Có nhiều lý do để cải thiện.'}], 'mistakes': ['an advice → some advice / a piece of advice', 'many information → much/a lot of information']}, {'id': 'a2-comparisons', 'level': 'A2', 'category': 'Comparison', 'title': 'Comparatives that sound natural', 'summary_vi': 'So sánh người, vật và ý tưởng mà không lặp cấu trúc đơn giản.', 'explanation_vi': 'Ngoài -er và more, bạn có thể dùng much, slightly, far để điều chỉnh mức độ so sánh.', 'rules': ['Short adjectives: faster, easier.', 'Long adjectives: more useful, more reliable.', 'Modifiers: much better, slightly cheaper, far more effective.'], 'examples': [{'en': 'This solution is much more reliable.', 'vi': 'Giải pháp này đáng tin cậy hơn nhiều.'}, {'en': 'The second option is slightly cheaper.', 'vi': 'Lựa chọn thứ hai rẻ hơn một chút.'}], 'mistakes': ['more easier → easier / much easier']}, {'id': 'b1-present-perfect', 'level': 'B1', 'category': 'Tenses', 'title': 'Present perfect vs past simple', 'summary_vi': 'Phân biệt trải nghiệm/liên hệ với hiện tại và sự kiện quá khứ đã kết thúc.', 'explanation_vi': 'Present perfect nối quá khứ với hiện tại; past simple đặt sự kiện trong một thời điểm quá khứ hoàn tất.', 'rules': ['Present perfect: experience, unfinished time, present result.', 'Past simple: finished time in the past.', 'Tránh dùng present perfect với mốc quá khứ đã kết thúc như yesterday.'], 'examples': [{'en': 'I have worked here for three years.', 'vi': 'Tôi đã làm ở đây được ba năm và vẫn đang làm.'}, {'en': 'I joined the company in 2023.', 'vi': 'Tôi gia nhập công ty vào năm 2023.'}], 'mistakes': ['I have visited it yesterday. → I visited it yesterday.']}, {'id': 'b1-modals', 'level': 'B1', 'category': 'Modals', 'title': 'Modals for advice, obligation and possibility', 'summary_vi': 'Dùng should, must, have to, might, could để thể hiện mức độ chắc chắn và thái độ.', 'explanation_vi': 'Modal verbs giúp writing chính xác hơn vì chúng cho biết bạn đang khuyên, yêu cầu, dự đoán hay chỉ nêu khả năng.', 'rules': ['should: lời khuyên hoặc điều nên làm.', 'must/have to: nghĩa vụ mạnh.', 'might/could: khả năng, đề xuất mềm hơn.'], 'examples': [{'en': 'Companies should provide clearer training.', 'vi': 'Các công ty nên cung cấp đào tạo rõ ràng hơn.'}, {'en': 'This change could reduce costs.', 'vi': 'Thay đổi này có thể giảm chi phí.'}], 'mistakes': ['must to do → must do']}, {'id': 'b1-relative-clauses', 'level': 'B1', 'category': 'Complex sentences', 'title': 'Relative clauses for richer sentences', 'summary_vi': 'Dùng who, which, that, where để thêm thông tin mà không phải tách quá nhiều câu ngắn.', 'explanation_vi': 'Relative clauses giúp bài viết kết nối tự nhiên và giảm lặp danh từ.', 'rules': ['who cho người.', 'which cho vật/ý tưởng.', 'that thường dùng trong defining clauses.', 'where cho nơi chốn.'], 'examples': [{'en': 'The app that I use every day is easy to navigate.', 'vi': 'Ứng dụng mà tôi dùng mỗi ngày rất dễ điều hướng.'}, {'en': 'This is the office where I first met the team.', 'vi': 'Đây là văn phòng nơi tôi lần đầu gặp nhóm.'}], 'mistakes': ['The person which helped me → The person who helped me']}, {'id': 'b1-gerund-infinitive', 'level': 'B1', 'category': 'Verb patterns', 'title': 'Gerunds and infinitives', 'summary_vi': 'Học các mẫu động từ + V-ing và động từ + to V phổ biến trong writing.', 'explanation_vi': 'Nhiều động từ đi với một dạng cố định. Ghi nhớ theo cụm sẽ hiệu quả hơn học từng từ rời.', 'rules': ['enjoy/avoid/consider + V-ing.', 'want/need/plan/decide + to V.', 'Một số động từ đổi nghĩa tùy cấu trúc, ví dụ remember doing vs remember to do.'], 'examples': [{'en': 'I enjoy learning through real projects.', 'vi': 'Tôi thích học thông qua dự án thực tế.'}, {'en': 'We decided to change the schedule.', 'vi': 'Chúng tôi quyết định thay đổi lịch.'}], 'mistakes': ['I suggest to use → I suggest using']}, {'id': 'b2-conditionals', 'level': 'B2', 'category': 'Complex sentences', 'title': 'Conditionals for arguments and consequences', 'summary_vi': 'Dùng câu điều kiện để trình bày hậu quả, giả định và lập luận chặt chẽ.', 'explanation_vi': 'Conditionals rất hữu ích trong opinion writing vì giúp bạn kết nối một lựa chọn với hệ quả của nó.', 'rules': ['First conditional: real future possibility.', 'Second conditional: hypothetical present/future.', 'Third conditional: hypothetical past.'], 'examples': [{'en': 'If companies invest in training, employees will adapt faster.', 'vi': 'Nếu công ty đầu tư vào đào tạo, nhân viên sẽ thích nghi nhanh hơn.'}, {'en': 'If I had more time, I would study another language.', 'vi': 'Nếu có nhiều thời gian hơn, tôi sẽ học thêm một ngôn ngữ.'}], 'mistakes': ['If I will have time → If I have time']}, {'id': 'b2-passive', 'level': 'B2', 'category': 'Voice', 'title': 'Passive voice when the action matters more', 'summary_vi': 'Dùng bị động có mục đích, đặc biệt trong mô tả quy trình và văn phong khách quan.', 'explanation_vi': 'Passive voice phù hợp khi người thực hiện không quan trọng, đã rõ hoặc bạn muốn nhấn mạnh kết quả.', 'rules': ['be + past participle.', 'Giữ đúng tense của be.', 'Không lạm dụng passive nếu active rõ ràng hơn.'], 'examples': [{'en': 'The data is collected every ten minutes.', 'vi': 'Dữ liệu được thu thập mỗi mười phút.'}, {'en': 'The issue was resolved yesterday.', 'vi': 'Vấn đề đã được giải quyết hôm qua.'}], 'mistakes': ['The data collected every day. → The data is collected every day.']}, {'id': 'b2-participle-clauses', 'level': 'B2', 'category': 'Advanced sentences', 'title': 'Participle clauses for concise writing', 'summary_vi': 'Rút gọn mệnh đề bằng V-ing hoặc past participle khi chủ ngữ logic rõ ràng.', 'explanation_vi': 'Participle clauses giúp bài viết gọn và tự nhiên hơn, nhưng cần chắc rằng chủ thể của mệnh đề rút gọn trùng với chủ thể chính.', 'rules': ['V-ing thường mang nghĩa chủ động.', 'Past participle thường mang nghĩa bị động.', 'Tránh dangling participles.'], 'examples': [{'en': 'Working remotely, employees can save commuting time.', 'vi': 'Khi làm việc từ xa, nhân viên có thể tiết kiệm thời gian đi lại.'}, {'en': 'Designed for beginners, the course starts with simple tasks.', 'vi': 'Được thiết kế cho người mới, khóa học bắt đầu bằng nhiệm vụ đơn giản.'}], 'mistakes': ['Driving to work, the rain started. → Chủ ngữ logic bị sai.']}, {'id': 'b2-linking', 'level': 'B2', 'category': 'Coherence', 'title': 'Linking ideas without sounding mechanical', 'summary_vi': 'Nâng từ and/but/because lên các cách nối ý linh hoạt hơn.', 'explanation_vi': 'Coherence tốt không đến từ việc nhồi nhiều linking words, mà từ mối quan hệ logic rõ ràng giữa các ý.', 'rules': ['Contrast: however, whereas, while, although.', 'Result: therefore, as a result, which means that.', 'Addition: moreover, in addition, another reason is that.'], 'examples': [{'en': 'The system is inexpensive; however, it requires regular maintenance.', 'vi': 'Hệ thống rẻ; tuy nhiên, nó cần bảo trì thường xuyên.'}, {'en': 'Remote work reduces commuting time, which means that employees may have more flexible mornings.', 'vi': 'Làm việc từ xa giảm thời gian đi lại, nghĩa là nhân viên có thể có buổi sáng linh hoạt hơn.'}], 'mistakes': ['Dùng However ở mọi đoạn khiến văn phong máy móc.']}, {'id': 'c1-inversion', 'level': 'C1', 'category': 'Advanced sentences', 'title': 'Inversion for emphasis', 'summary_vi': 'Dùng đảo ngữ có chọn lọc để tạo nhấn mạnh trong văn phong nâng cao.', 'explanation_vi': 'Inversion hữu ích ở C1 nhưng chỉ nên dùng khi tự nhiên; nó không làm câu hay hơn nếu ý tưởng đơn giản.', 'rules': ['Never/Rarely/Seldom + auxiliary + subject + verb.', 'Not only + auxiliary + subject + verb, but...', 'Only after/when... + auxiliary + subject + verb.'], 'examples': [{'en': 'Rarely do we consider the long-term cost.', 'vi': 'Hiếm khi chúng ta cân nhắc chi phí dài hạn.'}, {'en': 'Not only does the tool save time, but it also reduces errors.', 'vi': 'Công cụ không chỉ tiết kiệm thời gian mà còn giảm lỗi.'}], 'mistakes': ['Lạm dụng đảo ngữ trong email thông thường.']}, {'id': 'c1-cleft', 'level': 'C1', 'category': 'Emphasis', 'title': 'Cleft sentences for controlled emphasis', 'summary_vi': 'Dùng It is...that và What...is để nhấn đúng thông tin quan trọng.', 'explanation_vi': 'Cleft sentences giúp người viết kiểm soát trọng tâm câu thay vì chỉ dựa vào từ vựng mạnh.', 'rules': ['It is/was X that/who...', 'What + clause + be + focus.', 'Dùng khi thật sự cần contrast hoặc emphasis.'], 'examples': [{'en': 'What matters most is how consistently the system performs.', 'vi': 'Điều quan trọng nhất là hệ thống hoạt động ổn định đến mức nào.'}, {'en': 'It was the lack of training that caused most of the confusion.', 'vi': 'Chính việc thiếu đào tạo gây ra phần lớn sự nhầm lẫn.'}], 'mistakes': ['Dùng cleft sentence cho mọi câu khiến bài viết nặng nề.']}, {'id': 'c1-hedging', 'level': 'C1', 'category': 'Academic style', 'title': 'Hedging: sound precise, not weak', 'summary_vi': 'Giảm các khẳng định tuyệt đối bằng may, tends to, appears to, in many cases.', 'explanation_vi': 'Writing nâng cao thường tránh khẳng định quá mức. Hedging cho thấy bạn hiểu giới hạn của lập luận.', 'rules': ['may/might/could để giảm mức chắc chắn.', 'tends to / is likely to cho xu hướng.', 'in many cases / to some extent để giới hạn phạm vi.'], 'examples': [{'en': 'Remote work may improve productivity in some roles.', 'vi': 'Làm việc từ xa có thể cải thiện năng suất ở một số vị trí.'}, {'en': 'This approach tends to work better for experienced users.', 'vi': 'Cách tiếp cận này có xu hướng hiệu quả hơn với người dùng có kinh nghiệm.'}], 'mistakes': ['Everyone knows... / This always proves... khi không có cơ sở chắc chắn.']}, {'id': 'c1-nominalisation', 'level': 'C1', 'category': 'Formal style', 'title': 'Nominalisation without making writing heavy', 'summary_vi': 'Biến động từ/tính từ thành danh từ khi cần văn phong formal, nhưng tránh câu quá nặng.', 'explanation_vi': 'Nominalisation có thể tạo văn phong trang trọng và giúp gom ý, nhưng active verbs thường vẫn rõ hơn trong nhiều ngữ cảnh.', 'rules': ['decide → decision, improve → improvement, analyse → analysis.', 'Dùng để đóng gói một quá trình thành một khái niệm.', 'Ưu tiên clarity; không nominalise chỉ để trông học thuật.'], 'examples': [{'en': 'The implementation of the policy requires careful planning.', 'vi': 'Việc triển khai chính sách cần lập kế hoạch cẩn thận.'}, {'en': 'A reduction in errors would improve reliability.', 'vi': 'Việc giảm lỗi sẽ cải thiện độ tin cậy.'}], 'mistakes': ['Xếp quá nhiều danh từ liên tiếp làm câu khó đọc.']}]

IMPROVE_MODE_INSTRUCTIONS = {
    "correct": "Correct grammar, spelling and punctuation with the minimum necessary changes. Preserve the learner's voice.",
    "grammar": "First correct errors, then suggest a stronger version using more varied but natural grammar appropriate to the target CEFR level. Do not make the writing artificially complex.",
    "vocabulary": "First correct errors, then improve word choice, collocations and precision. Avoid rare words that a learner would not realistically use.",
    "polish": "Correct errors and produce a stronger version with both more natural grammar and better vocabulary while preserving the original meaning and tone.",
}


def ollama_json(messages: list[dict[str, str]], schema: dict[str, Any], num_predict: int = 1200, temperature: float = 0.1) -> dict[str, Any]:
    body = {
        "model": OLLAMA_MODEL,
        "stream": False,
        "think": False,
        "keep_alive": "30m",
        "format": schema,
        "options": {
            "temperature": temperature,
            "num_ctx": 4096,
            "num_predict": num_predict,
        },
        "messages": messages,
    }
    response = requests.post(f"{OLLAMA_URL}/api/chat", json=body, timeout=REQUEST_TIMEOUT)
    response.raise_for_status()
    envelope = response.json()
    return extract_json(envelope.get("message", {}).get("content", ""))


def improve_with_ollama(payload: ImproveIn) -> dict[str, Any]:
    schema = {
        "type": "object",
        "properties": {
            "corrected_text": {"type": "string"},
            "upgraded_text": {"type": "string"},
            "summary_vi": {"type": "string"},
            "grammar_upgrades": {
                "type": "array",
                "maxItems": 8,
                "items": {
                    "type": "object",
                    "properties": {
                        "original": {"type": "string"},
                        "improved": {"type": "string"},
                        "pattern": {"type": "string"},
                        "reason_vi": {"type": "string"},
                    },
                    "required": ["original", "improved", "pattern", "reason_vi"],
                },
            },
            "vocabulary_upgrades": {
                "type": "array",
                "maxItems": 10,
                "items": {
                    "type": "object",
                    "properties": {
                        "original": {"type": "string"},
                        "improved": {"type": "string"},
                        "example": {"type": "string"},
                        "note_vi": {"type": "string"},
                    },
                    "required": ["original", "improved", "example", "note_vi"],
                },
            },
        },
        "required": ["corrected_text", "upgraded_text", "summary_vi", "grammar_upgrades", "vocabulary_upgrades"],
    }
    system = (
        "You are an English writing improvement coach. Preserve the learner's intended meaning. "
        "Never invent facts. Never make the writing unnecessarily formal. "
        "Vietnamese explanations must use the Latin alphabet and contain no CJK characters."
    )
    user = (
        f"TARGET CEFR: {payload.target_cefr}\n"
        f"MODE: {payload.mode}\n"
        f"INSTRUCTION: {IMPROVE_MODE_INSTRUCTIONS[payload.mode]}\n\n"
        f"LEARNER TEXT:\n{payload.text}\n\n"
        "Return a corrected version and a realistic upgraded version. "
        "List only useful reusable grammar and vocabulary improvements."
    )
    result = ollama_json(
        [{"role": "system", "content": system}, {"role": "user", "content": user}],
        schema,
        num_predict=1800,
        temperature=0.1,
    )
    if contains_cjk(str(result.get("summary_vi", ""))):
        result["summary_vi"] = ""
    result["mode"] = payload.mode
    result["target_cefr"] = payload.target_cefr
    return result


def normalise_lookup_word(word: str) -> str:
    word = re.sub(r"\s+", " ", word.strip())
    word = re.sub(r"^[^\w'-]+|[^\w'-]+$", "", word, flags=re.UNICODE)
    if not word or len(word) > 80:
        raise HTTPException(400, "Invalid word or phrase")
    if len(word.split()) > 4:
        raise HTTPException(400, "Select up to four words")
    return word


def cambridge_url_for(word: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", word.casefold()).strip("-")
    return f"https://dictionary.cambridge.org/dictionary/english/{quote(slug)}"


def dictionary_ai_fallback(word: str) -> dict[str, Any]:
    schema = {
        "type": "object",
        "properties": {
            "word": {"type": "string"},
            "phonetic": {"type": "string"},
            "definitions": {
                "type": "array",
                "minItems": 1,
                "maxItems": 4,
                "items": {
                    "type": "object",
                    "properties": {
                        "part_of_speech": {"type": "string"},
                        "definition": {"type": "string"},
                        "example": {"type": "string"},
                        "synonyms": {"type": "array", "items": {"type": "string"}, "maxItems": 5},
                    },
                    "required": ["part_of_speech", "definition", "example", "synonyms"],
                },
            },
        },
        "required": ["word", "phonetic", "definitions"],
    }
    result = ollama_json(
        [
            {"role": "system", "content": "You are a compact English learner dictionary. Definitions must be short, clear English. Examples must be original and natural. Do not claim an exact IPA if uncertain; use an empty phonetic string instead."},
            {"role": "user", "content": f"Define this English word or short phrase: {word}"},
        ],
        schema,
        num_predict=650,
        temperature=0.0,
    )
    result["source"] = f"local-ai:{OLLAMA_MODEL}"
    result["audio"] = ""
    result["cambridge_url"] = cambridge_url_for(word)
    return result


def lookup_dictionary(word: str) -> dict[str, Any]:
    clean = normalise_lookup_word(word)
    cache_key = clean.casefold()
    with db() as conn:
        row = conn.execute("SELECT payload_json, fetched_at FROM dictionary_cache WHERE word = ?", (cache_key,)).fetchone()
        if row:
            try:
                fetched = datetime.fromisoformat(row["fetched_at"])
                if datetime.now().astimezone() - fetched < timedelta(days=30):
                    payload = json.loads(row["payload_json"])
                    payload["cached"] = True
                    return payload
            except Exception:
                pass

    payload = None
    try:
        response = requests.get(
            f"https://api.dictionaryapi.dev/api/v2/entries/en/{quote(clean)}",
            timeout=8,
        )
        if response.ok:
            data = response.json()
            if isinstance(data, list) and data:
                entry = data[0]
                phonetic = str(entry.get("phonetic") or "")
                audio = ""
                if not phonetic:
                    for p in entry.get("phonetics", []):
                        if p.get("text"):
                            phonetic = str(p["text"])
                            break
                for p in entry.get("phonetics", []):
                    if p.get("audio"):
                        audio = str(p["audio"])
                        if audio.startswith("//"):
                            audio = "https:" + audio
                        break
                definitions = []
                for meaning in entry.get("meanings", []):
                    pos = str(meaning.get("partOfSpeech") or "")
                    for definition in meaning.get("definitions", [])[:2]:
                        definitions.append({
                            "part_of_speech": pos,
                            "definition": str(definition.get("definition") or ""),
                            "example": str(definition.get("example") or ""),
                            "synonyms": [str(x) for x in definition.get("synonyms", [])[:5]],
                        })
                        if len(definitions) >= 5:
                            break
                    if len(definitions) >= 5:
                        break
                if definitions:
                    payload = {
                        "word": str(entry.get("word") or clean),
                        "phonetic": phonetic,
                        "audio": audio,
                        "definitions": definitions,
                        "source": "dictionaryapi.dev",
                        "cambridge_url": cambridge_url_for(clean),
                        "cached": False,
                    }
    except Exception:
        payload = None

    if payload is None:
        try:
            payload = dictionary_ai_fallback(clean)
            payload["cached"] = False
        except Exception as exc:
            raise HTTPException(503, "Dictionary service is unavailable and local AI fallback failed.") from exc

    with db() as conn:
        conn.execute(
            """
            INSERT INTO dictionary_cache(word, payload_json, fetched_at)
            VALUES (?, ?, ?)
            ON CONFLICT(word) DO UPDATE SET
              payload_json = excluded.payload_json,
              fetched_at = excluded.fetched_at
            """,
            (cache_key, json.dumps(payload, ensure_ascii=False), datetime.now().astimezone().isoformat(timespec="seconds")),
        )
        conn.commit()
    return payload


@app.post("/api/improve")
def api_improve(payload: ImproveIn) -> dict[str, Any]:
    try:
        return improve_with_ollama(payload)
    except requests.RequestException as exc:
        raise HTTPException(503, "Ollama is unavailable for writing improvement.") from exc
    except Exception as exc:
        raise HTTPException(502, "The improvement model returned invalid structured output.") from exc


@app.get("/api/library/grammar")
def api_grammar_library() -> dict[str, Any]:
    with db() as conn:
        completed = {
            str(r["lesson_id"])
            for r in conn.execute("SELECT lesson_id FROM grammar_progress").fetchall()
        }
    lessons=[]
    for item in GRAMMAR_COURSE:
        row=dict(item)
        row["completed"]=row["id"] in completed
        lessons.append(row)
    return {
        "lessons": lessons,
        "total": len(lessons),
        "completed": len(completed),
        "levels": ["A1","A2","B1","B2","C1"],
    }


def generate_grammar_lesson(lesson: dict[str, Any]) -> dict[str, Any]:
    schema={
        "type":"object",
        "properties":{
            "explanation_vi":{"type":"string"},
            "rules":{"type":"array","minItems":3,"maxItems":6,"items":{"type":"string"}},
            "examples":{
                "type":"array","minItems":3,"maxItems":5,
                "items":{
                    "type":"object",
                    "properties":{"en":{"type":"string"},"vi":{"type":"string"}},
                    "required":["en","vi"],
                },
            },
            "mistakes":{"type":"array","minItems":2,"maxItems":5,"items":{"type":"string"}},
            "writing_tip_vi":{"type":"string"},
        },
        "required":["explanation_vi","rules","examples","mistakes","writing_tip_vi"],
    }
    system=(
        "You write concise original English grammar lessons for Vietnamese learners. "
        "The lesson must match the requested CEFR level and objective. "
        "Explain in Vietnamese using Latin alphabet. English examples stay in English. "
        "Do not copy a textbook or website. Focus on practical writing."
    )
    user=(
        f"LEVEL: {lesson['level']}\n"
        f"TOPIC: {lesson['title']}\n"
        f"OBJECTIVE: {lesson['objective_vi']}\n"
        "Create a short teachable lesson with reusable rules, natural examples, common mistakes, and one writing tip."
    )
    return ollama_json(
        [{"role":"system","content":system},{"role":"user","content":user}],
        schema,
        num_predict=1300,
        temperature=0.1,
    )


@app.get("/api/library/grammar/{lesson_id}")
def api_grammar_lesson(lesson_id: str) -> dict[str, Any]:
    lesson=GRAMMAR_BY_ID.get(lesson_id)
    if not lesson:
        raise HTTPException(404,"Grammar lesson not found")
    with db() as conn:
        row=conn.execute(
            "SELECT content_json FROM grammar_lesson_cache WHERE lesson_id = ?",
            (lesson_id,),
        ).fetchone()
    if row:
        detail=json.loads(row["content_json"])
        source="cache"
    else:
        try:
            detail=generate_grammar_lesson(lesson)
            source=f"ollama:{OLLAMA_MODEL}"
            with db() as conn:
                conn.execute(
                    """
                    INSERT INTO grammar_lesson_cache(lesson_id, content_json, generated_at)
                    VALUES (?, ?, ?)
                    ON CONFLICT(lesson_id) DO UPDATE SET
                      content_json=excluded.content_json,
                      generated_at=excluded.generated_at
                    """,
                    (
                        lesson_id,
                        json.dumps(detail,ensure_ascii=False),
                        datetime.now().astimezone().isoformat(timespec="seconds"),
                    ),
                )
                conn.commit()
        except Exception:
            detail={
                "explanation_vi": lesson["objective_vi"]+" Hãy chú ý cách cấu trúc này hoạt động trong câu hoàn chỉnh và trong ngữ cảnh writing.",
                "rules":["Đọc ví dụ và nhận diện cấu trúc chính.","So sánh câu đúng với lỗi thường gặp.","Tự viết ít nhất hai câu trước khi chuyển bài."],
                "examples":[
                    {"en":"Create your own example for this grammar point.","vi":"Tự tạo một ví dụ cho điểm ngữ pháp này."},
                    {"en":"Use the pattern in a complete sentence.","vi":"Dùng cấu trúc trong một câu hoàn chỉnh."},
                    {"en":"Review the sentence for accuracy and meaning.","vi":"Kiểm tra lại độ chính xác và ý nghĩa của câu."},
                ],
                "mistakes":["Không học công thức tách rời khỏi câu hoàn chỉnh.","Không cố dùng cấu trúc nâng cao khi chưa hiểu nghĩa."],
                "writing_tip_vi":"Sau khi học, hãy dùng cấu trúc này trong một đoạn writing ngắn.",
            }
            source="built-in-fallback"
    with db() as conn:
        done=conn.execute("SELECT 1 FROM grammar_progress WHERE lesson_id = ?",(lesson_id,)).fetchone() is not None
    return {**lesson,**detail,"completed":done,"source":source}


@app.post("/api/library/grammar/{lesson_id}/complete")
def api_complete_grammar(lesson_id: str) -> dict[str, Any]:
    if lesson_id not in GRAMMAR_BY_ID:
        raise HTTPException(404,"Grammar lesson not found")
    now=datetime.now().astimezone().isoformat(timespec="seconds")
    with db() as conn:
        conn.execute(
            """
            INSERT INTO grammar_progress(lesson_id,completed_at)
            VALUES (?,?)
            ON CONFLICT(lesson_id) DO UPDATE SET completed_at=excluded.completed_at
            """,
            (lesson_id,now),
        )
        conn.commit()
    return {"completed":True,"lesson_id":lesson_id}


@app.delete("/api/library/grammar/{lesson_id}/complete")
def api_uncomplete_grammar(lesson_id: str) -> dict[str, Any]:
    with db() as conn:
        cur=conn.execute("DELETE FROM grammar_progress WHERE lesson_id = ?",(lesson_id,))
        conn.commit()
    return {"completed":False,"changed":cur.rowcount>0,"lesson_id":lesson_id}


@app.post("/api/translate")
def api_translate(payload: TranslateIn) -> dict[str, Any]:
    schema={
        "type":"object",
        "properties":{
            "translation_vi":{"type":"string"},
            "natural_meaning_vi":{"type":"string"},
            "part_of_speech":{"type":"string"},
            "note_vi":{"type":"string"},
        },
        "required":["translation_vi","natural_meaning_vi","part_of_speech","note_vi"],
    }
    try:
        result=ollama_json(
            [
                {
                    "role":"system",
                    "content":(
                        "Translate English into natural Vietnamese for a language learner. "
                        "Translate phrases by meaning, not word by word. Keep notes concise."
                    ),
                },
                {"role":"user","content":payload.text},
            ],
            schema,
            num_predict=500,
            temperature=0.0,
        )
        result["text"]=payload.text
        return result
    except Exception as exc:
        raise HTTPException(503,"Local translation is unavailable.") from exc


@app.get("/api/dictionary")
def api_dictionary(word: str) -> dict[str, Any]:
    return lookup_dictionary(word)


@app.get("/api/vocabulary")
def api_vocabulary() -> dict[str, Any]:
    with db() as conn:
        rows = conn.execute("SELECT * FROM saved_words ORDER BY added_at DESC").fetchall()
    return {"items": [dict(row) for row in rows]}


@app.post("/api/vocabulary")
def api_save_vocabulary(payload: SaveWordIn) -> dict[str, Any]:
    word = normalise_lookup_word(payload.word)
    now = datetime.now().astimezone().isoformat(timespec="seconds")
    with db() as conn:
        conn.execute(
            """
            INSERT INTO saved_words(word, phonetic, part_of_speech, definition, added_at, translation_vi)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(word) DO UPDATE SET
              phonetic = excluded.phonetic,
              part_of_speech = excluded.part_of_speech,
              definition = excluded.definition,
              added_at = excluded.added_at,
              translation_vi = excluded.translation_vi,
              translation_vi = excluded.translation_vi
            """,
            (word, payload.phonetic, payload.part_of_speech, payload.definition, now, payload.translation_vi),
        )
        conn.commit()
    return {"saved": True, "word": word, "added_at": now}


@app.delete("/api/vocabulary/{word}")
def api_delete_vocabulary(word: str) -> dict[str, Any]:
    clean = normalise_lookup_word(word)
    with db() as conn:
        cur = conn.execute("DELETE FROM saved_words WHERE lower(word) = lower(?)", (clean,))
        conn.commit()
    return {"deleted": cur.rowcount > 0}

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
        previous = None
        if int(row["revision_no"] or 1) > 1:
            previous = conn.execute(
                "SELECT * FROM essays WHERE series_id = ? AND revision_no = ?",
                (row["series_id"], int(row["revision_no"]) - 1),
            ).fetchone()
    d = row_to_dict(row, detail=True)
    d["revisions"] = [dict(r) for r in series_rows]
    d["delta"] = revision_delta(d, previous)
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
