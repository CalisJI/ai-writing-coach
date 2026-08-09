import json
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
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```$", "", text)
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", text, re.S)
        if not match:
            raise
        return json.loads(match.group(0))


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
    user_prompt = f"""TARGET LEVEL: {payload.target_cefr}
WRITING TASK:
{payload.prompt or '(Free writing — evaluate clarity, language control and naturalness.)'}

LEARNER TEXT:
{payload.text}

Evaluate the text using the fixed rubric. Identify recurring/reusable learning points, not just typos."""

    body = {
        "model": OLLAMA_MODEL,
        "stream": False,
        "think": False,
        "keep_alive": "30m",
        "format": "json",
        "options": {
            "temperature": 0.1,
            "seed": 42,
            "num_ctx": 4096,
            "num_predict": 900,
        },
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
    }
    r = requests.post(f"{OLLAMA_URL}/api/chat", json=body, timeout=REQUEST_TIMEOUT)
    r.raise_for_status()
    content = r.json()["message"]["content"]
    raw = extract_json(content)
    raw["__learner_text"] = payload.text
    return validate_result(raw)


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
    except Exception as exc:
        if not ALLOW_FALLBACK:
            raise HTTPException(
                status_code=503,
                detail=f"Không kết nối được Ollama ({type(exc).__name__}). Kiểm tra OLLAMA_URL/model trước khi chấm bài.",
            ) from exc
        return heuristic_fallback(payload), "fallback-demo"


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
