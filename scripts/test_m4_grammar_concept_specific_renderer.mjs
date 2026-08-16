import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const {renderGrammarLearningModel,hasGrammarLearningModel}=await import(
  new URL('../static/becoming/components/grammar-learning.js?test=concept-specific-508',import.meta.url)
);

const load=language=>{
  const name=language==='en'?'english':'chinese';
  return JSON.parse(readFileSync(
    new URL(`../writing_coach/languages/${name}/grammar_knowledge.json`,import.meta.url),
    'utf8'
  ));
};

const en=load('en'),zh=load('zh');
assert.equal(en.length,269);
assert.equal(zh.length,239);

let rendered=0;
for(const [language,items] of [['en',en],['zh',zh]]){
  for(const item of items){
    const model=item.learning_model;
    assert.equal(hasGrammarLearningModel(model),true,`${language}:${item.id}`);
    assert.equal(model.authoring?.status,'source-backed-concept-specific',`${language}:${item.id}`);
    const html=renderGrammarLearningModel(model,{
      interfaceLanguage:'vi',
      explanationLanguage:'vi',
      translationLanguage:'vi',
      targetLanguage:language,
    });
    assert.match(html,/data-grammar-learning-model="1"/,item.id);
    assert.match(html,/data-learning-stage="pattern"/,item.id);
    assert.match(html,/data-learning-stage="context"/,item.id);
    assert.match(html,/data-learning-evidence-stage="apply"/,item.id);
    assert.match(html,/data-learning-evidence-stage="recall"/,item.id);
    assert.match(html,/data-learning-evidence-stage="transfer"/,item.id);
    rendered++;
  }
}
assert.equal(rendered,508);
console.log('M4 Grammar concept-specific renderer: PASS (508/508)');
