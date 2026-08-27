import assert from 'node:assert/strict';
import {api} from '../static/becoming/api.js';
import {state} from '../static/becoming/store.js';
import {renderWrite} from '../static/becoming/screens/write.js';
import {renderReview} from '../static/becoming/screens/review.js';

class FakeElement{
  constructor(){
    this.dataset={};
    this.listeners={};
    this.innerHTML='';
    this.innerText='';
    this.textContent='';
    this.hidden=false;
    this.disabled=false;
    this.classList={toggle:()=>{},add:()=>{},remove:()=>{}};
  }
  addEventListener(name,listener){this.listeners[name]=listener;}
  removeEventListener(){}
  contains(){return false;}
  focus(){}
  setAttribute(){}
  removeAttribute(){}
  querySelector(){return null;}
}

function fakeRoot(ids){
  const nodes=new Map(ids.map(id=>[id,new FakeElement()]));
  return {
    nodes,
    innerHTML:'',
    querySelector:selector=>nodes.get(selector)||null,
    querySelectorAll:()=>[],
  };
}

const writeRoot=fakeRoot([
  '#writingEditor','#editorCount','#savedStamp','#lookupSelection','#blockFormat',
  '#practiceMode','#practiceLevel','#practiceLength','#practiceTopic','#practiceAudience',
  '#clearDraft','#reviewDraft','#reviewDraftMobile','#viewRubric','#generateBrief',
]);

const reviewIds=[
  '#learnerTextEvidence','#posLensToggle','#posLensStatus','#posLensLegend','#posLens',
  '#editDraftButton','#reviewRubric','#fullRubricButton','#downloadFeedback',
  '#reviseButton','#startRevision','#polishButton',
];
const reviewRoot=fakeRoot(reviewIds);

globalThis.document={
  addEventListener:()=>{},
  removeEventListener:()=>{},
  querySelector:()=>null,
  querySelectorAll:()=>[],
  getElementById:()=>null,
  execCommand:()=>{},
  body:{style:{},classList:{add:()=>{},remove:()=>{}}},
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
  dispatchEvent:()=>{},
};
globalThis.requestAnimationFrame=callback=>callback();

state.language='en';
state.supportLanguage='en';
state.profile={native_language:'en'};
state.dashboard={error_memory:[]};
state.draft={
  ...state.draft,
  mode:'free',level:'B2',length:150,text:'',html:'',prompt:'Write about a useful habit.',
  generatedTask:null,practiceContext:null,parentEssayId:null,
};

const learnerText='I is building a useful writing habit every day.';
const zhLearnerText='我每天建立一个有用的写作习惯。';
const evaluation={
  id:412,
  evaluator:'ollama:writing-evaluator',
  prompt:'Write about a useful habit.',
  text:learnerText,
  target_cefr:'B2',
  overall:78,
  grammar:64,
  vocabulary:82,
  coherence:80,
  task_achievement:76,
  naturalness:79,
  errors:[{
    category:'grammar',fragment:'I is',suggestion:'I am',
    explanation_vi:'Động từ cần hòa hợp với chủ ngữ.',
    mini_rule_vi:'I đi với am.',confidence:0.98,
  }],
  strength_evidence:[{
    category:'coherence',fragment:'every day',
    explanation_vi:'Ý tưởng có mốc thời gian rõ.',confidence:0.94,
  }],
  priorities_vi:['Sửa hòa hợp chủ ngữ - động từ trước.'],
};
const zhEvaluation={
  ...evaluation,
  prompt:'写一段关于有用习惯的文字。',
  text:zhLearnerText,
  target_cefr:'HSK4',
  overall:81,
  errors:[{
    category:'grammar',fragment:'建立',suggestion:'养成',
    explanation_vi:'动词选择使表达更自然。',
    mini_rule_vi:'习惯通常与养成搭配。',confidence:0.96,
  }],
  strength_evidence:[{
    category:'coherence',fragment:'每天',
    explanation_vi:'时间频率表达清楚。',confidence:0.93,
  }],
};

const originalEvaluate=api.evaluate;
const originalPracticeOutcome=api.practiceOutcome;
let submittedPayload=null;
api.evaluate=async payload=>{
  submittedPayload=payload;
  return state.language==='zh'?{...zhEvaluation}:{...evaluation};
};

