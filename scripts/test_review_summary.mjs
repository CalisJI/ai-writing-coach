import assert from 'node:assert/strict';
import {state} from '../static/becoming/store.js';
import {evaluationNotice,reviewSummaryText} from '../static/becoming/screens/review.js';

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
  assert.equal(evaluationNotice({evaluator:'ollama:model'}),'');
}

console.log('Review summary priority contract: PASS');
