import assert from 'node:assert/strict';

import {api} from '../static/becoming/api.js';
import {state} from '../static/becoming/store.js';

if(!globalThis.Element)globalThis.Element=Object;
if(!globalThis.HTMLSelectElement)globalThis.HTMLSelectElement=class {};
if(!globalThis.document){
  globalThis.document={
    documentElement:{scrollHeight:0},
    addEventListener(){},
    getElementById(){return null;},
    createElement(){return {};},
  };
}
globalThis.innerHeight=800;
globalThis.addEventListener=()=>{};
globalThis.removeEventListener=()=>{};
globalThis.localStorage={getItem:()=>null,setItem(){},removeItem(){}};

class FakeElement{
  constructor(tag='div',attrs={}){
    this.tagName=tag.toUpperCase();
    this.attributes={...attrs};
    this.dataset={};
    Object.entries(attrs).forEach(([key,value])=>{
      if(key.startsWith('data-'))this.dataset[key.slice(5).replace(/-([a-z])/g,(_,letter)=>letter.toUpperCase())]=value;
    });
    this.listeners={};
    this.children=[];
    this.parentElement=null;
    this.classList={toggle(){},add(){},remove(){}};
    this.style={};
    this.innerHTML='';
    this.textContent='';
    this.value=attrs.value||'';
    this.checked=Object.prototype.hasOwnProperty.call(attrs,'checked');
    this.disabled=false;
  }
  addEventListener(name,fn){this.listeners[name]=fn;}
  removeEventListener(){}
  setAttribute(name,value){this.attributes[name]=String(value);}
  getAttribute(name){return this.attributes[name]??null;}
  removeAttribute(name){delete this.attributes[name];}
  focus(){}
  getBoundingClientRect(){return {top:0,height:100,bottom:100};}
  scrollIntoView(){}
  querySelector(selector){return this._root?.querySelector(selector)||null;}
  querySelectorAll(selector){return this._root?.querySelectorAll(selector)||[];}
  async click(){return this.listeners.click?.({currentTarget:this});}
}

