import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {MEDIA_LEARNING_FIXTURE,MEDIA_LEARNING_ZH_FIXTURE} from '../tests/fixtures/media-learning.js';
import {mediaImportState,validMediaUrl} from '../static/becoming/screens/listening.js';

assert.equal(validMediaUrl('https://example.com/video'),true);
assert.equal(validMediaUrl('javascript:alert(1)'),false);
assert.equal(mediaImportState(MEDIA_LEARNING_FIXTURE),'ready');
assert.equal(mediaImportState({...MEDIA_LEARNING_FIXTURE,asset:{...MEDIA_LEARNING_FIXTURE.asset,processing_state:'processing'}}),'processing');
assert.equal(mediaImportState({...MEDIA_LEARNING_FIXTURE,asset:{...MEDIA_LEARNING_FIXTURE.asset,processing_state:'failed'}}),'error');
assert.equal(mediaImportState({...MEDIA_LEARNING_FIXTURE,asset:{...MEDIA_LEARNING_FIXTURE.asset,transcript_available:false},transcript:null}),'transcript-unavailable');
assert.equal(MEDIA_LEARNING_ZH_FIXTURE.transcript.segments[0].original_text,'这是共享的原文字幕。');
assert.equal(MEDIA_LEARNING_ZH_FIXTURE.translations.length,0);

const source=readFileSync(new URL('../static/becoming/screens/listening.js',import.meta.url),'utf8');
const router=readFileSync(new URL('../static/becoming/router.js',import.meta.url),'utf8');
const release=readFileSync(new URL('../static/becoming/domain/skill-release.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../static/becoming/listening.css',import.meta.url),'utf8');
assert.match(router,/'listen'/);
assert.match(release,/listen:'listening'/);
assert.match(source,/data-select-segment/);
assert.match(source,/toggleOriginal/);
assert.match(source,/toggleMeaning/);
assert.match(source,/translation-unavailable/);
assert.match(source,/disabled title=/);
assert.doesNotMatch(source,/score|scoring|ListeningMedia|ListeningTranscript/);
assert.match(css,/@media\(max-width:1000px\)/);
assert.match(css,/@media\(max-width:620px\)/);
console.log('Listening UI contract: PASS');
