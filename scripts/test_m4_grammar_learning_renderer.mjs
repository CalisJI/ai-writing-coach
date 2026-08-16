import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const moduleUrl=new URL('../static/becoming/components/grammar-learning.js?test=phase2',import.meta.url);
const {hasGrammarLearningModel,renderGrammarLearningModel}=await import(moduleUrl);

const model={
  schema_version:1,
  flow:['notice','understand','connect','compare','apply','recall','transfer'],
  hook:{prompt:{vi:'Nhìn trước.'}},
  meaning:{summary:{vi:'Hiểu ý nghĩa.'},mental_model:{vi:'Ý nghĩa trước.'},use_when:[{vi:'Trong đúng ngữ cảnh.'}]},
  blocks:[
    {id:'formula',type:'formula',stage:'understand',title:{vi:'Công thức'},payload:{parts:[{text:'have / has',role:'auxiliary'},{text:'V3',role:'verb'}]}},
    {id:'timeline',type:'timeline',stage:'connect',title:{vi:'Dòng thời gian'},payload:{events:[{label:'past',position:'past'},{label:'now',position:'now'}]}},
    {id:'contrast',type:'contrast',stage:'compare',title:{vi:'Phân biệt'},payload:{items:[{label:'A',text:'I have lived here.'},{label:'B',text:'I lived there.'}]}},
    {id:'mistake',type:'common_mistake',stage:'compare',title:{vi:'Lỗi'},payload:{incorrect:'I have lived there yesterday.',why:{vi:'Yesterday là mốc quá khứ đã kết thúc.'},correct:'I lived there yesterday.'}},
    {id:'micro',type:'micro_practice',stage:'apply',title:{vi:'Chọn'},payload:{interaction:'choose',prompt:{vi:'Chọn câu đúng.'},options:['A','B'],answer:'A'}},
    {id:'apply',type:'personal_practice',stage:'apply',title:{vi:'Áp dụng'},payload:{prompt:{vi:'Viết câu của bạn.'}}},
    {id:'recall',type:'recall',stage:'recall',title:{vi:'Nhớ lại'},payload:{prompt:{vi:'have/has + ?'},answer:'V3'}},
    {id:'transfer',type:'skill_transfer',stage:'transfer',title:{vi:'Chuyển giao'},payload:{skills:{writing:{vi:'Dùng trong Writing.'}}}},
  ],
  completion:{required_stages:['apply','recall','transfer']},
};

assert.equal(hasGrammarLearningModel(model),true);
const enHtml=renderGrammarLearningModel(model,{locale:'vi',targetLanguage:'en'});
assert.match(enHtml,/grammar-formula/);
assert.match(enHtml,/grammar-timeline/);
assert.match(enHtml,/data-learning-evidence-stage="recall"/);
assert.match(enHtml,/grammar-common-mistake/);
assert.match(enHtml,/data-interaction-type="choose"/);
assert.match(enHtml,/aria-label="Luồng học ngữ pháp"/);
assert.doesNotMatch(enHtml,/>BEFORE</);
assert.doesNotMatch(enHtml,/>AFTER</);

const zh=structuredClone(model);
zh.blocks[1]={id:'insert',type:'insertion',stage:'connect',title:{vi:'Vị trí'},payload:{segments:[
  {text:'我',pinyin:'wǒ',role:'subject'},
  {text:'去',pinyin:'qù',role:'verb'},
  {text:'过',pinyin:'guo',role:'particle',inserted:true},
  {text:'北京',pinyin:'Běijīng',role:'object'},
]}};
const zhHtml=renderGrammarLearningModel(zh,{locale:'vi',targetLanguage:'zh'});
assert.match(zhHtml,/grammar-particle-insertion/);
assert.match(zhHtml,/data-reading-aid-toggle/);
assert.match(zhHtml,/role-particle/);

const screen=readFileSync(new URL('../static/becoming/screens/grammar.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../static/becoming/grammar.css',import.meta.url),'utf8');
for(const needle of ['grammar-learning.js?v=2.17.1','renderGrammarLearningModel','grammarLearningCompletion','legacyLessonBody']){
  assert.equal(screen.includes(needle),true,`Missing ${needle}`);
}
assert.equal(css.includes('min-width:max-content'),false);
assert.equal(css.includes('.grammar-learning-flow{grid-template-columns:repeat(4,minmax(110px,1fr));overflow-x:auto}'),false);
for(const needle of [
  '.grammar-common-mistake',
  '.grammar-exception',
  '.grammar-micro-practice',
  '.role-auxiliary',
  '.role-particle',
  '.role-classifier',
  '.role-negation',
  '.role-error',
  '.role-exception',
]){
  assert.equal(css.includes(needle),true,`Grammar review correction missing ${needle}`);
}
console.log('M4 Grammar learning model/renderer foundation: PASS');
