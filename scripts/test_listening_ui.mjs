import assert from 'node:assert/strict';
import {MEDIA_LEARNING_FIXTURE,MEDIA_LEARNING_ZH_FIXTURE} from '../tests/fixtures/media-learning.js';
import {api} from '../static/becoming/api.js';
import {mediaPlayer,replaySegment,setPlaybackRate} from '../static/becoming/components/media-player.js';
import {createListeningController,mediaImportErrorState,renderListening} from '../static/becoming/screens/listening.js';
import {routeAvailable} from '../static/becoming/domain/skill-release.js';
import {state} from '../static/becoming/store.js';

const calls=[];
let resolveImport;
const imported=new Promise(resolve=>{resolveImport=resolve;});
const states=[];
const controller=createListeningController({
  importMedia:payload=>{calls.push(payload);return imported;},
  targetLanguage:()=> 'vi',
  onChange:model=>states.push(model.status),
});
assert.match(controller.html(),/mediaImportForm/);
const pending=controller.importUrl('https://youtu.be/dQw4w9WgXcQ');
assert.equal(controller.model.status,'validating');
assert.deepEqual(calls,[{source_url:'https://youtu.be/dQw4w9WgXcQ',target_language:'vi'}]);
resolveImport(MEDIA_LEARNING_FIXTURE);
await pending;
assert.deepEqual(states.slice(-2),['validating','ready']);
assert.equal(controller.model.status,'ready');
assert.equal(controller.model.payload.translation.status,'ready');
assert.equal(controller.model.selected,'segment-001');
assert.doesNotMatch(controller.html(),/translation-status-(?:unavailable|too_large)/);
assert.match(controller.html(),/Listen for the first complete idea\./);
assert.match(controller.html(),/listening-segment selected[^>]*data-segment-id="segment-001"/);
assert.match(controller.html(),/data-segment-id="segment-001" aria-current="true"/);
assert.match(controller.html(),/data-previous-segment disabled/);
assert.doesNotMatch(controller.html(),/data-next-segment disabled/);
assert.match(controller.html(),/value="0.75"/);
assert.match(controller.html(),/value="1.25"/);
assert.match(controller.html(),/<iframe/);
assert.match(controller.html(),/disabled/);

