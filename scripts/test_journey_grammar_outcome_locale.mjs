import assert from 'node:assert/strict';
import {api} from '../static/becoming/api.js';
import {state} from '../static/becoming/store.js';
import {renderJourney} from '../static/becoming/screens/journey.js';
import {renderWrite} from '../static/becoming/screens/write.js';

globalThis.location={hash:'#/journey'};
const storage=new Map();
globalThis.localStorage={
  getItem:key=>storage.get(key)||null,
  setItem:(key,value)=>storage.set(key,String(value)),
  removeItem:key=>storage.delete(key),
};
globalThis.window={dispatchEvent:()=>{},getSelection:()=>null,setInterval:()=>1,clearInterval:()=>{}};
globalThis.document={
  addEventListener:()=>{},
  removeEventListener:()=>{},
  querySelector:()=>null,
  querySelectorAll:()=>[],
  getElementById:()=>null,
  execCommand:()=>{},
};
const revisionButtons=new Map();
const journeyStartButton={
  dataset:{journeyStart:''},
  listeners:{},
  innerHTML:'',
  textContent:'Start practice',
  disabled:false,
  classList:{toggle:()=>{},add:()=>{},remove:()=>{}},
  addEventListener(name,listener){this.listeners[name]=listener;},
  setAttribute(){},
  removeAttribute(){},
  querySelector(){return null;},
  async click(){return this.listeners.click?.({currentTarget:this});},
};
const root={
  innerHTML:'',
  insertAdjacentHTML() {},
  querySelector:selector=>{
    if(selector==='[data-journey-start]'&&root.innerHTML.includes('data-journey-start')){
      return journeyStartButton;
    }
    return null;
  },
  querySelectorAll:selector=>{
    if(selector!=='[data-journey-essay]')return [];
    const ids=[...root.innerHTML.matchAll(/data-journey-essay="([^"]+)"/g)]
      .map(match=>match[1]);
    return ids.map(id=>{
      if(!revisionButtons.has(id)){
        revisionButtons.set(id,{
          dataset:{journeyEssay:id},
          listeners:{},
          addEventListener(name,listener){this.listeners[name]=listener;},
          async click(){return this.listeners.click?.({currentTarget:this});},
        });
      }
      return revisionButtons.get(id);
    });
  },
};
class WriteElement{
  constructor(){
    this.dataset={};
    this.listeners={};
    this.innerHTML='';
    this.innerText='';
    this.textContent='';
    this.disabled=false;
    this.classList={toggle:()=>{},add:()=>{},remove:()=>{}};
  }
  addEventListener(name,listener){this.listeners[name]=listener;}
  removeEventListener(){}
  focus(){}
  setAttribute(){}
  removeAttribute(){}
  contains(){return false;}
  querySelector(){return null;}
}
const writeIds=[
  '#writingEditor','#editorCount','#savedStamp','#lookupSelection','#blockFormat',
  '#practiceMode','#practiceLevel','#practiceLength','#practiceTopic','#practiceAudience',
  '#clearDraft','#reviewDraft','#reviewDraftMobile','#viewRubric','#generateBrief',
];
const writeNodes=new Map(writeIds.map(id=>[id,new WriteElement()]));
const writeRoot={
  innerHTML:'',
  querySelector:selector=>writeNodes.get(selector)||null,
  querySelectorAll:()=>[],
};

api.dashboard=async()=>({cefr:'B1',streak:0});
api.essays=async()=>[{
  id:1,
  series_id:1,
  revision_no:1,
  overall:70,
  created_at:'2026-01-01T00:00:00Z',
  prompt:'A short practice task',
}];
let latestMemory={
  patterns:[],
  strengths:[],
  focus:null,
  revision_wins:[],
};
api.learningMemory=async()=>latestMemory;
api.practiceRecommendation=async()=>null;
let latestOutcome={
    grammar_id:'a1-agreement',
    focus_label:'Agreement practice',
    status:'improved',
    issue_count:0,
    revision_no:2,
};
let practiceHistoryItems=[
  latestOutcome,
  {grammar_id:'a1-agreement',focus_label:'Agreement practice',status:'still_working',issue_count:1,revision_no:1},
];
api.practiceOutcomes=async()=>({latest:latestOutcome,items:practiceHistoryItems});

