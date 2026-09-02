import * as SecureStore from 'expo-secure-store';
import {z} from 'zod';
import type {KeyValueStorage} from '../../storage/boundedCache';

/**
 * Recently prepared listening lessons, per learning language, ported from
 * static/becoming/domain/media-lesson-history.js.
 *
 * Its reasoning holds here unchanged: Listening is the skill where returning to
 * the same material matters, the media-learning API is stateless, and a
 * server-side history would need a schema change, which is a human gate. A
 * per-device list needs none. Native had no history at all, so every lesson
 * meant finding the URL again.
 */

const STORAGE_KEY = 'orena.media-lesson-history.v1';
const MAX_PER_LANGUAGE = 6;
const MAX_AGE_MS = 90 * 24 * 60 * 60 * 1000;

export const mediaLessonSchema = z.object({
  source_url: z.string().max(400).default(''),
  lesson_id: z.string().max(128).default(''),
  title: z.string().max(160).default(''),
  provider: z.string().max(40).default(''),
  selected_segment_id: z.string().max(255).default(''),
  mode: z.enum(['follow', 'active', 'dictation', 'shadowing']).default('follow'),
  saved_at: z.number(),
}).strip();

export type MediaLessonEntry = z.infer<typeof mediaLessonSchema>;

const historySchema = z.record(z.array(z.unknown()));

export const secureMediaLessonStorage: KeyValueStorage = {
  getItem: (key) => key === STORAGE_KEY ? SecureStore.getItemAsync(key) : Promise.resolve(null),
  setItem: (key, value) => key === STORAGE_KEY ? SecureStore.setItemAsync(key, value) : Promise.resolve(),
  removeItem: (key) => key === STORAGE_KEY ? SecureStore.deleteItemAsync(key) : Promise.resolve(),
};

const languageKey = (value: string) => value.trim().toLowerCase();
const usable = (entry: MediaLessonEntry, now: number) => Boolean(entry.source_url || entry.lesson_id) && Number.isFinite(entry.saved_at) && now - entry.saved_at <= MAX_AGE_MS;

async function readAll(storage: KeyValueStorage): Promise<Record<string, unknown[]>> {
  try {
    const raw = await storage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return historySchema.parse(JSON.parse(raw));
  } catch { return {}; }
}

function parseEntries(value: unknown[] | undefined, now: number): MediaLessonEntry[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => { try { return mediaLessonSchema.parse(item); } catch { return null; } })
    .filter((item): item is MediaLessonEntry => item !== null && usable(item, now));
}

export async function listMediaLessons(learningLanguage: string, storage: KeyValueStorage = secureMediaLessonStorage, now: number = Date.now()): Promise<MediaLessonEntry[]> {
  const key = languageKey(learningLanguage);
  if (!key) return [];
  const all = await readAll(storage);
  return parseEntries(all[key], now).slice(0, MAX_PER_LANGUAGE);
}

/**
 * A re-import that carries no title must never downgrade a named lesson to a
 * bare URL, so the previous entry's values survive an emptier one.
 */
export async function rememberMediaLesson(
  entry: {learning_language: string; source_url?: string; lesson_id?: string; title?: string; provider?: string; selected_segment_id?: string; mode?: MediaLessonEntry['mode']},
  storage: KeyValueStorage = secureMediaLessonStorage,
  now: number = Date.now(),
): Promise<boolean> {
  const key = languageKey(entry.learning_language);
  const url = (entry.source_url || '').trim().slice(0, 400);
  const lessonId = (entry.lesson_id || '').trim().slice(0, 128);
  if (!key || (!url && !lessonId)) return false;
  try {
    const all = await readAll(storage);
    const existing = parseEntries(all[key], now);
    const previous = existing.find((item) => lessonId ? item.lesson_id === lessonId : !item.lesson_id && item.source_url === url);
    const next: MediaLessonEntry = mediaLessonSchema.parse({
      source_url: url,
      lesson_id: lessonId,
      title: (entry.title || '').trim().slice(0, 160) || previous?.title || '',
      provider: (entry.provider || '').trim().slice(0, 40) || previous?.provider || '',
      selected_segment_id: (entry.selected_segment_id || '').trim().slice(0, 255) || previous?.selected_segment_id || '',
      mode: entry.mode || previous?.mode || 'follow',
      saved_at: now,
    });
    all[key] = [next, ...existing.filter((item) => lessonId ? item.lesson_id !== lessonId : item.lesson_id || item.source_url !== url)].slice(0, MAX_PER_LANGUAGE);
    await storage.setItem(STORAGE_KEY, JSON.stringify(all));
    return true;
  } catch {
    /* Storage is full or unavailable. The lesson still works; it just is not
       remembered. This must never break an import. */
    return false;
  }
}

export async function forgetMediaLesson(learningLanguage: string, sourceUrl: string, storage: KeyValueStorage = secureMediaLessonStorage, now: number = Date.now()): Promise<boolean> {
  const key = languageKey(learningLanguage);
  const url = (sourceUrl || '').trim().slice(0, 400);
  if (!key || !url) return false;
  try {
    const all = await readAll(storage);
    all[key] = parseEntries(all[key], now).filter((item) => item.source_url !== url);
    await storage.setItem(STORAGE_KEY, JSON.stringify(all));
    return true;
  } catch { return false; }
}
