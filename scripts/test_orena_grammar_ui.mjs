import assert from 'node:assert/strict';
import fs from 'node:fs';

const screen=fs.readFileSync(new URL('../static/becoming/screens/grammar.js',import.meta.url),'utf8');
const styles=fs.readFileSync(new URL('../static/becoming/orena/grammar.css',import.meta.url),'utf8');
const renderer=fs.readFileSync(new URL('../static/becoming/components/grammar-learning.js',import.meta.url),'utf8');
const pedagogy=fs.readFileSync(new URL('../static/becoming/domain/grammar-pedagogy.js',import.meta.url),'utf8');
const shell=fs.readFileSync(new URL('../static/becoming/orena/shell.css',import.meta.url),'utf8');
const template=fs.readFileSync(new URL('../templates/becoming/index.html',import.meta.url),'utf8');
const version=fs.readFileSync(new URL('../BECOMING_FRONTEND_VERSION',import.meta.url),'utf8').trim();

assert.equal(version,'2.17.5');
assert.match(template,/orena\/grammar\.css\?v=2\.17\.5/,'Grammar Orena layer must be versioned with the current frontend');
assert.match(screen,/grammar-learning\.js\?v=2\.17\.5/);
assert.match(screen,/router\.js\?v=2\.17\.5/);
assert.doesNotMatch(screen,/\?v=2\.17\.4/);

for(const contract of [
  'has-open-lesson',
  'grammar-back-button',
  'grammar-lesson-rail-card',
  'grammar-lesson-outline',
]){
  assert.match(screen,new RegExp(contract),'Grammar screen must render or bind '+contract);
  assert.match(styles,new RegExp(contract),'Grammar stylesheet must define '+contract);
}

assert.match(screen,/page\?\.classList\.add\('has-open-lesson'\)/,'Opening a lesson must enter focused lesson mode');
assert.match(screen,/page\?\.classList\.remove\('has-open-lesson'\)/,'Back must restore the curriculum overview');
assert.match(screen,/activeLessonOpener/,'Grammar must retain the exact control that opened a lesson');
assert.match(screen,/opener\?\.isConnected[\s\S]*focus\(\{preventScroll:true\}\)/,'Back must restore focus to the originating lesson control');
assert.match(screen,/data-grammar-lesson-title/,'Open lessons must expose their title to shared mobile chrome');
assert.match(screen,/wireLessonOutline\(slot\)/,'Lesson outline must derive from the composed lesson DOM');
assert.match(screen,/data-lesson-outline/);
assert.match(screen,/composeLessonBody\(slot,detail\)/,'Screen must compose the deterministic pedagogy plan');
assert.match(screen,/bindGrammarLearningInteractions\(slot,languageContext\)/,'Schema-v2 interactions must remain connected');
assert.match(screen,/grammarLearningCompletion\(slot,detail\.learning_model,languageContext\)/,'Completion evidence must remain authoritative');
assert.match(screen,/oIcon\('arrowLeft'\)/,'Back control must reuse the shared icon system');

assert.match(pedagogy,/export function classifyArchetype/);
assert.match(pedagogy,/export function deriveSegmentRole/);
assert.match(pedagogy,/export function composeLesson/);
assert.match(pedagogy,/export const BLOCK_SLOT/);

