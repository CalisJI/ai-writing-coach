import assert from 'node:assert/strict';
import {api} from '../static/becoming/api.js';
import {state} from '../static/becoming/store.js';
import {renderJourney} from '../static/becoming/screens/journey.js';

globalThis.location={hash:'#/journey'};
const revisionButtons=new Map();
const root={
  innerHTML:'',
  querySelector:()=>null,
  querySelectorAll:selector=>{
    if(selector!=='[data-journey-essay]')return [];
    const ids=[...root.innerHTML.matchAll(/data-journey-essay="([^"]+)"/g)]
      .map(match=>match[1]);
    return ids.map(id=>{
      if(!revisionButtons.has(id)){
        revisionButtons.set(id,{
          dataset:{journeyEssay:id},
          listeners:{},
          addEventListener(name,listener){this.listeners[name]=listener;},
          async click(){return this.listeners.click?.({currentTarget:this});},
        });
      }
      return revisionButtons.get(id);
    });
  },
};

api.dashboard=async()=>({cefr:'B1',streak:0});
api.essays=async()=>[{
  id:1,
  series_id:1,
  revision_no:1,
  overall:70,
  created_at:'2026-01-01T00:00:00Z',
  prompt:'A short practice task',
}];
let latestMemory={
  patterns:[],
  strengths:[],
  focus:null,
  revision_wins:[],
};
api.learningMemory=async()=>latestMemory;
api.practiceRecommendation=async()=>null;
let latestOutcome={
    grammar_id:'a1-agreement',
    focus_label:'Agreement practice',
    status:'improved',
    issue_count:0,
    revision_no:2,
};
api.practiceOutcomes=async()=>({latest:latestOutcome});

state.language='en';
state.profile={native_language:'en'};
for(const [locale,label] of [
  ['en','Grammar practice progress'],
  ['vi','Tiến độ luyện ngữ pháp'],
  ['zh','语法练习进度'],
]){
  state.supportLanguage=locale;
  await renderJourney(root);
  assert.ok(
    root.innerHTML.includes(label),
    `Journey Grammar outcome should follow the active ${locale.toUpperCase()} UI locale`,
  );
  if(locale!=='en'){
    assert.doesNotMatch(
      root.innerHTML,
      /\bimproved\b/,
      `Journey ${locale.toUpperCase()} Grammar outcome must not expose the raw status enum`,
    );
  }
}
state.supportLanguage='zh';
assert.doesNotMatch(root.innerHTML,/Grammar practice progress/);

for(const locale of ['en','vi','zh']){
  state.supportLanguage=locale;
  for(const malformed of [null,{},
    {grammar_id:{},status:'improved',issue_count:{},revision_no:{}},
    {grammar_id:'a1-agreement',status:'unknown'},
  ]){
    latestOutcome=malformed;
    await renderJourney(root);
    assert.doesNotMatch(
      root.innerHTML,
      /o-journey-grammar-outcome/,
      `Journey ${locale.toUpperCase()} must omit malformed Grammar outcomes`,
    );
    assert.doesNotMatch(
      root.innerHTML,
      /\[object Object\]/,
      `Journey ${locale.toUpperCase()} must not render malformed object values`,
    );
  }
}

for(const locale of ['en','vi','zh']){
  state.supportLanguage=locale;
  for(const malformed of [
    {patterns:null,strengths:null,revision_wins:null,focus:null},
    {patterns:[null,{}],strengths:[null,{}],revision_wins:[null,{}],focus:{}},
    {patterns:[{category:{},status:{},total:{},older:-1,newer:0}],strengths:[{category:{},stage:{},evidence_count:{}}],revision_wins:[{overall_delta:{}}],focus:null},
    {patterns:[{category:'grammar',status:'recurring',total:-1,older:1,newer:0,series_count:1}],strengths:[],revision_wins:[],focus:null},
    {patterns:[{category:'grammar',status:'recurring',total:1,older:0.5,newer:0,series_count:1}],strengths:[],revision_wins:[],focus:null},
    {patterns:[],strengths:[{category:'grammar',stage:'Stable',evidence_count:1.5,series_count:1}],revision_wins:[],focus:null},
  ]){
    latestMemory=malformed;
    await renderJourney(root);
    assert.doesNotMatch(
      root.innerHTML,
      /\[object Object\]/,
      `Journey ${locale.toUpperCase()} must not render malformed learning-memory records`,
    );
    assert.doesNotMatch(root.innerHTML,/o-journey-focus|o-journey-row--(?:up|watch)/,
      `Journey ${locale.toUpperCase()} must omit semantically invalid memory records`);
  }
}

