from __future__ import annotations

import asyncio
import inspect
import json
from pathlib import Path

import pytest
import requests
from fastapi import HTTPException, Request

import auth_support
import writing_coach.media_api as media_api
import writing_coach.media_ingestion as media_ingestion
import writing_coach.media_learning as media_learning
from writing_coach.media_api import MediaImportIn, serialize_media_acquisition
from writing_coach.media_ingestion import (
    MediaImportCategory,
    MediaImportError,
    MediaIngestionService,
    ProviderRequestFailed,
    ProviderSourceUnavailable,
    ProviderTimedOut,
)
from writing_coach.media_providers.youtube import (
    BoundedYouTubeSession,
    PublicYouTubeCaptionClient,
    YouTubeCaptionSnippet,
    YouTubeCaptionTrack,
    YouTubeMediaProviderAdapter,
)


VIDEO_ID = "dQw4w9WgXcQ"
ROOT = Path(__file__).resolve().parents[1]


@pytest.fixture(autouse=True)
def no_live_provider_network(monkeypatch: pytest.MonkeyPatch) -> None:
    def fail_network(*_args: object, **_kwargs: object) -> None:
        raise AssertionError("M1.2 unit tests must not access the network")

    monkeypatch.setattr(requests.sessions.Session, "request", fail_network)


class FakeMetadataClient:
    def __init__(self, title: str = "A public media lesson", error: Exception | None = None) -> None:
        self.title = title
        self.error = error
        self.calls: list[str] = []

    def fetch_title(self, canonical_source_url: str) -> str:
        self.calls.append(canonical_source_url)
        if self.error is not None:
            raise self.error
        return self.title


class FakeCaptionClient:
    def __init__(
        self,
        track: YouTubeCaptionTrack | None,
        error: Exception | None = None,
    ) -> None:
        self.track = track
        self.error = error
        self.calls: list[str] = []

    def fetch_track(self, video_id: str) -> YouTubeCaptionTrack | None:
        self.calls.append(video_id)
        if self.error is not None:
            raise self.error
        return self.track


def _track(language: str = "en") -> YouTubeCaptionTrack:
    return YouTubeCaptionTrack(
        source_language=language,
        snippets=(
            YouTubeCaptionSnippet("Second caption", 1.5, 0.5),
            YouTubeCaptionSnippet("First caption", 0.0, 1.25),
        ),
    )


def _service(
    track: YouTubeCaptionTrack | None = None,
    *,
    caption_error: Exception | None = None,
    metadata_error: Exception | None = None,
) -> tuple[MediaIngestionService, FakeMetadataClient, FakeCaptionClient]:
    metadata = FakeMetadataClient(error=metadata_error)
    captions = FakeCaptionClient(_track() if track is None else track, error=caption_error)
    adapter = YouTubeMediaProviderAdapter(metadata_client=metadata, caption_client=captions)
    service = MediaIngestionService(
        adapters=(adapter,),
        source_language_supported=lambda code: code in {"en", "zh"},
    )
    return service, metadata, captions


@pytest.mark.parametrize(
    "source_url",
    (
        f"https://www.youtube.com/watch?v={VIDEO_ID}",
        f"https://youtu.be/{VIDEO_ID}",
        f"https://youtube.com/shorts/{VIDEO_ID}",
    ),
)
def test_supported_youtube_urls_share_one_canonical_acquisition(source_url: str) -> None:
    service, metadata, captions = _service()

    acquisition = service.import_media(source_url, "vi")

    assert acquisition.media_object.asset.asset_id == f"youtube:{VIDEO_ID}"
    assert acquisition.media_object.asset.source_url == (
        f"https://www.youtube.com/watch?v={VIDEO_ID}"
    )
    assert metadata.calls == [f"https://www.youtube.com/watch?v={VIDEO_ID}"]
    assert captions.calls == [VIDEO_ID]


