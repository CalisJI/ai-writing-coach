import assert from 'node:assert/strict';

import {
  MEDIA_LEARNING_FIXTURE,
  MEDIA_LEARNING_ZH_FIXTURE,
} from '../tests/fixtures/media-learning.js';
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

const {createSpeakingController,renderSpeaking}=await import('../static/becoming/screens/speaking.js');
const {api}=await import('../static/becoming/api.js');

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

// Canonical speech categories must become learner-locale copy at the screen
// boundary; backend English messages must never leak into VI/ZH feedback.
let errorTake=null;
let asrErrorCategory='speech_asr_timeout';
let pronunciationErrorCategory='pronunciation_provider_malformed';
const errorRecorder={
  snapshot(){return {status:errorTake?'ready':'idle',error:null,url:errorTake?.url||null,blob:errorTake?.blob||null,mime_type:'audio/webm',supported:true};},
  async start(){errorTake={url:'blob:error-take',blob:new Blob(['error take'],{type:'audio/webm'}),mime_type:'audio/webm',size:10};return true;},
  async stop(){return errorTake;},
  discard(){errorTake=null;return true;},
  cleanup(){},
};
const errorController=createSpeakingController({
  session,
  recorder:errorRecorder,
  transcribe:async()=>{throw {category:asrErrorCategory,message:`SERVER ENGLISH ASR ${asrErrorCategory}`};},
  pronunciationAssess:async()=>{throw {category:pronunciationErrorCategory,message:`SERVER ENGLISH PRONUNCIATION ${pronunciationErrorCategory}`};},
});
await errorController.startRecording();
assert.equal(await errorController.stopRecording(),true);
assert.equal(errorController.model.asrStatus,'error');
for(const [locale,copy] of [
  ['en','Speech recognition timed out. Try again shortly.'],
  ['vi','Nhận dạng lời nói đã hết thời gian. Hãy thử lại sau ít phút.'],
  ['zh','语音识别超时，请稍后重试。'],
]){
  state.supportLanguage=locale;
  const errorHtml=errorController.html();
  assert.match(errorHtml,new RegExp(copy));
  assert.doesNotMatch(errorHtml,/SERVER ENGLISH ASR/,
    `${locale.toUpperCase()} Speaking must not leak backend error text`);
}
for(const category of ['speech_asr_auth','speech_asr_forbidden']){
  asrErrorCategory=category;
  await errorController.startRecording();
  assert.equal(await errorController.stopRecording(),true);
  assert.equal(errorController.model.asrStatus,'error');
  for(const [locale,copy,retryCopy] of [
    ['en','Speech recognition access is not available in this environment. Please contact the administrator.','Speech recognition timed out. Try again shortly.'],
    ['vi','Môi trường này không có quyền dùng dịch vụ nhận dạng lời nói. Hãy liên hệ quản trị viên.','Nhận dạng lời nói đã hết thời gian. Hãy thử lại sau ít phút.'],
    ['zh','当前环境没有语音识别权限，请联系管理员。','语音识别超时，请稍后重试。'],
  ]){
    state.supportLanguage=locale;
    const errorHtml=errorController.html();
    assert.match(errorHtml,new RegExp(copy));
    assert.doesNotMatch(errorHtml,new RegExp(retryCopy));
    assert.doesNotMatch(errorHtml,/SERVER ENGLISH ASR/,
      `${locale.toUpperCase()} Speaking must not offer retry guidance for ${category}`);
  }
}
asrErrorCategory='speech_asr_timeout';
assert.equal(await errorController.assessPronunciation(),false);
assert.equal(errorController.model.pronunciationStatus,'error');
for(const [locale,copy] of [
  ['en','Pronunciation assessment is temporarily unavailable. Your recording and content match still work.'],
  ['vi','Tạm thời chưa chấm được phát âm. Lượt ghi và khớp nội dung vẫn hoạt động.'],
  ['zh','暂时无法完成发音评估。录音和内容匹配仍可继续使用。'],
]){
  state.supportLanguage=locale;
  const errorHtml=errorController.html();
  assert.match(errorHtml,new RegExp(copy));
  assert.doesNotMatch(errorHtml,/SERVER ENGLISH PRONUNCIATION/,
    `${locale.toUpperCase()} Speaking must not leak pronunciation error text`);
}
for(const scenario of [
  {
    category:'pronunciation_timeout',
    copy:{en:'Pronunciation assessment could not finish. Try again shortly.',vi:'Chưa thể hoàn tất chấm phát âm. Hãy thử lại sau ít phút.',zh:'发音评估未能完成，请稍后重试。'},
  },
  {
    category:'pronunciation_rate_limited',
    copy:{en:'Pronunciation assessment could not finish. Try again shortly.',vi:'Chưa thể hoàn tất chấm phát âm. Hãy thử lại sau ít phút.',zh:'发音评估未能完成，请稍后重试。'},
  },
  {
    category:'pronunciation_payload_too_large',
    copy:{en:'This recording is too large for pronunciation assessment. Record a shorter take.',vi:'Lượt ghi này quá lớn để chấm phát âm. Hãy ghi một lượt ngắn hơn.',zh:'这次录音过大，无法完成发音评估。请录制更短的片段。'},
  },
  {
    category:'pronunciation_audio_unsupported',
    copy:{en:'This recording format could not be prepared. Try recording again.',vi:'Không thể chuẩn bị định dạng lượt ghi này. Hãy ghi lại.',zh:'无法处理这次录音格式，请重新录制。'},
  },
  {
    category:'pronunciation_invalid_request',
    copy:{en:'This pronunciation request is not valid. Check the segment and try again.',vi:'Yêu cầu chấm phát âm này không hợp lệ. Hãy kiểm tra đoạn luyện tập và thử lại.',zh:'这次发音评估请求无效，请检查练习片段后重试。'},
  },
]){
  pronunciationErrorCategory=scenario.category;
  assert.equal(await errorController.assessPronunciation(),false);
  assert.equal(errorController.model.pronunciationStatus,'error');
  for(const locale of ['en','vi','zh']){
    state.supportLanguage=locale;
    const errorHtml=errorController.html();
    assert.match(errorHtml,new RegExp(scenario.copy[locale]));
    assert.doesNotMatch(errorHtml,/SERVER ENGLISH PRONUNCIATION/,
      `${locale.toUpperCase()} Speaking must not leak ${scenario.category}`);
  }
}
pronunciationErrorCategory='pronunciation_provider_malformed';
state.supportLanguage='en';

