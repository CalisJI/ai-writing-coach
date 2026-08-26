import assert from 'node:assert/strict';
import {api} from '../static/becoming/api.js';
import {state} from '../static/becoming/store.js';
import {renderJourney} from '../static/becoming/screens/journey.js';

const root={
  innerHTML:'',
  querySelector:()=>null,
  querySelectorAll:()=>[],
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
api.learningMemory=async()=>({
  patterns:[],
  strengths:[],
  focus:null,
  revision_wins:[],
});
api.practiceRecommendation=async()=>null;
api.practiceOutcomes=async()=>({
  latest:{
    grammar_id:'a1-agreement',
    focus_label:'Agreement practice',
    status:'improved',
    issue_count:0,
    revision_no:2,
  },
});

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

console.log('Journey Grammar outcome locale contract: PASS');
