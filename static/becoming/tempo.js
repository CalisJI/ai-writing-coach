/* ===== Orena — Tempo axis =====
   Mirrors theme.js: set a dataset attribute on <html>, optionally persist,
   announce the change so screens can react without polling.

   `studio`   — today's density. The default, so nothing changes for an
                existing learner until they opt in.
   `practice` — more air, larger targets, staged reveal, reward motion.

   Tempo is a presentation preference. It never changes what evidence the
   product holds about a learner, and it never changes a learning claim.
*/

const TEMPO_KEY = 'becoming.tempo.v1';
const TEMPOS = ['studio', 'practice'];

/* Guidance styles chosen at onboarding already describe how much scaffolding
   a learner wants. Until tempo has its own control, derive a sensible default
   from that instead of asking the learner the same question twice. */
const STYLE_DEFAULT = {
  guided: 'practice',
  examples: 'practice',
  concise: 'studio',
  deep: 'studio',
};

export function storedTempo() {
  let saved = null;
  try {
    saved = localStorage.getItem(TEMPO_KEY);
  } catch (error) {
    return null;
  }
  return TEMPOS.includes(saved) ? saved : null;
}

export function activeTempo() {
  const value = document.documentElement.dataset.tempo || storedTempo() || 'studio';
  return TEMPOS.includes(value) ? value : 'studio';
}

export function tempoForStyle(style) {
  return STYLE_DEFAULT[style] || 'studio';
}

export function applyTempo(tempo, { persist = false } = {}) {
  const resolved = TEMPOS.includes(tempo) ? tempo : 'studio';
  document.documentElement.dataset.tempo = resolved;
  if (persist) {
    try {
      localStorage.setItem(TEMPO_KEY, resolved);
    } catch (error) {
      /* Private mode or blocked storage: the tempo still applies for this
         session, it just will not be remembered. Not worth failing over. */
    }
  }
  window.dispatchEvent(new CustomEvent('becoming:tempo-changed', { detail: { tempo: resolved } }));
  return resolved;
}

/* Called once at boot. An explicit stored choice always wins over the
   guidance-style default, so changing guidance later never silently
   overrides a tempo the learner picked on purpose. */
export function installTempo({ style } = {}) {
  return applyTempo(storedTempo() || tempoForStyle(style));
}
