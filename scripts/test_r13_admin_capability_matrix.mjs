import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

class FakeElement{
  constructor(){
    this._innerHTML='';
    this.textContent='';
    this.className='';
    this.dataset={};
    this.value='';
    this.checked=true;
    this.disabled=false;
    this.listeners={};
    this.classList={add(){},remove(){},toggle(){}};
  }
  set innerHTML(value){this._innerHTML=String(value); this._childrenBySelector=new Map();}
  get innerHTML(){return this._innerHTML;}
  addEventListener(name,listener){this.listeners[name]=listener;}
  async click(){return this.listeners.click?.({currentTarget:this});}
  closest(){return null;}
  querySelector(){return null;}
  querySelectorAll(selector){
    if(selector !== '[data-save-capability]' && selector !== '[data-health-capability]') return [];
    if(this._childrenBySelector?.has(selector)) return this._childrenBySelector.get(selector);
    const controls=[];
    const attributeName=selector === '[data-save-capability]' ? 'data-save-capability' : 'data-health-capability';
    const pattern=new RegExp(`<button[^>]*${attributeName}="([^"]+)"[^>]*>`, 'g');
    let match;
    while((match=pattern.exec(this._innerHTML))){
      const key=match[1];
      const attribute=(name)=>match[0].match(new RegExp(`${name}="([^"]*)"`))?.[1] || '';
      const row=new FakeElement();
      const provider=new FakeElement(); provider.value='openai';
      const model=new FakeElement(); model.value='model-1';
      const enabled=new FakeElement(); enabled.checked=true;
      const healthStatus=new FakeElement();
      row.querySelector=(query)=>({
        '[data-capability-provider]':provider,
        '[data-capability-model]':model,
        '[data-capability-enabled]':enabled,
        '[data-capability-health-status]':healthStatus,
      }[query] || null);
      const button=new FakeElement();
      if(selector === '[data-save-capability]'){
        button.dataset.saveCapability=key;
        button.dataset.capabilityFallback=attribute('data-capability-fallback');
        button.dataset.capabilityTimeout=attribute('data-capability-timeout');
        button.dataset.capabilityTemperature=attribute('data-capability-temperature');
      }else{
        button.dataset.healthCapability=key;
      }
      button.closest=()=>row;
      controls.push(button);
    }
    this._childrenBySelector.set(selector,controls);
    return controls;
  }
}

const elementIds=[
  'adminAiMessage','adminCurrentEngine','adminCurrentKind','adminProviderCount',
  'adminReadyCount','adminModelCount','adminProviderCards','adminModelGrid',
  'adminCapabilityMatrix','adminOperations','adminNav','adminRefreshModels','adminRefreshOperations','adminModelSearch',
];

function runAdmin(configResponses, operationResponse={ok:true,json:async()=>({available:true,has_data:false,recent:[],by_capability:[]})}){
  const elements=new Map(elementIds.map(id=>[`#${id}`,new FakeElement()]));
  const document={
    readyState:'complete',
    querySelector:selector=>elements.get(selector)||null,
    querySelectorAll:()=>[],
    addEventListener(){},
  };
  const calls=[];
  const supplied=Array.isArray(configResponses)?[...configResponses]:[configResponses];
  const responses=[{ok:true,json:async()=>({is_admin:true})}, supplied.shift(), operationResponse, ...supplied];
  const context={
    document,
    fetch:async(url,options={})=>{
      calls.push({url,method:options.method||'GET',body:options.body});
      return responses.shift();
    },
    console:{error(){}},
  };
  vm.runInNewContext(fs.readFileSync('static/admin.js','utf8'),context);
  return new Promise(resolve=>setTimeout(()=>setTimeout(()=>resolve({elements,calls}),0),0));
}