assert.match(styles,/grid-template-columns:minmax\(0,830px\) 288px/,'Desktop lesson must retain the verified teaching-column and rail geometry');
assert.match(styles,/gap:26px/,'Desktop lesson must retain the verified column gap');
assert.match(styles,/\.grammar-page\.has-open-lesson > :is\([\s\S]*\.grammar-curriculum-map[\s\S]*display:none/,'Focused lesson mode must remove the curriculum from the reading flow');
assert.match(styles,/@media \(max-width:1023px\)[\s\S]*\.grammar-page \.grammar-lesson-layout\{grid-template-columns:minmax\(0,1fr\)/,'Mobile lesson must recompose to one column');
assert.match(styles,/\.o-topbar-title\[data-grammar-lesson-title\]/,'Mobile chrome must display the active lesson title');
assert.match(shell,/prefers-reduced-motion:reduce/,'Shared Orena shell must suppress motion for Grammar');
assert.doesNotMatch(styles,/#[0-9a-f]{3,8}\b/i,'Grammar must consume shared Orena colour tokens');

for(const stableRendererContract of [
  'data-grammar-learning-model="1"',
  'data-grammar-visual-system="orena-grammar-v2"',
  'data-grammar-reference="orena-prod"',
  'data-grammar-schema=',
  'data-grammar-block-type=',
  'data-target-language=',
  'data-interface-language=',
  'data-learning-evidence-stage=',
]){
  assert.ok(renderer.includes(stableRendererContract),'Protected renderer must retain '+stableRendererContract);
}

for(const visualContract of [
  'grammar-learning-primary-pattern',
  'grammar-formula-band',
  'grammar-formula-plain',
  'grammar-learning-use-when',
  'grammar-lesson-pair',
  'grammar-contrast-grid',
  'grammar-diff--out',
  'grammar-diff--in',
  'grammar-mistake-row',
  'grammar-micro-practice',
]){
  assert.ok(styles.includes(visualContract)||renderer.includes(visualContract)||screen.includes(visualContract),'Missing universal visual contract '+visualContract);
}

const [{renderGrammarLearningModel,markedDifference},{composeLesson}]=await Promise.all([
  import(new URL('../static/becoming/components/grammar-learning.js?test=orena-visual-508',import.meta.url)),
  import(new URL('../static/becoming/domain/grammar-pedagogy.js?test=orena-visual-508',import.meta.url)),
]);
const loadKnowledge=language=>JSON.parse(fs.readFileSync(
  new URL(`../writing_coach/languages/${language}/grammar_knowledge.json`,import.meta.url),
  'utf8',
));

const moved=markedDifference('Like I this song.','I like this song.');
assert.match(moved.from,/grammar-diff--out/,'Word-order corrections must mark the moved source token');
assert.match(moved.to,/grammar-diff--in/,'Word-order corrections must mark the moved target token');

let renderedLessons=0;
for(const [language,file] of [['en','english'],['zh','chinese']]){
  for(const lesson of loadKnowledge(file)){
    const plan=composeLesson(lesson);
    const blockTypes=new Set(lesson.learning_model.blocks.map(block=>block.type));
    assert.ok(plan.primaryType&&blockTypes.has(plan.primaryType),`${language}:${lesson.id} must choose a real primary model`);

    const html=renderGrammarLearningModel(lesson.learning_model,{
      interfaceLanguage:'vi',
      explanationLanguage:'vi',
      translationLanguage:'vi',
      targetLanguage:language,
    });
    assert.match(html,/data-grammar-visual-system="orena-grammar-v2"/,lesson.id);
    assert.match(html,/data-grammar-reference="orena-prod"/,lesson.id);
    assert.match(html,/class="grammar-learning-primary-pattern"/,lesson.id);
    assert.match(html,/class="grammar-learning-use-when"/,lesson.id);

    for(const block of lesson.learning_model.blocks){
      assert.ok(
        html.includes(`data-grammar-block-type="${block.type}"`),
        `${language}:${lesson.id} did not visually render ${block.type}`,
      );
    }
    if(blockTypes.has('contrast'))assert.match(html,/grammar-contrast-grid/,lesson.id);
    if(blockTypes.has('common_mistake')){
      assert.match(html,/grammar-mistake-row is-incorrect/,lesson.id);
      assert.match(html,/grammar-mistake-row is-correct/,lesson.id);
    }
    if(blockTypes.has('micro_practice'))assert.match(html,/grammar-micro-practice/,lesson.id);
    renderedLessons++;
  }
}
assert.equal(renderedLessons,508);

console.log('Orena Grammar visual, pedagogy, and interaction contracts passed (508/508 EN/ZH)');
