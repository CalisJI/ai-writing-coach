import assert from 'node:assert/strict';

import {MEDIA_LEARNING_FIXTURE} from '../tests/fixtures/media-learning.js';
import {
  clearSharedMediaSession,
  getSharedMediaSession,
  setSharedMediaSession,
} from '../static/becoming/domain/shared-media-session.js';

// The recorder vendor probes AudioWorkletNode while the screen module loads.
// Keep this contract test independent of a browser audio implementation.
globalThis.AudioWorkletNode ??= class AudioWorkletNode {
  connect(){return this;}
  disconnect(){}
};

const {createSpeakingController}=await import('../static/becoming/screens/speaking.js');

const payload=structuredClone(MEDIA_LEARNING_FIXTURE);
assert.equal(setSharedMediaSession({
  learning_language:'en',
  payload,
  selected_segment_id:'segment-001',
}),true);
const session=getSharedMediaSession('en');
assert.ok(session);

let take=null;
const recorder={
  snapshot(){
    return {
      status:take?'ready':'idle',
      error:null,
      url:take?.url||null,
      blob:take?.blob||null,
      mime_type:'audio/webm',
      supported:true,
    };
  },
  async start(){return true;},
  async stop(){
    take={
      url:'blob:qa-speaking-take',
      blob:new Blob(['qa speaking take'],{type:'audio/webm'}),
      mime_type:'audio/webm',
      size:16,
    };
    return take;
  },
  discard(){take=null;return true;},
  cleanup(){},
};

const controller=createSpeakingController({
  session,
  recorder,
  transcribe:async()=>({
    text:'Listen for the first complete idea.',
    words:[],
  }),
  pronunciationAssess:async()=>({
    score_kind:'provider',
    pron_score:88,
    accuracy_score:88,
    fluency_score:82,
    completeness_score:96,
    prosody_score:84,
    words:[{
      word:'Listen',
      accuracy_score:74,
      error_type:'Mispronunciation',
      phonemes:[{phoneme:'ɪ',accuracy_score:68}],
    },{
      word:'for',
      accuracy_score:99,
      error_type:'None',
      phonemes:[{phoneme:'ɔː',accuracy_score:98}],
    }],
  }),
});

assert.match(controller.html(),/data-speaking-core/);
assert.match(controller.html(),/Listen for the first complete idea\./);
assert.match(controller.html(),/data-speaking-record/);

assert.equal(await controller.startRecording(),true);
assert.equal(await controller.stopRecording(),true);
assert.equal(controller.model.asrStatus,'ready');
assert.equal(controller.model.evaluation?.content_match,100);
assert.match(controller.html(),/data-speaking-content-match/);
assert.match(controller.html(),/Listen for the first complete idea\./);
assert.match(controller.html(),/data-speaking-pronunciation-action/);

assert.equal(await controller.assessPronunciation(),true);
assert.equal(controller.model.pronunciationStatus,'ready');
assert.equal(controller.model.pronunciation?.pron_score,88);
assert.match(controller.html(),/data-speaking-pronunciation/);
assert.match(controller.html(),/data-speaking-pronunciation-evidence/);
const feedbackHtml=controller.html();
assert.equal((feedbackHtml.match(/data-speaking-pronunciation-word/g)||[]).length,1);
assert.match(feedbackHtml,/<strong>Listen<\/strong>/);
assert.doesNotMatch(feedbackHtml,/<strong>for<\/strong>/);
assert.match(feedbackHtml,/o-pronunciation-phoneme/);
assert.match(feedbackHtml,/88/);

assert.equal(controller.selectRelative(1),true);
assert.equal(controller.model.selected,'segment-002');
assert.equal(controller.model.asrStatus,'idle');
assert.equal(controller.model.pronunciation,null);
assert.match(controller.html(),/The same segment can support shadowing later\./);

assert.equal(controller.discardRecording(),true);
assert.equal(controller.model.evaluation,null);
clearSharedMediaSession('en');

console.log('Speaking UI fixture record -> ASR -> match -> feedback: PASS');
