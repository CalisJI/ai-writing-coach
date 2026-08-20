import assert from 'node:assert/strict';
import {
  buildTranscriptDisplayUnits,
  displayUnitContains,
  displayUnitMeaning,
} from '../static/becoming/domain/transcript-display-units.js';

const source=[
  {segment_id:'s0',order:0,start_ms:0,end_ms:3900,original_text:'do you forget words when you speak'},
  {segment_id:'s1',order:1,start_ms:2100,end_ms:6100,original_text:"English don't worry you are not alone"},
  {segment_id:'s2',order:2,start_ms:6100,end_ms:9500,original_text:'many people have this problem but I have'},
  {segment_id:'s3',order:3,start_ms:9400,end_ms:12600,original_text:'good news for you today I will help you'},
];

const units=buildTranscriptDisplayUnits(source);
assert.equal(units.length,2);
assert.deepEqual(units[0].canonical_segment_ids,['s0','s1']);
assert.equal(units[0].start_ms,0);
assert.equal(units[0].end_ms,6100);
assert.equal(displayUnitContains(units[0],'s1'),true);
assert.deepEqual(units[1].canonical_segment_ids,['s2','s3']);

const meaning=displayUnitMeaning(
  units[0],
  new Map([['s0','Bạn có quên từ'],['s1','khi nói tiếng Anh không']]),
);
assert.equal(meaning,'Bạn có quên từ khi nói tiếng Anh không');

const overlap=buildTranscriptDisplayUnits([
  {segment_id:'a',order:0,start_ms:0,end_ms:2500,original_text:'hello world this is'},
  {segment_id:'b',order:1,start_ms:1800,end_ms:4000,original_text:'this is a test'},
]);
assert.equal(overlap[0].original_text,'hello world this is a test');

console.log('TRANSCRIPT_DISPLAY_UNITS=PASS');