let activeImports=0;
const activeController=createListeningController({importMedia:async()=>{activeImports+=1;return MEDIA_LEARNING_FIXTURE;},targetLanguage:()=> 'vi'});
await activeController.importUrl('https://youtu.be/dQw4w9WgXcQ');
activeController.toggleOriginal(false);
activeController.toggleMeaning(false);
assert.equal(activeController.setMode('active'),true);
assert.equal(activeController.model.mode,'active');
assert.match(activeController.html(),/data-listening-mode="active"/);
assert.match(activeController.html(),/maxlength="2000"/);
assert.ok(!activeController.html().includes(MEDIA_LEARNING_FIXTURE.transcript.segments[0].original_text));
assert.ok(!activeController.html().includes(MEDIA_LEARNING_FIXTURE.translations[0].translated_meaning));
assert.equal(activeController.checkPractice(),false);
assert.match(activeController.html(),/active-listening-validation/);
assert.equal(activeController.model.practiceSession.segments['segment-001'].attempts.length,0);
assert.equal(activeController.setPracticeDraft('x'.repeat(2001)),false);
assert.equal(activeController.checkPractice(),false);
assert.equal(activeController.model.practiceSession.segments['segment-001'].attempts.length,0);
assert.match(activeController.html(),/active-listening-validation/);
assert.equal(activeController.setPracticeDraft('<script>alert("x")</script> \u4e2d\u6587 \u{1f3a7}'),true);
assert.match(activeController.html(),/&lt;script&gt;alert\(&quot;x&quot;\)&lt;\/script&gt;/);
assert.doesNotMatch(activeController.html(),/<script>|<\/script>/);
activeController.setPracticeDraft('Listen for the first complete idea.');
assert.equal(activeController.checkPractice(),true);
assert.match(activeController.html(),/active-listening-text-match/);
assert.match(activeController.html(),/100%/);
assert.match(activeController.html(),/Listen for the first complete idea\./);
assert.ok(activeController.html().includes(MEDIA_LEARNING_FIXTURE.translations[0].translated_meaning));
for(const [locale,label] of [['en','Type what you heard'],['vi','G\u00f5 l\u1ea1i \u0111i\u1ec1u b\u1ea1n nghe \u0111\u01b0\u1ee3c'],['zh','\u8f93\u5165\u4f60\u542c\u5230\u7684\u5185\u5bb9']]){
  state.supportLanguage=locale;
  assert.ok(activeController.html().includes(label));
}
state.supportLanguage='vi';
assert.match(activeController.html(),/not a proficiency score|không phải điểm năng lực|并不是语言能力分数/);
assert.doesNotMatch(activeController.html(),/CEFR|HSK|Mastered|Fluent|Advanced/);
assert.equal(activeController.retryPractice(),true);
assert.equal(activeImports,1);
assert.doesNotMatch(activeController.html(),/Listen for the first complete idea\.|active-listening-text-match/);
assert.equal(activeController.model.practiceSession.segments['segment-001'].attempts.length,1);
assert.equal(activeController.moveSelection(1),true);
assert.equal(activeController.model.selected,'segment-002');
assert.equal(activeController.revealPractice(),true);
assert.match(activeController.html(),/The same segment can support shadowing later\./);
assert.doesNotMatch(activeController.html(),/active-listening-text-match/);
assert.equal(activeController.model.practiceSession.segments['segment-002'].attempts.length,0);
assert.match(activeController.html(),/active-listening-summary/);
assert.equal(activeController.model.practiceSession.segments['segment-002'].revealed,true);
assert.equal(activeController.moveSelection(-1),true);
assert.equal(activeController.model.practiceSession.segments['segment-001'].attempts.length,1);
assert.equal(activeController.setMode('follow'),true);
assert.ok(!activeController.html().includes(MEDIA_LEARNING_FIXTURE.transcript.segments[0].original_text));
assert.ok(!activeController.html().includes(MEDIA_LEARNING_FIXTURE.translations[0].translated_meaning));
activeController.toggleOriginal(true);
activeController.toggleMeaning(true);
activeController.setMode('active');
activeController.setMode('follow');
assert.match(activeController.html(),/Listen for the first complete idea\./);
assert.ok(activeController.html().includes(MEDIA_LEARNING_FIXTURE.translations[0].translated_meaning));

const shadowController=createListeningController({
  importMedia:async()=>MEDIA_LEARNING_FIXTURE,
  targetLanguage:()=> 'vi',
});
await shadowController.importUrl('https://youtu.be/dQw4w9WgXcQ');
assert.equal(shadowController.model.shadowingSession.asset_id,MEDIA_LEARNING_FIXTURE.asset.asset_id);
assert.deepEqual(
  shadowController.model.shadowingSession.segment_ids,
  MEDIA_LEARNING_FIXTURE.transcript.segments.map(segment=>segment.segment_id),
);
assert.match(shadowController.html(),/data-shadow-selected/);
assert.equal(shadowController.setMode('shadowing'),true);
assert.equal(shadowController.model.mode,'shadowing');
assert.match(shadowController.html(),/data-listening-mode="shadowing"/);
assert.match(shadowController.html(),/data-shadow-round/);
assert.ok(shadowController.html().includes(MEDIA_LEARNING_FIXTURE.transcript.segments[0].original_text));
assert.equal(shadowController.recordShadowingRound(),true);
assert.equal(shadowController.model.shadowingSession.segments['segment-001'].rounds,1);
assert.equal(shadowController.moveSelection(1),true);
assert.equal(shadowController.model.selected,'segment-002');
assert.equal(shadowController.model.shadowingSession.current_segment_id,'segment-002');
assert.equal(shadowController.recordShadowingRound(),true);
assert.equal(shadowController.model.shadowingSession.segments['segment-002'].rounds,1);
assert.doesNotMatch(
  shadowController.html(),
  /MediaRecorder|SpeechRecognition|pronunciation_evaluator|speaking_evaluator|accuracy_percent/,
);
for(const [locale,label] of [
  ['en','No recording or pronunciation score is generated in this checkpoint.'],
  ['vi','Chưa ghi âm và chưa chấm phát âm ở checkpoint này.'],
  ['zh','不录音，也不生成发音评分。'],
]){
  state.supportLanguage=locale;
  assert.ok(shadowController.html().includes(label));
}
state.supportLanguage='vi';
assert.equal(shadowController.setMode('follow'),true);
assert.match(shadowController.html(),/data-shadow-selected/);

