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
assert.doesNotMatch(css,/\.listening-now-playing/);
assert.match(css,/\.listening-segment\.selected\.it-playing-segment/);
assert.match(css,/transition:background-color \.2s ease/);
assert.match(listening,/data-toggle-playback[\s\S]*data-follow-playing[\s\S]*data-previous-segment[\s\S]*data-replay-current[\s\S]*data-next-segment/);
assert.match(listening,/data-follow-playing aria-label=/);

console.log('LISTENING_SMART_FOLLOW_CONTRACT=PASS');