function attrsFrom(raw){
  const attrs={};
  for(const match of raw.matchAll(/([\w-]+)(?:="([^"]*)")?/g))attrs[match[1]]=match[2]??'';
  return attrs;
}

class FakeRoot{
  constructor(){this._elements=[];this._html='';this._readingScroll=null;}
  set innerHTML(value){
    this._html=String(value||'');
    this._elements=[];
    const stack=[];
    const token=/<!--[^]*?-->|<\/(\w+)>|<(button|form|input|select|option|section|div|span|label|fieldset|mark|aside|p|strong|small|blockquote|ul|li|legend)([^>]*)>/gi;
    let match;
    while((match=token.exec(this._html))){
      if(match[1]){
        if(match[1].toLowerCase()!=='option')stack.pop();
        continue;
      }
      const element=new FakeElement(match[2],attrsFrom(match[3]||''));
      element._root=this;
      element.parentElement=stack[stack.length-1]||null;
      if(element.parentElement)element.parentElement.children.push(element);
      this._elements.push(element);
      if(!/^(input|option|mark|br|img)$/.test(element.tagName.toLowerCase()))stack.push(element);
    }
    for(const select of this._elements.filter(item=>item.tagName==='SELECT')){
      const option=select.children.find(item=>item.tagName==='OPTION'&&item.attributes.selected!==undefined)||select.children[0];
      select.value=option?.attributes.value||'';
    }
  }
  get innerHTML(){return this._html;}
  _matches(element,selector){
    if(selector==='.o-reader')return element.attributes.class?.split(/\s+/).includes('o-reader');
    if(selector==='.reading-page')return element.attributes.class?.split(/\s+/).includes('reading-page');
    if(selector==='select:not([data-orena-select])')return element.tagName==='SELECT';
    const id=selector.match(/^#([\w-]+)$/); if(id)return element.attributes.id===id[1];
    const data=selector.match(/^\[data-([\w-]+)(?:="([^"]*)")?\]$/);
    if(data){const key=data[1].replace(/-([a-z])/g,(_,letter)=>letter.toUpperCase());return Object.prototype.hasOwnProperty.call(element.dataset,key)&&(data[2]===undefined||element.dataset[key]===data[2]);}
    const checked=selector.match(/^input\[name="([^"]+)"\]:checked$/);
    if(checked)return element.tagName==='INPUT'&&element.attributes.name===checked[1]&&element.checked;
    const named=selector.match(/^input\[name="([^"]+)"\]$/);
    if(named)return element.tagName==='INPUT'&&element.attributes.name===named[1];
    if(selector==='button[type="submit"]')return element.tagName==='BUTTON'&&element.attributes.type==='submit';
    return false;
  }
  querySelector(selector){return this._elements.find(element=>this._matches(element,selector))||null;}
  querySelectorAll(selector){return this._elements.filter(element=>this._matches(element,selector));}
}

const passage={
  en:'Maya wrote one clear task before opening her laptop. She worked without changing activities, and the routine made distraction easier to notice. By Friday she finished more planned work.',
  zh:'小林先写下今天最重要的任务，再把手机放进包里。他完成第一项任务后休息十分钟，新的方法让他更清楚自己的学习目的。',
};
const sessions={};

const {renderReading}=await import('../static/becoming/screens/reading.js');

for(const language of ['en','zh']){
  state.language=language;
  state.supportLanguage=language;
  state.profile={native_language:'vi'};
  state.readingSession=null;
  state.readingResult=null;
  state.readingSessions=[];
  state.libraryVocabulary=null;
  const level=language==='zh'?'HSK3':'B1';
  state.draft={...state.draft,level};
  const savedWord=language==='zh'?'学习':'distraction';
  const question=language==='zh'?'新的方法主要带来什么变化？':'What did the routine make easier?';
  const evidence=language==='zh'?'让他更清楚自己的学习目的':'made distraction easier to notice';
  const options=language==='zh'?['更快完成所有事情','更清楚学习目的','不用休息','使用更多手机']:['More messages','Less focus','Notice distraction','Longer calls'];
  const session={id:language==='zh'?22:11,created_at:'2026-08-28T00:00:00Z',language_code:language,target_level:level,topic:'daily_life',learner_goal:'everyday',title:language==='zh'?'一个新的学习习惯':'One Clear Task',passage:passage[language],questions:Array.from({length:4},(_,index)=>({id:index+1,question:index===0?question:`${question} (${index+1})`,options,}),),recycled_words:[savedWord],generation_mode:'generated'};
  sessions[session.id]=session;
  const attempts=[];
  const saves=[];
  const calls=[];
  const reopened=[];
  api.readingSessions=async()=>({items:attempts.length?[{...session,latest_attempt:{correct_count:1,total:1}}]:[]});
  api.libraryVocabulary=async()=>({items:[{word:savedWord,definition:language==='zh'?'学习':'a loss of focus'}]});
  api.createReadingSession=async payload=>{calls.push({kind:'create',payload});return session;};
  api.submitReadingAnswers=async(id,answers)=>{calls.push({kind:'answer',id,answers});attempts.push(true);return {found:true,valid:true,session_id:id,correct_count:4,total:4,accuracy:1,claim:'comprehension_check_only',results:Array.from({length:4},(_,index)=>({id:index+1,correct:true,selected_index:language==='zh'?1:2,correct_index:language==='zh'?1:2,explanation_vi:'evidence',evidence_fragment:index===0?evidence:passage[language].slice(0,20)}))};};
  api.readingSession=async id=>{reopened.push(String(id));return {found:true,session:sessions[id]};};
  api.saveLibraryVocabulary=async payload=>{saves.push(payload);return {item:payload};};

  const root=new FakeRoot();
  await renderReading(root);
  assert.match(root.innerHTML,/readingCreateForm/,`${language} create form renders`);
  const createForm=root.querySelector('#readingCreateForm');
  await createForm.listeners.submit({preventDefault(){}});
  assert.deepEqual(calls[0],{kind:'create',payload:{target_level:level,topic:'random',material:'article',recycle_library:true}},`${language} creation payload`);
  assert.equal(state.readingSession.language_code,language,`${language} session remains language scoped`);
  assert.equal(state.readingSession.target_level,level,`${language} session keeps requested level`);
  assert.match(root.innerHTML,new RegExp(session.title.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
  assert.ok(root.innerHTML.includes(`data-reading-word="${savedWord}"`),`${language} recycled word is marked`);

  await root.querySelector('[data-reading-save-all]').click();
  assert.equal(saves.length,1,`${language} key word reaches Library`);
  assert.equal(saves[0].word,savedWord);
  for(let questionIndex=0;questionIndex<4;questionIndex++){
    const radios=root.querySelectorAll(`input[name="q${questionIndex}"]`);
    radios.forEach((radio,index)=>{radio.checked=index===(language==='zh'?1:2);});
  }
  await root.querySelector('#readingAnswerForm').listeners.submit({preventDefault(){}});
  assert.equal(calls.at(-1).kind,'answer');
  assert.equal(calls.at(-1).id,session.id);
  assert.deepEqual(calls.at(-1).answers,Array(4).fill(language==='zh'?1:2));
  assert.match(root.innerHTML,/data-reading-evidence="0"/);
  assert.match(root.innerHTML,language==='zh'?/不是阅读水平评分/:/not a reading level/); // result copy keeps the explicit non-mastery boundary
  assert.doesNotMatch(root.innerHTML,language==='zh'?/掌握分数/:/mastery score/);

  await root.querySelector('[data-reading-back]').click();
  const reopen=root.querySelector('[data-reading-open]');
  assert.ok(reopen,`${language} history exposes reopen control`);
  await reopen.click();
  assert.equal(state.readingSession.id,session.id);
  assert.deepEqual(reopened,[String(session.id)],`${language} history reopens the selected session`);
  assert.match(root.innerHTML,new RegExp(session.title.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));

  /* Empty/unavailable Library is honest, and an answer submission failure does
     not turn into a fabricated result or erase the still-actionable form. */
  state.readingSession={...session,recycled_words:[]};
  state.readingResult=null;
  state.libraryVocabulary=null;
  api.libraryVocabulary=async()=>{throw new Error('library unavailable');};
  await renderReading(root);
  assert.doesNotMatch(root.innerHTML,/\[object Object\]/);
  assert.match(root.innerHTML,language==='zh'?/没有复用/:/did not reuse any saved words/);
  state.readingSession=session;
  state.readingResult=null;
  api.libraryVocabulary=async()=>({items:[{word:savedWord,definition:''}]});
  api.submitReadingAnswers=async()=>{throw new Error('answer service unavailable');};
  await renderReading(root);
  for(let questionIndex=0;questionIndex<4;questionIndex++){
    root.querySelectorAll(`input[name="q${questionIndex}"]`).forEach((radio,index)=>{radio.checked=index===(language==='zh'?1:2);});
  }
  await root.querySelector('#readingAnswerForm').listeners.submit({preventDefault(){}});
  await new Promise(resolve=>setTimeout(resolve,0));
  assert.equal(state.readingResult,null,`${language} failed answer submission has no result`);
  assert.ok(root.querySelector('#submitReading'),`${language} failed answer submission keeps retryable form`);
}

console.log('R10 EN/ZH Reading session -> evidence -> Library -> history flow: PASS');
