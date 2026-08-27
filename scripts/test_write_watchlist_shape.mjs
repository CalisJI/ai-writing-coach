import assert from 'node:assert/strict';
import {state} from '../static/becoming/store.js';
import {renderWrite} from '../static/becoming/screens/write.js';

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
}

const ids=[
  '#writingEditor','#editorCount','#savedStamp','#lookupSelection','#blockFormat',
  '#practiceMode','#practiceLevel','#practiceLength','#practiceTopic','#practiceAudience',
  '#clearDraft','#reviewDraft','#reviewDraftMobile','#viewRubric',
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
  execCommand:()=>{},
};
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