const capabilities=[
  {key:'writing_evaluator',operation:'structured_text_generation',implemented:true,provider_backed:true,configurable:true,explicit_config_exists:true,config:{enabled:true,provider:'openai',model:'model-1',timeout_seconds:45,temperature:0.4,fallback_policy:'none'},config_provenance:{saved:true,updated_at:'2026-08-28T14:00:00+07:00',updated_by_present:true}},
  {key:'writing_linguistic',operation:'deterministic',implemented:true,provider_backed:false,configurable:false,explicit_config_exists:false,config:null},
  {key:'reading_generator',operation:'structured_text_generation',implemented:true,provider_backed:true,configurable:true,explicit_config_exists:false,config:null},
  {key:'writing_improver',operation:'structured_text_generation',implemented:true,provider_backed:true,configurable:true,explicit_config_exists:true,config:{enabled:false,provider:'openai',model:'model-1'}},
  {key:'learner_translation',operation:'structured_text_generation',implemented:true,provider_backed:true,configurable:true,explicit_config_exists:true,config:{enabled:true,provider:'deepseek',model:'model-1'}},
  {key:'speech_asr',operation:'speech_recognition',implemented:false,provider_backed:true,configurable:false,explicit_config_exists:false,config:null},
  {key:'learner_dictionary',operation:'structured_text_generation',implemented:true,provider_backed:true,configurable:true,explicit_config_exists:true,config:{enabled:true,provider:'openai',model:'[redacted]',model_redacted:true}},
];
const payload={
  capabilities,
  providers:[
    {id:'openai',name:'OpenAI API',kind:'cloud',secret_mode:'server-managed',server_configured:true,configured:true,available:true,models:['model-1']},
  ],
  learner_runtime:{mode:'legacy'},
  legacy_runtime:{role:'live-global-routing-until-R2-activation',selection_present:false},
};

