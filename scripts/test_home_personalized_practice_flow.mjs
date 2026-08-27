import assert from 'node:assert/strict';
import {api} from '../static/becoming/api.js';
import {state} from '../static/becoming/store.js';
import {renderHome} from '../static/becoming/screens/home.js';

class FakeElement{
  constructor(){
    this.dataset={};
    this.listeners={};
    this.innerHTML='';
    this.textContent='';
    this.disabled=false;
    this.classList={toggle:()=>{},add:()=>{},remove:()=>{}};
  }
  addEventListener(name,listener){this.listeners[name]=listener;}
  removeAttribute(){}
  setAttribute(){}
  async click(){return this.listeners.click?.({currentTarget:this});}
}

const root={
  innerHTML:'',
  nodes:new Map(),
  querySelector(selector){
    if(!this.nodes.has(selector))this.nodes.set(selector,new FakeElement());
    return this.nodes.get(selector);
  },
  querySelectorAll(selector){
    if(!selector.includes('home-practice-grammar'))return [];
    const match=this.innerHTML.match(/data-home-practice-grammar="([^"]+)"/);
    if(!match)return [];
    const button=this.nodes.get(selector)||new FakeElement();
    button.dataset.homePracticeGrammar=match[1];
    this.nodes.set(selector,button);
    return [button];
  },
};

globalThis.document={
  querySelector:()=>null,
  querySelectorAll:()=>[],
};
globalThis.window={dispatchEvent:()=>{}};
globalThis.location={hash:'#/home'};
globalThis.HashChangeEvent=class {};
const storage=new Map();
globalThis.localStorage={
  getItem:key=>storage.get(key)??null,
  setItem:(key,value)=>storage.set(key,String(value)),
  removeItem:key=>storage.delete(key),
};

const original={
  dashboard:api.dashboard,
  essays:api.essays,
  learningMemory:api.learningMemory,
  practiceRecommendation:api.practiceRecommendation,
  practiceOutcomes:api.practiceOutcomes,
  libraryVocabulary:api.libraryVocabulary,
  nextPractice:api.nextPractice,
  grammarPractice:api.grammarPractice,
};

const fixtures={
  en:{
    profile:{native_language:'en'},
    recommendation:{
      language:'en',intent:'repair',focus_category:'article',focus_family:'grammar',
      focus_label:'Articles',focus_status:'watch',target_level:'B2',
      task_type:'story',topic:'daily life',word_target:150,
      focus_instruction:'Practice articles in your next draft.',
      reason:'Repeated article evidence in recent writing.',
    },
    task:{
      task_type:'story',topic:'daily life',target_level:'B2',word_target:150,
      prompt:'Write about a daily routine using clear articles.',
    },
  },
  zh:{
    profile:{native_language:'zh'},
    recommendation:{
      language:'zh',intent:'repair',focus_category:'grammar',focus_family:'grammar',
      focus_label:'语法与句子结构',focus_status:'watch',target_level:'HSK4',
      task_type:'story',topic:'日常生活',word_target:80,
      focus_instruction:'下一篇写作先检查句子结构。',
      reason:'近期写作中反复出现语法问题。',
    },
    task:{
      task_type:'story',topic:'日常生活',target_level:'HSK4',word_target:80,
      prompt:'请写一段关于日常生活的短文，注意句子结构。',
    },
  },
};