state.language='en';
state.profile={native_language:'en'};
const historyStatusCopy={
  en:'The pattern is still active.',
  vi:'Mẫu này vẫn đang xuất hiện.',
  zh:'这个模式仍然活跃。',
};
for(const [locale,label] of [
  ['en','Grammar practice progress'],
  ['vi','Tiến độ luyện ngữ pháp'],
  ['zh','语法练习进度'],
]){
  state.supportLanguage=locale;
  await renderJourney(root);
  assert.ok(
    root.innerHTML.includes(label),
    `Journey Grammar outcome should follow the active ${locale.toUpperCase()} UI locale`,
  );
  if(locale!=='en'){
    assert.doesNotMatch(
      root.innerHTML,
      /\bimproved\b/,
      `Journey ${locale.toUpperCase()} Grammar outcome must not expose the raw status enum`,
    );
  }
  assert.ok(
    root.innerHTML.includes(locale==='en'?'Recent practice outcomes':locale==='vi'?'Các kết quả luyện tập gần đây':'最近的练习结果'),
    `Journey ${locale.toUpperCase()} should show the localized practice outcome history`,
  );
  assert.ok(root.innerHTML.includes(historyStatusCopy[locale]),
    `Journey ${locale.toUpperCase()} should localize each historical outcome`);
  if(locale!=='en')assert.doesNotMatch(root.innerHTML,/still_working/,
    `Journey ${locale.toUpperCase()} must not expose raw historical status enums`);
}
state.supportLanguage='zh';
assert.doesNotMatch(root.innerHTML,/Grammar practice progress/);

practiceHistoryItems=[];
for(const locale of ['en','vi','zh']){
  state.supportLanguage=locale;
  for(const malformed of [null,{},
    {grammar_id:{},status:'improved',issue_count:{},revision_no:{}},
    {grammar_id:'a1-agreement',status:'unknown'},
  ]){
    latestOutcome=malformed;
    await renderJourney(root);
    assert.doesNotMatch(
      root.innerHTML,
      /o-journey-grammar-outcome/,
      `Journey ${locale.toUpperCase()} must omit malformed Grammar outcomes`,
    );
    assert.doesNotMatch(
      root.innerHTML,
      /\[object Object\]/,
      `Journey ${locale.toUpperCase()} must not render malformed object values`,
    );
  }
}

for(const locale of ['en','vi','zh']){
  state.supportLanguage=locale;
  for(const malformed of [
    {patterns:null,strengths:null,revision_wins:null,focus:null},
    {patterns:[null,{}],strengths:[null,{}],revision_wins:[null,{}],focus:{}},
    {patterns:[{category:{},status:{},total:{},older:-1,newer:0}],strengths:[{category:{},stage:{},evidence_count:{}}],revision_wins:[{overall_delta:{}}],focus:null},
    {patterns:[{category:'grammar',status:'recurring',total:-1,older:1,newer:0,series_count:1}],strengths:[],revision_wins:[],focus:null},
    {patterns:[{category:'grammar',status:'recurring',total:1,older:0.5,newer:0,series_count:1}],strengths:[],revision_wins:[],focus:null},
    {patterns:[],strengths:[{category:'grammar',stage:'Stable',evidence_count:1.5,series_count:1}],revision_wins:[],focus:null},
  ]){
    latestMemory=malformed;
    await renderJourney(root);
    assert.doesNotMatch(
      root.innerHTML,
      /\[object Object\]/,
      `Journey ${locale.toUpperCase()} must not render malformed learning-memory records`,
    );
    assert.doesNotMatch(root.innerHTML,/o-journey-focus|o-journey-row--(?:up|watch)/,
      `Journey ${locale.toUpperCase()} must omit semantically invalid memory records`);
  }
}

