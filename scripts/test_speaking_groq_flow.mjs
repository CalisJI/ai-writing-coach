import fs from 'node:fs';
import assert from 'node:assert/strict';

const speaking=fs.readFileSync(new URL('../static/becoming/screens/speaking.js',import.meta.url),'utf8');
const recorder=fs.readFileSync(new URL('../static/becoming/components/audio-recorder.js',import.meta.url),'utf8');
const api=fs.readFileSync(new URL('../static/becoming/api.js',import.meta.url),'utf8');

assert.match(recorder,/recordingBlob/);
assert.match(recorder,/blob:recordingBlob/);
assert.match(recorder,/finish\(\{\s*url:recordingUrl,\s*blob:recordingBlob,/s);

assert.match(api,/transcribeSpeech:/);
assert.match(api,/\/api\/speech\/transcribe/);
assert.match(api,/new FormData\(\)/);

assert.match(speaking,/transcribe=api\.transcribeSpeech/);
assert.match(speaking,/await transcribe\(\s*result\.blob,/s);
assert.match(speaking,/model\.asrStatus='loading'/);
assert.match(speaking,/data-speaking-asr-result/);

console.log('Speaking -> Groq ASR source contract: PASS');
