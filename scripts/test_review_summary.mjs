import assert from 'node:assert/strict';
import {api} from '../static/becoming/api.js';
import {state} from '../static/becoming/store.js';
import {evaluationNotice,renderReview,reviewSummaryText} from '../static/becoming/screens/review.js';
import {categoryReason,categoryRule,supportCopy} from '../static/becoming/domain/support.js';

const result={
  priorities_vi:['Sửa thì động từ trước khi đánh bóng từ vựng.','Giữ mạch ý rõ hơn.'],
};

state.profile={native_language:'vi'};
state.supportLanguage='vi';
assert.equal(
  reviewSummaryText(result,null,[]),
  result.priorities_vi[0],
  'Vietnamese Review summary should surface the first evaluator priority',
);

for(const locale of ['en','zh']){
  state.profile={native_language:locale};
  state.supportLanguage=locale;
  assert.notEqual(
    reviewSummaryText(result,null,[]),
    result.priorities_vi[0],
    `${locale.toUpperCase()} Review summary must not leak the Vietnamese priority array`,
  );
}

state.profile={native_language:'vi'};
state.supportLanguage='en';
assert.notEqual(
  reviewSummaryText(result,null,[]),
  result.priorities_vi[0],
  'Review summary must follow the active UI locale when profile persistence lags',
);

state.profile={native_language:'vi'};
state.supportLanguage='vi';
assert.equal(
  reviewSummaryText({priorities_vi:[]},null,[]),
  'Bài này đã được đọc theo toàn bộ tiêu chí. Bằng chứng bên dưới dẫn đúng chữ bạn viết.',
  'Vietnamese Review summary should keep its honest fallback when no priority exists',
);

const noticeCopy={en:'Limited review',vi:'Đánh giá giới hạn',zh:'评估受限'};
for(const locale of ['en','vi','zh']){
  state.supportLanguage=locale;
  const notice=evaluationNotice({evaluator:'fallback-demo'});
  assert.match(notice,/data-review-evaluation-state="degraded"/);
  assert.match(notice,new RegExp(noticeCopy[locale]));
  assert.doesNotMatch(notice,/unavailable/i);
  assert.equal(evaluationNotice({evaluator:'ollama:model'}),'');
}

assert.equal(
  reviewSummaryText({priorities_vi:{message:'provider payload shape changed'}},null,[]),
  reviewSummaryText({priorities_vi:[]},null,[]),
  'Vietnamese Review summary must ignore malformed priority objects instead of rendering [object Object]',
);
assert.doesNotMatch(
  reviewSummaryText({priorities_vi:{message:'provider payload shape changed'}},null,[]),
  /\[object Object\]/,
);

class FakeElement{
  constructor(){
    this.dataset={};
    this.attributes={};
    this.classList={toggle:()=>{}};
    this.listeners={};
    this.innerHTML='';
    this.textContent='';
  }
  addEventListener(name,listener){this.listeners[name]=listener;}
  removeAttribute(name){delete this.attributes[name];}
  setAttribute(name,value){this.attributes[name]=value;}
  async click(){return this.listeners.click?.({currentTarget:this});}
}

function fakeReviewRoot({openGrammar=[],practiceGrammar=[]}={}){
  const ids=[
    '#learnerTextEvidence','#posLensToggle','#posLensStatus','#posLensLegend','#posLens',
    '#editDraftButton','#reviewRubric','#fullRubricButton','#downloadFeedback',
    '#reviseButton','#startRevision','#polishButton',
  ];
  const nodes=new Map(ids.map(id=>[id,new FakeElement()]));
  return {
    nodes,
    innerHTML:'',
    querySelector:selector=>nodes.get(selector)||null,
    querySelectorAll:selector=>{
      if(selector==='[data-open-grammar]')return openGrammar;
      if(selector==='[data-practice-grammar]')return practiceGrammar;
      return [];
    },
  };
}

