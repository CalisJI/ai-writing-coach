from __future__ import annotations

from writing_coach.media_ingestion import (
    MediaIngestionService,
    ProviderRequestFailed,
)
from writing_coach.media_providers.youtube import (
    YouTubeCaptionTrack,
    YouTubeMediaProviderAdapter,
)


class Metadata:
    def fetch_title(self, _source_url: str) -> str:
        return "Lesson"


class NoCaptions:
    def fetch_track(self, _video_id: str, _source_language: str) -> YouTubeCaptionTrack | None:
        return None


class BrokenCaptions:
    def fetch_track(self, _video_id: str, _source_language: str):
        raise ProviderRequestFailed()


class ForbiddenFallback:
    def fetch(self, *_args, **_kwargs):
        raise AssertionError("embedded Supadata fallback must be disabled")


def service_for(caption_client) -> MediaIngestionService:
    adapter = YouTubeMediaProviderAdapter(
        metadata_client=Metadata(),
        caption_client=caption_client,
        fallback_transcript_client=ForbiddenFallback(),  # type: ignore[arg-type]
        enable_fallback=False,
        defer_transcript_recovery=True,
    )
    return MediaIngestionService(
        adapters=(adapter,),
        source_language_supported=lambda code: code in {"en", "zh"},
    )


def test_native_only_adapter_returns_transcriptless_media_for_groq_orchestration() -> None:
    acquisition = service_for(NoCaptions()).import_media(
        "https://youtu.be/dQw4w9WgXcQ",
        "vi",
        "en",
    )
    assert acquisition.media_object.asset.asset_id == "youtube:dQw4w9WgXcQ"
    assert acquisition.media_object.asset.source_language == "und"
    assert acquisition.media_object.transcript is None


def test_native_caption_provider_failure_can_defer_to_groq_orchestration() -> None:
    acquisition = service_for(BrokenCaptions()).import_media(
        "https://youtu.be/dQw4w9WgXcQ",
        "vi",
        "en",
    )
    assert acquisition.media_object.asset.source_language == "und"
    assert acquisition.media_object.transcript is None
