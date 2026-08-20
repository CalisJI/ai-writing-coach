#!/usr/bin/env python3
from __future__ import annotations

import os
import re
import sys
from urllib.parse import parse_qs, urlsplit

from writing_coach.media_providers.youtube_audio import YtDlpYouTubeAudioUrlResolver
from writing_coach.speech_asr import (
    GroqSpeechAsrProvider,
    SpeechAsrMalformed,
    SpeechAsrPayloadTooLarge,
    SpeechAsrRequestFailed,
    SpeechAsrTimedOut,
)


def main() -> int:
    if len(sys.argv) != 3:
        print("usage: python scripts/diagnose_groq_url.py <youtube_url> <en|zh>")
        return 2

    source_url = sys.argv[1].strip()
    language = sys.argv[2].strip().casefold()

    if not os.getenv("GROQ_API_KEY", "").strip():
        print("DIAG=FAIL")
        print("failure_kind=missing_groq_api_key")
        return 2

    resolved = YtDlpYouTubeAudioUrlResolver().resolve(source_url)
    parsed = urlsplit(resolved.url)
    query = parse_qs(parsed.query, keep_blank_values=True)

    print("RESOLVER=PASS")
    print(f"resolved_host={parsed.hostname or '(none)'}")
    print(f"resolved_format_id={resolved.format_id or '(unknown)'}")
    print(f"query_has_ip={'ip' in query}")
    print(f"query_has_expire={'expire' in query}")
    print(f"query_has_signature={any(k in query for k in ('sig','signature','lsig'))}")
    print("resolved_url_redacted=true")

    provider = GroqSpeechAsrProvider.from_env()
    if provider is None:
        print("DIAG=FAIL")
        print("failure_kind=groq_provider_not_configured")
        return 2

    try:
        result = provider.transcribe_url(resolved.url, language=language)
    except SpeechAsrRequestFailed as exc:
        print("GROQ_URL_TRANSCRIBE=FAIL")
        print("failure_kind=request_failed")
        print(f"http_status={exc.status_code}")
        # Groq's provider message is already bounded to 500 chars by the adapter.
        message = " ".join((exc.provider_message or "").split())
        message = re.sub(r"https?://\\S+", "<redacted-url>", message)
        print(f"provider_message={message or '(empty)'}")
        return 1
    except SpeechAsrTimedOut:
        print("GROQ_URL_TRANSCRIBE=FAIL")
        print("failure_kind=timeout")
        return 1
    except SpeechAsrPayloadTooLarge:
        print("GROQ_URL_TRANSCRIBE=FAIL")
        print("failure_kind=payload_too_large")
        return 1
    except SpeechAsrMalformed:
        print("GROQ_URL_TRANSCRIBE=FAIL")
        print("failure_kind=malformed")
        return 1

    print("GROQ_URL_TRANSCRIBE=PASS")
    print(f"detected_language={result.language}")
    print(f"segment_count={len(result.segments)}")
    print(f"word_count={len(result.words)}")
    print("transcript_text_redacted=true")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
