import assert from 'node:assert/strict';
import {api} from '../static/becoming/api.js';
import {state} from '../static/becoming/store.js';
import {setSharedMediaSession,clearSharedMediaSession} from '../static/becoming/domain/shared-media-session.js';
import {installInteractiveTranscriptLayer} from '../static/becoming/components/interactive-transcript.js';
import {t} from '../static/becoming/domain/i18n.js';
import {renderSpeaking} from '../static/becoming/screens/speaking.js';

class FakeElement{
  constructor(attrs={}){this.attributes={...attrs};this.dataset={};this.listeners={};this.classList={add(){},remove(){},toggle(){}};this.style={};this.parentElement=null;for(const [key,value] of Object.entries(attrs)){if(key.startsWith('data-'))this.dataset[key.slice(5).replace(/-([a-z])/g,(_,letter)=>letter.toUpperCase())]=value;}}
  closest(selector){
    if(selector.includes('data-segment-id'))return this.container||null;
    if(selector.includes('data-it-term'))return this;
    return null;
  }
  addEventListener(name,fn){this.listeners[name]=fn;}
  setAttribute(name,value){this.attributes[name]=String(value);}
  removeAttribute(){}
  appendChild(){}
  querySelectorAll(){return [];}
  remove(){}
  focus(){}
}

class SpeakingRoot{
  constructor(){this.innerHTML='';this.nodes=[];this._cleanupScreen=null;}
  set innerHTML(value){
    this._html=String(value||'');
    this.nodes=[];
    const dataPattern=/data-([a-z0-9-]+)(?:="([^"]*)")?/g;
    for(const match of this._html.matchAll(dataPattern)){
      const key=match[1].replace(/-([a-z])/g,(_,letter)=>letter.toUpperCase());
      if(this.nodes.some(node=>Object.prototype.hasOwnProperty.call(node.dataset,key)))continue;
      this.nodes.push(new FakeElement({[`data-${match[1]}`]:match[2]??''}));
    }
    const segmentId=this._html.match(/class="[^"]*speaking-source[^"]*"[^>]*data-segment-id="([^"]+)"/i)?.[1]||'';
    const container=new FakeElement({'data-segment-id':segmentId});
    const tokenPattern=/<span class="transcript-token"[^>]*data-it-term="([^"]+)"[^>]*>/g;
    for(const match of this._html.matchAll(tokenPattern)){
      const token=new FakeElement({'data-it-term':match[1]});
      token.container=container;
      this.nodes.push(token);
    }
  }
  get innerHTML(){return this._html;}
  querySelector(selector){
    if(selector.includes('.transcript-token'))return this.nodes.find(node=>node.dataset.itTerm&&node.container)||null;
    const match=selector.match(/^\[data-([a-z0-9-]+)/);
    if(!match)return null;
    const key=match[1].replace(/-([a-z])/g,(_,letter)=>letter.toUpperCase());
    return this.nodes.find(node=>Object.prototype.hasOwnProperty.call(node.dataset,key))||null;
  }
  querySelectorAll(selector){const node=this.querySelector(selector);return node?[node]:[];}
}
const dialogBody=new FakeElement();
const dialogTitle=new FakeElement();
const backdrop=new FakeElement();
globalThis.Element=FakeElement;globalThis.HTMLElement=FakeElement;
globalThis.window={};
globalThis.MutationObserver=class{observe(){}disconnect(){}};
globalThis.document={
  documentElement:{dataset:{}},body:{style:{},appendChild(){}},
  querySelectorAll:()=>[],querySelector:()=>null,
  getElementById:id=>({dialogBody,dialogTitle,dialogBackdrop:backdrop,dialogClose:new FakeElement()}[id]||null),
  addEventListener(name,fn){const previous=this.listeners[name];this.listeners[name]=previous?event=>{previous(event);fn(event);}:fn;},removeEventListener(){},listeners:{},createElement:()=>new FakeElement(),
};
globalThis.localStorage={getItem:()=>null,setItem(){},removeItem(){}};
globalThis.getSelection=()=>null;
globalThis.location={hash:'#/speak'};

