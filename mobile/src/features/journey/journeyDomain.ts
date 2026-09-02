/**
 * Pure helpers ported from static/becoming/screens/journey.js.
 *
 * The discipline this file exists to keep: a station is never given a plausible
 * date to complete the picture, and movement is null when there is nothing to
 * compare. journey.js says so in its own comment, and the screen would
 * otherwise be reporting progress the learner has not made.
 */

export type JourneyEssay = {created_at?: string; overall?: number; series_id?: number};
export type JourneyStrength = {stage?: string};
export type RevisionWin = {overall_delta?: number; latest_date?: string};

/** `groupEssays()`: drafts of one piece belong together, newest piece first. */
export function groupEssays(rows: readonly JourneyEssay[]): JourneyEssay[][] {
  const groups = new Map<string, JourneyEssay[]>();
  for (const row of rows) {
    const key = String(row.series_id ?? row.created_at ?? '');
    const bucket = groups.get(key);
    if (bucket) bucket.push(row); else groups.set(key, [row]);
  }
  return [...groups.values()]
    .map((group) => [...group].sort((a, b) => String(a.created_at || '').localeCompare(String(b.created_at || ''))))
    .sort((a, b) => String(b.at(-1)?.created_at || '').localeCompare(String(a.at(-1)?.created_at || '')));
}

/** Strengths the product is willing to call reliable. */
export function reliableStrengthCount(strengths: readonly JourneyStrength[]): number {
  return strengths.filter((item) => item.stage === 'Stable' || item.stage === 'Mastered').length;
}

/**
 * `writingProgressOverview()`'s movement: the change in overall score across the
 * last five pieces. Null -- not zero -- when there are not two pieces to
 * compare, because "no movement" and "nothing measured" are different facts.
 */
export function scoreMovement(groups: readonly JourneyEssay[][]): number | null {
  const latestFive = groups.slice(0, 5);
  const first = latestFive.at(-1)?.at(-1);
  const latest = latestFive[0]?.at(-1);
  if (!first || !latest || first === latest) return null;
  const from = Number(first.overall);
  const to = Number(latest.overall);
  if (!Number.isFinite(from) || !Number.isFinite(to)) return null;
  return to - from;
}

export type TimelineStation = {
  key: 'started' | 'win' | 'momentum' | 'focus' | 'next';
  done: boolean;
  current?: boolean;
  next?: boolean;
  /** The record's own date, or null. Never a plausible stand-in. */
  date: string | null;
  note: string;
};

/**
 * `timeline()`: five stations, each either dated from a record or drawn as not
 * reached.
 */
export function timelineStations(
  {essays, revisionWins, focusLabel, nextLabel}: {
    essays: readonly JourneyEssay[];
    revisionWins: readonly RevisionWin[];
    focusLabel: string;
    nextLabel: string;
  },
): TimelineStation[] {
  const sorted = [...essays].sort((a, b) => String(a.created_at || '').localeCompare(String(b.created_at || '')));
  const firstWin = revisionWins
    .filter((win) => Number(win.overall_delta) > 0)
    .sort((a, b) => String(a.latest_date || '').localeCompare(String(b.latest_date || '')))[0] ?? null;
  const third = sorted[2] ?? null;
  return [
    {key: 'started', done: sorted.length > 0, date: sorted[0]?.created_at ?? null, note: ''},
    {key: 'win', done: Boolean(firstWin), date: firstWin?.latest_date ?? null, note: ''},
    {key: 'momentum', done: Boolean(third), date: third?.created_at ?? null, note: ''},
    {key: 'focus', done: Boolean(focusLabel), current: true, date: null, note: focusLabel},
    {key: 'next', done: false, next: true, date: null, note: nextLabel},
  ];
}

/** `completedCard()`: revisions beyond the first draft of each piece. */
export function completedCounts(memory: {essay_count?: number; revision_count?: number} | null | undefined): {pieces: number; revisions: number} {
  const pieces = Number(memory?.essay_count) || 0;
  return {pieces, revisions: Math.max(0, (Number(memory?.revision_count) || 0) - pieces)};
}