let delayedResolve;
const delayedImport=new Promise(resolve=>{delayedResolve=resolve;});
let mountedHtml='';
const delayedRoot={
  get innerHTML(){return mountedHtml;},
  set innerHTML(value){mountedHtml=value;},
  querySelector(selector){
    if(selector.startsWith('[data-listening-view=')){
      const viewId=selector.match(/"([^"]+)"/)?.[1];
      return viewId&&mountedHtml.includes(`data-listening-view="${viewId}"`)?{}:null;
    }
    return null;
  },
  querySelectorAll(){return [];},
};
const mounted=await renderListening(delayedRoot,{importMedia:()=>delayedImport,targetLanguage:()=> 'vi'});
const delayed=mounted.importUrl('https://youtu.be/dQw4w9WgXcQ');
mountedHtml='<section id="new-route">New route</section>';
delayedResolve(MEDIA_LEARNING_FIXTURE);
await delayed;
assert.equal(mountedHtml,'<section id="new-route">New route</section>');

const scrolledSegments=[];
let scrollHtml='';
const scrollRoot={
  get innerHTML(){return scrollHtml;},
  set innerHTML(value){scrollHtml=value;},
  querySelector(selector){
    if(selector.startsWith('[data-listening-view=')){
      const viewId=selector.match(/"([^"]+)"/)?.[1];
      return viewId&&scrollHtml.includes(`data-listening-view="${viewId}"`)?{}:null;
    }
    return null;
  },
  querySelectorAll(selector){
    if(selector==='[data-segment-id]'){
      return ['segment-001','segment-002'].map(segmentId=>({
        dataset:{segmentId},
        scrollIntoView:()=>scrolledSegments.push(segmentId),
      }));
    }
    return [];
  },
};
const scrollController=await renderListening(scrollRoot,{importMedia:async()=>MEDIA_LEARNING_FIXTURE,targetLanguage:()=> 'vi'});
await scrollController.importUrl('https://youtu.be/dQw4w9WgXcQ');
assert.deepEqual(scrolledSegments,['segment-001']);
assert.equal(scrollController.moveSelection(1),true);
assert.deepEqual(scrolledSegments,['segment-001','segment-002']);

const overlapping=[];
const raceController=createListeningController({
  importMedia:payload=>new Promise((resolve,reject)=>overlapping.push({payload,resolve,reject})),
  targetLanguage:()=> 'vi',
});
const olderImport=raceController.importUrl('https://example.invalid/lesson-a');
const newerImport=raceController.importUrl('https://example.invalid/lesson-b');
assert.deepEqual(overlapping.map(item=>item.payload.source_url),[
  'https://example.invalid/lesson-a',
  'https://example.invalid/lesson-b',
]);
overlapping[1].resolve(MEDIA_LEARNING_ZH_FIXTURE);
await newerImport;
assert.equal(raceController.model.payload.asset.asset_id,'asset-fixture-zh');
assert.equal(raceController.model.selected,'segment-zh-001');
assert.equal(raceController.setMode('active'),true);
raceController.setPracticeDraft(MEDIA_LEARNING_ZH_FIXTURE.transcript.segments[0].original_text);
assert.equal(raceController.checkPractice(),true);
assert.equal(raceController.model.practiceSession.asset_id,'asset-fixture-zh');
assert.equal(raceController.model.practiceSession.segments['segment-zh-001'].attempts.length,1);
overlapping[0].resolve(MEDIA_LEARNING_FIXTURE);
await olderImport;
assert.equal(raceController.model.payload.asset.asset_id,'asset-fixture-zh');
assert.equal(raceController.model.selected,'segment-zh-001');
assert.equal(raceController.model.status,'ready');
assert.equal(raceController.model.practiceSession.asset_id,'asset-fixture-zh');
assert.equal(raceController.model.practiceSession.segments['segment-zh-001'].attempts.length,1);

