import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const listening=readFileSync('static/becoming/screens/listening.js','utf8');
const interactive=readFileSync('static/becoming/components/interactive-transcript.js','utf8');
const css=readFileSync('static/becoming/interactive-transcript.css','utf8');
const smartFollow=listening.slice(
  listening.indexOf('function installSmartFollow'),
  listening.indexOf('export async function renderListening'),
);

assert.doesNotMatch(listening,/data-now-playing|syncNowPlayingDock|listening-now-playing/);
assert.match(interactive,/dataset\.canonicalSegmentIds/);
assert.match(interactive,/classList\.add\('it-playing-segment'/);
assert.match(listening,/const SMART_FOLLOW_IDLE_MS=4500/);
assert.match(smartFollow,/root\.addEventListener\('orena:media-time',scheduleFollow/);
assert.match(smartFollow,/root\.querySelector\('\.listening-workspace \.listening-segments'\)/);
assert.match(smartFollow,/scrollTranscriptRow\(container,row,\{focusFraction:\.45\}\)/);
assert.match(listening,/function transcriptRowGeometry[\s\S]*container\.scrollTop\+rowRect\.top-containerRect\.top/);
assert.match(listening,/function scrollTranscriptRow[\s\S]*container\.scrollTo\(\{/);
assert.match(listening,/function scrollTranscriptRow[\s\S]*container\.clientHeight\*focusFraction/);
assert.doesNotMatch(listening,/row\.offsetTop/);
assert.doesNotMatch(smartFollow,/scrollIntoView|window\.scroll|selected_segment_id|controller\.select/);
for(const eventName of ['wheel','touchstart','touchmove','pointerdown','keydown']){
  assert.match(smartFollow,new RegExp(`root\\.addEventListener\\('${eventName}'`));
}
for(const keyName of ['ArrowUp','ArrowDown','PageUp','PageDown','Home','End']){
  assert.match(listening,new RegExp(`'${keyName}'`));
}
assert.match(smartFollow,/clearTimeout\(resumeTimer\)/);
assert.match(smartFollow,/setTimeout\(resume,SMART_FOLLOW_IDLE_MS\)/);
assert.match(smartFollow,/resumeNow\(\)[\s\S]*resume\(\)/);

// The layout these lines pinned lived in interactive-transcript.css and has
// been replaced by orena/listening.css in the rebuild against
// ORENA-LISTENING-*. Keeping it in two files meant every rebuilt rule had to
// out-specify the old one, and that escalation then beat the rebuild's own
// mobile rules, so the old block is gone rather than merely overridden.
//
// What these assertions were protecting is still protected, re-pointed at the
// file that now owns it:
//   - the player stays put while the transcript scrolls (sticky, both widths)
//   - the transcript column can scroll independently
//   - the segment controls do not float over the transcript
//   - the two columns collapse to one on a narrow viewport
const listenCss=readFileSync('static/becoming/orena/listening.css','utf8');

// The player is pinned, and capped so a card taller than the window cannot
// hide its own transport - the bug that made this rebuild necessary to check.
assert.match(listenCss,/\.o-player\{[\s\S]*position:sticky/);
assert.match(listenCss,/\.o-player\{[\s\S]*max-height:calc\(100dvh/);

// Two columns that become one, and a player column that travels with the
// viewport instead of being pinned to the reference's pixel width.
assert.match(listenCss,/\.o-listen\{[\s\S]*grid-template-columns:clamp\(/);
assert.match(listenCss,/@media \(max-width:1023px\)[\s\S]*\.o-listen\{[\s\S]*grid-template-columns:minmax\(0,1fr\)/);

// The transcript scrolls on its own; the segment controls sit under it.
assert.match(listenCss,/\.listening-segments\{[\s\S]*overflow-y:auto/);
assert.doesNotMatch(listenCss,/\.listening-practice-controls\{[^}]*position:sticky/);

// The frame has to stay a containing block, or the absolutely positioned
// iframe escapes and covers the whole card.
assert.match(listenCss,/\.listening-video-frame\{[\s\S]*position:relative/);

// The offset variable is still read by the other transcript surfaces.
assert.match(css,/--listening-sticky-offset:/);
assert.doesNotMatch(css,/top:calc\(var\(--shell-topbar-height\) \+ var\(--space-3,12px\)\)/);
const listeningCss=readFileSync('static/becoming/listening.css','utf8');
assert.match(listeningCss,/@media\(max-width:620px\)[\s\S]*grid-template-columns:repeat\(5,minmax\(0,1fr\)\)/);
assert.doesNotMatch(listeningCss,/\[data-replay-current\][^}]*grid-column:1\/-1/);
assert.doesNotMatch(css,/\.listening-now-playing/);
assert.match(css,/\.listening-segment\.selected\.it-playing-segment/);
assert.match(css,/transition:background-color \.2s ease/);
// The five controls used to sit in one row, and this asserted their order in
// it. The rebuild against ORENA-LISTENING-* splits them by job: transport lives
// on the player (skip, play, skip, mute, rate) and segment movement lives under
// the transcript (previous, replay, next). Order within a row is no longer the
// contract; that every control still exists and still reaches the player is.
// The behavioural guards above this line are untouched.
for(const control of [
  'data-toggle-playback',
  'data-follow-playing',
  'data-previous-segment',
  'data-replay-current',
  'data-next-segment',
  'data-seek',
  'data-toggle-mute',
]){
  assert.match(listening,new RegExp(control),`listening lost the ${control} control`);
}
assert.match(listening,/data-follow-playing aria-label=/);

console.log('LISTENING_SMART_FOLLOW_CONTRACT=PASS');