const renderFixture={
  evaluator:'fallback-demo',
  text:'I write a short practice sentence.',
  overall:62,
  grammar:62,
  vocabulary:62,
  coherence:62,
  task_achievement:62,
  naturalness:62,
  errors:[],
  strength_evidence:[],
  priorities_vi:[],
};
const renderedNoticeCopy={
  en:'Limited review',
  vi:'Đánh giá giới hạn',
  zh:'评估受限',
};
for(const locale of ['en','vi','zh']){
  state.profile={native_language:locale};
  state.supportLanguage=locale;
  state.language='en';
  state.lastEvaluation=renderFixture;
  state.draft.text=renderFixture.text;
  const root=fakeReviewRoot();
  await renderReview(root);
  assert.match(root.innerHTML,/data-review-evaluation-state="degraded"/);
  assert.match(root.innerHTML,new RegExp(renderedNoticeCopy[locale]));
}

for(const locale of ['en','vi','zh']){
  state.profile={native_language:locale};
  state.supportLanguage=locale;
  state.language='en';
  state.lastEvaluation={
    ...renderFixture,
    priorities_vi:{message:'provider payload shape changed'},
  };
  state.draft.text=renderFixture.text;
  const malformedPriorityRoot=fakeReviewRoot();
  await renderReview(malformedPriorityRoot);
  assert.doesNotMatch(
    malformedPriorityRoot.innerHTML,
    /\[object Object\]/,
    `Review ${locale.toUpperCase()} must not render malformed priority payloads`,
  );
}

const feedbackLocaleFixture={
  ...renderFixture,
  errors:[{
    category:'grammar',
    fragment:'I is',
    suggestion:'I am',
    explanation_vi:'Giải thích tiếng Việt cho lỗi này.',
    mini_rule_vi:'Quy tắc tiếng Việt cho lỗi này.',
    confidence:1,
  }],
  strength_evidence:[{
    category:'grammar',
    fragment:'I write clearly.',
    explanation_vi:'Điểm mạnh tiếng Việt.',
    confidence:1,
  }],
};
for(const [profileLocale,uiLocale] of [['vi','en'],['en','vi'],['zh','en'],['en','zh']]){
  state.profile={native_language:profileLocale};
  state.supportLanguage=uiLocale;
  state.language='en';
  state.lastEvaluation=feedbackLocaleFixture;
  state.draft.text=feedbackLocaleFixture.text;
  const root=fakeReviewRoot();
  await renderReview(root);
  const expected=categoryReason('grammar',{native_language:uiLocale});
  assert.ok(
    root.innerHTML.includes(expected),
    `Review feedback should follow the active ${uiLocale.toUpperCase()} UI locale when profile is ${profileLocale.toUpperCase()}`,
  );
}

for(const locale of ['en','vi','zh']){
  for(const malformed of [null,{}]){
    state.profile={native_language:locale};
    state.supportLanguage=locale;
    state.lastEvaluation={
      ...renderFixture,
      errors:[malformed],
      strength_evidence:[malformed],
      strengths_vi:[malformed],
    };
    state.draft.text=renderFixture.text;
    const malformedEvidenceRoot=fakeReviewRoot();
    await renderReview(malformedEvidenceRoot);
    assert.doesNotMatch(
      malformedEvidenceRoot.innerHTML,
      /data-feedback-key="(?:error|strength)-/,
      `Review ${locale.toUpperCase()} must ignore malformed ${malformed===null?'null':'object'} evidence entries`,
    );
  }
}

for(const locale of ['en','vi','zh']){
  for(const malformed of [null,{}]){
    state.profile={native_language:locale};
    state.supportLanguage=locale;
    state.lastEvaluation={...renderFixture,grammar_links:[malformed]};
    state.draft.text=renderFixture.text;
    const malformedTransferRoot=fakeReviewRoot();
    await renderReview(malformedTransferRoot);
    assert.doesNotMatch(
      malformedTransferRoot.innerHTML,
      /data-open-grammar=/,
      `Review ${locale.toUpperCase()} must ignore malformed ${malformed===null?'null':'object'} Grammar links`,
    );
  }
}