const importFailure=new Error('The media provider could not complete this request.');
importFailure.category='provider_failure';
const resetController=createListeningController({
  importMedia:async({source_url})=>{
    if(source_url.endsWith('/failure'))throw importFailure;
    return source_url.endsWith('/lesson-zh')?MEDIA_LEARNING_ZH_FIXTURE:MEDIA_LEARNING_FIXTURE;
  },
  targetLanguage:()=> 'vi',
});
await resetController.importUrl('https://example.invalid/lesson-en');
resetController.select('segment-002');
resetController.toggleOriginal(false);
resetController.toggleMeaning(false);
assert.equal(resetController.setPlaybackRate(.75),true);
assert.equal(resetController.setMode('active'),true);
resetController.setPracticeDraft(MEDIA_LEARNING_FIXTURE.transcript.segments[1].original_text);
assert.equal(resetController.checkPractice(),true);
assert.equal(resetController.model.practiceSession.segments['segment-002'].attempts.length,1);
await resetController.importUrl('https://example.invalid/failure');
assert.equal(resetController.model.status,'error');
assert.equal(resetController.model.error,importFailure);
await resetController.importUrl('https://example.invalid/lesson-zh');
assert.equal(resetController.model.selected,'segment-zh-001');
assert.equal(resetController.model.error,null);
assert.equal(resetController.model.original,false);
assert.equal(resetController.model.meaning,false);
assert.equal(resetController.model.playbackRate,.75);
assert.equal(resetController.model.mode,'active');
assert.equal(resetController.model.practiceSession.asset_id,'asset-fixture-zh');
assert.equal(Object.values(resetController.model.practiceSession.segments).flatMap(item=>item.attempts).length,0);
assert.match(resetController.html(),/value="0.75" selected/);

controller.toggleOriginal(false);
controller.toggleMeaning(false);
assert.equal(controller.moveSelection(1),true);
assert.equal(controller.model.selected,'segment-002');
assert.equal(controller.model.original,false);
assert.equal(controller.model.meaning,false);
assert.match(controller.html(),/listening-segment selected[^>]*data-segment-id="segment-002"/);
assert.match(controller.html(),/data-next-segment disabled/);
assert.doesNotMatch(controller.html(),/The same segment can support shadowing later\./);
assert.doesNotMatch(controller.html(),/Cùng đoạn này có thể dùng để luyện nói sau\./);
assert.equal(controller.moveSelection(1),false);
assert.equal(controller.model.selected,'segment-002');
assert.equal(controller.moveSelection(-1),true);
assert.equal(controller.model.selected,'segment-001');
assert.equal(controller.moveSelection(-1),false);
assert.equal(controller.select('missing-segment'),false);
assert.equal(controller.setPlaybackRate(2),false);
assert.equal(controller.model.playbackRate,1);
controller.toggleOriginal(true);
controller.toggleMeaning(true);
controller.moveSelection(1);
assert.match(controller.html(),/The same segment can support shadowing later\./);
assert.match(controller.html(),/Cùng đoạn này có thể dùng để luyện nói sau\./);

const translationFailure={
  ...MEDIA_LEARNING_ZH_FIXTURE,
  translation:{...MEDIA_LEARNING_ZH_FIXTURE.translation,provider_error:'RAW PROVIDER EXCEPTION'},
};
const untranslated=createListeningController({importMedia:async()=>translationFailure,targetLanguage:()=> 'vi'});
await untranslated.importUrl('https://youtu.be/dQw4w9WgXcQ');
assert.equal(untranslated.model.status,'ready');
assert.equal(untranslated.model.payload.translation.status,'unavailable');
assert.match(untranslated.html(),/这是共享的原文字幕。/);
assert.match(untranslated.html(),/translation-status-unavailable/);
assert.match(untranslated.html(),/Hiện chưa thể tạo phần nghĩa|Meaning could not be generated|目前无法生成释义/);
assert.doesNotMatch(untranslated.html(),/RAW PROVIDER EXCEPTION|translation-unavailable/);
assert.equal(untranslated.moveSelection(1),true);
assert.equal(untranslated.model.selected,'segment-zh-002');
assert.match(untranslated.html(),/下一句也使用同一个学习流程。/);
assert.match(untranslated.html(),/translation-status-unavailable/);
assert.equal(untranslated.moveSelection(-1),true);
assert.equal(untranslated.setMode('active'),true);
assert.ok(!untranslated.html().includes(MEDIA_LEARNING_ZH_FIXTURE.transcript.segments[0].original_text));
untranslated.setPracticeDraft(MEDIA_LEARNING_ZH_FIXTURE.transcript.segments[0].original_text);
assert.equal(untranslated.checkPractice(),true);
assert.match(untranslated.html(),/active-listening-text-match/);
assert.match(untranslated.html(),/100%/);
assert.ok(untranslated.html().includes(MEDIA_LEARNING_ZH_FIXTURE.transcript.segments[0].original_text));
assert.match(untranslated.html(),/translation-status-unavailable/);