@pytest.mark.parametrize(
    ("source_url", "category"),
    (
        ("not-a-url", MediaImportCategory.MALFORMED_URL),
        (
            f"https://user:secret@www.youtube.com/watch?v={VIDEO_ID}",
            MediaImportCategory.MALFORMED_URL,
        ),
        ("https://www.youtube.com/watch", MediaImportCategory.MALFORMED_URL),
        ("https://example.invalid/video", MediaImportCategory.UNSUPPORTED_PROVIDER),
    ),
)
def test_malformed_and_unsupported_urls_fail_safely(
    source_url: str,
    category: MediaImportCategory,
) -> None:
    service, _metadata, captions = _service()

    with pytest.raises(MediaImportError) as caught:
        service.import_media(source_url, "vi")

    assert caught.value.category is category
    assert captions.calls == []
    assert source_url not in caught.value.learner_message


def test_playback_and_transcript_serialize_to_the_agreed_frontend_dto() -> None:
    service, _metadata, _captions = _service()

    response = serialize_media_acquisition(
        service.import_media(f"https://youtu.be/{VIDEO_ID}", "vi")
    )

    assert response["playback"] == {
        "provider": "youtube",
        "kind": "embed",
        "url": f"https://www.youtube-nocookie.com/embed/{VIDEO_ID}",
    }
    assert response["asset"]["source_provider"] == "youtube"
    assert response["asset"]["source_type"] == "external-video"
    assert response["asset"]["transcript_available"] is True
    assert response["asset"]["translation_available"] is False
    assert response["translations"] == []

    transcript = response["transcript"]
    assert transcript is not None
    assert transcript["source_language"] == "en"
    assert [segment["original_text"] for segment in transcript["segments"]] == [
        "First caption",
        "Second caption",
    ]
    assert [segment["order"] for segment in transcript["segments"]] == [0, 1]
    assert [segment["segment_id"] for segment in transcript["segments"]] == [
        f"youtube:{VIDEO_ID}:segment:000000",
        f"youtube:{VIDEO_ID}:segment:000001",
    ]
    assert [(segment["start_ms"], segment["end_ms"]) for segment in transcript["segments"]] == [
        (0, 1250),
        (1500, 2000),
    ]


def test_caption_unavailable_returns_truthful_transcript_null_state() -> None:
    metadata = FakeMetadataClient()
    captions = FakeCaptionClient(None)
    service = MediaIngestionService(
        adapters=(YouTubeMediaProviderAdapter(metadata, captions),),
        source_language_supported=lambda code: code in {"en", "zh"},
    )

    response = serialize_media_acquisition(
        service.import_media(f"https://youtu.be/{VIDEO_ID}", "vi")
    )

    assert response["asset"]["source_language"] == "und"
    assert response["asset"]["transcript_available"] is False
    assert response["asset"]["translation_available"] is False
    assert response["transcript"] is None
    assert response["translations"] == []


@pytest.mark.parametrize(
    ("error", "category"),
    (
        (ProviderSourceUnavailable(), MediaImportCategory.MEDIA_UNAVAILABLE),
        (ProviderTimedOut(), MediaImportCategory.PROVIDER_TIMEOUT),
        (ProviderRequestFailed(), MediaImportCategory.PROVIDER_FAILURE),
    ),
)
def test_provider_failures_use_learner_safe_categories(
    error: Exception,
    category: MediaImportCategory,
) -> None:
    service, _metadata, _captions = _service(caption_error=error)

    with pytest.raises(MediaImportError) as caught:
        service.import_media(f"https://youtu.be/{VIDEO_ID}", "vi")

    assert caught.value.category is category
    assert VIDEO_ID not in caught.value.learner_message