for(const locale of ['en','vi','zh']){
  state.profile={native_language:locale};
  state.supportLanguage=locale;
  state.lastEvaluation={
    ...renderFixture,
    practice_outcome:{
      status:'transferred',
      focus_label:'Grammar transfer',
      issue_count:0,
      revision_no:2,
      strength_evidence:[null,{}],
      error_evidence:[{}],
    },
  };
  state.draft.text=renderFixture.text;
  const malformedOutcomeRoot=fakeReviewRoot();
  await renderReview(malformedOutcomeRoot);
  assert.doesNotMatch(
    malformedOutcomeRoot.innerHTML,
    /\[object Object\]/,
    `Review ${locale.toUpperCase()} must not render malformed practice outcome evidence`,
  );
}

for(const locale of ['en','vi','zh']){
  for(const {value,rendered} of [
    {value:null,rendered:false},
    {value:{},rendered:false},
    {value:{status:{},issue_count:{},revision_no:{},focus_label:{}},rendered:false},
    {value:{status:'unknown',issue_count:0,revision_no:1},rendered:false},
    {value:{status:'improved',previous_issue_count:2,issue_count:-1,revision_no:2},rendered:false},
    {value:{status:'improved',previous_issue_count:2,issue_count:0.5,revision_no:2},rendered:false},
    {value:{status:'improved',previous_issue_count:2,issue_count:0,revision_no:0},rendered:false},
    {value:{status:'improved',previous_issue_count:2,issue_count:0,revision_no:1.5},rendered:false},
    {value:{status:'improved',focus_label:{},issue_count:0,revision_no:2},rendered:true},
  ]){
    state.profile={native_language:locale};
    state.supportLanguage=locale;
    state.language='en';
    state.lastEvaluation={
      ...renderFixture,
      practice_outcome:value,
    };
    state.draft.text=renderFixture.text;
    const outcomeRoot=fakeReviewRoot();
    await renderReview(outcomeRoot);
    if(rendered){
      assert.match(outcomeRoot.innerHTML,/practice-check status-improved/,
        `Review ${locale.toUpperCase()} should retain a safe valid-status outcome`);
    }else{
      assert.doesNotMatch(outcomeRoot.innerHTML,/practice-check status-/,
        `Review ${locale.toUpperCase()} must omit malformed practice outcomes`);
    }
    assert.doesNotMatch(outcomeRoot.innerHTML,/\[object Object\]/,
      `Review ${locale.toUpperCase()} must not render malformed outcome fields`);
  }
}

const dialogNodes={
  dialogBackdrop:{classList:{remove:()=>{},add:()=>{}},setAttribute:()=>{}},
  dialogTitle:{textContent:''},
  dialogBody:{innerHTML:''},
  dialogClose:{focus:()=>{}},
};
globalThis.document={
  getElementById:id=>dialogNodes[id]||null,
  body:{style:{}},
};
state.profile={native_language:'en'};
state.supportLanguage='zh';
state.lastEvaluation=feedbackLocaleFixture;
state.draft.text=feedbackLocaleFixture.text;
const zhRoot=fakeReviewRoot();
api.improve=async()=>({corrected_text:'I am clear.',upgraded_text:'My writing is clear.'});
await renderReview(zhRoot);
await zhRoot.querySelector('#polishButton').click();
assert.ok(
  dialogNodes.dialogBody.innerHTML.includes(supportCopy('compare_tip',{native_language:'zh'})),
  'the strong-version dialog tooltip should follow the active Chinese UI locale',
);
assert.ok(
  zhRoot.innerHTML.includes(categoryReason('grammar',{native_language:'zh'}))
    &&zhRoot.innerHTML.includes(categoryRule('grammar',{native_language:'zh'})),
  'Chinese Review feedback should render both the localized explanation and reusable rule',
);

