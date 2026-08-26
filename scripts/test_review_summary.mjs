import assert from 'node:assert/strict';
import {state} from '../static/becoming/store.js';
import {evaluationNotice,renderReview,reviewSummaryText} from '../static/becoming/screens/review.js';

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
  setAttribute(name,value){this.attributes[name]=value;}
}

function fakeReviewRoot(){
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
    querySelectorAll:()=>[],
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
