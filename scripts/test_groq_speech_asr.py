"""Dependency-light Groq ASR adapter smoke test."""
from __future__ import annotations

import sys
import types
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

# Host Python used for Manual Mode verification may not have project deps installed.
# Stub only the tiny requests surface needed to import speech_asr; the adapter itself
# still uses the real requests package inside the application/container runtime.
try:
    import requests  # noqa: F401
except ModuleNotFoundError:
    requests = types.ModuleType("requests")
    class RequestException(Exception):
        pass
    class Timeout(RequestException):
        pass
    class Session:
        pass
    requests.RequestException = RequestException
    requests.Timeout = Timeout
    requests.Session = Session
    sys.modules["requests"] = requests

from writing_coach.speech_asr import GroqSpeechAsrProvider


class FakeResponse:
    status_code = 200

    def json(self):
        return {
            "text": "Hello world",
            "language": "en",
            "segments": [{"start": 0.1, "end": 1.2, "text": "Hello world"}],
            "words": [
                {"start": 0.1, "end": 0.5, "word": "Hello"},
                {"start": 0.6, "end": 1.2, "word": "world"},
            ],
        }


class FakeSession:
    def __init__(self):
        self.last = None

    def post(self, url, **kwargs):
        self.last = (url, kwargs)
        return FakeResponse()


session = FakeSession()
provider = GroqSpeechAsrProvider("test-key", session=session)
result = provider.transcribe_bytes(
    b"fake-webm",
    filename="recording.webm",
    content_type="audio/webm",
    language="en",
)

assert result.provider == "groq"
assert result.model == "whisper-large-v3-turbo"
assert result.text == "Hello world"
assert result.segments[0].start_ms == 100
assert result.segments[0].end_ms == 1200
assert result.words[1].word == "world"

url, kwargs = session.last
assert url.endswith("/audio/transcriptions")
assert kwargs["headers"]["Authorization"] == "Bearer test-key"
assert ("response_format", "verbose_json") in kwargs["data"]
assert ("timestamp_granularities[]", "segment") in kwargs["data"]
assert ("timestamp_granularities[]", "word") in kwargs["data"]
assert ("language", "en") in kwargs["data"]

print("Groq speech ASR smoke: PASS")
