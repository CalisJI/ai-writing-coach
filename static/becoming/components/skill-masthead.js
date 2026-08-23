import {esc} from './primitives.js';

/* Editorial masthead for the four skill screens.
 *
 * Every skill screen used to open the same way: a thin grey band, a ghost
 * numeral at 3% opacity carrying no information (library and speak were both
 * "06"), and then cards. Four different skills were visually indistinguishable.
 *
 * The masthead replaces that with a section front: the skill named in display
 * type, its purpose in one line, and — the part that matters — one live number
 * drawn from the learner's own state. The number is the point. A masthead that
 * only announces "READ" is decoration; one that says "12 passages, 3 unread"
 * is orientation.
 *
 * Rules for the caller:
 *   - `stat` is optional. Screens with nothing true to show omit it rather
 *     than inventing a number.
 *   - `stat.value` must come from real data, never a placeholder
 *     (UIUX contract rule 10).
 *   - `stat.tone` is 'reward' only for effort evidence — a streak, a count of
 *     work done. Never for a score, a level, or anything implying mastery.
 */

const TONES = new Set(['neutral', 'accent', 'reward']);

export function skillMasthead({name = '', purpose = '', stat = null} = {}) {
  const tone = stat && TONES.has(stat.tone) ? stat.tone : 'neutral';
  const hasStat = Boolean(stat && (stat.value || stat.value === 0));

  const statBlock = hasStat
    ? `<div class="skill-masthead-stat" data-tone="${esc(tone)}">
         <span class="skill-masthead-value">${esc(String(stat.value))}</span>
         ${stat.label ? `<span class="skill-masthead-label">${esc(stat.label)}</span>` : ''}
       </div>`
    : '';

  return `<header class="skill-masthead${hasStat ? '' : ' is-quiet'}">
    <div class="skill-masthead-identity">
      <h1 class="skill-masthead-name">${esc(name)}</h1>
      ${purpose ? `<p class="skill-masthead-purpose">${esc(purpose)}</p>` : ''}
    </div>
    ${statBlock}
  </header>`;
}
