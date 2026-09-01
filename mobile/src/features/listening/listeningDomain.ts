/**
 * Pure helpers ported from static/becoming/screens/listening.js so native
 * derives the same state from the same lesson: the mode gate, the timestamp
 * stamp, the text-match comparison Active Listening reports, and its session
 * summary.
 */

export type ListeningMode = 'follow' | 'active' | 'shadowing';

/** `stamp()`: media positions read as M:SS, never as raw milliseconds. */
export function stamp(ms: number): string {
  const value = Number.isFinite(ms) ? Math.max(0, ms) : 0;
  return `${Math.floor(value / 60000)}:${String(Math.floor(value / 1000) % 60).padStart(2, '0')}`;
}

/**
 * `playbackAvailable()`: Active and Shadowing are reconstruction and speaking
 * exercises against real audio, so they are only offered when the provider
 * actually gives us something playable. Follow works from the transcript alone.
 */
export function playbackAvailable(playback: {kind?: string; provider?: string; url?: string} | undefined): boolean {
  if (!playback) return false;
  return playback.kind === 'embed' && playback.provider === 'youtube' && /\/embed\/[A-Za-z0-9_-]{11}/.test(playback.url || '');
}

export function listeningMode(requested: ListeningMode, playbackReady: boolean): ListeningMode {
  return playbackReady ? requested : 'follow';
}

/** listening.js's unit split: characters for zh, words elsewhere. */
export function listeningUnits(text: string, language: string): string[] {
  const value = String(text || '').trim();
  if (!value) return [];
  if (language === 'zh') return [...value.replace(/\s+/g, '')];
  return value.toLocaleLowerCase().split(/\s+/).filter(Boolean);
}

export const MAX_LISTENING_EVALUATION_UNITS = 120;
export const MAX_LISTENING_RECONSTRUCTION_CHARS = 2000;

export type TextMatch = {accuracy_percent: number; exact: boolean};

/**
 * The reconstruction comparison. It is a text match against this transcript --
 * listening.js says so on screen -- not a proficiency score, so it stays a
 * plain ordered-overlap ratio rather than anything that could read as an
 * assessment.
 */
export function textMatch(answer: string, expected: string, language: string): TextMatch {
  const left = listeningUnits(answer, language);
  const right = listeningUnits(expected, language);
  if (!right.length) return {accuracy_percent: 0, exact: false};
  const remaining = [...right];
  let hits = 0;
  for (const unit of left) {
    const index = remaining.indexOf(unit);
    if (index >= 0) { remaining.splice(index, 1); hits += 1; }
  }
  const accuracy = Math.round((hits / right.length) * 100);
  const exact = left.length === right.length && left.every((unit, index) => unit === right[index]);
  return {accuracy_percent: exact ? 100 : Math.min(accuracy, 99), exact};
}

export type SegmentPractice = {
  presentation: 'checked' | 'revealed';
  draft: string;
  attempts: {answer: string; result: TextMatch}[];
};

export type PracticeSummary = {
  practiced_segments: number; total_segments: number; checked_attempts: number;
  exact_match_segments: number; revealed_only_segments: number; average_best_text_match: number | null;
};

/** `listeningPracticeSummary()`: what this session actually did, nothing more. */
export function practiceSummary(sessions: Record<string, SegmentPractice>, totalSegments: number): PracticeSummary {
  const entries = Object.values(sessions);
  const checkedAttempts = entries.reduce((total, item) => total + item.attempts.length, 0);
  const exact = entries.filter((item) => item.attempts.some((attempt) => attempt.result.exact)).length;
  const revealedOnly = entries.filter((item) => item.presentation === 'revealed' && item.attempts.length === 0).length;
  const bests = entries
    .filter((item) => item.attempts.length > 0)
    .map((item) => Math.max(...item.attempts.map((attempt) => attempt.result.accuracy_percent)));
  return {
    practiced_segments: entries.filter((item) => item.attempts.length > 0 || item.presentation === 'revealed').length,
    total_segments: totalSegments,
    checked_attempts: checkedAttempts,
    exact_match_segments: exact,
    revealed_only_segments: revealedOnly,
    average_best_text_match: bests.length ? Math.round(bests.reduce((a, b) => a + b, 0) / bests.length) : null,
  };
}

/** The segment that owns a media position, for follow-along selection. */
export function segmentAt(segments: readonly {segment_id: string; start_ms: number; end_ms: number}[], positionMs: number): string | null {
  const hit = segments.find((segment) => positionMs >= segment.start_ms && positionMs < segment.end_ms);
  return hit?.segment_id ?? null;
}
