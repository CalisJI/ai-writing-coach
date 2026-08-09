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
from writing_coach.languages.english.grammar_course import GRAMMAR_COURSE, GRAMMAR_BY_ID
from writing_coach.languages.english.profile import RUBRIC_WEIGHTS, SYSTEM_PROMPT, score_to_level
from auth_support import AUTH_ENABLED, current_db_path, install_auth
from writing_coach.core.platform_api import router as platform_router
from fastapi import FastAPI, HTTPException
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
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
SCHEMA_VERSION = 6

app = FastAPI(title="AI Writing Coach", version=APP_VERSION)
app.mount("/static", StaticFiles(directory=ROOT / "static"), name="static")

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
        cols = column_names(conn, "essays")
        if "language_code" not in cols:
            conn.execute("ALTER TABLE essays ADD COLUMN language_code TEXT NOT NULL DEFAULT 'en'")
        if "target_level" not in cols:
            conn.execute("ALTER TABLE essays ADD COLUMN target_level TEXT")
        if "level_estimate" not in cols:
            conn.execute("ALTER TABLE essays ADD COLUMN level_estimate TEXT")
        if "module_data_json" not in cols:
            conn.execute("ALTER TABLE essays ADD COLUMN module_data_json TEXT NOT NULL DEFAULT '{}'")
        conn.execute("UPDATE essays SET language_code = 'en' WHERE language_code IS NULL OR language_code = ''")
        conn.execute("UPDATE essays SET target_level = target_cefr WHERE target_level IS NULL OR target_level = ''")
        conn.execute("UPDATE essays SET level_estimate = cefr_estimate WHERE level_estimate IS NULL OR level_estimate = ''")
        conn.execute(
            """
            CREATE TRIGGER IF NOT EXISTS trg_essays_generic_metadata_after_insert
            AFTER INSERT ON essays
            BEGIN
              UPDATE essays
              SET
                language_code = COALESCE(NULLIF(language_code, ''), 'en'),
                target_level = COALESCE(NULLIF(target_level, ''), NEW.target_cefr),
                level_estimate = COALESCE(NULLIF(level_estimate, ''), NEW.cefr_estimate),
                module_data_json = COALESCE(NULLIF(module_data_json, ''), '{}')
              WHERE id = NEW.id;
            END
            """
        )
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_essays_language_series_revision "
            "ON essays(language_code, series_id, revision_no)"
        )
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
app.include_router(platform_router)

def weighted_overall(result: dict[str, Any]) -> float:
    score = sum(float(result[k]) * w for k, w in RUBRIC_WEIGHTS.items())
    return round(max(0, min(100, score)), 1)


def app_cefr(score: float) -> str:
    return score_to_level(score)

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


@app.get("/static/account.js")
def account_script() -> HTMLResponse:
    return HTMLResponse(
        (ROOT / "static" / "account.js").read_text(encoding="utf-8"),
        media_type="application/javascript",
        headers={"Cache-Control": "no-cache"},
    )


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
