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
const evaluationPayloads=[];
let evaluatorAvailable=true;
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
  evaluateSpeaking:async payload=>{
    if(!evaluatorAvailable)throw {message:'Evaluator unavailable'};
    evaluationPayloads.push(payload);
    return {
      language:payload.language,
      dimensions:{
        transcription_confidence:null,
        content_match:100,
        pronunciation:payload.pronunciation?88:null,
        fluency:payload.pronunciation?82:null,
        proficiency:null,
      },
      evidence:{reference_text:payload.reference_text,transcript_text:payload.transcript_text},
    };
  },
});

assert.match(controller.html(),/data-speaking-core/);
assert.match(controller.html(),/Listen for the first complete idea\./);
assert.match(controller.html(),/data-speaking-record/);
state.supportLanguage='en';

assert.equal(await controller.startRecording(),true);
assert.equal(await controller.stopRecording(),true);
assert.equal(controller.model.asrStatus,'ready');
assert.equal(controller.model.evaluation?.content_match,100);
assert.equal(controller.model.speakingEvaluationStatus,'ready');
assert.equal(controller.model.speakingEvaluation?.dimensions.content_match,100);
assert.equal(evaluationPayloads.length,1);
assert.deepEqual(evaluationPayloads[0],{
  language:'en',
  reference_text:'Listen for the first complete idea.',
  transcript_text:'Listen for the first complete idea.',
  content_match:controller.model.evaluation,
  pronunciation:null,
  transcription_confidence:null,
});
assert.match(controller.html(),/data-speaking-content-match/);
assert.match(controller.html(),/data-speaking-evaluation-state="ready"/);
assert.match(controller.html(),/Take evaluation/);
assert.match(controller.html(),/Listen for the first complete idea\./);
assert.match(controller.html(),/data-speaking-pronunciation-action/);

assert.equal(await controller.assessPronunciation(),true);
assert.equal(controller.model.pronunciationStatus,'ready');
assert.equal(controller.model.pronunciation?.pron_score,88);
assert.equal(evaluationPayloads.length,2);
assert.equal(evaluationPayloads[1].pronunciation.pron_score,88);
assert.equal(controller.model.speakingEvaluation?.dimensions.pronunciation,88);
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
assert.match(vietnameseFeedbackHtml,/Đánh giá lượt ghi/);
assert.match(vietnameseFeedbackHtml,/aria-label="Listen, 74 \u0111i\u1ec3m"/);
assert.match(vietnameseFeedbackHtml,/aria-label="\u026a, 68 \u0111i\u1ec3m"/);
assert.match(vietnameseFeedbackHtml,/Ph\u00e1t \u00e2m sai/);
assert.match(vietnameseFeedbackHtml,/B\u1ecf s\u00f3t/);
assert.match(vietnameseFeedbackHtml,/N\u00f3i th\u00eam/);
state.supportLanguage='zh';
const chineseFeedbackHtml=controller.html();
assert.match(chineseFeedbackHtml,/本次录音评估/);
assert.match(chineseFeedbackHtml,/aria-label="Listen, 74 \u5206\u6570"/);
assert.match(chineseFeedbackHtml,/aria-label="\u026a, 68 \u5206\u6570"/);
assert.match(chineseFeedbackHtml,/\u53d1\u97f3\u9519\u8bef/);
assert.match(chineseFeedbackHtml,/\u9057\u6f0f/);
assert.match(chineseFeedbackHtml,/\u591a\u8bf4/);
state.supportLanguage='en';

evaluatorAvailable=false;
assert.equal(await controller.startRecording(),true);
assert.equal(await controller.stopRecording(),true);
assert.equal(controller.model.speakingEvaluationStatus,'error');
assert.match(controller.html(),/data-speaking-evaluation-state="error"/);
assert.match(controller.html(),/Evaluator unavailable/);
assert.match(controller.html(),/data-speaking-content-match/);
evaluatorAvailable=true;

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
for(const locale of ['en','vi','zh']){
  state.supportLanguage=locale;
  const localizedSyntheticFeedbackHtml=syntheticController.html();
  assert.match(localizedSyntheticFeedbackHtml,/o-demo-banner/);
  assert.doesNotMatch(localizedSyntheticFeedbackHtml,/o-pronunciation-word-reason/);
}
state.supportLanguage='en';

assert.equal(controller.selectRelative(1),true);
assert.equal(controller.model.selected,'segment-002');
assert.equal(controller.model.asrStatus,'idle');
assert.equal(controller.model.pronunciation,null);
assert.match(controller.html(),/The same segment can support shadowing later\./);

assert.equal(controller.discardRecording(),true);
assert.equal(controller.model.evaluation,null);

let resolveTranscript;
let raceTake=null;
const raceRecorder={
  snapshot(){
    return {status:raceTake?'ready':'idle',error:null,url:raceTake?.url||null,blob:raceTake?.blob||null,mime_type:'audio/webm',supported:true};
  },
  async start(){
    raceTake={url:'blob:race-take',blob:new Blob(['race take'],{type:'audio/webm'}),mime_type:'audio/webm',size:9};
    return true;
  },
  async stop(){return raceTake;},
  discard(){raceTake=null;return true;},
  cleanup(){},
};
const raceEvaluationPayloads=[];
const raceController=createSpeakingController({
  session,
  recorder:raceRecorder,
  transcribe:async()=>new Promise(resolve=>{resolveTranscript=resolve;}),
  evaluateSpeaking:async payload=>{
    raceEvaluationPayloads.push(payload);
    return {dimensions:{content_match:100,proficiency:null}};
  },
});
await raceController.startRecording();
const pendingRaceStop=raceController.stopRecording();
while(!resolveTranscript)await new Promise(resolve=>setTimeout(resolve,0));
assert.equal(raceController.select('segment-002'),true);
resolveTranscript({text:'Listen for the first complete idea.',words:[]});
assert.equal(await pendingRaceStop,false);
assert.equal(raceController.model.asrStatus,'idle');
assert.equal(raceController.model.asrTranscript,'');
assert.equal(raceEvaluationPayloads.length,0,
  'Speaking must ignore a take whose ASR completes after its segment changed');
clearSharedMediaSession('en');

console.log('Speaking UI fixture record -> ASR -> match -> feedback: PASS');