@pytest.mark.parametrize(
    "track",
    (
        YouTubeCaptionTrack("en", ()),
        YouTubeCaptionTrack(
            "en",
            (YouTubeCaptionSnippet("Invalid time", -0.5, 1.0),),
        ),
        YouTubeCaptionTrack(
            "en",
            (YouTubeCaptionSnippet(" ", 0.0, 1.0),),
        ),
    ),
)
def test_malformed_provider_captions_fail_the_m1_contract(
    track: YouTubeCaptionTrack,
) -> None:
    service, _metadata, _captions = _service(track)

    with pytest.raises(MediaImportError) as caught:
        service.import_media(f"https://youtu.be/{VIDEO_ID}", "vi")

    assert caught.value.category is MediaImportCategory.MALFORMED_TRANSCRIPT


@pytest.mark.parametrize(
    ("source_language", "text"),
    (
        ("en", "A shared English caption."),
        ("zh", "这是一个共享的中文字幕。"),
    ),
)
def test_english_and_chinese_use_the_same_ingestion_pipeline(
    source_language: str,
    text: str,
) -> None:
    track = YouTubeCaptionTrack(
        source_language,
        (YouTubeCaptionSnippet(text, 0.0, 1.0),),
    )
    service, _metadata, captions = _service(track)

    acquisition = service.import_media(f"https://youtu.be/{VIDEO_ID}", "vi")

    assert type(acquisition.media_object) is media_learning.MediaLearningObject
    assert acquisition.media_object.asset.source_language == source_language
    assert acquisition.media_object.transcript is not None
    assert acquisition.media_object.transcript.segments[0].original_text == text
    assert captions.calls == [VIDEO_ID]


def test_unsupported_source_language_fails_at_the_application_boundary() -> None:
    service, _metadata, _captions = _service(
        YouTubeCaptionTrack("fr", (YouTubeCaptionSnippet("Bonjour", 0.0, 1.0),))
    )

    with pytest.raises(MediaImportError) as caught:
        service.import_media(f"https://youtu.be/{VIDEO_ID}", "vi")

    assert caught.value.category is MediaImportCategory.UNSUPPORTED_SOURCE_LANGUAGE


