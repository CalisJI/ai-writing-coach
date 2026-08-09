from __future__ import annotations

import json
import re
from dataclasses import dataclass
from typing import Any


class AIProviderError(RuntimeError):
    pass


class AIProviderUnavailable(AIProviderError):
    pass


@dataclass
class AIResult:
    data: dict[str, Any]
    provider: str
    model: str
    runtime: dict[str, Any]

    @property
    def label(self) -> str:
        return f"{self.provider}:{self.model}"


def extract_json_object(text: str) -> dict[str, Any]:
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

    raise AIProviderError("AI provider did not return a complete JSON object.")
