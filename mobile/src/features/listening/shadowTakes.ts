import {File, Paths} from 'expo-file-system';

/**
 * The learner's shadowing takes, ported from the `shadowTakes` Map in
 * static/becoming/screens/listening.js.
 *
 * That file is explicit about the rule this has to preserve: takes are held for
 * the session and never leave the device, which keeps shadowing inside M1.6's
 * browser-session-only state. The browser can hold a Blob in memory; a phone
 * cannot, so a take is a file — but the guarantee is the same one, enforced
 * here rather than assumed:
 *
 * - a take is copied into the app's own cache directory, never the shared
 *   media store, so nothing else on the device indexes it;
 * - nothing uploads it (the shadowing endpoint carries `completed_rounds` and
 *   nothing else);
 * - `releaseTakes()` deletes the files, and the studio calls it when the
 *   learner leaves.
 *
 * The copy is what makes more than one take possible at all: TransientAudioService
 * deletes the previous recording on the next `startRecording()`, so a take that
 * is not moved out of the way is gone the moment the next round starts.
 */

export type ShadowTake = {
  /** Where the take lives on this device, for playback only. */
  uri: string;
  /** Wall-clock length of the take, measured while recording. */
  ms: number;
  recordedAt: number;
};

/**
 * The two file operations this needs, behind a seam so the store is testable
 * without a device. expo-file-system 19's `File`/`Paths` API is synchronous.
 */
export type TakeFileSystem = {
  copy: (fromUri: string, toUri: string) => void;
  remove: (uri: string) => void;
  cacheDirectory: string | null;
};

const defaultFileSystem: TakeFileSystem = {
  copy: (fromUri, toUri) => { new File(fromUri).copy(new File(toUri)); },
  remove: (uri) => { new File(uri).delete(); },
  get cacheDirectory() { return Paths.cache.uri; },
};

/** `takeKey()`: takes belong to one segment of one asset. */
export const takeKey = (assetId: string | undefined, segmentId: string | undefined): string =>
  `${assetId || 'asset'}:${segmentId || 'segment'}`;

const extensionOf = (uri: string): string => {
  const match = /\.([A-Za-z0-9]{1,5})(?:\?|$)/.exec(uri);
  return match ? `.${match[1]}` : '.m4a';
};

/**
 * Move a just-finished recording somewhere the next round will not delete.
 * Returns null rather than throwing: a take that cannot be kept must not cost
 * the learner the round they just practised.
 */
export function keepTake(
  recordingUri: string,
  ms: number,
  fs: TakeFileSystem = defaultFileSystem,
  now: number = Date.now(),
): ShadowTake | null {
  const directory = fs.cacheDirectory;
  if (!recordingUri || !directory) return null;
  const separator = directory.endsWith('/') ? '' : '/';
  const target = `${directory}${separator}orena-shadow-${now}-${Math.floor(Math.random() * 1e6)}${extensionOf(recordingUri)}`;
  try {
    fs.copy(recordingUri, target);
    return {uri: target, ms: Math.max(0, Math.round(ms)), recordedAt: now};
  } catch {
    return null;
  }
}

/** Delete takes from the device. Best effort -- a file already gone is fine. */
export function releaseTakes(takes: readonly ShadowTake[], fs: TakeFileSystem = defaultFileSystem): void {
  for (const take of takes) {
    try { fs.remove(take.uri); } catch { /* cache cleanup is best effort */ }
  }
}

export type ShadowingSummary = {practiced_segments: number; total_segments: number; completed_rounds: number};

/**
 * `shadowingPracticeSummary()`: how many segments have been practised at all,
 * and how many rounds in total. Nothing here judges the recordings.
 */
export function shadowingSummary(rounds: Record<string, number>, totalSegments: number): ShadowingSummary {
  const values = Object.values(rounds);
  return {
    practiced_segments: values.filter((count) => count > 0).length,
    total_segments: totalSegments,
    completed_rounds: values.reduce((total, count) => total + count, 0),
  };
}

/**
 * The reference always shows at least three rounds, and one more empty row than
 * the learner has filled, so there is always a next round to start.
 */
export const roundCount = (takeCount: number): number => Math.max(3, takeCount + 1);