const patternShape={
  category:'grammar',status:'improving',total:2,older:2,newer:1,series_count:2,
};
const patternStatusCopy={
  vi:{new:'Mới',watch:'Cần theo dõi'},
  zh:{new:'新出现',watch:'需要留意'},
};
for(const locale of ['vi','zh']){
  state.profile={native_language:locale};
  state.supportLanguage=locale;
  for(const status of ['new','watch']){
    latestMemory={
      patterns:[
        patternShape,
        {...patternShape,category:'vocabulary',status},
      ],
      strengths:[],
      focus:{category:'grammar'},
      revision_wins:[],
    };
    await renderJourney(root);
    assert.match(root.innerHTML,new RegExp(patternStatusCopy[locale][status]),
      `Journey ${locale.toUpperCase()} should localize the ${status} pattern status`);
    const learnerMarkup=root.innerHTML.replace(/\bclass="[^"]*"/g,'');
    assert.doesNotMatch(learnerMarkup,new RegExp(`\\b${status}\\b`),
      `Journey ${locale.toUpperCase()} must not expose raw ${status} status`);
  }
}

const revisionEssays=[
  {id:11,series_id:11,revision_no:1,overall:68,created_at:'2026-01-01T00:00:00Z',prompt:'A revision series'},
  {id:12,series_id:11,revision_no:2,overall:74,created_at:'2026-01-02T00:00:00Z',prompt:'A revision series'},
];
const revisionEvidenceCopy={
  en:'Issue count change: -2',
  vi:'Thay đổi số lượng lỗi: -2',
  zh:'问题数量变化：-2',
};
api.essays=async()=>revisionEssays;
let openedEssayId=null;
api.essay=async id=>{
  openedEssayId=String(id);
  return revisionEssays.find(item=>String(item.id)===String(id));
};
for(const locale of ['en','vi','zh']){
  state.profile={native_language:locale};
  state.supportLanguage=locale;
  latestMemory={
    patterns:[],
    strengths:[],
    focus:null,
    revision_wins:[{latest_id:12,revisions:2,overall_delta:6,error_delta:-2,latest_date:'2026-01-02T00:00:00Z'}],
  };
  await renderJourney(root);
  assert.match(root.innerHTML,new RegExp(revisionEvidenceCopy[locale]),
    `Journey ${locale.toUpperCase()} should render localized revision evidence`);
}

state.language='en';
state.supportLanguage='en';
latestMemory={
  patterns:[],
  strengths:[],
  focus:null,
  revision_wins:[{latest_id:12,revisions:2,overall_delta:6,error_delta:-2,latest_date:'2026-01-02T00:00:00Z'}],
};
await renderJourney(root);
const renderedRevisionButtons=root.querySelectorAll('[data-journey-essay]');
assert.equal(renderedRevisionButtons.length,1,
  'Journey must render one revision control for the linked latest essay');
assert.equal(renderedRevisionButtons[0].dataset.journeyEssay,'12',
  'Journey revision control must target the linked latest essay id');
await renderedRevisionButtons[0].click();
assert.equal(openedEssayId,'12',
  'Journey revision evidence must open the linked latest essay');
assert.equal(state.lastEvaluation.id,12,
  'Journey revision navigation must retain the selected essay for Review');
assert.equal(state.draft.parentEssayId,12,
  'Journey revision navigation must preserve the Review parent essay id');
assert.equal(globalThis.location?.hash,'#/review');

const targetRecommendation={
  intent:'repair',
  focus_family:'grammar',
  focus_category:'article',
  focus_status:'watch',
  focus_label:'Articles',
  focus_instruction:'Practice articles before your next draft.',
  reason:'Repeated article evidence in recent writing.',
  target_level:'B2',
  task_type:'opinion',
  topic:'work',
  word_target:120,
};
const targetTask={
  ...targetRecommendation,
  prompt:'Write about a work habit using clear articles.',
  personalization:targetRecommendation,
};
api.practiceRecommendation=async()=>targetRecommendation;
api.nextPractice=async()=>targetTask;
latestMemory={
  patterns:[],
  strengths:[],
  focus:{category:'article'},
  revision_wins:[],
};
await renderJourney(root);
assert.ok(root.innerHTML.includes('data-journey-start'),
  'Journey must render the targeted Practice start control');