const sameLanguage={
  ...MEDIA_LEARNING_FIXTURE,
  asset:{...MEDIA_LEARNING_FIXTURE.asset,translation_available:false},
  translations:[],
  translation:{status:'not_required',target_language:'en',source:null,failure_kind:null},
};
const translationNotRequired=createListeningController({importMedia:async()=>sameLanguage,targetLanguage:()=> 'en'});
await translationNotRequired.importUrl('https://youtu.be/dQw4w9WgXcQ');
assert.equal(translationNotRequired.model.status,'ready');
assert.equal(translationNotRequired.model.payload.translation.status,'not_required');
assert.match(translationNotRequired.html(),/translation-not-required/);
assert.match(translationNotRequired.html(),/Không cần bản dịch|Translation is not required|不需要翻译/);
assert.doesNotMatch(translationNotRequired.html(),/translation-unavailable/);
assert.doesNotMatch(translationNotRequired.html(),/Meaning is not available yet\./);
assert.equal(translationNotRequired.setMode('active'),true);
assert.equal(translationNotRequired.revealPractice(),true);
assert.match(translationNotRequired.html(),/translation-not-required/);
assert.doesNotMatch(translationNotRequired.html(),/active-listening-text-match/);

const tooLarge={
  ...MEDIA_LEARNING_ZH_FIXTURE,
  translation:{status:'too_large',target_language:'vi',source:null,failure_kind:null},
};
const oversizedTranslation=createListeningController({importMedia:async()=>tooLarge,targetLanguage:()=> 'vi'});
await oversizedTranslation.importUrl('https://youtu.be/dQw4w9WgXcQ');
assert.equal(oversizedTranslation.model.status,'ready');
assert.match(oversizedTranslation.html(),/这是共享的原文字幕。/);
assert.match(oversizedTranslation.html(),/translation-status-too_large/);
assert.match(oversizedTranslation.html(),/quá lớn để tự động tạo phần nghĩa|too large for automatic meaning generation|内容过大/);
assert.doesNotMatch(oversizedTranslation.html(),/translation-status-unavailable|translation-unavailable/);
assert.notEqual(oversizedTranslation.html(),untranslated.html());
assert.equal(oversizedTranslation.setMode('active'),true);
assert.equal(oversizedTranslation.revealPractice(),true);
assert.match(oversizedTranslation.html(),/translation-status-too_large/);
assert.ok(oversizedTranslation.html().includes(MEDIA_LEARNING_ZH_FIXTURE.transcript.segments[0].original_text));
assert.doesNotMatch(oversizedTranslation.html(),/active-listening-text-match/);

const noCaption={...MEDIA_LEARNING_FIXTURE,asset:{...MEDIA_LEARNING_FIXTURE.asset,transcript_available:false,translation_available:false},transcript:null,translations:[],translation:{status:'transcript_unavailable',target_language:'vi',source:null,failure_kind:null}};
const captionless=createListeningController({importMedia:async()=>noCaption,targetLanguage:()=> 'vi'});
await captionless.importUrl('https://youtu.be/dQw4w9WgXcQ');
assert.equal(captionless.model.status,'transcript-unavailable');
assert.equal(captionless.model.payload.translation.status,'transcript_unavailable');
assert.match(captionless.html(),/listening-state-transcript-unavailable/);
assert.equal(captionless.model.practiceSession,null);
assert.equal(captionless.model.shadowingSession,null);
assert.equal(captionless.setMode('active'),false);
assert.equal(captionless.setMode('shadowing'),false);
assert.doesNotMatch(captionless.html(),/data-listening-mode="active"/);