// The same record → ASR → content-match path must remain executable for a
// Chinese source lesson, not only have Chinese labels around an English take.
const zhPayload=structuredClone(MEDIA_LEARNING_ZH_FIXTURE);
assert.equal(setSharedMediaSession({
  learning_language:'zh',
  payload:zhPayload,
  selected_segment_id:'segment-zh-001',
}),true);
const zhSession=getSharedMediaSession('zh');
let zhTake=null;
const zhRecorder={
  snapshot(){
    return {
      status:zhTake?'ready':'idle',
      error:null,
      url:zhTake?.url||null,
      blob:zhTake?.blob||null,
      mime_type:'audio/webm',
      supported:true,
    };
  },
  async start(){return true;},
  async stop(){
    zhTake={
      url:'blob:qa-speaking-zh-take',
      blob:new Blob(['qa speaking zh take'],{type:'audio/webm'}),
      mime_type:'audio/webm',
      size:19,
    };
    return zhTake;
  },
  discard(){zhTake=null;return true;},
  cleanup(){},
};
let zhEvaluationPayload=null;
const zhController=createSpeakingController({
  session:zhSession,
  recorder:zhRecorder,
  transcribe:async()=>({
    text:'这是共享的原文字幕。',
    words:[],
  }),
  evaluateSpeaking:async payload=>{
    zhEvaluationPayload=payload;
    return {
      language:'zh',
      dimensions:{
        transcription_confidence:null,
        content_match:100,
        pronunciation:null,
        fluency:null,
        proficiency:null,
      },
      evidence:{reference_text:payload.reference_text,transcript_text:payload.transcript_text},
    };
  },
});
state.supportLanguage='zh';
assert.match(zhController.html(),/data-speaking-core/);
assert.match(zhController.html(),/这是共享的原文字幕。/);
assert.equal(await zhController.startRecording(),true);
assert.equal(await zhController.stopRecording(),true);
assert.equal(zhController.model.asrStatus,'ready');
assert.equal(zhController.model.evaluation?.content_match,100);
assert.equal(zhController.model.speakingEvaluationStatus,'ready');
assert.equal(zhEvaluationPayload.language,'zh');
assert.equal(zhEvaluationPayload.reference_text,'这是共享的原文字幕。');
assert.equal(zhEvaluationPayload.transcript_text,'这是共享的原文字幕。');
assert.match(zhController.html(),/data-speaking-content-match/);
assert.match(zhController.html(),/data-speaking-evaluation-state="ready"/);
assert.match(zhController.html(),/内容匹配/);
assert.match(zhController.html(),/这份摘要只描述本次录音/);
clearSharedMediaSession('zh');

