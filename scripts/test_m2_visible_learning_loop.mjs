import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  evaluateSpeechTranscript,
  speechContentMatchBand,
} from '../static/becoming/domain/speaking-evaluation.js';

assert.equal(speechContentMatchBand(95),'strong');
assert.equal(speechContentMatchBand(75),'close');
assert.equal(speechContentMatchBand(55),'retry');

const evaluation=evaluateSpeechTranscript(
  'I really enjoy learning languages',
  'I really enjoy learning language',
);
assert.equal(evaluation.result_band,'close');
assert.equal(evaluation.reference_alignment.length,5);
assert.ok(evaluation.reference_alignment.some(item=>!item.matched));
assert.ok(Array.isArray(evaluation.heard_alignment));

const feedback=readFileSync(
  new URL('../static/becoming/domain/feedback-map.js',import.meta.url),'utf8',
);
assert.match(feedback,/export function feedbackCategoryKey/);
assert.match(feedback,/subject_verb_agreement:'grammar'/);
assert.match(feedback,/word_choice:'vocabulary'/);
assert.match(feedback,/task_achievement:'coherence'/);
assert.match(feedback,/data-feedback-category/);
assert.match(feedback,/error-category-/);

const review=readFileSync(
  new URL('../static/becoming/screens/review.js',import.meta.url),'utf8',
);
assert.match(review,/feedbackCategoryLegend/);
assert.match(review,/feedback-category-legend/);
assert.match(review,/categoryLabel\(category\)/);

const speaking=readFileSync(
  new URL('../static/becoming/screens/speaking.js',import.meta.url),'utf8',
);
assert.match(speaking,/data-speaking-match-band/);
assert.match(speaking,/reference_alignment/);
assert.match(speaking,/data-speaking-previous/);
assert.match(speaking,/data-speaking-next/);
assert.match(speaking,/selectRelative/);
for(const forbidden of ['fetch(','FormData','XMLHttpRequest','pronunciation_evaluator','speaking_evaluator']){
  assert.equal(speaking.includes(forbidden),false,`forbidden Speaking coupling: ${forbidden}`);
}

const listening=readFileSync(
  new URL('../static/becoming/screens/listening.js',import.meta.url),'utf8',
);
assert.match(listening,/setSharedMediaSession/);
assert.match(listening,/selectSharedMediaSegment/);
assert.match(listening,/controller\.restore\(shared\.payload,shared\.selected_segment_id\)/);
assert.match(listening,/data-open-speaking/);
assert.match(listening,/go\('speak'\)/);

console.log('M2 Visible Learning Loop contracts: PASS');
