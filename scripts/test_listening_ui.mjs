import assert from 'node:assert/strict';
import {MEDIA_LEARNING_FIXTURE,MEDIA_LEARNING_ZH_FIXTURE} from '../tests/fixtures/media-learning.js';
import {api} from '../static/becoming/api.js';
import {mediaPlayer,replaySegment} from '../static/becoming/components/media-player.js';
import {createListeningController,mediaImportErrorState,renderListening} from '../static/becoming/screens/listening.js';
import {routeAvailable} from '../static/becoming/domain/skill-release.js';

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
assert.match(controller.html(),/Listen for the first complete idea\./);
assert.match(controller.html(),/listening-segment selected[^>]*data-segment-id="segment-001"/);
assert.match(controller.html(),/<iframe/);
assert.match(controller.html(),/disabled/);

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

controller.select('segment-002');
assert.equal(controller.model.selected,'segment-002');
assert.match(controller.html(),/listening-segment selected[^>]*data-segment-id="segment-002"/);
controller.toggleOriginal(false);
assert.doesNotMatch(controller.html(),/The same segment can support shadowing later\./);
controller.toggleOriginal(true);
assert.match(controller.html(),/The same segment can support shadowing later\./);
controller.toggleMeaning(false);
assert.doesNotMatch(controller.html(),/Cùng đoạn này có thể dùng để luyện nói sau\./);
controller.toggleMeaning(true);
assert.match(controller.html(),/Cùng đoạn này có thể dùng để luyện nói sau\./);

const untranslated=createListeningController({importMedia:async()=>MEDIA_LEARNING_ZH_FIXTURE,targetLanguage:()=> 'vi'});
await untranslated.importUrl('https://youtu.be/dQw4w9WgXcQ');
assert.equal(untranslated.model.status,'ready');
assert.equal(untranslated.model.payload.translation.status,'unavailable');
assert.match(untranslated.html(),/这是共享的原文字幕。/);
assert.match(untranslated.html(),/translation-unavailable/);

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

const noCaption={...MEDIA_LEARNING_FIXTURE,asset:{...MEDIA_LEARNING_FIXTURE.asset,transcript_available:false,translation_available:false},transcript:null,translations:[],translation:{status:'transcript_unavailable',target_language:'vi',source:null,failure_kind:null}};
const captionless=createListeningController({importMedia:async()=>noCaption,targetLanguage:()=> 'vi'});
await captionless.importUrl('https://youtu.be/dQw4w9WgXcQ');
assert.equal(captionless.model.status,'transcript-unavailable');
assert.equal(captionless.model.payload.translation.status,'transcript_unavailable');
assert.match(captionless.html(),/listening-state-transcript-unavailable/);

const categorized=new Error('This media provider is not supported yet.');
categorized.category='unsupported_provider';
const unsupported=createListeningController({importMedia:async()=>{throw categorized;},targetLanguage:()=> 'vi'});
await unsupported.importUrl('https://example.invalid/video');
assert.equal(unsupported.model.status,'unsupported');
assert.doesNotMatch(unsupported.html(),/\[object Object\]/);
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

const skills=[{key:'listening',internal_available:true,public_available:false}];
assert.equal(routeAvailable('listen',skills,{internal:true}),true);
assert.equal(routeAvailable('listen',skills,{internal:false}),false);
console.log('Listening interaction lifecycle: PASS');
