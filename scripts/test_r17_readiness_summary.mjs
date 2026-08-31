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
}
const ids=['adminNav','adminAiMessage','adminCurrentEngine','adminCurrentKind','adminProviderCount','adminReadyCount','adminModelCount','adminProviderCards','adminModelGrid','adminCapabilityMatrix','adminOperations','adminProductActivity','adminReadinessSummary','adminAccountState','adminRefreshModels','adminRefreshOperations','adminRefreshProductActivity','adminModelSearch'];
const elements=new Map(ids.map(id=>[`#${id}`,new FakeElement()]));
const summary={available:true,state:'deferred',evidence_state:'ready',approval_state:'not_granted',indicators:[
  {name:'capability_configuration',state:'ready',source:'AI capability configuration'},
  {name:'capability_health',state:'degraded',source:'AI operation telemetry'},
  {name:'product_observability',state:'insufficient',source:'Admin product activity aggregates'},
  {name:'learner_impact_evidence',state:'ready',source:'Validated learner-origin telemetry'},
  {name:'runtime_activation',state:'deferred',source:'Human activation policy',detail:'Activation remains human-gated.'},
]};
const responses=[
  {ok:true,json:async()=>({is_admin:true})},
  {ok:true,json:async()=>({capabilities:[],providers:[],learner_runtime:{mode:'legacy'},legacy_runtime:{}})},
  {ok:true,json:async()=>({available:true,has_data:false,recent:[],by_capability:[]})},
  {ok:true,json:async()=>({available:true,has_data:false,skills:[],learner_impact_failures:{available:true,data_state:'insufficient_data',by_capability:[]}})},
  {ok:true,json:async()=>summary},
  {ok:true,json:async()=>({account:{available:false}})},
];
const calls=[];
const context={document:{readyState:'complete',querySelector:s=>elements.get(s)||null,querySelectorAll:()=>[],addEventListener(){}},fetch:async url=>{calls.push(url);return responses.shift();},console:{error(){}}};
vm.runInNewContext(fs.readFileSync('static/admin.js','utf8'),context);
await new Promise(resolve=>setTimeout(resolve,0));
await new Promise(resolve=>setTimeout(resolve,0));
const html=elements.get('#adminReadinessSummary').innerHTML;
assert.match(html,/Overall: Deferred/);
assert.match(html,/capability_health/);
assert.match(html,/Degraded/);
assert.match(html,/This read-only view is not production-release approval/);
assert.doesNotMatch(html,/learner_key|private-user|secret|event row/i);
assert.ok(calls.includes('/api/admin/readiness-summary'));
console.log('R17 readiness summary mounted contract: PASS');
