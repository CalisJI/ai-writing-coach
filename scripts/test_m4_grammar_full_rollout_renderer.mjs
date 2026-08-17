import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const {renderGrammarLearningModel,hasGrammarLearningModel}=await import(
  new URL('../static/becoming/components/grammar-learning.js?test=full-rollout',import.meta.url)
);

const en=JSON.parse(readFileSync(
  new URL('../writing_coach/languages/english/grammar_knowledge.json',import.meta.url),
  'utf8'
));
const zh=JSON.parse(readFileSync(
  new URL('../writing_coach/languages/chinese/grammar_knowledge.json',import.meta.url),
  'utf8'
));

assert.equal(en.length,269);
assert.equal(zh.length,239);
assert.equal(en.length+zh.length,508);

for(const [language,items] of [['en',en],['zh',zh]]){
  for(const item of items){
    assert.equal(hasGrammarLearningModel(item.learning_model),true,`${language}:${item.id} missing model`);
    assert.equal(item.learning_model.schema_version,2,`${language}:${item.id} wrong schema`);
    assert.equal(item.learning_model.language_policy.target_language,language);
    const html=renderGrammarLearningModel(item.learning_model,{
      interfaceLanguage:'vi',
      explanationLanguage:'vi',
      translationLanguage:'vi',
      targetLanguage:language,
    });
    assert.match(html,/data-grammar-learning-model="1"/);
    assert.match(html,/data-learning-stage="pattern"/);
    assert.match(html,/data-learning-stage="context"/);
    assert.match(html,/data-learning-evidence-stage="recall"/);
    assert.match(html,/data-learning-evidence-stage="transfer"/);
  }
}

const sourceAdapted=[...en,...zh].filter(
  item=>item.source?.universal_model_status==='source-adapted-v1'
);
assert.equal(sourceAdapted.length,505);

console.log('M4 Universal Grammar full EN/ZH rollout renderer: PASS (508/508)');