const patternShape={
  category:'grammar',status:'improving',total:2,older:2,newer:1,series_count:2,
};
const patternStatusCopy={
  vi:{new:'Mới',watch:'Cần theo dõi'},
  zh:{new:'新出现',watch:'需要留意'},
};
for(const locale of ['vi','zh']){
  state.profile={native_language:locale};
  state.supportLanguage=locale;
  for(const status of ['new','watch']){
    latestMemory={
      patterns:[
        patternShape,
        {...patternShape,category:'vocabulary',status},
      ],
      strengths:[],
      focus:{category:'grammar'},
      revision_wins:[],
    };
    await renderJourney(root);
    assert.match(root.innerHTML,new RegExp(patternStatusCopy[locale][status]),
      `Journey ${locale.toUpperCase()} should localize the ${status} pattern status`);
    const learnerMarkup=root.innerHTML.replace(/\bclass="[^"]*"/g,'');
    assert.doesNotMatch(learnerMarkup,new RegExp(`\\b${status}\\b`),
      `Journey ${locale.toUpperCase()} must not expose raw ${status} status`);
  }
}

const revisionEssays=[
  {id:11,series_id:11,revision_no:1,overall:68,created_at:'2026-01-01T00:00:00Z',prompt:'A revision series'},
  {id:12,series_id:11,revision_no:2,overall:74,created_at:'2026-01-02T00:00:00Z',prompt:'A revision series'},
];
const revisionEvidenceCopy={
  en:'Issue count change: -2',
  vi:'Thay đổi số lượng lỗi: -2',
  zh:'问题数量变化：-2',
};
api.essays=async()=>revisionEssays;
let openedEssayId=null;
api.essay=async id=>{
  openedEssayId=String(id);
  return revisionEssays.find(item=>String(item.id)===String(id));
};
for(const locale of ['en','vi','zh']){
  state.profile={native_language:locale};
  state.supportLanguage=locale;
  latestMemory={
    patterns:[],
    strengths:[],
    focus:null,
    revision_wins:[{latest_id:12,revisions:2,overall_delta:6,error_delta:-2,latest_date:'2026-01-02T00:00:00Z'}],
  };
  await renderJourney(root);
  assert.match(root.innerHTML,new RegExp(revisionEvidenceCopy[locale]),
    `Journey ${locale.toUpperCase()} should render localized revision evidence`);
}

state.language='en';
state.supportLanguage='en';
latestMemory={
  patterns:[],
  strengths:[],
  focus:null,
  revision_wins:[{latest_id:12,revisions:2,overall_delta:6,error_delta:-2,latest_date:'2026-01-02T00:00:00Z'}],
};
await renderJourney(root);
const renderedRevisionButtons=root.querySelectorAll('[data-journey-essay]');
assert.equal(renderedRevisionButtons.length,1,
  'Journey must render one revision control for the linked latest essay');
assert.equal(renderedRevisionButtons[0].dataset.journeyEssay,'12',
  'Journey revision control must target the linked latest essay id');
await renderedRevisionButtons[0].click();
assert.equal(openedEssayId,'12',
  'Journey revision evidence must open the linked latest essay');
assert.equal(state.lastEvaluation.id,12,
  'Journey revision navigation must retain the selected essay for Review');
assert.equal(state.draft.parentEssayId,12,
  'Journey revision navigation must preserve the Review parent essay id');
assert.equal(globalThis.location?.hash,'#/review');

console.log('Journey Grammar outcome locale contract: PASS');
