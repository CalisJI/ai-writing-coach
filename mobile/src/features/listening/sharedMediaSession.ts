import type {MediaLesson} from '../../api/contracts/listening';

/**
 * The lesson Listening and Speaking share, ported from
 * static/becoming/domain/shared-media-session.js.
 *
 * Speaking's prompt is a segment of a Listening lesson, so Speaking needs the
 * whole payload: the segments to step through, and the playback to hear the
 * reference. The web keeps that in a module-level Map keyed by learning
 * language, and this keeps the same shape and the same lifetime -- in memory
 * for the run of the app, never persisted. Nothing here is a cache of server
 * state; it is the handoff between two screens.
 *
 * Native previously passed only `referenceText` through route params, so
 * Speaking had a string and no way to play the line it was asking the learner
 * to repeat.
 */

export type SharedMediaMode = 'follow' | 'active' | 'dictation' | 'shadowing';

export type SharedMediaSession = {
  learning_language: string;
  payload: MediaLesson;
  selected_segment_id: string;
  mode: SharedMediaMode;
};

const sessions = new Map<string, SharedMediaSession>();

const languageKey = (value: string | undefined): string => typeof value === 'string' ? value.trim().toLowerCase() : '';
const sessionMode = (value: unknown): SharedMediaMode =>
  value === 'follow' || value === 'active' || value === 'dictation' || value === 'shadowing' ? value : 'follow';

const segmentIds = (payload: MediaLesson | null | undefined): string[] =>
  (payload?.transcript?.segments ?? []).map((segment) => segment.segment_id).filter((value): value is string => typeof value === 'string' && value !== '');

/**
 * Refuses anything Speaking could not use: no language, no asset, or a
 * transcript with no segments. A selection that is not in the transcript falls
 * back to the first segment rather than being kept as a dangling id.
 */
export function setSharedMediaSession({learning_language, payload, selected_segment_id, mode}: {
  learning_language?: string;
  payload?: MediaLesson | null;
  selected_segment_id?: string | null;
  mode?: SharedMediaMode | null;
}): boolean {
  const key = languageKey(learning_language);
  const ids = segmentIds(payload);
  if (!key || !payload?.asset?.asset_id || ids.length === 0) return false;
  const selected = selected_segment_id && ids.includes(selected_segment_id) ? selected_segment_id : ids[0]!;
  const previous = sessions.get(key);
  // Reopening the same lesson keeps the mode the learner was in; a different
  // lesson starts in Follow.
  const sameAsset = previous?.payload.asset.asset_id === payload.asset.asset_id;
  const rememberedMode = mode == null && sameAsset ? sessionMode(previous?.mode) : sessionMode(mode);
  sessions.set(key, {learning_language: key, payload, selected_segment_id: selected, mode: rememberedMode});
  return true;
}

export function getSharedMediaSession(learningLanguage?: string): SharedMediaSession | null {
  const value = sessions.get(languageKey(learningLanguage));
  if (!value) return null;
  return {
    learning_language: value.learning_language,
    payload: value.payload,
    selected_segment_id: value.selected_segment_id,
    mode: sessionMode(value.mode),
  };
}

export function selectSharedMediaSegment(learningLanguage: string | undefined, segmentId: string): boolean {
  const current = sessions.get(languageKey(learningLanguage));
  if (!current || !segmentIds(current.payload).includes(segmentId)) return false;
  current.selected_segment_id = segmentId;
  return true;
}

export function setSharedMediaMode(learningLanguage: string | undefined, mode: SharedMediaMode): boolean {
  const current = sessions.get(languageKey(learningLanguage));
  if (!current || !['follow', 'active', 'dictation', 'shadowing'].includes(mode)) return false;
  current.mode = mode;
  return true;
}

/** Test seam; the app never clears a session, it replaces it. */
export function resetSharedMediaSessions(): void {
  sessions.clear();
}