try{
  api.dashboard=async()=>({essay_count:0,streak:0,metrics:{}});
  api.essays=async()=>[];
  api.learningMemory=async()=>({patterns:[],strengths:[],focus:null,revision_wins:[]});
  api.practiceOutcomes=async()=>({latest:{
    status:'improved',previous_issue_count:2,issue_count:0,revision_no:2,
    focus_label:'Grammar transfer',grammar_id:'a1-complete-sentences-and-basic-word-order',
  }});
  api.libraryVocabulary=async()=>[];

  for(const locale of ['en','zh']){
    const fixture=fixtures[locale];
    state.language=locale;
    state.supportLanguage=locale;
    state.profile=fixture.profile;
    const staleLevel=locale==='zh'?'HSK1':'A1';
    state.draft={
      ...state.draft,
      mode:'free',topic:'random',level:staleLevel,
      length:locale==='zh'?80:150,prompt:'',generatedTask:null,
      practiceContext:null,text:'',html:'<p>Stale persisted writing.</p>',
      savedAt:1700000000000,parentEssayId:null,
    };
    let nextPayload=null;
    api.practiceRecommendation=async()=>fixture.recommendation;
    api.nextPractice=async payload=>{
      nextPayload=payload;
      return {...fixture.task,personalization:fixture.recommendation};
    };
    globalThis.location.hash='#/home';
    root.nodes.clear();
    await renderHome(root);
    const grammarButton=root.querySelectorAll('[data-home-practice-grammar]')[0];
    assert.ok(grammarButton,
      `${locale.toUpperCase()} Home must render Grammar practice from the latest outcome`);
    assert.ok(root.innerHTML.includes(locale==='zh'?'立即练习':'Practice now'),
      `${locale.toUpperCase()} Home must localize the Grammar practice action`);
    let grammarPracticeId=null;
    api.grammarPractice=async id=>{
      grammarPracticeId=id;
      return {
        prompt:locale==='zh'?'请使用本课语法重点写三句话。':'Write three sentences using this grammar focus.',
        target_level:locale==='zh'?'HSK1':'A1',
        practice_context:{intent:'repair',focus_family:'grammar',focus_category:'grammar',
          task_type:'story',topic:'grammar transfer',target_level:locale==='zh'?'HSK1':'A1',
          grammar_id:id},
      };
    };
    await grammarButton.click();
    assert.equal(grammarPracticeId,'a1-complete-sentences-and-basic-word-order',
      `${locale.toUpperCase()} Home must request the linked Grammar lesson practice`);
    assert.equal(state.draft.practiceContext?.grammar_id,grammarPracticeId,
      `${locale.toUpperCase()} Home must preserve Grammar practice context`);
    assert.equal(state.draft.savedAt,null,
      `${locale.toUpperCase()} Home Grammar practice must clear stale saved-state`);
    assert.equal(globalThis.location.hash,'#/write',
      `${locale.toUpperCase()} Home Grammar practice must open Write`);
    globalThis.location.hash='#/home';
    assert.match(root.innerHTML,/id="homePrimary"/,
      `${locale.toUpperCase()} Home must render the personalized Practice action`);
    const primary=root.querySelector('#homePrimary');
    assert.ok(primary.listeners.click,`${locale.toUpperCase()} Home should bind personalized practice`);
    await primary.listeners.click({currentTarget:primary});

    assert.deepEqual(nextPayload,{target_level:fixture.recommendation.target_level},
      `${locale.toUpperCase()} Home must request practice at the recommendation level`);
    assert.equal(state.draft.prompt,fixture.task.prompt,
      `${locale.toUpperCase()} Home must transfer the generated prompt to Write`);
    assert.equal(state.draft.text,'');
    assert.equal(state.draft.html,'',
      `${locale.toUpperCase()} Home must clear stale rich-text before new Practice`);
    assert.equal(state.draft.savedAt,null,
      `${locale.toUpperCase()} Home must clear stale saved-state before new Practice`);
    assert.equal(state.draft.generatedTask.prompt,fixture.task.prompt);
    assert.equal(state.draft.mode,fixture.task.task_type);
    assert.equal(state.draft.topic,fixture.task.topic);
    assert.equal(state.draft.level,fixture.recommendation.target_level);
    assert.equal(state.draft.length,fixture.task.word_target);
    assert.deepEqual(state.draft.practiceContext,fixture.recommendation,
      `${locale.toUpperCase()} Home must preserve the backend recommendation context`);
    assert.equal(state.draft.parentEssayId,null);
    assert.equal(globalThis.location.hash,'#/write',
      `${locale.toUpperCase()} personalized practice must open Write`);
  }
}finally{
  Object.assign(api,original);
}

console.log('Home personalized Practice flow EN/ZH: PASS');
