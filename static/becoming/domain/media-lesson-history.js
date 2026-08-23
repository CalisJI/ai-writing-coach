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
  if (!entry || typeof entry.source_url !== 'string' || !entry.source_url) return false;
  const savedAt = Number(entry.saved_at);
  return Number.isFinite(savedAt) && Date.now() - savedAt <= MAX_AGE_MS;
}

export function rememberMediaLesson({ learning_language = '', source_url = '', title = '', provider = '' } = {}) {
  const key = languageKey(learning_language);
  const url = cleanText(source_url, 400);
  if (!key || !url) return false;

  const all = readAll();
  const existing = Array.isArray(all[key]) ? all[key].filter(usable) : [];
  const previous = existing.find(entry => entry.source_url === url);

  const entry = {
    source_url: url,
    // Keep the older title if this import did not carry one, so a re-import
    // never downgrades a named lesson to a bare URL.
    title: cleanText(title, 160) || (previous ? previous.title : ''),
    provider: cleanText(provider, 40) || (previous ? previous.provider : ''),
    saved_at: Date.now(),
  };

  all[key] = [entry, ...existing.filter(item => item.source_url !== url)].slice(0, MAX_PER_LANGUAGE);
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

export function requestLessonAutostart(learningLanguage = '', sourceUrl = '') {
  const key = languageKey(learningLanguage);
  const url = cleanText(sourceUrl, 400);
  if (!key || !url) return false;
  try {
    sessionStorage.setItem(AUTOSTART_KEY, JSON.stringify({ key, url, at: Date.now() }));
    return true;
  } catch {
    return false;
  }
}

export function takeLessonAutostart(learningLanguage = '') {
  const key = languageKey(learningLanguage);
  if (!key) return '';
  let raw = null;
  try {
    raw = sessionStorage.getItem(AUTOSTART_KEY);
    sessionStorage.removeItem(AUTOSTART_KEY);
  } catch {
    return '';
  }
  if (!raw) return '';
  try {
    const parsed = JSON.parse(raw);
    // Only honour a fresh request for this language, so a stale handoff can
    // never hijack a later visit to Listening.
    if (!parsed || parsed.key !== key) return '';
    if (!Number.isFinite(Number(parsed.at)) || Date.now() - Number(parsed.at) > 60000) return '';
    return typeof parsed.url === 'string' ? parsed.url : '';
  } catch {
    return '';
  }
}
