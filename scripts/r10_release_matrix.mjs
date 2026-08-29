import assert from 'node:assert/strict';
import {existsSync,readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {spawnSync} from 'node:child_process';

const cliArgs=process.argv.slice(2);
const outputIndex=cliArgs.indexOf('--output');
const output=outputIndex>=0?cliArgs[outputIndex+1]:null;
const projectArg=cliArgs.find((arg,index)=>index!==outputIndex&&index!==outputIndex+1&&!arg.startsWith('--'));
const root=resolve(projectArg||'.');
const read=path=>readFileSync(resolve(root,path),'utf8');
const verified=[];
const inspected=[];
const canonicalReport=resolve(root,'docs/project/R10_PRE_PUBLIC_MATRIX.json');
const deferred=[
  {gate:'provider_credentials',status:'deferred',reason:'Credentialed Reading generation and contextual-dictionary validation remain human-gated.'},
  {gate:'production_mutation',status:'deferred',reason:'Production Reading migration, data mutation, and runtime activation remain outside this local checkpoint.'},
  {gate:'public_promotion',status:'deferred',reason:'Public Reading promotion requires explicit human approval after the local matrix review.'},
];

function runNode(script,args=[]){
  const result=spawnSync(process.execPath,[resolve(root,script),...args],{cwd:root,encoding:'utf8'});
  assert.equal(result.status,0,`${script} failed:\n${result.stdout||''}\n${result.stderr||''}`);
  verified.push({check:script,status:'pass',scope:'behavioral'});
}

for(const path of [
  'scripts/test_r10_reading_flow.mjs',
  'scripts/test_r16_reading_contextual_dictionary.mjs',
  'scripts/test_r16_contextual_dictionary.mjs',
])assert.ok(existsSync(resolve(root,path)),`missing R10 matrix contract: ${path}`);

runNode('scripts/test_r10_reading_flow.mjs');
runNode('scripts/test_r16_reading_contextual_dictionary.mjs');
runNode('scripts/test_r16_contextual_dictionary.mjs');

const readingService=read('writing_coach/becoming_reading.py');
const readingRoute=read('app.py');
const readingScreen=read('static/becoming/screens/reading.js');
const readingApi=read('static/becoming/api.js');
for(const [label,text,needles] of [
  ['Reading session and evidence service',readingService,['class ReadingGenerateIn','class ReadingAnswerIn','create_reading_session','submit_reading_answers','evidence_fragment','comprehension_check_only']],
  ['Authenticated Reading route boundary',readingRoute,['@app.get("/api/reading/sessions"','@app.post("/api/reading/session"','@app.post("/api/reading/session/{session_id}/answer"','list_reading_sessions','create_reading_session','submit_reading_answers']],
  ['Mounted Reading and Library handoff',readingScreen,['api.libraryVocabulary()','api.saveLibraryVocabulary','data-reading-save','data-reading-contextual-state','state.readingSession']],
  ['Reading API client helpers',readingApi,['readingSessions:','createReadingSession:','submitReadingAnswers:','libraryVocabulary:','saveLibraryVocabulary:']],
]){
  for(const needle of needles)assert.ok(text.includes(needle),`${label} missing ${needle}`);
  inspected.push({check:label,status:'static-inspection',scope:'source-boundary'});
}
assert.doesNotMatch(readingService,/mastery|proficiency/i,'Reading service must not claim mastery or proficiency');
inspected.push({check:'Non-mastery Reading result boundary',status:'static-inspection',scope:'source-boundary'});

const report={
  schema_version:1,
  matrix:'R10-pre-public-en-zh-reading',
  verified,
  inspected,
  deferred,
  release:{reading_public:false,provider_activation:false,production_mutation:false},
};
const serialized=JSON.stringify(report,null,2)+'\n';
if(output)writeFileSync(resolve(root,output),serialized,'utf8');
else{
  assert.ok(existsSync(canonicalReport),`missing canonical matrix report: ${canonicalReport}`);
  assert.equal(readFileSync(canonicalReport,'utf8'),serialized,'canonical R10 matrix report is stale; regenerate with --output and review the diff');
}
console.log(JSON.stringify(report,null,2));