// Render-level acceptance: exercise the actual screen event wiring for both
// learner languages. The controller tests above prove domain state changes;
// this fake root proves the mounted DOM exposes the same record -> ASR ->
// feedback path the browser uses.
class RenderNode{
  constructor(dataset={},id=''){
    this.dataset=dataset;
    this.id=id;
    this.listeners={};
    this.style={};
    this.disabled=false;
    this.value='1';
    this.textContent='';
  }
  addEventListener(name,listener){this.listeners[name]=listener;}
  async click(){return this.listeners.click?.({currentTarget:this,target:this});}
  setAttribute(){}
}
class RenderRoot{
  constructor(){this._html='';this.nodes=[];this._set('');}
  _set(html){
    this._html=html;
    this.nodes=[];
    const seen=new Set();
    const dataPattern=/data-([a-z0-9-]+)(?:="([^"]*)")?/g;
    for(const match of html.matchAll(dataPattern)){
      const key=match[1].replace(/-([a-z])/g,(_,letter)=>letter.toUpperCase());
      if(seen.has(key))continue;
      seen.add(key);
      this.nodes.push(new RenderNode({[key]:match[2]??''}));
    }
    const idPattern=/id="([^"]+)"/g;
    for(const match of html.matchAll(idPattern)){
      if(!this.nodes.some(node=>node.id===match[1]))this.nodes.push(new RenderNode({},match[1]));
    }
  }
  set innerHTML(value){this._set(String(value||''));}
  get innerHTML(){return this._html;}
  querySelector(selector){
    if(selector.startsWith('#'))return this.nodes.find(node=>node.id===selector.slice(1))||null;
    const match=selector.match(/^\[data-([a-z0-9-]+)\]/);
    if(!match)return null;
    const key=match[1].replace(/-([a-z])/g,(_,letter)=>letter.toUpperCase());
    return this.nodes.find(node=>Object.prototype.hasOwnProperty.call(node.dataset,key))||null;
  }
  querySelectorAll(selector){
    const node=this.querySelector(selector);
    return node?[node]:[];
  }
}

const originalSpeechApi={
  transcribeSpeech:api.transcribeSpeech,
  assessPronunciation:api.assessPronunciation,
  evaluateSpeaking:api.evaluateSpeaking,
};
const renderedCases=[
  {language:'en',supportLanguage:'en',payload:MEDIA_LEARNING_FIXTURE,text:'Listen for the first complete idea.'},
  {language:'zh',supportLanguage:'zh',payload:MEDIA_LEARNING_ZH_FIXTURE,text:'这是共享的原文字幕。'},
];
try{
  for(const item of renderedCases){
    clearSharedMediaSession(item.language);
    assert.equal(setSharedMediaSession({
      learning_language:item.language,
      payload:structuredClone(item.payload),
      selected_segment_id:item.language==='zh'?'segment-zh-001':'segment-001',
    }),true);
    state.language=item.language;
    state.supportLanguage=item.supportLanguage;
    let recording=false;
    const renderedRecorder={
      snapshot(){return {status:recording?'recording':'idle',error:null,url:null,blob:null,mime_type:'audio/webm',supported:true};},
      async start(){recording=true;return true;},
      async stop(){recording=false;return {blob:new Blob(['rendered take'],{type:'audio/webm'}),mime_type:'audio/webm',size:13,url:'blob:rendered'};},
      discard(){recording=false;return true;},
      cleanup(){},
    };
    api.transcribeSpeech=async()=>({text:item.text,words:[]});
    api.assessPronunciation=async()=>null;
    let renderedEvaluationPayload=null;
    api.evaluateSpeaking=async payload=>{
      renderedEvaluationPayload=payload;
      return {
      language:payload.language,
      dimensions:{transcription_confidence:null,content_match:100,pronunciation:null,fluency:null,proficiency:null},
      evidence:{reference_text:payload.reference_text,transcript_text:payload.transcript_text},
      };
    };
    const renderedRoot=new RenderRoot();
    const renderedController=await renderSpeaking(renderedRoot,{recorderFactory:()=>renderedRecorder});
    assert.ok(renderedController,`${item.language.toUpperCase()} rendered Speaking screen should mount`);
    assert.match(renderedRoot.innerHTML,/data-speaking-record/);
    await renderedRoot.querySelector('[data-speaking-record]').click();
    assert.equal(renderedController.model.asrStatus,'idle');
    await renderedRoot.querySelector('[data-speaking-stop]').click();
    for(let attempt=0;attempt<100&&(
      renderedController.model.asrStatus==='loading'||
      renderedController.model.speakingEvaluationStatus==='loading'
    );attempt++){
      await new Promise(resolve=>setTimeout(resolve,0));
    }
    assert.equal(renderedController.model.asrStatus,'ready',`${item.language.toUpperCase()} rendered take should reach ASR`);
    assert.equal(renderedController.model.speakingEvaluationStatus,'ready',`${item.language.toUpperCase()} rendered take should reach evaluation`);
    assert.equal(renderedEvaluationPayload.language,item.language);
    assert.equal(renderedEvaluationPayload.reference_text,item.text);
    assert.equal(renderedEvaluationPayload.transcript_text,item.text);
    assert.match(renderedRoot.innerHTML,/data-speaking-content-match/);
    assert.match(renderedRoot.innerHTML,/data-speaking-evaluation-state="ready"/);
    assert.equal(renderedRoot.innerHTML.includes(item.text),true);
    assert.match(renderedRoot.innerHTML,item.language==='zh'?/本次录音评估/:/Take evaluation/);
    renderedRoot._cleanupScreen?.();
  }
}finally{
  api.transcribeSpeech=originalSpeechApi.transcribeSpeech;
  api.assessPronunciation=originalSpeechApi.assessPronunciation;
  api.evaluateSpeaking=originalSpeechApi.evaluateSpeaking;
  clearSharedMediaSession('en');
  clearSharedMediaSession('zh');
}

console.log('Speaking UI fixture record -> ASR -> match -> feedback: PASS');
