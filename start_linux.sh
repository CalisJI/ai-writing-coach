#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"
if [ ! -d .venv ]; then
  python3 -m venv .venv
  . .venv/bin/activate
  pip install -r requirements.txt
else
  . .venv/bin/activate
fi
export OLLAMA_MODEL="${OLLAMA_MODEL:-qwen3:4b}"
python -m uvicorn app:app --host 127.0.0.1 --port 8000
