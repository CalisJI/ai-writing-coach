import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const moduleUrl=new URL('../static/becoming/components/grammar-learning.js?test=universal',import.meta.url);
const {
  renderGrammarLearningModel,
  localizedText,
  grammarLanguageContext,
}=await import(moduleUrl);

assert.equal(localizedText({en:'English',vi:'Tiếng Việt'},'en'),'English');
assert.equal(localizedText({vi:'Tiếng Việt'},'en'),'');
assert.equal(localizedText({default:'Fallback',vi:'Tiếng Việt'},'fr'),'Fallback');

const model={
  schema_version:2,
  flow:['notice','understand','pattern','context','compare','apply','recall','transfer'],
  language_policy:{
    target_language:'zh',
    explanation_languages:['en','vi'],
    translation_languages:['en','vi'],
  },
  capabilities:['formula','particle','word-order','context-scene'],
  hook:{eyebrow:{vi:'Nhận ra'},prompt:{vi:'Nhìn cấu trúc trước.'}},
  meaning:{
    summary:{vi:'Giải thích bằng tiếng Việt.'},
    mental_model:{vi:'Đây là phần giải thích.'},
    use_when:[{vi:'Dùng trong ngữ cảnh phù hợp.'}],
  },
  blocks:[
    {
      id:'formula',type:'formula',stage:'pattern',title:{vi:'Mẫu câu'},
      payload:{parts:[
        {text:'我',role:'subject',label:{vi:'Chủ ngữ'}},
        {text:'比',role:'particle',label:{vi:'Từ so sánh'}},
        {text:'他高',role:'complement',label:{vi:'Phần so sánh'}},
      ]},
    },
    {
      id:'scene',type:'scene',stage:'context',title:{vi:'Ngữ cảnh'},
      payload:{lines:[{text:'我比他高。',meaning:{en:'I am taller than him.'}}]},
    },
    {
      id:'contrast',type:'contrast',stage:'compare',title:{vi:'Phân biệt'},
      payload:{items:[{label:'A',text:'我比他高。'},{label:'B',text:'他比我高。'}]},
    },
    {
      id:'apply',type:'personal_practice',stage:'apply',title:{vi:'Áp dụng'},
      payload:{prompt:{vi:'Tự viết một câu.'}},
    },
    {
      id:'recall',type:'recall',stage:'recall',title:{vi:'Gợi nhớ'},
      payload:{prompt:{vi:'Nhớ lại mẫu câu.'}},
    },
    {
      id:'transfer',type:'skill_transfer',stage:'transfer',title:{vi:'Chuyển giao'},
      payload:{skills:{writing:{vi:'Dùng nó khi viết.'}}},
    },
  ],
  completion:{required_stages:['apply','recall','transfer']},
};

const context=grammarLanguageContext({
  interfaceLanguage:'en',
  explanationLanguage:'vi',
  translationLanguage:'en',
  targetLanguage:'zh',
});
const html=renderGrammarLearningModel(model,context);
assert.match(html,/data-interface-language="en"/);
assert.match(html,/data-explanation-language="vi"/);
assert.match(html,/data-translation-language="en"/);
assert.match(html,/data-target-language="zh"/);
assert.match(html,/>Subject</);
assert.doesNotMatch(html,/>Chủ ngữ</);
assert.match(html,/Giải thích bằng tiếng Việt/);
assert.match(html,/我比他高。/);
assert.match(html,/I am taller than him/);

const knowledge=JSON.parse(readFileSync(
  new URL('../writing_coach/languages/english/grammar_knowledge.json',import.meta.url),
  'utf8'
));
const a1=knowledge.find(item=>item.id==='a1-be-am-is-are');
const a1Html=renderGrammarLearningModel(a1.learning_model,{
  interfaceLanguage:'en',
  explanationLanguage:'en',
  translationLanguage:'en',
  targetLanguage:'en',
});
for(const forbidden of [
  'Chủ ngữ','Be phù hợp','Bạn đang','Viết 3 câu','Không nhìn lên trên',
]){
  assert.equal(a1Html.includes(forbidden),false,`English explanation leaked Vietnamese: ${forbidden}`);
}
assert.match(a1Html,/>Subject</);
assert.match(a1Html,/Matching form of be/);
assert.match(a1Html,/data-learning-stage="pattern"/);

const component=readFileSync(
  new URL('../static/becoming/components/grammar-learning.js',import.meta.url),
  'utf8'
);
for(const forbidden of [
  "targetLanguage==='zh'",
  'targetLanguage === "zh"',
  'hidePinyin',
  'showPinyin',
]){
  assert.equal(component.includes(forbidden),false,`Shared renderer hard-codes a language concept: ${forbidden}`);
}
assert.match(component,/reading_aid/);
assert.match(component,/data-reading-aid-toggle/);

const css=readFileSync(new URL('../static/becoming/grammar.css',import.meta.url),'utf8');
assert.match(css,/@media\(max-width:430px\)/);
assert.match(css,/\.grammar-formula-line\{[\s\S]*grid-template-columns:minmax\(0,1fr\)/);
assert.equal(css.includes('.grammar-visual-canvas{overflow:auto'),false);
assert.equal(css.includes('min-width:max-content'),false);

console.log('M4 Universal Grammar renderer/language separation: PASS');