const rendered=await runAdmin({ok:true,json:async()=>payload});
const matrix=rendered.elements.get('#adminCapabilityMatrix').innerHTML;
const modelGrid=rendered.elements.get('#adminModelGrid').innerHTML;
assert.match(matrix,/data-capability-key="writing_evaluator"/);
assert.match(matrix,/Configured/);
assert.match(matrix,/data-capability-key="writing_linguistic"[\s\S]*Deterministic/);
assert.match(matrix,/data-capability-key="reading_generator"[\s\S]*Not configured/);
assert.match(matrix,/data-capability-key="writing_improver"[\s\S]*Configured · disabled/);
assert.match(matrix,/data-capability-key="learner_translation"[\s\S]*Configured · provider unavailable/);
assert.match(matrix,/data-capability-key="speech_asr"[\s\S]*Reserved/);
assert.match(matrix,/Learner runtime: <b>legacy<\/b>/);
assert.match(matrix,/\[redacted\]/);
assert.match(matrix,/Saved 2026-08-28T14:00:00\+07:00/);
assert.match(matrix,/Updated by administrator/);
assert.match(matrix,/data-capability-key="writing_evaluator"[\s\S]*data-save-capability="writing_evaluator"/);
const linguisticRow=matrix.match(/data-capability-key="writing_linguistic"[\s\S]*?(?=<\/div><div class="admin-capability-row")/)?.[0] || '';
const speechRow=matrix.match(/data-capability-key="speech_asr"[\s\S]*?(?=<\/div><div class="admin-capability-row")/)?.[0] || '';
assert.doesNotMatch(linguisticRow,/data-save-capability=/);
assert.doesNotMatch(speechRow,/data-save-capability=/);
assert.doesNotMatch(matrix,/secret|token|api_key/i);
assert.doesNotMatch(modelGrid,/data-use-provider|data-test-provider/);
assert.deepEqual(rendered.calls.map(call=>call.method),['GET','GET','GET']);
assert.match(rendered.elements.get('#adminOperations').innerHTML,/No operation data yet/);
const populatedOperations=await runAdmin({ok:true,json:async()=>payload},{ok:true,json:async()=>({
  available:true,has_data:true,
  by_capability:[
    {capability:'writing_evaluator',total:3,success:2,failure:1,avg_latency_ms:18,usage_known:1,usage_partial:1,usage_unknown:1,token_totals:{prompt_tokens:6,completion_tokens:null,total_tokens:8},rate_limit:{requests_limit:100,requests_remaining:0,tokens_limit:10000,tokens_remaining:null},rate_limit_reported_count:2,rate_limit_unknown_count:1,quota_state:'reported_exhausted',health_state:'degraded',evidence_count:3,failure_rate_percent:33,trend:[{bucket:'2026-08-28',request_count:3,failure_count:1,avg_latency_ms:18,token_totals:{total_tokens:8}}]},
    {capability:'reading_generator',total:1,success:0,failure:1,avg_latency_ms:null,usage_known:0,usage_partial:0,usage_unknown:1,token_totals:{prompt_tokens:null,completion_tokens:null,total_tokens:null},rate_limit:{requests_limit:null,requests_remaining:null,tokens_limit:null,tokens_remaining:null},rate_limit_reported_count:0,rate_limit_unknown_count:1,quota_state:'unavailable',health_state:'provider_failure',evidence_count:1,failure_rate_percent:100},
  ],
  recent:[
    {capability:'writing_evaluator',provider:'openai',model:'model-1',outcome:'success',latency_ms:17,usage:{total_tokens:9},prompt:'do-not-render',cost:99},
    {capability:'reading_generator',provider:'ollama',model:'local-model',outcome:'failure',latency_ms:null,usage:null},
    {capability:'writing_evaluator',provider:'openai',model:'model-1',outcome:'success',latency_ms:19,usage:{prompt_tokens:null,completion_tokens:null,total_tokens:null}},
  ],
})});
const operationsMarkup=populatedOperations.elements.get('#adminOperations').innerHTML;
assert.match(operationsMarkup,/By capability/);
assert.match(operationsMarkup,/Recent events/);
assert.match(operationsMarkup,/writing_evaluator/);
assert.match(operationsMarkup,/17 ms/);
assert.match(operationsMarkup,/Usage unknown/);
assert.match(operationsMarkup,/Degraded/);
assert.match(operationsMarkup,/Provider failure/);
assert.match(operationsMarkup,/33% failures/);
assert.match(operationsMarkup,/3 events sampled/);
assert.match(operationsMarkup,/Tokens: 6 prompt · completion unknown · 8 total/);
assert.match(operationsMarkup,/1 partial usage/);
assert.match(operationsMarkup,/1 usage unavailable/);
assert.match(operationsMarkup,/Provider reports exhausted/);
assert.match(operationsMarkup,/Rate limits unavailable/);
assert.match(operationsMarkup,/Recent trend \(7 days\)/);
assert.match(operationsMarkup,/2026-08-28 · 3 requests · 1 failures/);
assert.doesNotMatch(operationsMarkup,/do-not-render|cost/);
assert.equal(rendered.elements.get('#adminCapabilityMatrix').querySelectorAll('[data-health-capability]').length,3);

const healthSuccess=await runAdmin([
  {ok:true,json:async()=>payload},
  {ok:true,json:async()=>({ok:true,capability:'writing_evaluator',provider:'openai',model:'model-1',latency_ms:23})},
]);
const healthButton=healthSuccess.elements.get('#adminCapabilityMatrix').querySelectorAll('[data-health-capability]')[0];
assert.equal(healthButton.dataset.healthCapability,'writing_evaluator');
await healthButton.click();
assert.equal(healthButton.closest().querySelector('[data-capability-health-status]').textContent,'Healthy · 23 ms');
assert.deepEqual(healthSuccess.calls.map(call=>call.method),['GET','GET','GET','POST']);

const healthFailure=await runAdmin([
  {ok:true,json:async()=>payload},
  {ok:false,json:async()=>({detail:{error_class:'provider_unavailable',error:'token=super-secret'}})},
]);
const failingHealth=healthFailure.elements.get('#adminCapabilityMatrix').querySelectorAll('[data-health-capability]')[0];
await failingHealth.click();
assert.equal(failingHealth.closest().querySelector('[data-capability-health-status]').textContent,'Provider unavailable');
assert.doesNotMatch(healthFailure.elements.get('#adminCapabilityMatrix').innerHTML,/super-secret|token/i);

