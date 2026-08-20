#!/usr/bin/env python3
from __future__ import annotations

import sys
from urllib.parse import urlsplit

from writing_coach.media_providers.youtube_audio import YtDlpYouTubeAudioUrlResolver
from writing_coach.media_timing import MediaAudioResolutionFailed


def main() -> int:
    if len(sys.argv) != 2:
        print("usage: python scripts/smoke_youtube_audio_resolver.py <youtube_url>")
        return 2

    source_url = sys.argv[1].strip()
    try:
        result = YtDlpYouTubeAudioUrlResolver().resolve(source_url)
    except MediaAudioResolutionFailed:
        print("YOUTUBE_AUDIO_RESOLVER=FAIL")
        return 1

    parsed = urlsplit(result.url)
    print("YOUTUBE_AUDIO_RESOLVER=PASS")
    print(f"provider={result.provider}")
    print(f"format_id={result.format_id or '(unknown)'}")
    print(f"resolved_scheme={parsed.scheme}")
    print(f"resolved_host={parsed.hostname or '(unknown)'}")
    print("resolved_url_redacted=true")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
