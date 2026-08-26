import assert from 'node:assert/strict';

import {MEDIA_LEARNING_FIXTURE} from '../tests/fixtures/media-learning.js';
import {
  clearSharedMediaSession,
  getSharedMediaSession,
  setSharedMediaSession,
} from '../static/becoming/domain/shared-media-session.js';
import {state} from '../static/becoming/store.js';

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
      error_type:' None ',
      phonemes:[{phoneme:'ɔː',accuracy_score:98}],
    },{
      word:'idea',
      accuracy_score:99,
      error_type:'None',
      phonemes:[{phoneme:'i',accuracy_score:68}],
    },{
      word:'omission',
      accuracy_score:70,
      error_type:'Omission',
      phonemes:[{phoneme:'ə',accuracy_score:70}],
    },{
      word:'insertion',
      accuracy_score:70,
      error_type:'Insertion',
      phonemes:[{phoneme:'ɪ',accuracy_score:70}],
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
assert.equal((feedbackHtml.match(/data-speaking-pronunciation-word/g)||[]).length,4);
assert.match(feedbackHtml,/<strong>Listen<\/strong>/);
assert.doesNotMatch(feedbackHtml,/<strong>for<\/strong>/);
assert.match(feedbackHtml,/<strong>idea<\/strong>/);
assert.match(feedbackHtml,/<strong>omission<\/strong>/);
assert.match(feedbackHtml,/<strong>insertion<\/strong>/);
assert.match(feedbackHtml,/o-pronunciation-phoneme/);
assert.match(feedbackHtml,/o-pronunciation-word-reason/);
assert.match(feedbackHtml,/role="img" aria-label="Listen, 74/);
assert.match(feedbackHtml,/role="img" aria-label="ɪ, 68/);
assert.match(feedbackHtml,/88/);

state.supportLanguage='en';
const englishFeedbackHtml=controller.html();
assert.match(englishFeedbackHtml,/aria-label="Listen, 74 score"/);
assert.match(englishFeedbackHtml,/aria-label="\u026a, 68 score"/);
assert.match(englishFeedbackHtml,/aria-label="idea, 99 score"/);
assert.match(englishFeedbackHtml,/Focus on: Listen, idea, omission, insertion/);
assert.match(englishFeedbackHtml,/Mispronunciation/);
assert.match(englishFeedbackHtml,/Omission/);
assert.match(englishFeedbackHtml,/Insertion/);
state.supportLanguage='vi';
const vietnameseFeedbackHtml=controller.html();
assert.match(vietnameseFeedbackHtml,/aria-label="Listen, 74 \u0111i\u1ec3m"/);
assert.match(vietnameseFeedbackHtml,/aria-label="\u026a, 68 \u0111i\u1ec3m"/);
assert.match(vietnameseFeedbackHtml,/Ph\u00e1t \u00e2m sai/);
assert.match(vietnameseFeedbackHtml,/B\u1ecf s\u00f3t/);
assert.match(vietnameseFeedbackHtml,/N\u00f3i th\u00eam/);
state.supportLanguage='zh';
const chineseFeedbackHtml=controller.html();
assert.match(chineseFeedbackHtml,/aria-label="Listen, 74 \u5206\u6570"/);
assert.match(chineseFeedbackHtml,/aria-label="\u026a, 68 \u5206\u6570"/);
assert.match(chineseFeedbackHtml,/\u53d1\u97f3\u9519\u8bef/);
assert.match(chineseFeedbackHtml,/\u9057\u6f0f/);
assert.match(chineseFeedbackHtml,/\u591a\u8bf4/);
state.supportLanguage='en';

const syntheticController=createSpeakingController({
  session,
  recorder,
  pronunciationAssess:async()=>({
    score_kind:'synthetic_demo',
    pron_score:76,
    accuracy_score:74,
    fluency_score:78,
    completeness_score:100,
    words:[{word:'Demo',accuracy_score:62,error_type:'SyntheticDemo',phonemes:[]}],
  }),
});
assert.equal(await syntheticController.assessPronunciation(),true);
const syntheticFeedbackHtml=syntheticController.html();
assert.match(syntheticFeedbackHtml,/o-demo-banner/);
assert.doesNotMatch(syntheticFeedbackHtml,/o-pronunciation-word-reason/);

assert.equal(controller.selectRelative(1),true);
assert.equal(controller.model.selected,'segment-002');
assert.equal(controller.model.asrStatus,'idle');
assert.equal(controller.model.pronunciation,null);
assert.match(controller.html(),/The same segment can support shadowing later\./);

assert.equal(controller.discardRecording(),true);
assert.equal(controller.model.evaluation,null);
clearSharedMediaSession('en');

console.log('Speaking UI fixture record -> ASR -> match -> feedback: PASS');
