# Source contract for bounded speech upload reads.
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
source = (ROOT / "writing_coach" / "speech_api.py").read_text(encoding="utf-8")
provider = (ROOT / "writing_coach" / "speech_asr.py").read_text(encoding="utf-8")

for needle in (
    "async def _read_upload_limited",
    "_UPLOAD_READ_CHUNK_BYTES = 1024 * 1024",
    "remaining = max_bytes - total + 1",
    "await file.read(min(_UPLOAD_READ_CHUNK_BYTES, remaining))",
    "if total > max_bytes:",
    "raise SpeechAsrPayloadTooLarge()",
    "data = await _read_upload_limited(file, max_bytes=max_bytes)",
    "async def _read_pronunciation_upload_limited",
    "data = await _read_pronunciation_upload_limited(file, max_bytes=max_bytes)",
):
    assert needle in source, needle

assert "def max_bytes(self) -> int:" in provider
print("Speech API bounded upload contract: PASS")
