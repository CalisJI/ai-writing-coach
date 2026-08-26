import assert from 'node:assert/strict';
import {api} from '../static/becoming/api.js';
import {state} from '../static/becoming/store.js';
import {renderHome} from '../static/becoming/screens/home.js';

globalThis.document={querySelector:()=>null};
const root={
  innerHTML:'',
  querySelector:()=>null,
  querySelectorAll:()=>[],
};

api.dashboard=async()=>({essay_count:0,streak:0,metrics:{}});
api.essays=async()=>[];
api.learningMemory=async()=>({patterns:[],strengths:[],focus:null,revision_wins:[]});
api.practiceRecommendation=async()=>null;
api.libraryVocabulary=async()=>[];

let latestOutcome={
  status:'improved',
  previous_issue_count:2,
  issue_count:0,
  focus_label:'Agreement practice',
  revision_no:2,
};
api.practiceOutcomes=async()=>({latest:latestOutcome});

state.language='en';
state.profile={native_language:'en'};

for(const locale of ['en','vi','zh']){
  state.supportLanguage=locale;
  await renderHome(root);
  assert.match(
    root.innerHTML,
    /practice-outcome-signal/,
    `Home ${locale.toUpperCase()} should render a valid practice outcome`,
  );
  assert.doesNotMatch(root.innerHTML,/\[object Object\]/);
}

for(const locale of ['en','vi','zh']){
  state.supportLanguage=locale;
  for(const {value,rendered} of [
    {value:null,rendered:false},
    {value:{},rendered:false},
    {value:{status:{},focus_label:{},previous_issue_count:{},issue_count:{},revision_no:{}},rendered:false},
    {value:{status:'unknown',focus_label:'Agreement practice'},rendered:false},
    {value:{status:'improved',previous_issue_count:2,issue_count:-1,revision_no:2},rendered:false},
    {value:{status:'improved',previous_issue_count:2,issue_count:0.5,revision_no:2},rendered:false},
    {value:{status:'improved',previous_issue_count:2,issue_count:0,revision_no:0},rendered:false},
    {value:{status:'improved',previous_issue_count:2,issue_count:0,revision_no:1.5},rendered:false},
    {value:{status:'improved',focus_label:{},previous_issue_count:null,issue_count:0,revision_no:2},rendered:true},
  ]){
    latestOutcome=value;
    await renderHome(root);
    if(rendered){
      assert.match(root.innerHTML,/practice-outcome-signal/,
        `Home ${locale.toUpperCase()} should retain a safe outcome shell`);
    }else{
      assert.doesNotMatch(root.innerHTML,/practice-outcome-signal/,
        `Home ${locale.toUpperCase()} must omit malformed practice outcomes`);
    }
    assert.doesNotMatch(
      root.innerHTML,
      /\[object Object\]/,
      `Home ${locale.toUpperCase()} must not render malformed outcome fields`,
    );
  }
}

console.log('Home practice outcome shape contract: PASS');
