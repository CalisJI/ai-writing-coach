import assert from 'node:assert/strict';
import {api} from '../static/becoming/api.js';
import {state} from '../static/becoming/store.js';
import {renderReading} from '../static/becoming/screens/reading.js';
import {t} from '../static/becoming/domain/i18n.js';

class FakeElement{
  constructor(tag='div',attrs={}){this.tagName=tag.toUpperCase();this.attributes={...attrs};this.dataset={};this.listeners={};this.children=[];this.classList={toggle(){},add(){},remove(){}};this.style={};this.value='';this.disabled=false;}
  addEventListener(name,fn){this.listeners[name]=fn;}
  appendChild(child){this.children.push(child);return child;}
  remove(){}
  setAttribute(name,value){this.attributes[name]=String(value);}
  getAttribute(name){return this.attributes[name]??null;}
  removeAttribute(){}
  focus(){}
  scrollIntoView(){}
  getBoundingClientRect(){return {top:0,height:100,bottom:100};}
  querySelector(selector){
    if(this.innerHTML&&selector==='[data-reading-lookup]'&&this.innerHTML.includes('data-reading-lookup'))return this._lookup||(this._lookup=new FakeElement('button'));
    if(this.innerHTML&&selector==='[data-reading-save]'&&this.innerHTML.includes('data-reading-save'))return this._save||(this._save=new FakeElement('button'));
    return this.children.find(child=>child.matches?.(selector))||null;
  }
  async click(){return this.listeners.click?.({currentTarget:this});}
  set innerHTML(value){this._innerHTML=String(value||'');this._lookup=null;this._save=null;}
  get innerHTML(){return this._innerHTML||'';}
}
function attrs(raw){const out={};for(const match of String(raw||'').matchAll(/([\w-]+)(?:="([^"]*)")?/g))out[match[1]]=match[2]??'';return out;}
class FakeRoot{
  constructor(){this._html='';this._elements=[];}
  set innerHTML(value){this._html=String(value||'');this._elements=[];for(const match of this._html.matchAll(/<(button|form|input|select|section|div|span|label|fieldset|mark|aside|p|strong|small|blockquote|ul|li)([^>]*)>/gi)){const element=new FakeElement(match[1],attrs(match[2]));for(const [key,val] of Object.entries(element.attributes)){if(key.startsWith('data-'))element.dataset[key.slice(5).replace(/-([a-z])/g,(_,letter)=>letter.toUpperCase())]=val;}element.matches=selector=>this.matches(element,selector);element.parentElement=null;this._elements.push(element);}}
  get innerHTML(){return this._html;}
  matches(element,selector){
    if(selector==='.o-reader')return element.attributes.class?.split(/\s+/).includes('o-reader');
    const id=selector.match(/^#([\w-]+)$/);if(id)return element.attributes.id===id[1];
    const data=selector.match(/^\[data-([\w-]+)\]$/);if(data)return Object.prototype.hasOwnProperty.call(element.dataset,data[1].replace(/-([a-z])/g,(_,letter)=>letter.toUpperCase()));
    return false;
  }
  querySelector(selector){return this._elements.find(element=>this.matches(element,selector))||null;}
  querySelectorAll(selector){return this._elements.filter(element=>this.matches(element,selector));}
}

globalThis.document={documentElement:{scrollHeight:0},querySelector:()=>null,querySelectorAll:()=>[],getElementById:()=>new FakeElement(),createElement:()=>new FakeElement(),addEventListener(){},removeEventListener(){}};
globalThis.innerHeight=800;globalThis.addEventListener=()=>{};globalThis.removeEventListener=()=>{};
globalThis.localStorage={getItem:()=>null,setItem(){},removeItem(){}};globalThis.location={hash:'#/read'};
globalThis.getSelection=()=>({toString:()=>''});

const original={readingSessions:api.readingSessions,libraryVocabulary:api.libraryVocabulary,contextualDictionary:api.contextualDictionary,saveLibraryVocabulary:api.saveLibraryVocabulary};
const sessions={en:{id:71,language_code:'en',target_level:'B1',topic:'daily_life',title:'A weekday habit',passage:'I usually walk to school on weekdays.',questions:[],recycled_words:[]},zh:{id:72,language_code:'zh',target_level:'HSK3',topic:'daily_life',title:'学习习惯',passage:'我通常步行去学校。',questions:[],recycled_words:[]}};
try{
  api.libraryVocabulary=async()=>({items:[]});
  for(const [language,selected] of [['en','usually'],['zh','通常']]){
    const session=sessions[language];let observed=null;let saved=null;
    state.language=language;state.supportLanguage=language;state.profile={native_language:'vi'};state.readingSession=session;state.readingResult=null;state.libraryVocabulary={items:[]};
    api.readingSessions=async()=>({items:[session]});
    api.contextualDictionary=async payload=>{observed=payload;return {available:true,claim:'contextual_dictionary',source_language:language,target_language:language,selected_text:selected,summary:language==='zh'?'这里表示通常的习惯。':'Here it means a usual habit.',natural_translation:'translation',grammar_notes:[],vocabulary:[],usage_note:''};};
    api.saveLibraryVocabulary=async payload=>{saved=payload;return {saved:true,item:payload};};
    const root=new FakeRoot();await renderReading(root);
    const passage=root.querySelector('[data-reading-passage]');globalThis.getSelection=()=>({toString:()=>selected});
    passage.listeners.mouseup();
    await root.querySelector('[data-understanding-slot]').querySelector('[data-reading-lookup]').click();
    const expectedContext={text:selected,context:session.passage,source_language:language,target_language:language};
    assert.deepEqual(observed,expectedContext,`${language} contextual lookup payload`);
    const slot=root.querySelector('[data-understanding-slot]');
    assert.match(slot.innerHTML,/data-reading-contextual-state="ready"/);
    assert.match(slot.innerHTML,language==='zh'?/通常的习惯/:/usual habit/);
    await slot.querySelector('[data-reading-save]').click();
    assert.deepEqual(saved,{word:selected,phonetic:'',part_of_speech:'',definition:language==='zh'?'这里表示通常的习惯。':'Here it means a usual habit.',translation_vi:'',source_fragment:selected,source_kind:'dictionary',focus_note:''},`${language} contextual result remains safely capturable`);

    api.contextualDictionary=async()=>({available:false,claim:'contextual_dictionary_unavailable',source_language:language,target_language:language,selected_text:selected});
    await renderReading(root);root.querySelector('[data-reading-passage]').listeners.mouseup();
    await root.querySelector('[data-understanding-slot]').querySelector('[data-reading-lookup]').click();
    const unavailable=root.querySelector('[data-understanding-slot]');
    assert.match(unavailable.innerHTML,/data-reading-contextual-state="unavailable"/);
    assert.ok(unavailable.innerHTML.includes(t('dictionary.context_unavailable')));
    assert.doesNotMatch(unavailable.innerHTML,/data-reading-save/);
  }
  console.log('R16 Reading contextual dictionary EN/ZH contract: PASS');
}finally{Object.assign(api,original);}
