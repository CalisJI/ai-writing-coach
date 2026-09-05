import assert from 'node:assert/strict';
import {MEDIA_LEARNING_FIXTURE} from '../tests/fixtures/media-learning.js';
import {renderListening} from '../static/becoming/screens/listening.js';

class FakeElement {}
// A real HTMLIFrameElement inherits dataset from HTMLElement, so it is always a
// DOMStringMap - never undefined - and the browser fills it from the data-*
// attributes on the tag. The double has to honour that contract, otherwise it
// fails on code that is correct against a real DOM.
class FakeFrame extends FakeElement {
  addEventListener(){}
  constructor(html=''){
    super();
    this.isConnected=true;
    this.dataset=datasetFromMarkup(html);
  }
}

// Mirror the browser's data-* -> dataset camelCase mapping for the rendered tag.
function datasetFromMarkup(html){
  const tag=/<(?:iframe|audio)[^>]*id="listeningPlayer"[^>]*>/.exec(String(html||''));
  const dataset={};
  if(!tag)return dataset;
  for(const [,name,value] of tag[0].matchAll(/data-([a-z0-9-]+)="([^"]*)"/g)){
    dataset[name.replace(/-([a-z0-9])/g,(_,c)=>c.toUpperCase())]=value;
  }
  return dataset;
}
class ScrollContainer extends FakeElement {
  constructor(){
    super();
    this.scrollTop=0;
    this.clientHeight=100;
    this.scrollHeight=500;
    this.row={getBoundingClientRect:()=>({top:300,bottom:320,height:20})};
  }
  closest(){return this;}
  querySelector(){return this.row;}
  getBoundingClientRect(){return {top:0};}
  scrollTo({top}){this.scrollTop=top;}
}
class LearningColumn {
  set innerHTML(value){
    this.html=value;
    this.segments=new ScrollContainer();
  }
  get innerHTML(){return this.html||'';}
  querySelector(selector){return selector==='.listening-segments'?this.segments:null;}
}

const previous={
  Element:globalThis.Element,
  HTMLIFrameElement:globalThis.HTMLIFrameElement,
  YT:globalThis.YT,
  setInterval:globalThis.setInterval,
  clearInterval:globalThis.clearInterval,
};
let playerCreations=0;
globalThis.Element=FakeElement;
globalThis.HTMLIFrameElement=FakeFrame;
globalThis.YT={
  Player:class {
    constructor(_frame,{events}){
      playerCreations+=1;
      events.onReady();
    }
    getCurrentTime(){return 0;}
    getPlayerState(){return 1;}
    destroy(){}
  },
};
globalThis.setInterval=()=>0;
globalThis.clearInterval=()=>{};

class ListeningRoot extends FakeElement {
  constructor(){
    super();
    this.dataset={};
    this.fullRenders=0;
    this.player=null;
    this.workspace=null;
    this.view=null;
    this.listeners=new Map();
    this.followButton={
      listeners:[],
      addEventListener:(_type,listener)=>this.followButton.listeners.push(listener),
      click:()=>this.followButton.listeners.at(-1)?.(),
    };
  }

  set innerHTML(value){
    this.fullRenders+=1;
    this.html=value;
    this.view={};
    this.player=value.includes('id="listeningPlayer"')?new FakeFrame(value):null;
    const column=new LearningColumn();
    this.learningColumn=column;
    this.workspace={
      dataset:{},
      querySelector:selector=>selector==='.listening-learning-column'?column:null,
    };
  }

  get innerHTML(){return this.html||'';}

  querySelector(selector){
    if(selector.startsWith('[data-listening-view='))return this.view;
    if(selector==='.listening-workspace')return this.workspace;
    if(selector==='#listeningPlayer')return this.player;
    if(selector==='[data-follow-playing]')return this.followButton;
    if(selector.includes('.listening-workspace .listening-segments'))return this.learningColumn?.segments;
    if(selector.includes('.listening-workspace[data-listening-mode="follow"] .listening-segments'))return this.learningColumn?.segments;
    return null;
  }