try{
  await renderWrite(writeRoot);
  writeRoot.querySelector('#writingEditor').innerText=learnerText;
  await writeRoot.querySelector('#reviewDraft').listeners.click({
    currentTarget:writeRoot.querySelector('#reviewDraft'),
  });

  assert.equal(submittedPayload.text,learnerText,
    'Write submit must forward the learner text to evaluation');
  assert.equal(submittedPayload.target_cefr,'B2');
  assert.equal(submittedPayload.learning_language,'en');
  assert.equal(state.lastEvaluation.id,evaluation.id,
    'Write submit must retain the evaluator result for Review');
  assert.equal(globalThis.location.hash,'#/review',
    'Write submit must route the completed evaluation to Review');

  await renderReview(reviewRoot);
  assert.match(reviewRoot.innerHTML,/data-feedback-key="error-0"/,
    'Review must render the evaluator error evidence from the submitted result');
  assert.match(reviewRoot.innerHTML,/I is/);
  assert.match(reviewRoot.innerHTML,/change-after">am/,
    'Review must render the evaluator correction alongside the learner fragment');
  assert.match(reviewRoot.innerHTML,/data-feedback-key="strength-0"/,
    'Review must render strength evidence from the same evaluation result');
  assert.match(reviewRoot.innerHTML,/78/,
    'Review must render the evaluator score from the completed Write flow');
  assert.doesNotMatch(reviewRoot.innerHTML,/data-review-evaluation-state="degraded"/,
    'Provider-backed evaluations must not be labelled as degraded');

  // R4 revision loop: Review must hand the evaluated essay back to Write with
  // its lineage, and the next evaluation must preserve that parent reference
  // so Review can show a truthful before/after delta.
  await reviewRoot.querySelector('#reviseButton').listeners.click({
    currentTarget:reviewRoot.querySelector('#reviseButton'),
  });
  assert.equal(globalThis.location.hash,'#/write');
  assert.equal(state.draft.parentEssayId,evaluation.id,
    'Revision must retain the evaluated essay as its parent');
  assert.equal(state.draft.text,learnerText);
  assert.equal(state.draft.prompt,evaluation.prompt);

  const revisedText='I am building a useful writing habit every day.';
  const practiceParentEssayId=411;
  const revisedEvaluation={
    ...evaluation,
    id:413,
    text:revisedText,
    overall:86,
    errors:[],
    delta:{overall:8,issues:{
      removed:[{fragment:'I is'}],
      persistent:[],
      new:[],
      changed:[],
    }},
  };
  const beforeRevisionEvaluate=api.evaluate;
  api.evaluate=async payload=>{
    submittedPayload=payload;
    return payload.parent_essay_id===evaluation.id
      ?{...revisedEvaluation}
      :payload.parent_essay_id===practiceParentEssayId
        ?{...practiceEvaluation}
      :beforeRevisionEvaluate(payload);
  };
  await renderWrite(writeRoot);
  writeRoot.querySelector('#writingEditor').innerText=revisedText;
  await writeRoot.querySelector('#reviewDraft').listeners.click({
    currentTarget:writeRoot.querySelector('#reviewDraft'),
  });
  assert.equal(submittedPayload.parent_essay_id,evaluation.id,
    'Revision submit must send the original essay id as parent reference');
  assert.equal(state.lastEvaluation.id,revisedEvaluation.id);
  assert.equal(globalThis.location.hash,'#/review');
  await renderReview(reviewRoot);
  assert.match(reviewRoot.innerHTML,/Revision evidence/,
    'Review must expose revision evidence after a linked re-evaluation');
  assert.match(reviewRoot.innerHTML,/Resolved/,
    'Review must label the resolved issue in the revision delta');
  assert.match(reviewRoot.innerHTML,/“I is”/,
    'Review must retain the exact resolved learner fragment');

  // R4 practice attribution: a targeted Grammar task's context must survive
  // the next Write submit and surface the persisted outcome in Review.
  const practiceContext={
    intent:'repair',focus_family:'grammar',focus_category:'article',
    focus_label:'Articles',grammar_id:'a1-article',
  };
  const practiceOutcome={
    status:'improved',focus_label:'Articles',previous_issue_count:1,
    issue_count:0,revision_no:2,
  };
  const practiceEvaluation={
    ...evaluation,
    id:414,
    parent_essay_id:practiceParentEssayId,
    practice_context:practiceContext,
  };
  api.practiceOutcome=async id=>{
    assert.equal(id,practiceEvaluation.id,
      'Practice outcome lookup must use the newly evaluated essay id');
    return {outcome:practiceOutcome};
  };
  state.language='en';
  state.supportLanguage='en';
  state.profile={native_language:'en'};
  state.draft={
    ...state.draft,
    mode:'free',level:'B2',length:150,text:'',html:'',prompt:evaluation.prompt,
    generatedTask:null,practiceContext,parentEssayId:practiceParentEssayId,
  };
  globalThis.location.hash='#/write';
  await renderWrite(writeRoot);
  writeRoot.querySelector('#writingEditor').innerText=learnerText;
  await writeRoot.querySelector('#reviewDraft').listeners.click({
    currentTarget:writeRoot.querySelector('#reviewDraft'),
  });
  assert.equal(submittedPayload.parent_essay_id,practiceParentEssayId,
    'Practice revision must link to a comparable predecessor essay');
  assert.deepEqual(submittedPayload.practice_context,practiceContext,
    'Practice submit must preserve the targeted Grammar context');
  assert.deepEqual(state.lastEvaluation.practice_outcome,practiceOutcome,
    'Write submit must attach the fetched practice outcome');
  await renderReview(reviewRoot);
  assert.match(reviewRoot.innerHTML,/practice-check status-improved/,
    'Review must render the attributed practice outcome');
  assert.match(reviewRoot.innerHTML,/Articles/);
  api.practiceOutcome=originalPracticeOutcome;

  // The same submit-and-render contract must hold for Chinese, not only for
  // the English fixture above.
  state.language='zh';
  state.supportLanguage='zh';
  state.profile={native_language:'zh'};
  state.draft={
    ...state.draft,
    mode:'free',level:'HSK4',length:80,text:'',html:'',prompt:zhEvaluation.prompt,
    generatedTask:null,practiceContext:null,parentEssayId:null,
  };
  globalThis.location.hash='#/write';
  await renderWrite(writeRoot);
  writeRoot.querySelector('#writingEditor').innerText=zhLearnerText;
  await writeRoot.querySelector('#reviewDraft').listeners.click({
    currentTarget:writeRoot.querySelector('#reviewDraft'),
  });
  assert.equal(submittedPayload.learning_language,'zh',
    'The shared Write submit flow must send Chinese learner language');
  assert.equal(submittedPayload.target_cefr,'HSK4');
  assert.equal(state.lastEvaluation.id,zhEvaluation.id);
  assert.equal(globalThis.location.hash,'#/review');
  await renderReview(reviewRoot);
  assert.match(reviewRoot.innerHTML,/data-feedback-key="error-0"/,
    'Chinese Review must render evaluator error evidence');
  assert.match(reviewRoot.innerHTML,/建立/);
  assert.match(reviewRoot.innerHTML,/养成/);
  assert.match(reviewRoot.innerHTML,/81/);

  // R3 degraded-state contract: when the backend returns its explicit local
  // fallback evaluator, the active Write -> Review flow must preserve that
  // provenance and render the localized learner notice rather than a normal
  // provider-backed review.
  const degradedCases=[
    {locale:'en',level:'B2',prompt:evaluation.prompt,text:learnerText,fixture:evaluation,notice:'Limited review'},
    {locale:'zh',level:'HSK4',prompt:zhEvaluation.prompt,text:zhLearnerText,fixture:zhEvaluation,notice:'\\u8bc4\\u4f30\\u53d7\\u9650'},
  ];
  for(const [index,item] of degradedCases.entries()){
    state.language=item.locale;
    state.supportLanguage=item.locale;
    state.profile={native_language:item.locale};
    state.draft={
      ...state.draft,
      mode:'free',level:item.level,length:item.locale==='zh'?80:150,text:'',html:'',prompt:item.prompt,
      generatedTask:null,practiceContext:null,parentEssayId:null,
    };
    globalThis.location.hash='#/write';
    api.evaluate=async payload=>({
      ...item.fixture,
      id:415+index,
      evaluator:'fallback-demo',
      text:payload.text,
    });
    await renderWrite(writeRoot);
    writeRoot.querySelector('#writingEditor').innerText=item.text;
    await writeRoot.querySelector('#reviewDraft').listeners.click({
      currentTarget:writeRoot.querySelector('#reviewDraft'),
    });
    assert.equal(state.lastEvaluation.evaluator,'fallback-demo',
      `${item.locale.toUpperCase()} Write must preserve degraded evaluator provenance for Review`);
    await renderReview(reviewRoot);
    assert.match(reviewRoot.innerHTML,/data-review-evaluation-state="degraded"/,
      `${item.locale.toUpperCase()} Review must expose degraded state from Write`);
    assert.match(reviewRoot.innerHTML,new RegExp(item.notice),
      `${item.locale.toUpperCase()} Review must show localized degraded guidance`);
    assert.match(reviewRoot.innerHTML,/data-feedback-key="error-0"/,
      `${item.locale.toUpperCase()} degraded Review must retain available evidence`);
    assert.doesNotMatch(reviewRoot.innerHTML,/\bunavailable\b/i,
      `${item.locale.toUpperCase()} fallback Review must not claim provider unavailability`);
  }
}finally{
  api.evaluate=originalEvaluate;
  api.practiceOutcome=originalPracticeOutcome;
}

console.log('Writing -> Evaluate -> Review evidence flow: PASS');
