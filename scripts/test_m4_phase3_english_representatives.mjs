import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const {renderGrammarLearningModel,hasGrammarLearningModel}=await import(
  new URL('../static/becoming/components/grammar-learning.js?test=phase3-en',import.meta.url)
);
const knowledge=JSON.parse(readFileSync(
  new URL('../writing_coach/languages/english/grammar_knowledge.json',import.meta.url),
  'utf8'
));
const byId=new Map(knowledge.map(item=>[item.id,item]));
const expected={
  'a1-be-am-is-are':['grammar-formula','grammar-semantic-sentence','grammar-transformation','grammar-common-mistake'],
  'a2-present-perfect-vs-past-simple':['grammar-timeline','grammar-contrast-grid','grammar-common-mistake'],
  'b1-passive-voice-present-and-past':['grammar-formula','grammar-semantic-sentence','grammar-transformation','grammar-sentence-builder'],
};

for(const [id,needles] of Object.entries(expected)){
  const item=byId.get(id);
  assert.ok(item,`Missing ${id}`);
  assert.equal(item.source.content_status,'curated');
  assert.equal(hasGrammarLearningModel(item.learning_model),true);
  const html=renderGrammarLearningModel(item.learning_model,{locale:'vi',targetLanguage:'en'});
  assert.match(html,/data-grammar-learning-model="1"/);
  assert.match(html,/data-learning-evidence-stage="recall"/);
  assert.match(html,/data-learning-evidence-stage="transfer"/);
  for(const needle of needles){
    assert.equal(html.includes(needle),true,`${id} renderer missing ${needle}`);
  }
}
const curated=knowledge.filter(item=>item.source.content_status==='curated').map(item=>item.id).sort();
assert.deepEqual(curated,Object.keys(expected).sort());
console.log('M4 Phase 3 English representative renderer: PASS');