  querySelectorAll(){return [];}
  addEventListener(type,listener){this.listeners.set(type,listener);}
  emit(type,target){this.listeners.get(type)?.({target});}
  contains(){return true;}
  dispatchEvent(){}
}

try{
  const canonicalOnly=()=>{
    const payload={
      ...MEDIA_LEARNING_FIXTURE,
      asset:{...MEDIA_LEARNING_FIXTURE.asset,translation_available:false},
      translations:[],
    };
    delete payload.translation;
    return payload;
  };
  let resolveTranslation;
  const translationPending=new Promise(resolve=>{resolveTranslation=resolve;});
  const root=new ListeningRoot();
  const controller=await renderListening(root,{
    importMedia:async()=>canonicalOnly(),
    translateMedia:async()=>translationPending,
    targetLanguage:()=> 'vi',
  });
  await controller.importUrl('https://youtu.be/dQw4w9WgXcQ');
  await Promise.resolve();

  const playerBeforeTranslation=root.querySelector('#listeningPlayer');
  assert.ok(playerBeforeTranslation instanceof FakeFrame);
  assert.equal(controller.select('segment-002'),true);
  assert.equal(controller.setPlayingSegment('segment-001'),true);
  assert.equal(controller.setMode('shadowing'),true);
  assert.equal(controller.recordShadowingRound(),true);
  assert.equal(controller.setMode('active'),true);
  assert.equal(controller.setPracticeDraft('kept draft'),true);
  assert.equal(controller.setPracticeDraft('x'.repeat(2001)),false);
  controller.toggleOriginal(false);
  controller.toggleMeaning(false);
  assert.equal(controller.setPlaybackRate(1.25),true);
  const practiceSession=controller.model.practiceSession;
  const shadowingSession=controller.model.shadowingSession;
  const practiceValidation=controller.model.practiceValidation;
  resolveTranslation({
    asset:{...MEDIA_LEARNING_FIXTURE.asset,translation_available:true},
    transcript:MEDIA_LEARNING_FIXTURE.transcript,
    translations:MEDIA_LEARNING_FIXTURE.translations,
    translation:MEDIA_LEARNING_FIXTURE.translation,
  });
  await Promise.resolve();
  await Promise.resolve();
  await new Promise(resolve=>setTimeout(resolve,0));
  const player=root.querySelector('#listeningPlayer');
  const fullRenders=root.fullRenders;
  assert.ok(player instanceof FakeFrame);
  assert.equal(player,playerBeforeTranslation);
  assert.equal(playerCreations,1);
  assert.equal(controller.model.selected,'segment-002');
  assert.equal(controller.model.playingSegmentId,'segment-001');
  assert.equal(controller.model.manualSelection,true);
  assert.equal(controller.model.practiceSession,practiceSession);
  assert.equal(controller.model.practiceSession.segments['segment-002'].draft,'kept draft');
  assert.equal(controller.model.shadowingSession,shadowingSession);
  assert.equal(controller.model.shadowingSession.segments['segment-002'].rounds,1);
  assert.equal(controller.model.practiceValidation,practiceValidation);
  assert.equal(controller.model.original,false);
  assert.equal(controller.model.meaning,false);
  assert.equal(controller.model.playbackRate,1.25);

  assert.equal(controller.select('segment-002'),true);
  controller.toggleOriginal(false);
  controller.toggleMeaning(false);
  assert.equal(controller.setMode('shadowing'),true);
  assert.match(root.learningColumn.innerHTML,/shadowing-focus/);
  assert.match(root.learningColumn.innerHTML,/active-listening-meaning/);

  assert.equal(root.querySelector('#listeningPlayer'),player);
  assert.equal(root.fullRenders,fullRenders);
  assert.equal(playerCreations,1);
  assert.equal(controller.model.selected,'segment-002');
  assert.match(root.learningColumn.innerHTML,/active-listening-meaning/);
  assert.match(root.learningColumn.innerHTML,/Cùng đoạn này có thể dùng để luyện nói sau\./);

  assert.equal(controller.setMode('follow'),true);
  root.learningColumn.querySelector('.listening-segments').scrollTop=300;
  root.emit('wheel',root.learningColumn.querySelector('.listening-segments'));
  assert.equal(controller.setPlayingSegment('segment-002'),true);
  assert.equal(root.learningColumn.querySelector('.listening-segments').scrollTop,300);
  assert.equal(root.querySelector('#listeningPlayer'),player);
  root.followButton.click();
  assert.notEqual(root.learningColumn.querySelector('.listening-segments').scrollTop,300);

  assert.equal(controller.setMode('active'),true);
  root.learningColumn.querySelector('.listening-segments').scrollTop=137;
  assert.equal(controller.setPlayingSegment('segment-001'),true);
  assert.equal(root.learningColumn.querySelector('.listening-segments').scrollTop,137);
  assert.equal(controller.setMode('shadowing'),true);
  assert.equal(root.learningColumn.querySelector('.listening-segments').scrollTop,0);
  root.learningColumn.querySelector('.listening-segments').scrollTop=241;
  assert.equal(controller.setPlayingSegment('segment-002'),true);
  assert.equal(root.learningColumn.querySelector('.listening-segments').scrollTop,241);
  assert.equal(controller.setMode('active'),true);
  assert.equal(root.learningColumn.querySelector('.listening-segments').scrollTop,137);
  assert.equal(root.querySelector('#listeningPlayer'),player);

  const failedRoot=new ListeningRoot();
  let failedTranslationAttempts=0;
  const failedController=await renderListening(failedRoot,{
    importMedia:async()=>canonicalOnly(),
    translateMedia:async()=>{
      failedTranslationAttempts+=1;
      if(failedTranslationAttempts===1)throw new Error('translation unavailable');
      return {
        asset:{...MEDIA_LEARNING_FIXTURE.asset,translation_available:true},
        transcript:MEDIA_LEARNING_FIXTURE.transcript,
        translations:MEDIA_LEARNING_FIXTURE.translations,
        translation:MEDIA_LEARNING_FIXTURE.translation,
      };
    },
    targetLanguage:()=> 'vi',
  });
  await failedController.importUrl('https://youtu.be/dQw4w9WgXcQ');
  await Promise.resolve();
  await Promise.resolve();
  const failedPlayerCreations=playerCreations;
  assert.equal(failedController.model.status,'ready');
  assert.equal(failedController.setMode('shadowing'),true);
  assert.ok(failedRoot.querySelector('#listeningPlayer') instanceof FakeFrame);
  assert.equal(playerCreations,failedPlayerCreations);
  failedRoot._cleanupScreen();

  const restoredRoot=new ListeningRoot();
  let restoredImports=0;
  const restoredController=await renderListening(restoredRoot,{
    importMedia:async()=>{restoredImports+=1;return canonicalOnly();},
    translateMedia:async()=>{
      failedTranslationAttempts+=1;
      return {
        asset:{...MEDIA_LEARNING_FIXTURE.asset,translation_available:true},
        transcript:MEDIA_LEARNING_FIXTURE.transcript,
        translations:MEDIA_LEARNING_FIXTURE.translations,
        translation:MEDIA_LEARNING_FIXTURE.translation,
      };
    },
    targetLanguage:()=> 'vi',
  });
  const restoredPlayer=restoredRoot.querySelector('#listeningPlayer');
  assert.equal(restoredImports,0);
  assert.equal(restoredController.model.payload.translation.status,'unavailable');
  assert.ok(restoredPlayer instanceof FakeFrame);
  assert.equal(restoredController.retryTranslation(),true);
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(failedTranslationAttempts,2);
  assert.equal(restoredController.model.payload.translation.status,'ready');
  assert.equal(restoredRoot.querySelector('#listeningPlayer'),restoredPlayer);
}finally{
  for(const [key,value] of Object.entries(previous)){
    if(value===undefined)delete globalThis[key];
    else globalThis[key]=value;
  }
}

console.log('LISTENING_PLAYER_LIFECYCLE_CONTRACT=PASS');