const saveResponses=[
  {ok:true,json:async()=>payload},
  {ok:true,json:async()=>({capability:'writing_evaluator',config:{enabled:true,provider:'openai',model:'model-2'}})},
  {ok:true,json:async()=>payload},
];
const editable=await runAdmin(saveResponses);
const saveButton=editable.elements.get('#adminCapabilityMatrix').querySelectorAll('[data-save-capability]')[0];
assert.equal(saveButton.dataset.saveCapability,'writing_evaluator');
saveButton.closest().querySelector('[data-capability-model]').value='model-2';
await saveButton.click();
await new Promise(resolve=>setTimeout(resolve,0));
assert.deepEqual(editable.calls.map(call=>call.method),['GET','GET','GET','PUT','GET']);
assert.equal(editable.calls[3].url,'/api/admin/ai/config/writing_evaluator');
assert.deepEqual(JSON.parse(editable.calls[3].body),{
  enabled:true, provider:'openai', model:'model-2', timeout_seconds:45, temperature:0.4, fallback_policy:'none',
});
assert.equal(editable.elements.get('#adminAiMessage').textContent,'Capability configuration saved. Learner runtime remains unchanged.');

const rejected=await runAdmin([
  {ok:true,json:async()=>payload},
  {ok:false,json:async()=>({detail:'token=super-secret'})},
]);
const rejectedButton=rejected.elements.get('#adminCapabilityMatrix').querySelectorAll('[data-save-capability]')[0];
await rejectedButton.click();
await new Promise(resolve=>setTimeout(resolve,0));
assert.deepEqual(rejected.calls.map(call=>call.method),['GET','GET','GET','PUT']);
assert.equal(rejected.elements.get('#adminAiMessage').textContent,'Capability configuration could not be saved.');
assert.doesNotMatch(rejected.elements.get('#adminAiMessage').textContent,/super-secret|token/i);

const refreshAfterSaveFailure=await runAdmin([
  {ok:true,json:async()=>payload},
  {ok:true,json:async()=>({capability:'writing_evaluator',config:{enabled:true,provider:'openai',model:'model-2'}})},
  {ok:false,json:async()=>({detail:'token=super-secret'})},
]);
const committedButton=refreshAfterSaveFailure.elements.get('#adminCapabilityMatrix').querySelectorAll('[data-save-capability]')[0];
await committedButton.click();
await new Promise(resolve=>setTimeout(resolve,0));
assert.deepEqual(refreshAfterSaveFailure.calls.map(call=>call.method),['GET','GET','GET','PUT','GET']);
assert.match(refreshAfterSaveFailure.elements.get('#adminCapabilityMatrix').innerHTML,/Capability matrix is unavailable/);
assert.equal(refreshAfterSaveFailure.elements.get('#adminAiMessage').textContent,'Capability configuration saved, but Admin could not refresh.');

const failed=await runAdmin({ok:false,json:async()=>({detail:'token=super-secret'})});
assert.match(failed.elements.get('#adminCapabilityMatrix').innerHTML,/Capability matrix is unavailable/);
assert.equal(failed.elements.get('#adminAiMessage').textContent,'Platform Admin failed to load.');
assert.doesNotMatch(failed.elements.get('#adminAiMessage').textContent,/super-secret|token/i);

const refresh=await runAdmin([
  {ok:true,json:async()=>payload},
  {ok:false,json:async()=>({detail:'token=super-secret'})},
]);
assert.match(refresh.elements.get('#adminCapabilityMatrix').innerHTML,/data-capability-key="writing_evaluator"/);
await refresh.elements.get('#adminRefreshModels').click();
await new Promise(resolve=>setTimeout(resolve,0));
const refreshedMatrix=refresh.elements.get('#adminCapabilityMatrix').innerHTML;
assert.match(refreshedMatrix,/Capability matrix is unavailable/);
assert.doesNotMatch(refreshedMatrix,/data-capability-key="writing_evaluator"/);
assert.equal(refresh.elements.get('#adminAiMessage').textContent,'Platform Admin failed to load.');

console.log('R13 Admin capability matrix: PASS');
