import assert from 'node:assert/strict';
import fs from 'node:fs';

const screen=fs.readFileSync(new URL('../static/becoming/screens/grammar.js',import.meta.url),'utf8');
const styles=fs.readFileSync(new URL('../static/becoming/orena/grammar.css',import.meta.url),'utf8');
const renderer=fs.readFileSync(new URL('../static/becoming/components/grammar-learning.js',import.meta.url),'utf8');
const template=fs.readFileSync(new URL('../templates/becoming/index.html',import.meta.url),'utf8');
const version=fs.readFileSync(new URL('../BECOMING_FRONTEND_VERSION',import.meta.url),'utf8').trim();

assert.equal(version,'2.17.5');
assert.match(template,/orena\/grammar\.css\?v=2\.17\.5/,'Grammar Orena layer must load after the shared migration layer');

for(const contract of [
  'has-open-lesson',
  'grammar-back-button',
  'grammar-lesson-rail-card',
  'grammar-lesson-outline',
  'grammar-mobile-section-toggle',
]){
  assert.match(screen,new RegExp(contract),'Grammar screen must render or bind '+contract);
  assert.match(styles,new RegExp(contract),'Grammar stylesheet must define '+contract);
}

assert.match(screen,/curriculumProgress=progressOf\(items\)/,'Lesson progress must use real curriculum data');
assert.match(screen,/data-grammar-lesson-outline/,'Lesson rail must derive its outline from rendered lesson sections');
assert.match(screen,/page\?\.classList\.add\('has-open-lesson'\)/,'Opening a lesson must enter focused lesson mode');
assert.match(screen,/page\?\.classList\.remove\('has-open-lesson'\)/,'Back must restore the curriculum overview');
assert.match(screen,/bindGrammarLearningInteractions\(slot,languageContext\)/,'Schema-v2 interactions must remain connected');
assert.match(screen,/grammarLearningCompletion\(slot,detail\.learning_model,languageContext\)/,'Completion evidence must remain authoritative');
assert.match(screen,/oIcon\('arrowLeft'\)/,'Back control must reuse the shared icon system');
assert.match(screen,/oIcon\('chevronDown'\)/,'Mobile accordions must reuse the shared icon system');

assert.match(styles,/grid-template-columns:minmax\(0,830px\) minmax\(260px,294px\)/,'Desktop lesson must follow the reference two-column geometry');
assert.match(styles,/gap:0 26px/,'Desktop lesson must preserve the reference column gap');
assert.match(styles,/\.grammar-page\.has-open-lesson > :is\([\s\S]*\.grammar-curriculum-map[\s\S]*display:none/,'Focused lesson mode must remove the catalog from the lesson reading flow');
assert.match(styles,/@media\(max-width:720px\)[\s\S]*grid-template-columns:minmax\(0,1fr\)/,'Mobile lesson must recompose to one column');
assert.match(styles,/\.is-mobile-collapsible\.is-collapsed > :not\(\.grammar-mobile-section-toggle\)/,'Mobile lesson sections must collapse without removing their controls');
assert.match(styles,/prefers-reduced-motion:reduce/);
assert.doesNotMatch(styles,/#[0-9a-f]{3,8}\b/i,'Grammar must consume shared Orena colour tokens');

for(const stableRendererContract of [
  'data-grammar-learning-model="1"',
  'data-grammar-visual-system="orena-grammar-v2"',
  'data-grammar-schema=',
  'data-target-language=',
  'data-interface-language=',
  'data-learning-evidence-stage=',
]){
  assert.ok(renderer.includes(stableRendererContract),'Protected renderer must retain '+stableRendererContract);
}

for(const visualContract of [
  '--grammar-accent:var(--o-role-noun)',
  'grammar-use-check',
  'grammar-example-mark',
  'grammar-segment-connector',
  'grammar-contrast-vs',
  'grammar-mistake-row',
  'grammar-micro-options',
  'grammar-skill-name',
]){
  assert.ok(styles.includes(visualContract)||renderer.includes(visualContract),'Missing universal visual contract '+visualContract);
}

const {renderGrammarLearningModel}=await import(
  new URL('../static/becoming/components/grammar-learning.js?test=orena-visual-508',import.meta.url)
);
const loadKnowledge=language=>JSON.parse(fs.readFileSync(
  new URL(`../writing_coach/languages/${language}/grammar_knowledge.json`,import.meta.url),
  'utf8'
));

let renderedLessons=0;
for(const [language,file] of [['en','english'],['zh','chinese']]){
  for(const lesson of loadKnowledge(file)){
    const html=renderGrammarLearningModel(lesson.learning_model,{
      interfaceLanguage:'vi',
      explanationLanguage:'vi',
      translationLanguage:'vi',
      targetLanguage:language,
    });
    assert.match(html,/data-grammar-visual-system="orena-grammar-v2"/,lesson.id);
    assert.match(html,/class="grammar-learning-primary-pattern"/,lesson.id);
    assert.match(html,/data-grammar-block-type="use_when"/,lesson.id);
    assert.match(html,/class="grammar-use-check"/,lesson.id);
    assert.match(html,/class="grammar-example-mark"/,lesson.id);
    assert.match(html,/data-contrast-count="[23]"/,lesson.id);
    assert.match(html,/grammar-mistake-row is-incorrect/,lesson.id);
    assert.match(html,/grammar-mistake-row is-correct/,lesson.id);
    assert.match(html,/grammar-learning-micro_practice/,lesson.id);
    for(const block of lesson.learning_model.blocks){
      assert.ok(
        html.includes(`data-grammar-block-type="${block.type}"`),
        `${language}:${lesson.id} did not visually render ${block.type}`
      );
    }
    renderedLessons++;
  }
}
assert.equal(renderedLessons,508);

console.log('Orena Grammar visual and interaction contracts passed (508/508 EN/ZH)');
