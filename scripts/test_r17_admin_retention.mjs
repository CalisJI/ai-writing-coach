import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

class FakeElement {
  constructor(){ this._innerHTML=''; this.listeners={}; this.classList={add(){},remove(){},toggle(){}}; }
  get innerHTML(){ return this._innerHTML; }
  set innerHTML(value){ this._innerHTML=String(value||''); }
  addEventListener(name, fn){ this.listeners[name]=fn; }
  querySelector(){ return null; }
  querySelectorAll(){ return []; }
  async click(){ return this.listeners.click?.({currentTarget:this}); }
}

async function mount(productResponse){
  const ids=['adminNav','adminAiMessage','adminCurrentEngine','adminCurrentKind','adminProviderCount','adminReadyCount','adminModelCount','adminProviderCards','adminModelGrid','adminCapabilityMatrix','adminOperations','adminProductActivity','adminAccountState','adminRefreshModels','adminRefreshOperations','adminRefreshProductActivity','adminModelSearch'];
  const elements=new Map(ids.map(id=>[`#${id}`,new FakeElement()]));
  const responses=[
    {ok:true,json:async()=>({is_admin:true})},
    {ok:true,json:async()=>({capabilities:[],providers:[],learner_runtime:{mode:'legacy'},legacy_runtime:{}})},
    {ok:true,json:async()=>({available:true,has_data:false,recent:[],by_capability:[]})},
    productResponse,
    {ok:true,json:async()=>({account:{available:false}})},
  ];
  const calls=[]; const errors=[];
  const context={
    document:{readyState:'complete',querySelector:selector=>elements.get(selector)||null,querySelectorAll:()=>[],addEventListener(){}},
    fetch:async(url)=>{ calls.push(url); return responses.shift(); }, console:{error(...args){errors.push(args.join(' '));}}
  };
  vm.runInNewContext(fs.readFileSync('static/admin.js','utf8'),context);
  await new Promise(resolve=>setTimeout(resolve,0));
  await new Promise(resolve=>setTimeout(resolve,0));
  return {html:elements.get('#adminProductActivity').innerHTML,calls,errors};
}

const ready=await mount({ok:true,json:async()=>({
  available:true,has_data:true,window_days:7,active_learners:3,total_activities:8,total_completions:6,
  returning_learners:2,repeat_practice_learners:2,cross_skill_returning_learners:1,
  return_windows:[{days:1,eligible_learners:3,returned_learners:2,return_rate_percent:66.7}],
  daily_returning:[{date:'2026-08-29',returning_learners:2}],
  cost_per_active_learner:{available:true,data_state:'ready',evidence_state:'partial',currency_state:'single',considered_operations:4,cost_totals:[{currency:'USD',catalog_version:'v1',amount:0.6,evidence_count:2,cost_per_active_learner:0.2}],capability_cost:[{capability:'writing_evaluator',cost_totals:[{currency:'USD',amount:0.6}]}]},
  skills:[{skill:'writing',activities:8,completions:6,completion_rate_percent:75,days:[{date:'2026-08-29',activities:8,completions:6}],funnel:{stages:[{stage:'started',available:false,count:null,rate_percent:null},{stage:'attempted',available:true,count:8,rate_percent:null},{stage:'completed',available:true,count:6,rate_percent:75}]}}]
})});
assert.deepEqual(ready.calls,['/api/me','/api/admin/ai/config','/api/admin/ai/operations','/api/admin/product-activity?window_days=7','/api/product/admin/account'],ready.errors.join('; '));
assert.match(ready.html,/2 returning learners/);
assert.match(ready.html,/2 repeat-practice learners/);
assert.match(ready.html,/1 cross-skill returning learners/);
assert.match(ready.html,/1-day return: 2\/3/);
assert.match(ready.html,/Daily returning learners: 2026-08-29: 2/);
assert.match(ready.html,/Funnel: started: unavailable · attempted: 8/);
assert.match(ready.html,/Cost per active learner: USD 0\.20000000 per active learner/);
assert.match(ready.html,/Evidence: partial · currency: single/);
assert.doesNotMatch(ready.html,/learner_key|private-user|secret text/i);

const insufficient=await mount({ok:true,json:async()=>({available:true,has_data:false,data_state:'insufficient_data',skills:[]})});
assert.match(insufficient.html,/return trends are insufficient/);
const unavailable=await mount({ok:true,json:async()=>({available:false,has_data:false,data_state:'unavailable',skills:[]})});
assert.match(unavailable.html,/Product activity is unavailable/);
console.log('R17 Admin retention mounted contract: PASS');
