import assert from 'node:assert/strict';
import {
  createShadowingPracticeSession,
  recordShadowingPracticeRound,
  selectShadowingPracticeSegment,
  shadowingPracticeSummary,
} from '../static/becoming/domain/shadowing-practice.js';

const session=createShadowingPracticeSession({
  asset_id:'asset-a',
  segment_ids:['segment-1','segment-2','segment-2',''],
});

assert.equal(session.asset_id,'asset-a');
assert.equal(session.current_segment_id,'segment-1');
assert.deepEqual(session.segment_ids,['segment-1','segment-2']);
assert.deepEqual(Object.keys(session.segments),['segment-1','segment-2']);
assert.deepEqual(session.segments['segment-1'],{rounds:0});

assert.deepEqual(shadowingPracticeSummary(session),{
  total_segments:2,
  practiced_segments:0,
  total_rounds:0,
});

assert.equal(recordShadowingPracticeRound(session),true);
assert.equal(recordShadowingPracticeRound(session),true);
assert.equal(selectShadowingPracticeSegment(session,'segment-2'),true);
assert.equal(recordShadowingPracticeRound(session),true);

assert.deepEqual(shadowingPracticeSummary(session),{
  total_segments:2,
  practiced_segments:2,
  total_rounds:3,
});

assert.equal(selectShadowingPracticeSegment(session,'missing'),false);

const empty=createShadowingPracticeSession({asset_id:'asset-empty',segment_ids:[]});
assert.equal(recordShadowingPracticeRound(empty),false);

const originalFetch=globalThis.fetch;
globalThis.fetch=()=>{throw new Error('network must not be used');};
try{
  const offline=createShadowingPracticeSession({asset_id:'offline',segment_ids:['s1']});
  recordShadowingPracticeRound(offline);
  assert.equal(shadowingPracticeSummary(offline).total_rounds,1);
}finally{
  globalThis.fetch=originalFetch;
}

console.log('Shadowing practice session: PASS');