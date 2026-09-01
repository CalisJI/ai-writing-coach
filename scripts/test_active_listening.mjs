import assert from 'node:assert/strict';
import {
  MAX_LISTENING_EVALUATION_UNITS,
  MAX_LISTENING_RECONSTRUCTION_CHARS,
  createListeningPracticeSession,
  advanceListeningPracticeHint,
  evaluateListeningReconstruction,
  listeningReconstructionDiff,
  listeningPracticeSummary,
  listeningUnits,
  recordListeningPracticeAttempt,
  retryListeningPracticeSegment,
  revealListeningPracticeAnswer,
  selectListeningPracticeSegment,
  setListeningPracticeDraft,
} from '../static/becoming/domain/listening-practice.js';

const evaluate=(source_language,expected,answer)=>evaluateListeningReconstruction({source_language,expected,answer});

assert.equal(evaluate('en','Listen to this idea.','Listen to this idea.').accuracy_percent,100);
assert.equal(evaluate('en','Listen to this idea.','LISTEN TO THIS IDEA').accuracy_percent,100);
assert.equal(evaluate('en','Listen, to this idea!','Listen to this idea').accuracy_percent,100);
assert.ok(evaluate('en','Listen to this complete idea','Listen to this idea').accuracy_percent<100);
assert.ok(evaluate('en','Listen to this idea','Please listen to this idea').accuracy_percent<100);
assert.ok(evaluate('en','Listen to this idea','Listen to that idea').accuracy_percent<100);
assert.ok(evaluate('en',"Don't stop listening","Dont stop listening").accuracy_percent<100);
assert.equal(evaluate('en',"Don\u2019t stop listening","Don't stop listening").accuracy_percent,100);

assert.equal(evaluate('zh','\u6211\u4eec\u4e00\u8d77\u7ec3\u4e60\u542c\u529b\u3002','\u6211\u4eec\u4e00\u8d77\u7ec3\u4e60\u542c\u529b\u3002').accuracy_percent,100);
assert.equal(evaluate('zh','\u6211\u4eec\u4e00\u8d77\u7ec3\u4e60\u542c\u529b\uff01','\u6211\u4eec\u4e00\u8d77\u7ec3\u4e60\u542c\u529b').accuracy_percent,100);
assert.equal(evaluate('zh','\u6211 \u4eec \u4e00 \u8d77 \u7ec3 \u4e60','\u6211\u4eec\u4e00\u8d77\u7ec3\u4e60').accuracy_percent,100);
assert.ok(evaluate('zh','\u6211\u4eec\u4e00\u8d77\u7ec3\u4e60\u542c\u529b','\u6211\u4eec\u4e00\u8d77\u7ec3\u4e60').accuracy_percent<100);
assert.ok(evaluate('zh','\u6211\u4eec\u4e00\u8d77\u7ec3\u4e60','\u6211\u4eec\u4e00\u8d77\u7ec3\u4e60\u542c\u529b').accuracy_percent<100);
assert.ok(evaluate('zh','\u6211\u4eec\u7ec3\u4e60\u542c\u529b','\u4f60\u4eec\u7ec3\u4e60\u542c\u529b').accuracy_percent<100);
assert.deepEqual(listeningUnits('\u6211\u7528 GPT-4 \u5b66\u4e60 123','zh'),['\u6211','\u7528','gpt-4','\u5b66','\u4e60','123']);
assert.deepEqual(evaluate('zh','\u6211\u7528 GPT-4 \u5b66\u4e60 123','\u6211\u7528 GPT-4 \u5b66\u4e60 123'),evaluate('zh','\u6211\u7528 GPT-4 \u5b66\u4e60 123','\u6211\u7528 GPT-4 \u5b66\u4e60 123'));
assert.deepEqual(listeningReconstructionDiff({source_language:'en',expected:'Take the train home.',answer:'Take train safely home'}).map(item=>item.status),['correct','missing','correct','extra','correct']);
assert.deepEqual(listeningReconstructionDiff({source_language:'zh',expected:'\u6211\u4eca\u5929\u5f88\u597d\u3002',answer:'\u6211 \u4eca\u5929 \u597d'}).map(item=>item.status),['correct','correct','correct','missing','correct']);

assert.throws(()=>evaluate('en','Expected text','   '),error=>error.code==='answer_empty');
assert.throws(()=>evaluate('en','Expected text','x'.repeat(MAX_LISTENING_RECONSTRUCTION_CHARS+1)),error=>error.code==='answer_too_large');
assert.throws(()=>evaluate('en','word '.repeat(MAX_LISTENING_EVALUATION_UNITS+1),'word'),error=>error.code==='evaluation_too_large');

const originalFetch=globalThis.fetch;
globalThis.fetch=()=>{throw new Error('network must not be used');};
try{assert.equal(evaluate('en','Offline only','offline only').accuracy_percent,100);}finally{globalThis.fetch=originalFetch;}

const session=createListeningPracticeSession({asset_id:'asset-a',segment_ids:['segment-1','segment-2']});
assert.equal(session.asset_id,'asset-a');
assert.equal(session.current_segment_id,'segment-1');
assert.doesNotMatch(JSON.stringify(session),/Canonical transcript answer/);
assert.deepEqual(Object.keys(session.segments),['segment-1','segment-2']);
assert.equal(advanceListeningPracticeHint(session),1);
assert.equal(advanceListeningPracticeHint(session),2);
assert.equal(session.segments['segment-1'].hint_level,2);

assert.equal(setListeningPracticeDraft(session,'Canonical transcript answer'),true);
const first=evaluate('en','Canonical transcript answer','Canonical transcript answer');
recordListeningPracticeAttempt(session,first);
assert.equal(session.segments['segment-1'].attempts.length,1);
assert.equal(listeningPracticeSummary(session).checked_attempts,1);
retryListeningPracticeSegment(session);
assert.equal(session.segments['segment-1'].draft,'');
assert.equal(session.segments['segment-1'].attempts.length,1);
setListeningPracticeDraft(session,'Canonical answer');
recordListeningPracticeAttempt(session,evaluate('en','Canonical transcript answer','Canonical answer'));
assert.equal(session.segments['segment-1'].attempts.length,2);
assert.equal(listeningPracticeSummary(session).average_best_text_match,100);

selectListeningPracticeSegment(session,'segment-2');
revealListeningPracticeAnswer(session);
const summary=listeningPracticeSummary(session);
assert.equal(summary.practiced_segments,2);
assert.equal(summary.checked_attempts,2);
assert.equal(summary.exact_match_segments,1);
assert.equal(summary.revealed_only_segments,1);
assert.equal(summary.average_best_text_match,100);
assert.equal(session.segments['segment-2'].attempts.length,0);
selectListeningPracticeSegment(session,'segment-1');
assert.equal(session.segments['segment-1'].attempts.length,2);

const nextMedia=createListeningPracticeSession({asset_id:'asset-b',segment_ids:['segment-b-1']});
assert.equal(nextMedia.asset_id,'asset-b');
assert.equal(listeningPracticeSummary(nextMedia).practiced_segments,0);
assert.doesNotMatch(JSON.stringify(nextMedia),/segment-1/);

console.log('Active Listening evaluator and session: PASS');
