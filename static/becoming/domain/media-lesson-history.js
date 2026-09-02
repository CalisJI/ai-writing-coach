/* Recently prepared listening lessons, per learning language.
 *
 * Listening is the one skill where returning to the *same* material matters:
 * a learner follows a video, then comes back to it to shadow it, to re-hear a
 * segment, to check a word. Without a history they had to go and find the URL
 * again every single time, which is a quiet reason not to come back at all.
 *
 * This lives in localStorage, deliberately. The media-learning API is stateless
 * (import / status / translate all take a payload and return a result; nothing
 * is stored), so a server-side history needs a new table, and a schema change
 * is a human gate under AGENTS.md §15. A per-device list needs no gate, covers
 * the dominant case, and can be replaced by a synced list later without the UI
 * changing shape.
 *
 * Conventions follow media-import-resume.js: same key namespace, keyed by
 * learning language, every storage access guarded.
 */

const STORAGE_KEY = 'orena.media-lesson-history.v1';
const MAX_PER_LANGUAGE = 6;
const MAX_AGE_MS = 90 * 24 * 60 * 60 * 1000;

const languageKey = value => (typeof value === 'string' ? value.trim().toLowerCase() : '');
const cleanText = (value, limit) => (typeof value === 'string' ? value.trim().slice(0, limit) : '');

function readAll() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function writeAll(value) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    return true;
  } catch {
    /* Private mode, or the quota is full. The lesson still works; it just is
       not remembered. Never let this break an import. */
    return false;
  }
}

function usable(entry) {
  if (!entry || (!(typeof entry.source_url === 'string' && entry.source_url) && !(typeof entry.lesson_id === 'string' && entry.lesson_id))) return false;
  const savedAt = Number(entry.saved_at);
  return Number.isFinite(savedAt) && Date.now() - savedAt <= MAX_AGE_MS;
}

const validModes = new Set(['follow', 'active', 'dictation', 'shadowing']);

export function rememberMediaLesson({ learning_language = '', source_url = '', lesson_id = '', title = '', provider = '', selected_segment_id = '', mode = '' } = {}) {
  const key = languageKey(learning_language);
  const url = cleanText(source_url, 400);
  const lessonId = cleanText(lesson_id, 128);
  if (!key || (!url && !lessonId)) return false;

  const all = readAll();
  const existing = Array.isArray(all[key]) ? all[key].filter(usable) : [];
  const previous = existing.find(entry => lessonId ? entry.lesson_id === lessonId : !entry.lesson_id && entry.source_url === url);
  const segment = cleanText(selected_segment_id, 255) || (previous ? previous.selected_segment_id : '');
  const selectedMode = validModes.has(mode) ? mode : (previous && validModes.has(previous.mode) ? previous.mode : 'follow');

  const entry = {
    source_url: url,
    lesson_id: lessonId,
    // Keep the older title if this import did not carry one, so a re-import
    // never downgrades a named lesson to a bare URL.
    title: cleanText(title, 160) || (previous ? previous.title : ''),
    provider: cleanText(provider, 40) || (previous ? previous.provider : ''),
    selected_segment_id: segment,
    mode: selectedMode,
    saved_at: Date.now(),
  };

  all[key] = [entry, ...existing.filter(item => lessonId ? item.lesson_id !== lessonId : item.lesson_id || item.source_url !== url)].slice(0, MAX_PER_LANGUAGE);
  return writeAll(all);
}

export function listMediaLessons(learningLanguage = '') {
  const key = languageKey(learningLanguage);
  if (!key) return [];
  const all = readAll();
  const entries = Array.isArray(all[key]) ? all[key].filter(usable) : [];
  if (entries.length !== (all[key] || []).length) {
    all[key] = entries;
    writeAll(all);
  }
  return entries.slice(0, MAX_PER_LANGUAGE);
}

export function forgetMediaLesson(learningLanguage = '', sourceUrl = '') {
  const key = languageKey(learningLanguage);
  const url = cleanText(sourceUrl, 400);
  if (!key || !url) return false;
  const all = readAll();
  const entries = Array.isArray(all[key]) ? all[key].filter(usable) : [];
  const next = entries.filter(entry => entry.source_url !== url);
  if (next.length === entries.length) return false;
  all[key] = next;
  return writeAll(all);
}

/* ---- handoff ----
 * Speaking needs a prepared media session, which only Listening can build.
 * Rather than telling a learner to go to Listening and find the lesson again,
 * Speaking records which remembered lesson it wants; Listening picks that up
 * on mount and imports it straight away. This is what stops Speaking being
 * hard-wired to "whatever you happened to open in Listening this session".
 */
const AUTOSTART_KEY = 'orena.listen-autostart.v1';

export function requestLessonAutostart(learningLanguage = '', sourceUrl = '', context = {}) {
  const key = languageKey(learningLanguage);
  const url = cleanText(sourceUrl, 400);
  const lessonId = cleanText(context.lesson_id, 128);
  if (!key || (!url && !lessonId)) return false;
  try {
    sessionStorage.setItem(AUTOSTART_KEY, JSON.stringify({
      key, url, lesson_id: lessonId, at: Date.now(),
      selected_segment_id: cleanText(context.selected_segment_id, 255),
      mode: validModes.has(context.mode) ? context.mode : '',
    }));
    return true;
  } catch {
    return false;
  }
}

export function takeLessonAutostart(learningLanguage = '') {
  return takeLessonAutostartContext(learningLanguage)?.source_url || '';
}

export function takeLessonAutostartContext(learningLanguage = '') {
  const key = languageKey(learningLanguage);
  if (!key) return null;
  let raw = null;
  try {
    raw = sessionStorage.getItem(AUTOSTART_KEY);
    sessionStorage.removeItem(AUTOSTART_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    // Only honour a fresh request for this language, so a stale handoff can
    // never hijack a later visit to Listening.
    if (!parsed || parsed.key !== key) return null;
    if (!Number.isFinite(Number(parsed.at)) || Date.now() - Number(parsed.at) > 60000) return null;
    const url=cleanText(parsed.url,400);
    const lessonId=cleanText(parsed.lesson_id,128);
    if (!url && !lessonId) return null;
    return {
      source_url: url,
      lesson_id: lessonId,
      selected_segment_id: cleanText(parsed.selected_segment_id, 255),
      mode: validModes.has(parsed.mode) ? parsed.mode : 'follow',
    };
  } catch {
    return null;
  }
}

/* ---- resume ----
 * The prepared session lives in memory only, so a refresh loses the lesson and
 * the learner has to go and find it again. Persisting the payload is the wrong
 * fix: a transcript is large, localStorage has a quota, and a stale copy of a
 * lesson is worse than no copy.
 *
 * `saved_at` on the newest entry already records when a lesson was last
 * prepared, so it doubles as "what was I working on". Inside a short window
 * that is a resume; outside it, reopening Listening means starting something
 * new, and silently re-importing an old video would be the wrong guess.
 */
const RESUME_WINDOW_MS = 60 * 60 * 1000;

export function resumableLesson(learningLanguage = '', windowMs = RESUME_WINDOW_MS) {
  const [newest] = listMediaLessons(learningLanguage);
  if (!newest) return null;
  const savedAt = Number(newest.saved_at);
  if (!Number.isFinite(savedAt) || Date.now() - savedAt > windowMs) return null;
  return {
    source_url: newest.source_url,
    lesson_id: cleanText(newest.lesson_id, 128),
    title: newest.title || '',
    selected_segment_id: cleanText(newest.selected_segment_id, 255),
    mode: validModes.has(newest.mode) ? newest.mode : 'follow',
  };
}
