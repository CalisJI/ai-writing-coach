import assert from 'node:assert/strict';
import {api} from '../static/becoming/api.js';
import {state} from '../static/becoming/store.js';
import {renderHome} from '../static/becoming/screens/home.js';
import {renderListening} from '../static/becoming/screens/listening.js';
import {rememberMediaLesson} from '../static/becoming/domain/media-lesson-history.js';
import {clearSharedMediaSession} from '../static/becoming/domain/shared-media-session.js';
import {MEDIA_LEARNING_FIXTURE,MEDIA_LEARNING_ZH_FIXTURE} from '../tests/fixtures/media-learning.js';

class FakeElement{
  constructor(){this.dataset={};this.listeners={};this.classList={add(){},remove(){},toggle(){}};this.style={};}
  addEventListener(name,listener){this.listeners[name]=listener;}
  removeEventListener(){}
  async click(){return this.listeners.click?.({currentTarget:this});}
  querySelector(){return null;}
}

function homeRoot(){
  const root={innerHTML:'',nodes:new Map(),querySelector(selector){
    if(!this.nodes.has(selector))this.nodes.set(selector,new FakeElement());
    return this.nodes.get(selector);
  },querySelectorAll(selector){
    if(selector!=='[data-home-resume-listening]')return [];
    if(!this.innerHTML.includes('data-home-resume-listening'))return [];
    const button=this.nodes.get(selector)||new FakeElement();
    this.nodes.set(selector,button);
    return [button];
  }};
  return root;
}

function listeningRoot(){
  let html='';
  return {get innerHTML(){return html;},set innerHTML(value){html=String(value||'');},querySelector(selector){
    if(selector.startsWith('[data-listening-view=')){
      const id=selector.match(/"([^"]+)"/)?.[1];
      return id&&html.includes(`data-listening-view="${id}"`)?{}:null;
    }
    return null;
  },querySelectorAll(){return [];},addEventListener(){}};
}

const storage=new Map();
globalThis.localStorage={getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,String(value)),removeItem:key=>storage.delete(key)};
const session=new Map();
globalThis.sessionStorage={getItem:key=>session.get(key)??null,setItem:(key,value)=>session.set(key,String(value)),removeItem:key=>session.delete(key)};
globalThis.document={querySelector:()=>null,querySelectorAll:()=>[],addEventListener(){},removeEventListener(){},body:{classList:{add(){},remove(){}}}};
globalThis.window={dispatchEvent(){},setInterval(){return 1;},clearInterval(){}};
globalThis.location={hash:'#/home'};
globalThis.HashChangeEvent=class {};
if(!globalThis.Element)globalThis.Element=Object;
if(!globalThis.HTMLIFrameElement)globalThis.HTMLIFrameElement=class {};

const original={
  dashboard:api.dashboard,essays:api.essays,learningMemory:api.learningMemory,
  practiceRecommendation:api.practiceRecommendation,practiceOutcomes:api.practiceOutcomes,
  libraryVocabulary:api.libraryVocabulary,
};

try{
  api.dashboard=async()=>({});
  api.essays=async()=>[];
  api.learningMemory=async()=>({strengths:[],revision_wins:[]});
  api.practiceRecommendation=async()=>null;
  api.practiceOutcomes=async()=>({items:[],latest:null});
  api.libraryVocabulary=async()=>[];

  for(const item of [
    {language:'en',payload:MEDIA_LEARNING_FIXTURE,title:'A short English lesson',segment:'segment-002',mode:'active',resume:'Continue listening'},
    {language:'zh',payload:MEDIA_LEARNING_ZH_FIXTURE,title:'一节中文听力课',segment:'segment-zh-002',mode:'shadowing',resume:'继续听力'},
  ]){
    state.language=item.language;
    state.supportLanguage=item.language;
    state.me={id:`learner-r12-${item.language}`};
    storage.clear();session.clear();
    rememberMediaLesson({learning_language:item.language,source_url:item.payload.asset.source_url,title:item.title,provider:'fixture',selected_segment_id:item.segment,mode:item.mode});
    const root=homeRoot();
    await renderHome(root);
    const button=root.querySelectorAll('[data-home-resume-listening]')[0];
    assert.ok(button,`${item.language} Home renders a recent Listening return cue`);
    assert.ok(root.innerHTML.includes(item.resume),`${item.language} return cue is localized`);
    assert.doesNotMatch(root.innerHTML,/transcript|audio|base64/i,`${item.language} cue exposes no media payload`);
    await button.click();
    assert.equal(globalThis.location.hash,'#/listen');

    const listening=await renderListening(listeningRoot(),{
      importMedia:async()=>item.payload,
      targetLanguage:()=>item.language,
      loadListeningProgress:async()=>({items:[]}),
      loadShadowingProgress:async()=>({items:[]}),
    });
    await new Promise(resolve=>setTimeout(resolve,0));
    await new Promise(resolve=>setTimeout(resolve,0));
    assert.equal(listening.model.status,'ready');
    assert.equal(listening.model.selected,item.segment,`${item.language} restores the saved canonical segment`);
    assert.equal(listening.model.mode,item.mode,`${item.language} restores the saved practice mode`);
  }

  for(const item of [
    {language:'en',payload:MEDIA_LEARNING_FIXTURE,old:Date.now()-91*24*60*60*1000},
    {language:'zh',payload:MEDIA_LEARNING_ZH_FIXTURE,old:Date.now()-2*60*60*1000},
  ]){
    state.language=item.language;state.supportLanguage=item.language;state.me={id:`learner-r12-empty-${item.language}`};
    storage.clear();session.clear();
    storage.set('orena.media-lesson-history.v1',JSON.stringify({[item.language]:[{source_url:item.payload.asset.source_url,title:'Expired',saved_at:item.old}]}));
    const root=homeRoot();
    await renderHome(root);
    assert.equal(root.querySelectorAll('[data-home-resume-listening]').length,0,`${item.language} stale history does not show a return cue`);
  }

  for(const item of [
    {language:'en',payload:MEDIA_LEARNING_FIXTURE,mode:'active'},
    {language:'zh',payload:MEDIA_LEARNING_ZH_FIXTURE,mode:'shadowing'},
  ]){
    state.language=item.language;state.supportLanguage=item.language;state.me={id:`learner-r12-malformed-${item.language}`};
    storage.clear();session.clear();clearSharedMediaSession(item.language);
    rememberMediaLesson({
      learning_language:item.language,
      source_url:item.payload.asset.source_url,
      title:'Malformed segment fixture',
      provider:'fixture',
      selected_segment_id:'segment-does-not-exist',
      mode:item.mode,
    });
    const root=homeRoot();
    await renderHome(root);
    const button=root.querySelectorAll('[data-home-resume-listening]')[0];
    assert.ok(button,`${item.language} malformed context still offers the lesson return cue`);
    await button.click();
    const listening=await renderListening(listeningRoot(),{
      importMedia:async()=>item.payload,
      targetLanguage:()=>item.language,
      loadListeningProgress:async()=>({items:[]}),
      loadShadowingProgress:async()=>({items:[]}),
    });
    await new Promise(resolve=>setTimeout(resolve,0));
    await new Promise(resolve=>setTimeout(resolve,0));
    assert.equal(listening.model.status,'ready');
    assert.equal(listening.model.selected,item.payload.transcript.segments[0].segment_id,`${item.language} malformed segment falls back to first segment`);
    assert.equal(listening.model.mode,'follow',`${item.language} malformed segment falls back to Follow mode`);
  }
}finally{
  Object.assign(api,original);
}

console.log('R12 EN/ZH Listening return-to-practice handoff: PASS');
