import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=rel=>readFileSync(new URL(`../${rel}`,import.meta.url),'utf8');
const router=read('static/becoming/router.js');
const app=read('static/becoming/app.js');
const api=read('static/becoming/api.js');
const template=read('templates/becoming/index.html');
const i18n=read('static/becoming/domain/i18n.js');
const contract=read('static/becoming/domain/screen-contract.js');
const screen=read('static/becoming/screens/grammar.js');
const css=read('static/becoming/grammar.css');
const learning=read('static/becoming/components/grammar-learning.js');

assert.match(router,/'grammar'/);
assert.match(app,/renderGrammar/);
assert.match(app,/grammar:renderGrammar/);
assert.match(api,/grammarLibrary:/);
assert.match(api,/grammarLesson:/);
assert.match(api,/grammarReference:/);
assert.match(api,/looksLikeHtml/);
assert.match(api,/completeGrammar:/);
assert.match(api,/uncompleteGrammar:/);
assert.match(template,/data-route="grammar"/);
assert.match(template,/grammar\.css\?v=/);
assert.match(i18n,/chrome\.grammar/);
assert.match(contract,/grammar:\{/);

for(const needle of [
  'api.grammarLibrary()',
  'api.grammarLesson(',
  'api.completeGrammar(',
  'api.uncompleteGrammar(',
  'guided_practice',
  'data-grammar-practice-input',
  'data-grammar-production',
  'data-grammar-reveal',
  'productionEntries',
  'sourceLabel',
  'activity',
]){
  assert.equal(screen.includes(needle),true,`Grammar UI missing ${needle}`);
}
for(const internalLeak of [
  'listBlock(c.targetScope,detail.scope)',
  'detail.module_scope',
  'detail.restrictions',
]){
  assert.equal(screen.includes(internalLeak),false,`Grammar UI leaks internal syllabus metadata: ${internalLeak}`);
}
for(const forbidden of ['fetch(','XMLHttpRequest']){
  assert.equal(screen.includes(forbidden),false,`Grammar UI bypassed shared API client: ${forbidden}`);
}
assert.match(css,/\.grammar-hero/);
assert.match(css,/\.grammar-module/);
assert.match(css,/\.grammar-lesson-layout/);
assert.match(css,/\.grammar-learning-flow/);
assert.match(css,/\.grammar-sentence-flow/);
assert.match(css,/\.grammar-timeline/);
for(const needle of [
  'renderGrammarLearningModel','bindGrammarLearningInteractions',
  'grammarLearningCompletion','legacyLessonBody',
]){
  assert.equal(screen.includes(needle),true,`Grammar screen missing rich-learning integration: ${needle}`);
}
for(const needle of [
  'GrammarFormula','SemanticSentence','TransformationFlow','WordOrderFlow',
  'ParticleInsertion','TimelineVisual','ContrastCard','RealLifeScene',
  'SentenceBuilder','CommonMistake','GrammarException','MicroPractice',
  'PersonalPractice','RecallPrompt','MemoryHook','SkillTransfer',
]){
  assert.equal(learning.includes(needle),true,`Grammar learning renderer missing ${needle}`);
}
console.log('M4 Grammar learner UI contract: PASS');