const playbackUnavailable={...MEDIA_LEARNING_FIXTURE,playback:{provider:'youtube',kind:'unavailable',url:''}};
const noPlayback=createListeningController({importMedia:async()=>playbackUnavailable,targetLanguage:()=> 'vi'});
await noPlayback.importUrl('https://example.invalid/no-playback');
assert.equal(noPlayback.model.status,'ready');
assert.equal(noPlayback.setMode('active'),false);
assert.equal(noPlayback.setMode('shadowing'),false);
assert.match(noPlayback.html(),/data-listening-mode="active"[^>]*disabled/);
assert.match(noPlayback.html(),/data-listening-mode="shadowing"[^>]*disabled/);
assert.match(noPlayback.html(),/active-listening-playback-unavailable/);

const oversizedCanonical={
  ...MEDIA_LEARNING_FIXTURE,
  transcript:{...MEDIA_LEARNING_FIXTURE.transcript,segments:[{...MEDIA_LEARNING_FIXTURE.transcript.segments[0],original_text:'word '.repeat(501)}]},
  translations:[],
  translation:{status:'unavailable',target_language:'vi',source:null,failure_kind:'too_large'},
};
const noEvaluation=createListeningController({importMedia:async()=>oversizedCanonical,targetLanguage:()=> 'vi'});
await noEvaluation.importUrl('https://example.invalid/oversized-segment');
assert.equal(noEvaluation.setMode('active'),true);
assert.match(noEvaluation.html(),/active-listening-unavailable/);
assert.doesNotMatch(noEvaluation.html(),/id="activeListeningForm"/);

