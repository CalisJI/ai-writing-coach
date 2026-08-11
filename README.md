# Docker service quick start

Bản này có `Dockerfile` + `compose.yaml` để chạy Writing Coach như service.

```powershell
Copy-Item .env.example .env
docker compose up -d --build
```

Mặc định app dùng `qwen3:8b` qua Ollama đang chạy trên Windows host. Xem **DOCKER_SETUP_VI.md** để cấu hình Ollama và Cloudflare Tunnel.

---

# AI Writing Coach — local MVP

A lightweight desktop-first local web app for English writing practice.

## What works now

- Large desktop writing editor
- Local AI scoring through Ollama
- Fixed 5-part rubric: Grammar 25%, Vocabulary 20%, Coherence 20%, Task achievement 20%, Naturalness 15%
- 0–100 internal progress score + CEFR estimate
- Vietnamese WHY/HOW explanations for detected issues
- SQLite essay history
- Recent-10 weighted skill score
- Progress line chart
- Recurring error analytics
- Streak and next-milestone indicator
- Offline demo fallback if Ollama is not running

> The 0–100 score and CEFR band mapping are tracking tools, not official Cambridge/IELTS scores.

## Fast setup on Windows

### 1) Install Ollama
Install Ollama, then in PowerShell/CMD:

```powershell
ollama pull qwen3:4b
```

For stronger evaluation on an 8 GB GPU, you can later try:

```powershell
ollama pull qwen3:8b
```

### 2) Start the app
Double-click:

```text
start_windows.bat
```

Then open `http://127.0.0.1:8000`.

The first start creates a Python virtual environment and installs the small Python dependency set.

## Change model

CMD:

```cmd
set OLLAMA_MODEL=qwen3:8b
start_windows.bat
```

PowerShell:

```powershell
$env:OLLAMA_MODEL="qwen3:8b"
python -m uvicorn app:app --host 127.0.0.1 --port 8000
```

## Data

All essays and scores are stored in:

```text
data/writing.db
```

No account or cloud database is required.

## Scoring design

The LLM does **not** directly decide the final overall score. It returns five component scores. The app computes:

```text
Overall = Grammar*0.25
        + Vocabulary*0.20
        + Coherence*0.20
        + TaskAchievement*0.20
        + Naturalness*0.15
```

The dashboard skill score is a weighted average of the latest 10 essays so a single lucky/unlucky essay cannot move the level too much.

## Next recommended development steps

1. Add revision/version tracking (original → revised → re-score).
2. Add clickable error highlights inside the original text.
3. Generate mini-exercises from recurring error categories.
4. Add a calibration set so the scoring prompt can be tested against fixed reference essays.
5. Optionally integrate this module into/fork from FreeLingo after the scoring loop is stable.

## v0.2.1 evaluator patch
- Qwen3 thinking disabled for faster scoring.
- Vietnamese-only feedback guardrail; CJK-contaminated explanations are filtered.
- Error fragments must exist verbatim in the learner text.
- Unchanged "corrections" are discarded.
- Only high-confidence (>= 0.75) feedback items are kept.
- Stronger article/spelling instructions to reduce false positives.

## v0.3 update-ready workflow

This release introduces a stable data volume, app/schema versioning, Docker Compose Watch for local development, and a safe Git-based updater with SQLite backup. See `UPDATE_SYSTEM.md`.


## PostgreSQL shadow foundation (v1.3.0)

The project now includes an opt-in PostgreSQL/SQLAlchemy/Alembic shadow data foundation. Runtime reads/writes remain on SQLite until a separately approved cutover. See `docs/POSTGRES_FOUNDATION.md`.


## Persistence runtime readiness (v1.3.1)

v1.3.1 keeps SQLite authoritative while moving runtime storage behind clearer
repository boundaries. Authentication and platform AI configuration now use
SQLite repository implementations rather than embedding SQLite SQL in service
modules, and PostgreSQL implementations of those same contracts are present for
a later cutover. Product storage already had this boundary from v1.2/v1.3.

A new scoped shadow-read verifier compares SQLite and PostgreSQL learning data
per user + language, preventing global-count verification from hiding isolation
errors. The learning runtime itself is deliberately still SQLite and is the next
major persistence cutover blocker.

## Learning repository boundary (v1.3.2)

Core learning persistence no longer executes SQLite SQL in `app.py`. Essays,
revision history, dashboard/error-memory reads, grammar completion, and basic
vocabulary CRUD now use `LearningRepository`, with SQLite still authoritative
and a PostgreSQL core implementation present for later cutover verification.
Dictionary and generated grammar-lesson caches remain local/rebuildable.

BECOMING memory, outcomes, Active Recall library, Reading Studio, and linguistic
services still use transitional SQLite adapters and remain the next persistence
boundary milestone. PostgreSQL runtime cutover is still disabled.
