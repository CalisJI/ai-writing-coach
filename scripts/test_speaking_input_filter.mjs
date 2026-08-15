import fs from 'node:fs';
import assert from 'node:assert/strict';

const source=fs.readFileSync(
  new URL('../static/becoming/components/audio-recorder.js',import.meta.url),
  'utf8'
);

assert.match(source,/noiseSuppression:\{ideal:true\}/);
assert.match(source,/echoCancellation:\{ideal:true\}/);
assert.match(source,/autoGainControl:\{ideal:true\}/);
assert.match(source,/channelCount:\{ideal:1\}/);
assert.match(source,/getSettings\?\.\(\)/);
assert.match(source,/input_settings:inputSettings/);

console.log('Speaking input audio filter contract: PASS');
