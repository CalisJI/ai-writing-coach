import assert from 'node:assert/strict';
import {api} from '../static/becoming/api.js';
import {state} from '../static/becoming/store.js';
import {renderWrite} from '../static/becoming/screens/write.js';
import {t} from '../static/becoming/domain/i18n.js';

class FakeElement{
  constructor(){
    this.dataset={};
    this.listeners={};
    this.innerHTML='';
    this.innerText='';
    this.textContent='';
    this.hidden=false;
    this.classList={toggle:()=>{},add:()=>{},remove:()=>{}};
  }
  addEventListener(name,listener){this.listeners[name]=listener;}
  removeEventListener(){}
  contains(){return false;}
  focus(){}
  setAttribute(){}
  removeAttribute(){}
}

const ids=[
  '#writingEditor','#editorCount','#savedStamp','#lookupSelection','#blockFormat',
  '#practiceMode','#practiceLevel','#practiceLength','#practiceTopic','#practiceAudience',
  '#clearDraft','#reviewDraft','#reviewDraftMobile','#viewRubric','#generateBrief',
];
const nodes=new Map(ids.map(id=>[id,new FakeElement()]));
const root={
  innerHTML:'',
  querySelector:selector=>nodes.get(selector)||null,
  querySelectorAll:()=>[],
};

globalThis.document={
  addEventListener:()=>{},
  removeEventListener:()=>{},
  querySelector:()=>null,
  getElementById:()=>null,
  execCommand:()=>{},
};
const storage=new Map();
globalThis.localStorage={
  getItem:key=>storage.get(key)||null,
  setItem:(key,value)=>storage.set(key,String(value)),
  removeItem:key=>storage.delete(key),
};
globalThis.location={hash:'#/write'};
globalThis.window={
  getSelection:()=>null,
  setInterval:()=>1,
  clearInterval:()=>{},
};

state.language='en';
state.supportLanguage='en';
state.profile={native_language:'en'};
state.draft={
  ...state.draft,
  mode:'free',level:'B2',length:150,text:'',html:'',prompt:'',
  generatedTask:{instruction:'Write about a useful habit.',personalization:{focus_label:'Articles'}},
  practiceContext:null,parentEssayId:null,
};

state.dashboard={error_memory:[
  {category:'article',status:'recurring',total:4,older:2,newer:2},
  {category:'word_choice',status:'recurring',total:3,older:1,newer:2},
]};
await renderWrite(root);
assert.match(root.innerHTML,/What keeps coming back/);
assert.match(root.innerHTML,/Write about a useful habit/);
assert.match(root.innerHTML,/Articles/);
assert.doesNotMatch(root.innerHTML,/\[object Object\]|undefined/);

state.draft.mode='opinion';
state.draft.topic='travel';
await renderWrite(root);
const originalGenerateTask=api.generateTask;
let generatedPayload=null;
api.generateTask=async payload=>{
  generatedPayload=payload;
  return {prompt:'Generated safely',source:'built-in'};
};
state.draft.topic={bad:true};
await nodes.get('#generateBrief').listeners.click({currentTarget:nodes.get('#generateBrief')});
assert.equal(generatedPayload.topic,'random',
  'Writing must not send malformed topics to task generation');
state.draft.topic='   ';
await nodes.get('#generateBrief').listeners.click({currentTarget:nodes.get('#generateBrief')});
api.generateTask=originalGenerateTask;
assert.equal(generatedPayload.topic,'random',
  'Writing must not send whitespace-only topics to task generation');

state.draft.mode='free';
state.draft.topic='random';
state.draft.practiceContext={intent:{bad:true}};
await renderWrite(root);
nodes.get('#writingEditor').innerText='A sufficiently long learner draft.';
state.draft.parentEssayId='7';
const originalEvaluate=api.evaluate;
let evaluationPayload=null;
api.evaluate=async payload=>{
  evaluationPayload=payload;
  return {id:7};
};
await nodes.get('#reviewDraft').listeners.click({currentTarget:nodes.get('#reviewDraft')});
assert.equal(evaluationPayload.parent_essay_id,null,
  'Writing must not send malformed parent references to evaluation');
const validPracticeContext={
  intent:'repair',focus_category:'article',focus_label:'Article',focus_family:'grammar',
  focus_status:'recurring',task_type:'email',topic:'work',target_level:'B2',
  action_label:'Practice this focus',reason:'Use a clearer article.',evidence:'a evidence',
  focus_instruction:'Check articles before submitting.',grammar_id:'a1-article',
  grammar_title:'Articles',
};
state.draft.practiceContext=validPracticeContext;
await nodes.get('#reviewDraft').listeners.click({currentTarget:nodes.get('#reviewDraft')});
assert.deepEqual(evaluationPayload.practice_context,validPracticeContext,
  'Writing must preserve valid backend practice context fields');
for(const malformedContext of [
  [],'malformed',{intent:'observe',focus_family:'grammar'},
  {intent:'repair',focus_family:'style'},
  {intent:'repair',focus_family:''},{intent:'',focus_family:'grammar'},
]){
  state.draft.practiceContext=malformedContext;
  await nodes.get('#reviewDraft').listeners.click({currentTarget:nodes.get('#reviewDraft')});
  assert.equal(evaluationPayload.practice_context,null,
    'Writing must suppress malformed practice context variants');
}
api.evaluate=originalEvaluate;
assert.equal(evaluationPayload.practice_context,null,
  'Writing must not send malformed practice context to evaluation');