const acquisitionCases=[
  ['malformed_url','unsupported',/URL media công khai hợp lệ|valid public media URL|有效的公开视频网址/],
  ['unsupported_provider','unsupported',/Nhà cung cấp media này chưa được hỗ trợ|media provider is not supported|媒体提供方/],
  ['media_unavailable','error',/riêng tư hoặc không khả dụng|private or unavailable|私密内容或暂不可用/],
  ['provider_timeout','error',/không phản hồi kịp thời|did not respond in time|响应超时/],
  ['provider_failure','error',/không thể chuẩn bị bài học này|could not prepare this lesson|无法准备本课/],
  ['unsupported_source_language','error',/Ngôn ngữ của media này chưa được hỗ trợ|media language is not supported|媒体语言/],
];
const acquisitionMessages=[];
for(const [category,status,safeCopy] of acquisitionCases){
  const categorized=new Error(`RAW PROVIDER EXCEPTION FOR ${category}`);
  categorized.category=category;
  const degraded=createListeningController({importMedia:async()=>{throw categorized;},targetLanguage:()=> 'vi'});
  await degraded.importUrl('https://example.invalid/video');
  const html=degraded.html();
  assert.equal(degraded.model.status,status);
  assert.match(html,new RegExp(`listening-state-${category}`));
  assert.match(html,safeCopy);
  assert.doesNotMatch(html,/RAW PROVIDER EXCEPTION|\[object Object\]/);
  acquisitionMessages.push(html.match(/<div class="listening-state[^>]*>([^<]+)<\/div>/)?.[1]);
}
assert.equal(new Set(acquisitionMessages).size,acquisitionCases.length);
for(const category of ['malformed_url','unsupported_provider']){
  assert.equal(mediaImportErrorState({category}),'unsupported');
}
for(const category of ['media_unavailable','provider_timeout','provider_failure','malformed_transcript','unsupported_source_language','invalid_target_language']){
  assert.equal(mediaImportErrorState({category}),'error');
}

const originalFetch=globalThis.fetch;
globalThis.fetch=async()=>({
  status:422,
  ok:false,
  headers:{get:()=> 'application/json'},
  json:async()=>({detail:{category:'invalid_target_language',message:'Choose a valid support language.'}}),
});
try{
  await assert.rejects(api.importMedia({source_url:'https://youtu.be/dQw4w9WgXcQ',target_language:'bad'}),error=>{
    assert.equal(error.message,'Choose a valid support language.');
    assert.equal(error.category,'invalid_target_language');
    assert.equal(error.status,422);
    assert.notEqual(String(error),'Error: [object Object]');
    return true;
  });
  const backendFailure=createListeningController({importMedia:api.importMedia,targetLanguage:()=> 'bad'});
  await backendFailure.importUrl('https://youtu.be/dQw4w9WgXcQ');
  assert.equal(backendFailure.model.status,'error');
  assert.doesNotMatch(backendFailure.html(),/\[object Object\]/);
}finally{
  globalThis.fetch=originalFetch;
}
globalThis.fetch=async()=>({status:400,ok:false,headers:{get:()=> 'application/json'},json:async()=>({detail:'Legacy failure'})});
try{
  await assert.rejects(api.importMedia({}),error=>error.message==='Legacy failure'&&error.status===400);
}finally{
  globalThis.fetch=originalFetch;
}
const originalLocation=globalThis.location;
globalThis.location={href:'/before'};
globalThis.fetch=async()=>({status:401,ok:false,headers:{get:()=> 'application/json'},json:async()=>({detail:'Authentication required'})});
try{
  await assert.rejects(api.importMedia({}),error=>error.message==='Authentication required'&&error.status===401);
  assert.equal(globalThis.location.href,'/login');
}finally{
  globalThis.fetch=originalFetch;
  if(originalLocation===undefined)delete globalThis.location; else globalThis.location=originalLocation;
}

const playback={provider:'youtube',kind:'embed',url:'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ'};
const playerHtml=mediaPlayer(playback,'Lesson');
assert.match(playerHtml,/www\.youtube-nocookie\.com\/embed\/dQw4w9WgXcQ\?enablejsapi=1/);
assert.doesNotMatch(mediaPlayer({...playback,url:`${playback.url}?origin=https://example.invalid#ignored`},'Lesson'),/example\.invalid|ignored/);
assert.match(mediaPlayer({...playback,kind:'download'},'Lesson'),/unavailable/);
assert.match(mediaPlayer({...playback,url:'http://www.youtube-nocookie.com/embed/dQw4w9WgXcQ'},'Lesson'),/unavailable/);
assert.match(mediaPlayer({...playback,url:'https://www.youtube.com/embed/dQw4w9WgXcQ'},'Lesson'),/unavailable/);
assert.match(mediaPlayer({...playback,url:'https://www.youtube-nocookie.com/embed/'},'Lesson'),/unavailable/);
assert.match(mediaPlayer({...playback,url:'https://user:secret@www.youtube-nocookie.com/embed/dQw4w9WgXcQ'},'Lesson'),/unavailable/);
const messages=[];
const frame={
  src:'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?enablejsapi=1',
  contentWindow:{postMessage:(message,target)=>messages.push({message:JSON.parse(message),target})},
};
assert.equal(replaySegment({querySelector:()=>frame},playback,4200),true);
assert.deepEqual(messages.map(item=>item.target),[
  'https://www.youtube-nocookie.com',
  'https://www.youtube-nocookie.com',
]);
assert.equal(messages[0].message.func,'seekTo');
assert.equal(messages[0].message.args[0],4.2);
assert.equal(messages[1].message.func,'playVideo');
assert.equal(replaySegment({querySelector:()=>frame},{provider:'vimeo',kind:'embed',url:'https://player.vimeo.com/video/1'},0),false);
messages.length=0;
assert.equal(setPlaybackRate({querySelector:()=>frame},playback,.75),true);
assert.deepEqual(messages,[{
  message:{event:'command',func:'setPlaybackRate',args:[.75]},
  target:'https://www.youtube-nocookie.com',
}]);
assert.equal(setPlaybackRate({querySelector:()=>frame},playback,1),true);
assert.equal(setPlaybackRate({querySelector:()=>frame},playback,1.25),true);
assert.deepEqual(messages.slice(1).map(item=>item.message.args),[[1],[1.25]]);
assert.equal(setPlaybackRate({querySelector:()=>frame},playback,2),false);
assert.equal(setPlaybackRate({querySelector:()=>frame},{provider:'vimeo',kind:'embed',url:'https://player.vimeo.com/video/1'},1),false);
assert.equal(messages.length,3);

const skills=[{key:'listening',internal_available:true,public_available:false}];
assert.equal(routeAvailable('listen',skills,{internal:true}),true);
assert.equal(routeAvailable('listen',skills,{internal:false}),false);
console.log('Listening interaction lifecycle: PASS');