const transferFixture={
  ...renderFixture,
  errors:[{
    id:'issue-1',
    category:'agreement',
    fragment:'I write',
    suggestion:'I wrote',
    explanation_vi:'',
    mini_rule_vi:'',
    confidence:1,
  }],
  grammar_links:[{
    issue_id:'issue-1',
    category:'agreement',
    grammar_id:'a1-agreement',
    title:'Subject verb agreement',
    level:'A1',
    reason:'Writing finding category: agreement',
    evidence:'I write',
  }],
};
const transferReasonCopy={
  en:'Linked from the Grammar finding in this review.',
  vi:'Được liên kết từ nhận xét Ngữ pháp trong bài này.',
  zh:'本次点评中的语法问题已关联到这里。',
};
for(const locale of ['en','vi','zh']){
  state.profile={native_language:locale};
  state.supportLanguage=locale;
  state.language='en';
  state.lastEvaluation=transferFixture;
  state.draft.text=transferFixture.text;
  const root=fakeReviewRoot();
  await renderReview(root);
  assert.match(root.innerHTML,new RegExp(transferReasonCopy[locale]));
  assert.doesNotMatch(root.innerHTML,/Writing finding category:/);
}

const storedActionValues=new Map();
globalThis.localStorage={
  getItem:key=>storedActionValues.get(key)??null,
  setItem:(key,value)=>storedActionValues.set(key,value),
  removeItem:key=>storedActionValues.delete(key),
};
globalThis.location={hash:''};
globalThis.window={dispatchEvent:()=>{}};
globalThis.HashChangeEvent=class {};
const openGrammarButton=new FakeElement();
openGrammarButton.dataset.openGrammar='a1-agreement';
const practiceGrammarButton=new FakeElement();
practiceGrammarButton.dataset.practiceGrammar='a1-agreement';
practiceGrammarButton.dataset.practiceEvidence='I write';
const actionRoot=fakeReviewRoot({
  openGrammar:[openGrammarButton],
  practiceGrammar:[practiceGrammarButton],
});
state.profile={native_language:'en'};
state.supportLanguage='en';
state.language='en';
state.lastEvaluation=transferFixture;
state.draft.text=transferFixture.text;
let practiceEvidence='';
api.grammarPractice=async (grammarId,evidence)=>{
  practiceEvidence=evidence;
  return {
  grammar_id:grammarId,
  prompt:'Write three sentences using the grammar focus.',
  target_level:'B2',
  practice_context:{grammar_id:grammarId,focus_category:'grammar'},
  };
};
await renderReview(actionRoot);
await openGrammarButton.click();
assert.equal(storedActionValues.get('becoming.grammar-focus'),'a1-agreement');
assert.equal(globalThis.location.hash,'#/grammar');
await practiceGrammarButton.click();
assert.equal(state.draft.prompt,'Write three sentences using the grammar focus.');
assert.deepEqual(state.draft.practiceContext,{grammar_id:'a1-agreement',focus_category:'grammar'});
assert.equal(practiceEvidence,'I write');
assert.equal(globalThis.location.hash,'#/write');

state.profile={native_language:'vi'};
state.supportLanguage='vi';
const invalidResponseFallback={
  evaluator:'fallback-demo',
  priorities_vi:['Dùng phần bằng chứng này như bản xem thử; hãy chạy lại khi AI Coach tạo được đánh giá đầy đủ.'],
};
assert.equal(
  reviewSummaryText(invalidResponseFallback,null,[]),
  invalidResponseFallback.priorities_vi[0],
  'Vietnamese invalid-response fallback should render provider-neutral degraded guidance',
);
assert.doesNotMatch(reviewSummaryText(invalidResponseFallback,null,[]),/Kết nối AI Coach|Bật AI Coach/i);

console.log('Review summary priority contract: PASS');