for(const locale of ['en','vi','zh']){
  state.supportLanguage=locale;
  await renderWrite(root);
  assert.ok(root.innerHTML.includes(t('write.watchlist')),
    `Writing must render the watchlist heading for ${locale}`);
  assert.ok(root.innerHTML.includes(`<li>${t('category.grammar')} · 4 · ${t('write.trend_flat')}</li>`),
    `Writing must render the translated grammar watchlist item for ${locale}`);
  assert.ok(root.innerHTML.includes(`<li>${t('category.vocabulary')} · 3 · ${t('write.trend_up')}</li>`),
    `Writing must render the translated vocabulary watchlist item for ${locale}`);
}
state.supportLanguage='en';

state.draft.generatedTask={instruction:{bad:true},prompt:{bad:true},personalization:{focus_label:{bad:true}}};
state.draft.mode='custom';
state.draft.topic={bad:true};
state.draft.audience={bad:true};
state.draft.prompt={bad:true};
state.draft.text={bad:true};
state.draft.html={bad:true};
await renderWrite(root);
assert.doesNotMatch(root.innerHTML,/\[object Object\]|undefined/,
  'Writing must not stringify malformed prompt payloads');
assert.doesNotMatch(root.innerHTML,/Articles|Write about a useful habit/,
  'Writing must omit malformed generated-task text');
assert.match(root.innerHTML,/id="practiceTopic"[^>]*value=""/,
  'Writing must clear malformed topic values in the rendered control');
assert.match(root.innerHTML,/id="practiceAudience"[^>]*value=""/,
  'Writing must clear malformed audience values in the rendered control');
assert.match(root.innerHTML,/id="customPrompt"[^>]*><\/textarea>/,
  'Writing must clear malformed custom prompt values in the rendered control');

state.draft.generatedTask={instruction:'Stale generated brief'};
state.draft.prompt='Stale custom prompt';
state.draft.practiceContext={focus_category:'article'};
state.draft.parentEssayId={bad:true};
state.draft.mode={bad:true};
state.draft.length={bad:true};
state.draft.topic={bad:true};
await renderWrite(root);
assert.match(root.innerHTML,/option value="free" selected/,
  'Writing must select a safe default mode for malformed drafts');
assert.match(root.innerHTML,/option value="150" selected/,
  'Writing must select a safe default length for malformed drafts');
assert.doesNotMatch(root.innerHTML,/\[object Object\]|undefined/,
  'Writing must not expose malformed draft selections');
assert.equal(state.draft.generatedTask,null,
  'Writing must clear stale generated tasks after selection fallback');
assert.equal(state.draft.prompt,'',
  'Writing must clear stale prompts after selection fallback');
assert.equal(state.draft.practiceContext,null,
  'Writing must clear stale practice context after selection fallback');
assert.equal(state.draft.topic,'random',
  'Writing must normalize malformed topics before task generation');
assert.equal(state.draft.parentEssayId,null,
  'Writing must clear malformed parent essay references before evaluation');
assert.doesNotMatch(root.innerHTML,/Stale generated brief|Stale custom prompt/,
  'Writing must omit cleared stale task copy');

state.draft.level='not-a-level';
state.draft.mode='free';
state.draft.length=150;
state.draft.topic='travel';
await renderWrite(root);
assert.equal(state.draft.topic,'travel',
  'Writing must preserve valid topics during level fallback');

for(const malformedDraft of [null,[]]){
  state.draft=malformedDraft;
  await renderWrite(root);
  assert.equal(state.draft.mode,'free',
    'Writing must recover a malformed draft container');
  assert.equal(state.draft.topic,'random',
    'Writing must recover a malformed draft topic');
  assert.doesNotMatch(root.innerHTML,/\[object Object\]|undefined/,
    'Writing must not expose malformed draft containers');
}

state.draft.savedAt={bad:true};
await renderWrite(root);
assert.match(root.innerHTML,/Not saved yet/,
  'Writing must not claim a save for malformed timestamps');
state.draft.savedAt=String(Date.now()-3600000);
await renderWrite(root);
assert.match(root.innerHTML,/Not saved yet/,
  'Writing must not coerce numeric-string timestamps');
state.draft.savedAt=Date.now()+86400000;
await renderWrite(root);
assert.match(root.innerHTML,/Not saved yet/,
  'Writing must not claim a save for future timestamps');

for(const malformed of [
  null,{},
  [{category:{},status:'recurring',total:{},older:1,newer:1}],
  [{category:'article',status:'recurring',total:4,older:3,newer:2}],
  [{category:'article',status:'recurring',total:4,older:3,newer:1}],
  [{category:'article',status:'recurring',total:2,older:1,newer:1}],
  [{category:'untrusted',status:'recurring',total:4,older:2,newer:2}],
  [{category:'article',status:'recurring',total:-1,older:1,newer:1}],
  [{category:'article',status:'recurring',total:1.5,older:1,newer:1}],
  [{category:'article',status:'recurring',total:1,older:1.5,newer:1}],
]){
  state.dashboard={error_memory:malformed};
  await renderWrite(root);
  assert.doesNotMatch(root.innerHTML,/What keeps coming back/,
    'Writing must omit malformed watchlist records');
  assert.doesNotMatch(root.innerHTML,/\[object Object\]|undefined/,
    'Writing must not render malformed watchlist values');
}

console.log('Writing watchlist shape contract: PASS');
