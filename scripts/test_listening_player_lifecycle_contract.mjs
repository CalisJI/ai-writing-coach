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
  const root=new ListeningRoot();
  const controller=await renderListening(root,{
    importMedia:async()=>MEDIA_LEARNING_FIXTURE,
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

  assert.equal(root.querySelector('#listeningPlayer'),player);
  assert.equal(root.fullRenders,fullRenders);
  assert.equal(playerCreations,1);
}finally{
  for(const [key,value] of Object.entries(previous)){
    if(value===undefined)delete globalThis[key];
    else globalThis[key]=value;
  }
}

console.log('LISTENING_PLAYER_LIFECYCLE_CONTRACT=PASS');