def test_api_maps_safe_error_category_without_provider_detail(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    service, _metadata, _captions = _service(caption_error=ProviderTimedOut())
    monkeypatch.setattr(media_api, "_media_ingestion_service", service)

    with pytest.raises(HTTPException) as caught:
        media_api.import_media(
            MediaImportIn(
                source_url=f"https://youtu.be/{VIDEO_ID}",
                target_language="vi",
            )
        )

    assert caught.value.status_code == 504
    assert caught.value.detail == {
            "category": "provider_timeout",
            "message": "The media provider did not respond in time. Please try again.",
    }


def test_media_import_api_is_protected_by_current_learner_auth_middleware(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    service, _metadata, captions = _service()
    monkeypatch.setattr(media_api, "_media_ingestion_service", service)
    monkeypatch.setattr(auth_support, "AUTH_ENABLED", True)
    middleware = auth_support.UserIsolationMiddleware(app=lambda *_args: None)
    request = Request(
        {
            "type": "http",
            "method": "POST",
            "path": "/api/media-learning/import",
            "raw_path": b"/api/media-learning/import",
            "query_string": b"",
            "headers": [],
            "scheme": "http",
            "server": ("test", 80),
            "client": ("test", 123),
            "session": {},
        }
    )

    async def fail_if_routed(_request: Request) -> None:
        raise AssertionError("Unauthenticated media import reached the provider route")

    response = asyncio.run(middleware.dispatch(request, fail_if_routed))

    assert response.status_code == 401
    assert json.loads(response.body) == {"detail": "Authentication required"}
    assert captions.calls == []


def test_provider_network_and_product_side_effects_remain_isolated() -> None:
    core_source = inspect.getsource(media_ingestion).casefold()
    domain_source = inspect.getsource(media_learning).casefold()
    api_source = inspect.getsource(media_api).casefold()
    combined = core_source + api_source

    assert "youtube" not in core_source
    assert "youtube" not in domain_source
    assert "requests" not in combined
    assert "writing_coach.ai" not in combined
    assert "sqlite" not in combined
    assert "sqlalchemy" not in combined
    assert "generate_structured" not in combined
    assert "speech_asr" not in combined
    assert "learner_translation" not in combined
    assert "yt_dlp" not in combined


def test_request_dto_accepts_current_support_language_without_starting_translation() -> None:
    payload = MediaImportIn(
        source_url=f"https://youtu.be/{VIDEO_ID}",
        target_language=" vi ",
    )

    assert payload.target_language == "vi"


def test_public_caption_dependency_is_wrapped_without_network_access() -> None:
    class FakeSnippet:
        text = "Provider caption"
        start = 0.25
        duration = 1.5

    class FakeFetchedTranscript:
        language_code = "zh"

        def __iter__(self):
            return iter((FakeSnippet(),))

    class FakeTranscript:
        def fetch(self) -> FakeFetchedTranscript:
            return FakeFetchedTranscript()

    class FakeTranscriptApi:
        def list(self, video_id: str) -> tuple[FakeTranscript, ...]:
            assert video_id == VIDEO_ID
            return (FakeTranscript(),)

    client = PublicYouTubeCaptionClient(api=FakeTranscriptApi())  # type: ignore[arg-type]

    track = client.fetch_track(VIDEO_ID)

    assert track == YouTubeCaptionTrack(
        source_language="zh",
        snippets=(YouTubeCaptionSnippet("Provider caption", 0.25, 1.5),),
    )


def test_caption_http_boundary_applies_a_bounded_timeout(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    captured: dict[str, object] = {}

    def fake_request(
        _session: requests.Session,
        method: str,
        url: str,
        **kwargs: object,
    ) -> requests.Response:
        captured.update({"method": method, "url": url, **kwargs})
        return requests.Response()

    monkeypatch.setattr(requests.Session, "request", fake_request)
    session = BoundedYouTubeSession(timeout_seconds=7)

    session.get("https://provider.example.invalid/captions")

    assert captured["method"] == "GET"
    assert captured["url"] == "https://provider.example.invalid/captions"
    assert captured["allow_redirects"] is True
    assert captured["timeout"] == 7


def test_application_registers_the_agreed_authenticated_import_route() -> None:
    from app import app

    registered_routes = list(app.routes)
    for route in app.routes:
        included_router = getattr(route, "original_router", None)
        if included_router is not None:
            registered_routes.extend(included_router.routes)
    matching_routes = [
        route
        for route in registered_routes
        if getattr(route, "path", None) == "/api/media-learning/import"
    ]

    assert len(matching_routes) == 1
    assert matching_routes[0].methods == {"POST"}


def test_canonical_state_marks_m11_closed_and_m12_in_progress() -> None:
    project_state = (ROOT / "docs/project/PROJECT_STATE.md").read_text(encoding="utf-8")
    handoff = (ROOT / "docs/project/CURRENT_HANDOFF.md").read_text(encoding="utf-8")
    roadmap = (ROOT / "docs/project/ROADMAP.md").read_text(encoding="utf-8")
    normalized_state = " ".join(project_state.split()).casefold()
    normalized_handoff = " ".join(handoff.split()).casefold()
    normalized_roadmap = " ".join(roadmap.split()).casefold()

    assert "m1.1 is **closed / approved / merged**" in normalized_state
    assert "m1.2 is **in progress**" in normalized_state
    assert "m1.1 is **closed / approved / merged**" in normalized_handoff
    assert "m1.2 is **in progress**" in normalized_handoff
    assert "m1.1 — media object and segment contracts: **closed / merged**" in normalized_roadmap
    assert "m1.2 — media ingestion and transcript acquisition: **in progress**" in normalized_roadmap
    assert "m1.3 translation is the next planned checkpoint" in normalized_handoff

    assert "R2 — AI Capability Control Plane: **IN PROGRESS / HUMAN-GATED ACTIVATION**" in handoff
    assert "| Listening | HIDDEN | unavailable | unavailable | no |" in project_state
    assert "listening and speaking remain non-public" in normalized_handoff