const original={contextualDictionary:api.contextualDictionary,dictionary:api.dictionary};
try{
  state.profile={native_language:'vi'};state.supportLanguage='vi';
  installInteractiveTranscriptLayer();
  for(const language of ['en','zh']){
    state.language=language;state.supportLanguage='vi';
    const selected=language==='zh'?'学习':'usually';
    const segments=language==='zh'
      ?[{segment_id:'segment-001',original_text:'我通常学习。'},{segment_id:'segment-002',original_text:'然后回家。'}]
      :[{segment_id:'segment-001',original_text:'I usually study.'},{segment_id:'segment-002',original_text:'Then I walk home.'}];
    setSharedMediaSession({learning_language:language,payload:{asset:{asset_id:`asset-${language}`,source_language:language},transcript:{segments}},selected_segment_id:'segment-001'});
    let observed=null;let fallback=false;
    api.contextualDictionary=async payload=>{observed=payload;return {available:true,claim:'contextual_dictionary',selected_text:selected,summary:'Grounded explanation.',natural_translation:'',grammar_notes:[],vocabulary:[],usage_note:''};};
    api.dictionary=async term=>{fallback=true;return {word:term,definitions:[]};};
    const token=new FakeElement({'data-it-term':selected});token.container=new FakeElement({'data-segment-id':'segment-001'});
    document.listeners.click({target:token,preventDefault(){},stopPropagation(){}});
    await new Promise(resolve=>setTimeout(resolve,10));
    assert.deepEqual(observed,{text:selected,context:segments.map(item=>item.original_text).join('\n'),source_language:language,target_language:'vi'},`${language} token contextual payload`);
    assert.equal(fallback,false,`${language} canonical token should not use ungrounded fallback`);

    api.contextualDictionary=async payload=>{observed={...payload,unavailable:true};return {available:false,claim:'contextual_dictionary_unavailable',selected_text:selected};};
    setSharedMediaSession({learning_language:language,payload:{asset:{asset_id:`asset-${language}`,source_language:language},transcript:{segments}},selected_segment_id:'segment-001'});
    const unavailableToken=new FakeElement({'data-it-term':selected});unavailableToken.container=token.container;
    assert.equal(typeof document.listeners.click,'function','interactive transcript click handler remains installed');
    document.listeners.click({target:unavailableToken,preventDefault(){},stopPropagation(){}});
    await new Promise(resolve=>setTimeout(resolve,10));
    assert.ok(observed?.unavailable,`${language} unavailable request should remain contextual (fallback=${fallback})`);
    assert.ok(dialogBody.innerHTML.includes(t('dictionary.context_unavailable')),`${language} unavailable state is explicit: ${dialogBody.innerHTML}`);
  }

  state.language='en';state.supportLanguage='vi';clearSharedMediaSession('en');
  let fallbackPayload=null;
  api.dictionary=async term=>{fallbackPayload=term;return {word:term,definitions:[]};};
  const ungrounded=new FakeElement({'data-it-term':'usually'});document.listeners.click({target:ungrounded,preventDefault(){},stopPropagation(){}});
  await new Promise(resolve=>setTimeout(resolve,0));
  assert.equal(fallbackPayload,'usually','missing canonical context keeps the existing dictionary fallback');

  // The Speaking screen must expose the same token contract as Listening. A
  // mounted render proves the production markup carries the canonical segment
  // linkage before the delegated dictionary action is tapped.
  for(const language of ['en','zh']){
    const speakingSegments=language==='zh'
      ?[{segment_id:'segment-001',original_text:'我通常学习。'},{segment_id:'segment-002',original_text:'然后回家。'}]
      :[{segment_id:'segment-001',original_text:'I usually study.'},{segment_id:'segment-002',original_text:'Then I walk home.'}];
    state.language=language;state.supportLanguage='vi';
    setSharedMediaSession({learning_language:language,payload:{asset:{asset_id:`asset-speaking-${language}`,source_language:language},transcript:{segments:speakingSegments}},selected_segment_id:'segment-001'});
    const recorder={
      snapshot(){return {status:'idle',error:null,url:null,blob:null,mime_type:'audio/webm',supported:true};},
      async start(){return true;},async stop(){return null;},discard(){return true;},cleanup(){},
    };
    let speakingObserved=null;
    api.contextualDictionary=async payload=>{
      speakingObserved=payload;
      return {available:true,claim:'contextual_dictionary',selected_text:payload.text,summary:'Grounded explanation.',natural_translation:'',grammar_notes:[],vocabulary:[],usage_note:''};
    };
    const speakingRoot=new SpeakingRoot();
    const speakingController=await renderSpeaking(speakingRoot,{recorderFactory:()=>recorder,loadAttempts:async()=>({items:[],progress:null})});
    assert.ok(speakingController,`${language} Speaking screen should mount`);
    speakingController.toggleReadText();
    const speakingToken=speakingRoot.querySelector('.transcript-token[data-it-term]');
    assert.ok(speakingToken,`${language} Speaking reference should render dictionary tokens`);
    assert.equal(speakingToken.dataset.itTerm,language==='zh'?'我':'I');
    assert.equal(speakingToken.container.dataset.segmentId,'segment-001');
    document.listeners.click({target:speakingToken,preventDefault(){},stopPropagation(){}});
    await new Promise(resolve=>setTimeout(resolve,10));
    assert.deepEqual(speakingObserved,{text:language==='zh'?'我':'I',context:speakingSegments.map(item=>item.original_text).join('\n'),source_language:language,target_language:'vi'},`${language} mounted Speaking token contextual payload`);
    speakingRoot._cleanupScreen?.();
    clearSharedMediaSession(language);
  }
  console.log('R16 shared transcript contextual dictionary EN/ZH contract: PASS');
}finally{Object.assign(api,original);}
