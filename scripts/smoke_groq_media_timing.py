#!/usr/bin/env python3
from __future__ import annotations

import os
import sys

from writing_coach.media_ingestion import MediaIngestionService
from writing_coach.media_providers.youtube import YouTubeMediaProviderAdapter
from writing_coach.media_providers.youtube_audio import YtDlpYouTubeAudioUrlResolver
from writing_coach.media_timing import MediaTimingService
from writing_coach.speech_asr import GroqSpeechAsrProvider


SUPPORTED = {"en", "zh"}


def main() -> int:
    if len(sys.argv) != 3:
        print("usage: python scripts/smoke_groq_media_timing.py <youtube_url> <en|zh>")
        return 2

    source_url = sys.argv[1].strip()
    language = sys.argv[2].strip().casefold()
    if language not in SUPPORTED:
        print("LIVE_MEDIA_TIMING=FAIL")
        print("failure_kind=unsupported_test_language")
        return 2

    if not os.getenv("GROQ_API_KEY", "").strip():
        print("LIVE_MEDIA_TIMING=FAIL")
        print("failure_kind=missing_groq_api_key")
        return 2

    provider = GroqSpeechAsrProvider.from_env()
    if provider is None:
        print("LIVE_MEDIA_TIMING=FAIL")
        print("failure_kind=groq_provider_not_configured")
        return 2

    ingestion = MediaIngestionService(
        adapters=(
            YouTubeMediaProviderAdapter(
                enable_fallback=False,
                defer_transcript_recovery=True,
            ),
        ),
        source_language_supported=lambda code: code in SUPPORTED,
    )

    acquisition = ingestion.import_media(
        source_url,
        "vi",
        language,
    )
    native_transcript = acquisition.media_object.transcript is not None
    native_segments = (
        len(acquisition.media_object.transcript.segments)
        if acquisition.media_object.transcript is not None
        else 0
    )

    timing = MediaTimingService(
        YtDlpYouTubeAudioUrlResolver(),
        provider,
    ).enrich(
        acquisition,
        language,
    )

    transcript = timing.acquisition.media_object.transcript
    segment_count = len(transcript.segments) if transcript is not None else 0
    word_count = len(timing.words)

    print("LIVE_MEDIA_TIMING=PASS" if timing.status in {"ready", "segment_only"} else "LIVE_MEDIA_TIMING=FAIL")
    print(f"learning_language={language}")
    print(f"native_transcript={str(native_transcript).lower()}")
    print(f"native_segment_count={native_segments}")
    print(f"timing_status={timing.status}")
    print(f"timing_source={timing.source or '(none)'}")
    print(f"timing_model={timing.model or '(none)'}")
    print(f"failure_kind={timing.failure_kind or '(none)'}")
    print(f"final_transcript_available={str(transcript is not None).lower()}")
    print(f"final_segment_count={segment_count}")
    print(f"word_timing_count={word_count}")
    print("transcript_text_redacted=true")

    if timing.status == "ready" and word_count > 0:
        first = timing.words[0]
        last = timing.words[-1]
        print(f"timing_bounds_ms={first.start_ms}-{last.end_ms}")
        return 0
    if timing.status == "segment_only" and transcript is not None:
        return 0
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
