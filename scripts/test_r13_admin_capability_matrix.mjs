import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

class FakeElement{
  constructor(){
    this.innerHTML='';
    this.textContent='';
    this.className='';
    this.dataset={};
    this.listeners={};
    this.classList={add(){},remove(){},toggle(){}};
  }
  addEventListener(name,listener){this.listeners[name]=listener;}
  async click(){return this.listeners.click?.({currentTarget:this});}
  querySelectorAll(){return [];}
}

const elementIds=[
  'adminAiMessage','adminCurrentEngine','adminCurrentKind','adminProviderCount',
  'adminReadyCount','adminModelCount','adminProviderCards','adminModelGrid',
  'adminCapabilityMatrix','adminNav','adminRefreshModels','adminModelSearch',
];

function runAdmin(configResponses){
  const elements=new Map(elementIds.map(id=>[`#${id}`,new FakeElement()]));
  const document={
    readyState:'complete',
    querySelector:selector=>elements.get(selector)||null,
    querySelectorAll:()=>[],
    addEventListener(){},
  };
  const calls=[];
  const responses=[{ok:true,json:async()=>({is_admin:true})},
    ...(Array.isArray(configResponses)?configResponses:[configResponses])];
  const context={
    document,
    fetch:async(url,options={})=>{
      calls.push({url,method:options.method||'GET'});
      return responses.shift();
    },
    console:{error(){}},
  };
  vm.runInNewContext(fs.readFileSync('static/admin.js','utf8'),context);
  return new Promise(resolve=>setTimeout(()=>resolve({elements,calls}),0));
}

const capabilities=[
  {key:'writing_evaluator',operation:'structured_text_generation',implemented:true,provider_backed:true,configurable:true,explicit_config_exists:true,config:{enabled:true,provider:'openai',model:'model-1'}},
  {key:'writing_linguistic',operation:'deterministic',implemented:true,provider_backed:false,configurable:false,explicit_config_exists:false,config:null},
  {key:'reading_generator',operation:'structured_text_generation',implemented:true,provider_backed:true,configurable:true,explicit_config_exists:false,config:null},
  {key:'speech_asr',operation:'speech_recognition',implemented:false,provider_backed:true,configurable:false,explicit_config_exists:false,config:null},
  {key:'learner_dictionary',operation:'structured_text_generation',implemented:true,provider_backed:true,configurable:true,explicit_config_exists:true,config:{enabled:true,provider:'openai',model:'[redacted]',model_redacted:true}},
];
const payload={
  capabilities,
  providers:[
    {id:'openai',name:'OpenAI API',kind:'cloud',secret_mode:'server-managed',server_configured:true},
  ],
  learner_runtime:{mode:'legacy'},
  legacy_runtime:{role:'live-global-routing-until-R2-activation',selection_present:false},
};

const rendered=await runAdmin({ok:true,json:async()=>payload});
const matrix=rendered.elements.get('#adminCapabilityMatrix').innerHTML;
assert.match(matrix,/data-capability-key="writing_evaluator"/);
assert.match(matrix,/Configured/);
assert.match(matrix,/data-capability-key="writing_linguistic"[\s\S]*Deterministic/);
assert.match(matrix,/data-capability-key="reading_generator"[\s\S]*Not configured/);
assert.match(matrix,/data-capability-key="speech_asr"[\s\S]*Reserved/);
assert.match(matrix,/Learner runtime: <b>legacy<\/b>/);
assert.match(matrix,/\[redacted\]/);
assert.doesNotMatch(matrix,/secret|token|api_key/i);
assert.deepEqual(rendered.calls.map(call=>call.method),['GET','GET']);

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
