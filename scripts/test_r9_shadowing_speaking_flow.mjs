import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

import {MEDIA_LEARNING_FIXTURE,MEDIA_LEARNING_ZH_FIXTURE} from '../tests/fixtures/media-learning.js';
import {state} from '../static/becoming/store.js';
import {
  clearSharedMediaSession,
  getSharedMediaSession,
  selectSharedMediaSegment,
  setSharedMediaSession,
} from '../static/becoming/domain/shared-media-session.js';

if(!globalThis.Element)globalThis.Element=Object;
if(!globalThis.HTMLIFrameElement)globalThis.HTMLIFrameElement=class {};

const {createListeningController}=await import('../static/becoming/screens/listening.js');
const {createSpeakingController}=await import('../static/becoming/screens/speaking.js');
const listeningSource=readFileSync(new URL('../static/becoming/screens/listening.js',import.meta.url),'utf8');
assert.match(listeningSource,/controller\.openSpeaking\(\).*go\('speak'\)/s);

for(const item of [
  {language:'en',payload:MEDIA_LEARNING_FIXTURE,segment:'segment-002'},
  {language:'zh',payload:MEDIA_LEARNING_ZH_FIXTURE,segment:'segment-zh-002'},
]){
  clearSharedMediaSession(item.language);
  state.language=item.language;
  state.supportLanguage=item.language;
  const listening=createListeningController({
    importMedia:async()=>structuredClone(item.payload),
    targetLanguage:()=>item.language,
    onMediaReady:(payload,selected_segment_id)=>setSharedMediaSession({
      learning_language:item.language,payload,selected_segment_id,
    }),
    onSelection:segmentId=>selectSharedMediaSegment(item.language,segmentId),
  });
  await listening.importUrl(`https://example.test/${item.language}`);
  for(const mode of ['follow','active']){
    assert.equal(listening.setMode(mode),true);
    assert.equal(listening.select(item.segment),true);
    assert.equal(listening.openSpeaking(),true);
    const modeHandoff=getSharedMediaSession(item.language);
    assert.equal(modeHandoff.mode,mode);
    assert.equal(modeHandoff.payload.asset.asset_id,item.payload.asset.asset_id);
    assert.equal(modeHandoff.selected_segment_id,item.segment);
    assert.equal(listening.restore(modeHandoff.payload,modeHandoff.selected_segment_id,modeHandoff.mode),true);
    assert.equal(listening.model.mode,mode);
    assert.equal(listening.model.selected,item.segment);
  }
  assert.equal(listening.setMode('shadowing'),true);
  assert.equal(listening.select(item.segment),true);
  assert.equal(listening.openSpeaking(),true);

  const handoff=getSharedMediaSession(item.language);
  assert.equal(handoff.learning_language,item.language);
  assert.equal(handoff.payload.asset.asset_id,item.payload.asset.asset_id);
  assert.equal(handoff.selected_segment_id,item.segment);
  assert.equal(handoff.mode,'shadowing');

  let recording=false;
  const take={blob:new Blob([`r9 ${item.language}`],{type:'audio/webm'}),mime_type:'audio/webm',size:8,url:`blob:r9-${item.language}`};
  const recorder={
    snapshot(){return {status:recording?'recording':'ready',error:null,url:recording?`blob:recording-${item.language}`:take.url,blob:recording?null:take.blob,mime_type:take.mime_type,supported:true};},
    async start(){recording=true;return true;},
    async stop(){recording=false;return take;},
    discard(){recording=false;return true;},
    cleanup(){},
  };
  const evaluationPayloads=[];
  const persisted=[];
  const speaking=createSpeakingController({
    session:handoff,
    recorder,
    transcribe:async(blob,language,filename)=>{
      assert.equal(language,item.language);
      assert.equal(filename,'speaking-take.webm');
      assert.equal(blob,take.blob);
      return {text:item.payload.transcript.segments.find(segment=>segment.segment_id===item.segment).original_text,confidence:91,words:[]};
    },
    evaluateSpeaking:async payload=>{
      evaluationPayloads.push(payload);
      return {language:payload.language,dimensions:{transcription_confidence:payload.transcription_confidence,content_match:100,pronunciation:null,fluency:null,proficiency:null},evidence:{},provenance:{}};
    },
    persistAttempt:async payload=>{persisted.push(payload);return {item:payload,progress:{attempt_count:1,proficiency:null}};},
  });
  assert.equal(await speaking.startRecording(),true);
  assert.equal(await speaking.stopRecording(),true);
  assert.equal(speaking.model.asrStatus,'ready');
  assert.equal(speaking.model.speakingEvaluationStatus,'ready');
  assert.equal(evaluationPayloads.length,1);
  assert.equal(evaluationPayloads[0].language,item.language);
  assert.equal(evaluationPayloads[0].reference_text,item.payload.transcript.segments.find(segment=>segment.segment_id===item.segment).original_text);
  assert.equal(persisted.length,1);
  assert.equal(persisted[0].asset_id,item.payload.asset.asset_id);
  assert.equal(persisted[0].segment_id,item.segment);
  assert.equal(persisted[0].language,item.language);
  assert.match(speaking.html(),/data-speaking-evaluation-state="ready"/);
  assert.match(speaking.html(),/Not assessed|未评估/);

  const providerFailure=createSpeakingController({
    session:handoff,
    recorder,
    transcribe:async()=>({text:item.payload.transcript.segments.find(segment=>segment.segment_id===item.segment).original_text,confidence:91,words:[]}),
    evaluateSpeaking:async()=>{throw {category:'speaking_evaluation_failed',message:'SERVER R9 PROVIDER DETAIL'};},
  });
  assert.equal(await providerFailure.startRecording(),true);
  assert.equal(await providerFailure.stopRecording(),true);
  assert.equal(providerFailure.model.speakingEvaluationStatus,'error');
  assert.match(providerFailure.html(),/data-speaking-evaluation-state="error"/);
  assert.doesNotMatch(providerFailure.html(),/SERVER R9 PROVIDER DETAIL/);
  assert.ok(item.language==='zh'
    ?providerFailure.html().includes('暂时无法生成完整摘要')
    :providerFailure.html().includes('full take summary is unavailable'));

  const returned=createListeningController({
    importMedia:async()=>item.payload,
    targetLanguage:()=>item.language,
    onMediaReady:(payload,selected_segment_id)=>setSharedMediaSession({learning_language:item.language,payload,selected_segment_id}),
  });
  assert.equal(returned.restore(handoff.payload,handoff.selected_segment_id,handoff.mode),true);
  assert.equal(returned.model.mode,'shadowing');
  assert.equal(returned.model.selected,item.segment);
  assert.equal(returned.model.shadowingSession.asset_id,item.payload.asset.asset_id);

  clearSharedMediaSession(item.language);
}

console.log('R9 EN/ZH Shadowing → Speaking → Shadowing handoff: PASS');
