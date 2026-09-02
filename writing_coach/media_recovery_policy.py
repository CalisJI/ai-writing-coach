"""One transcript-recovery policy, shared by My Media and the bulk importer.

A learner importing a YouTube URL in My Media and a curator importing the same
URL through the L2/L3 catalog pipeline must reach the same answer about whether
that video is usable. Before this module they did not: the runtime built its
adapter with

    YouTubeMediaProviderAdapter(enable_fallback=False, defer_transcript_recovery=True)

so a caption-less video became a READY asset awaiting recovery, while the bulk
importer built a bare `YouTubeMediaProviderAdapter()` and inherited the opposite
defaults - inline fallback on, deferral off - so the same video could raise and
be recorded as a failed candidate.

That is two definitions of "no captions" for one product. This module holds the
single policy so neither side can drift again.
"""

from __future__ import annotations

from writing_coach.media_providers.supadata import SupadataTranscriptClient
from writing_coach.media_providers.youtube import YouTubeMediaProviderAdapter

# Absence of captions is not absence of media. Acquisition always returns the
# asset and its playback; transcript recovery is a separate, later step run by
# the fallback service, so playback state and transcript state stay independent.
DEFER_TRANSCRIPT_RECOVERY = True
INLINE_PROVIDER_FALLBACK = False


def build_youtube_adapter(
    fallback_client: SupadataTranscriptClient | None = None,
    **overrides: object,
) -> YouTubeMediaProviderAdapter:
    """The adapter both entry points use, with the shared recovery policy.

    `fallback_client` is accepted so a caller that genuinely has one can pass it
    through, but the policy flags are fixed: a caller cannot quietly opt into a
    different definition of a caption-less video.
    """

    overrides.pop("enable_fallback", None)
    overrides.pop("defer_transcript_recovery", None)
    return YouTubeMediaProviderAdapter(
        fallback_transcript_client=fallback_client,
        enable_fallback=INLINE_PROVIDER_FALLBACK,
        defer_transcript_recovery=DEFER_TRANSCRIPT_RECOVERY,
        **overrides,  # type: ignore[arg-type]
    )
