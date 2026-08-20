import assert from 'node:assert/strict';
import {
  feedbackCategoryKey,
  highlightedLearnerText,
} from '../static/becoming/domain/feedback-map.js';

const expected={
  article:'grammar',
  tense:'verb_tense',
  collocation:'collocation',
  word_choice:'vocabulary',
  particle:'grammar',
  aspect:'grammar',
  measure_word:'grammar',
  ba_sentence:'grammar',
  bei_sentence:'grammar',
  character_choice:'vocabulary',
  conjunction:'coherence',
  punctuation:'grammar',
  unknown_category:'grammar',
};

for(const [category,group] of Object.entries(expected)){
  assert.equal(feedbackCategoryKey(category),group,category);
}

const html=highlightedLearnerText('我学习中文。',[
  {category:'character_choice',fragment:'中文'},
]);
assert.match(html,/error-category-vocabulary/);
assert.match(html,/data-feedback-key="error-0"/);
assert.match(html,/data-feedback-category="vocabulary"/);
assert.match(html,/>中文<\/mark>/);

console.log('Shared EN/ZH feedback category mapping: PASS');