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
const canonicalReport=resolve(root,'docs/project/R11_PRE_PUBLIC_MATRIX.json');
const deferred=[
  {gate:'postgres_migration',status:'deferred',reason:'The additive migration is prepared and generated offline; production migration execution remains human-gated.'},
  {gate:'capability_activation',status:'deferred',reason:'Listening capability activation remains outside this local checkpoint and requires explicit human approval.'},
  {gate:'public_promotion',status:'deferred',reason:'Public Listening promotion requires explicit human approval after the local matrix review.'},
];

function runNode(script,args=[]){
  const nodeArgs=script.includes('validate_browser_esm_graph')?['--experimental-vm-modules']:[];
  const result=spawnSync(process.execPath,[...nodeArgs,resolve(root,script),...args],{cwd:root,encoding:'utf8'});
  assert.equal(result.status,0,`${script} failed:\n${result.stdout||''}\n${result.stderr||''}`);
  verified.push({check:script,status:'pass',scope:'behavioral'});
}

for(const path of [
  'scripts/test_r11_listening_progress.mjs',
  'scripts/test_r9_shadowing_feedback.mjs',
  'scripts/test_r9_shadowing_speaking_flow.mjs',
  'scripts/test_listening_player_lifecycle_contract.mjs',
  'scripts/test_active_listening.mjs',
])assert.ok(existsSync(resolve(root,path)),`missing R11 matrix contract: ${path}`);

runNode('scripts/test_r11_listening_progress.mjs');
runNode('scripts/test_r9_shadowing_feedback.mjs');
runNode('scripts/test_r9_shadowing_speaking_flow.mjs');
runNode('scripts/test_listening_player_lifecycle_contract.mjs');
runNode('scripts/test_active_listening.mjs');
runNode('scripts/validate_browser_esm_graph.mjs',[root]);

const listeningApi=read('writing_coach/listening_api.py');
const repository=read('writing_coach/persistence/specialized_repository.py');
const models=read('writing_coach/persistence/models.py');
const migration=read('migrations/versions/20260828_0004_shadowing_progress.py');
const listening=read('static/becoming/screens/listening.js');
const api=read('static/becoming/api.js');
for(const [label,text,needles] of [
  ['Listening API boundary',listeningApi,['/progress','/shadowing-progress','ListeningProgressIn','ShadowingProgressIn','configure_listening_progress']],
  ['PostgreSQL-only durable repository',repository,['class SQLiteSpecializedLearningRepository','Durable Active Listening progress requires the PostgreSQL runtime.','Durable Shadowing progress requires the PostgreSQL runtime.','save_shadowing_progress_record','list_shadowing_progress_records']],
  ['Separate Shadowing persistence model',models,['class ListeningProgress','class ShadowingProgress','uq_shadowing_progress_scope_segment']],
  ['Additive Shadowing migration',migration,['revision = "20260828_0004"','down_revision = "20260828_0003"','shadowing_progress']],
  ['Mounted Listening persistence wiring',listening,['loadListeningProgress','saveListeningProgress','loadShadowingProgress','saveShadowingProgress','restorePracticeProgress','restoreShadowingProgress','data-listening-persistence-state','data-shadowing-persistence-state']],
  ['Listening API client helpers',api,['listeningProgress:','saveListeningProgress:','shadowingProgress:','saveShadowingProgress:']],
]){
  for(const needle of needles)assert.ok(text.includes(needle),`${label} missing ${needle}`);
  inspected.push({check:label,status:'static-inspection',scope:'source-boundary'});
}
assert.doesNotMatch(listeningApi,/raw_audio|audio_blob|proficiency|mastery_claim/i,'Listening progress API must remain audio-free and claim-free');
inspected.push({check:'Audio-free, non-proficiency Listening payload boundary',status:'static-inspection',scope:'source-boundary'});

const report={
  schema_version:1,
  matrix:'R11-pre-public-en-zh-listening',
  verified,
  inspected,
  deferred,
  release:{listening_public:false,capability_activation:false},
};
const serialized=JSON.stringify(report,null,2)+'\n';
if(output)writeFileSync(resolve(root,output),serialized,'utf8');
else{
  assert.ok(existsSync(canonicalReport),`missing canonical matrix report: ${canonicalReport}`);
  assert.equal(readFileSync(canonicalReport,'utf8'),serialized,'canonical R11 matrix report is stale; regenerate with --output and review the diff');
}
console.log(JSON.stringify(report,null,2));