const renderedStart=root.querySelector('[data-journey-start]');
assert.ok(renderedStart,
  'Journey target control must be available from the rendered markup');
await renderedStart.click();
assert.equal(state.draft.prompt,targetTask.prompt,
  'Journey target action must transfer the generated practice prompt to Write');
assert.deepEqual(state.draft.practiceContext,targetRecommendation,
  'Journey target action must preserve recommendation context for evaluation');
assert.equal(globalThis.location.hash,'#/write');

const originalEvaluate=api.evaluate;
const originalPracticeOutcome=api.practiceOutcome;
let submittedPracticeContext=null;
api.evaluate=async payload=>{
  submittedPracticeContext=payload.practice_context;
  return {id:414};
};
api.practiceOutcome=async()=>({outcome:null});
await renderWrite(writeRoot);
writeNodes.get('#writingEditor').innerText='A focused article practice sentence.';
await writeNodes.get('#reviewDraft').listeners.click({
  currentTarget:writeNodes.get('#reviewDraft'),
});
api.evaluate=originalEvaluate;
api.practiceOutcome=originalPracticeOutcome;
const expectedPracticeContext={...targetRecommendation};
delete expectedPracticeContext.word_target;
assert.deepEqual(submittedPracticeContext,expectedPracticeContext,
  'Journey-created practice context must reach the Write evaluation payload');
assert.equal('word_target' in submittedPracticeContext,false,
  'Write evaluation context must forward only backend practice-context fields');
assert.equal(globalThis.location.hash,'#/review');

const zhTargetRecommendation={
  intent:'repair',
  focus_family:'grammar',
  focus_category:'article',
  focus_status:'watch',
  focus_label:'冠词',
  focus_instruction:'下一篇写作先检查冠词使用。',
  reason:'近期写作中反复出现冠词问题。',
  target_level:'HSK4',
  task_type:'hsk',
  topic:'工作',
  word_target:80,
};
const zhTargetTask={
  ...zhTargetRecommendation,
  prompt:'请写一段关于工作习惯的短文，注意冠词对应的限定表达。',
  personalization:zhTargetRecommendation,
};
api.practiceRecommendation=async()=>zhTargetRecommendation;
api.nextPractice=async()=>zhTargetTask;
state.language='zh';
state.supportLanguage='zh';
state.profile={native_language:'zh'};
state.draft={...state.draft,mode:'free',level:'HSK4',length:80,text:'',html:'',prompt:'',generatedTask:null,practiceContext:null,parentEssayId:null};
globalThis.location.hash='#/journey';
latestMemory={patterns:[],strengths:[],focus:{category:'article'},revision_wins:[]};
await renderJourney(root);
assert.ok(root.innerHTML.includes('data-journey-start'),
  'Chinese Journey must render the targeted Practice start control');
await root.querySelector('[data-journey-start]').click();
assert.equal(globalThis.location.hash,'#/write');
let submittedChinesePayload=null;
const beforeChineseEvaluate=api.evaluate;
const beforeChinesePracticeOutcome=api.practiceOutcome;
api.evaluate=async payload=>{
  submittedChinesePayload=payload;
  return {id:415};
};
api.practiceOutcome=async()=>({outcome:null});
await renderWrite(writeRoot);
writeNodes.get('#writingEditor').innerText='我每天养成一个有用的写作习惯。';
await writeNodes.get('#reviewDraft').listeners.click({
  currentTarget:writeNodes.get('#reviewDraft'),
});
api.evaluate=beforeChineseEvaluate;
api.practiceOutcome=beforeChinesePracticeOutcome;
assert.equal(submittedChinesePayload.learning_language,'zh',
  'Chinese Journey target must reach Write with Chinese evaluator language');
assert.equal(submittedChinesePayload.target_cefr,'HSK4');
const expectedChineseContext={...zhTargetRecommendation};
delete expectedChineseContext.word_target;
assert.deepEqual(submittedChinesePayload.practice_context,expectedChineseContext,
  'Chinese Journey target must preserve backend-valid practice context');
assert.equal(globalThis.location.hash,'#/review');

console.log('Journey Grammar outcome locale contract: PASS');
