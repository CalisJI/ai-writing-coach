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

assert.match(css,/listening-workspace\[data-listening-mode="follow"\] \.listening-video-frame\{\s*position:sticky/);
assert.match(css,/grid-template-columns:minmax\(0,1\.3fr\) minmax\(360px,\.9fr\)/);
assert.match(css,/@media \(max-width:959px\)[\s\S]*grid-template-columns:minmax\(0,1fr\)/);
assert.match(css,/\.listening-workspace\[data-listening-mode="follow"\] \.listening-practice-controls\{\s*position:static/);
assert.doesNotMatch(css,/\.listening-transcript \.listening-practice-controls\{\s*position:sticky/);
assert.match(css,/\.listening-workspace\[data-listening-mode="follow"\] \.listening-transcript\{\s*display:flex[\s\S]*flex-direction:column/);
assert.match(css,/--listening-sticky-offset:/);
assert.match(css,/\.listening-video-frame\{[\s\S]*top:var\(--listening-sticky-offset\)/);
assert.match(css,/@media \(max-width:959px\)\{[\s\S]*\.listening-video\{[\s\S]*top:var\(--listening-sticky-offset\)/);
assert.doesNotMatch(css,/top:calc\(var\(--shell-topbar-height\) \+ var\(--space-3,12px\)\)/);
assert.match(css,/\.listening-workspace\[data-listening-mode="follow"\] \.listening-video\{\s*position:sticky/);
const listeningCss=readFileSync('static/becoming/listening.css','utf8');
assert.match(listeningCss,/@media\(max-width:620px\)[\s\S]*grid-template-columns:repeat\(5,minmax\(0,1fr\)\)/);
assert.doesNotMatch(listeningCss,/\[data-replay-current\][^}]*grid-column:1\/-1/);
assert.doesNotMatch(css,/\.listening-now-playing/);
assert.match(css,/\.listening-segment\.selected\.it-playing-segment/);
assert.match(css,/transition:background-color \.2s ease/);
assert.match(listening,/data-toggle-playback[\s\S]*data-follow-playing[\s\S]*data-previous-segment[\s\S]*data-replay-current[\s\S]*data-next-segment/);
assert.match(listening,/data-follow-playing aria-label=/);

console.log('LISTENING_SMART_FOLLOW_CONTRACT=PASS');
