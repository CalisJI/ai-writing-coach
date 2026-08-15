from __future__ import annotations
import json
from pathlib import Path

_PATH = Path(__file__).with_name("grammar_knowledge.json")
GRAMMAR_KNOWLEDGE = json.loads(_PATH.read_text(encoding="utf-8"))
GRAMMAR_KNOWLEDGE_BY_ID = {item["id"]: item for item in GRAMMAR_KNOWLEDGE}
