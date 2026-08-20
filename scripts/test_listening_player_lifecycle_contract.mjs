import assert from 'node:assert/strict';
import {MEDIA_LEARNING_FIXTURE} from '../tests/fixtures/media-learning.js';
import {renderListening} from '../static/becoming/screens/listening.js';

class FakeElement {}
class FakeFrame extends FakeElement {
  constructor(){
    super();
    this.isConnected=true;
  }
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
  }

  set innerHTML(value){
    this.fullRenders+=1;
    this.html=value;
    this.view={};
    this.player=value.includes('id="listeningPlayer"')?new FakeFrame():null;
    const column={innerHTML:''};
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
    return null;
  }

  querySelectorAll(){return [];}
  addEventListener(){}
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

  const player=root.querySelector('#listeningPlayer');
  const fullRenders=root.fullRenders;
  assert.ok(player instanceof FakeFrame);
  assert.equal(playerCreations,1);

  assert.equal(controller.select('segment-002'),true);
  controller.toggleOriginal(false);
  controller.toggleMeaning(false);
  assert.equal(controller.setMode('shadowing'),true);
  assert.match(root.learningColumn.innerHTML,/shadowing-focus/);
  assert.doesNotMatch(root.learningColumn.innerHTML,/active-listening-meaning/);

  resolveTranslation({
    asset:{...MEDIA_LEARNING_FIXTURE.asset,translation_available:true},
    transcript:MEDIA_LEARNING_FIXTURE.transcript,
    translations:MEDIA_LEARNING_FIXTURE.translations,
    translation:MEDIA_LEARNING_FIXTURE.translation,
  });
  await Promise.resolve();
  await Promise.resolve();

  assert.equal(root.querySelector('#listeningPlayer'),player);
  assert.equal(root.fullRenders,fullRenders);
  assert.equal(playerCreations,1);
  assert.equal(controller.model.selected,'segment-002');
  assert.match(root.learningColumn.innerHTML,/active-listening-meaning/);
  assert.match(root.learningColumn.innerHTML,/Cùng đoạn này có thể dùng để luyện nói sau\./);

  const failedRoot=new ListeningRoot();
  const failedController=await renderListening(failedRoot,{
    importMedia:async()=>canonicalOnly(),
    translateMedia:async()=>{throw new Error('translation unavailable');},
    targetLanguage:()=> 'vi',
  });
  await failedController.importUrl('https://youtu.be/dQw4w9WgXcQ');
  await Promise.resolve();
  await Promise.resolve();
  const failedPlayer=failedRoot.querySelector('#listeningPlayer');
  const failedPlayerCreations=playerCreations;
  assert.equal(failedController.setMode('shadowing'),true);
  assert.match(failedRoot.learningColumn.innerHTML,/translation-status-unavailable/);
  assert.equal(failedRoot.querySelector('#listeningPlayer'),failedPlayer);
  assert.equal(playerCreations,failedPlayerCreations);
}finally{
  for(const [key,value] of Object.entries(previous)){
    if(value===undefined)delete globalThis[key];
    else globalThis[key]=value;
  }
}

console.log('LISTENING_PLAYER_LIFECYCLE_CONTRACT=PASS');
