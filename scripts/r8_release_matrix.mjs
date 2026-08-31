import assert from 'node:assert/strict';
import {existsSync, readFileSync, writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {spawnSync} from 'node:child_process';

const root=resolve(process.argv[2]||'.');
const outputIndex=process.argv.indexOf('--output');
const output=outputIndex>=0?process.argv[outputIndex+1]:null;
const read=path=>readFileSync(resolve(root,path),'utf8');
const verified=[];
const inspected=[];
const canonicalReport=resolve(root,'docs/project/R8_PRE_PUBLIC_MATRIX.json');
const deferred=[
  {gate:'provider_credentials',status:'deferred',reason:'Credentialed provider validation remains human-gated; no secret is available to this local matrix.'},
  {gate:'postgres_migration',status:'deferred',reason:'Alembic SQL is generated offline; production migration execution remains human-gated.'},
  {gate:'public_promotion',status:'deferred',reason:'Writing/Speaking public release promotion requires explicit human approval.'},
];

function runNode(script,args=[]){
  const nodeArgs=script.includes('validate_browser_esm_graph')?['--experimental-vm-modules']:[];
  const result=spawnSync(process.execPath,[...nodeArgs,resolve(root,script),...args],{cwd:root,encoding:'utf8'});
  assert.equal(result.status,0,`${script} failed:\n${result.stdout||''}\n${result.stderr||''}`);
  verified.push({check:script,status:'pass'});
}

for(const path of [
  'scripts/test_writing_evaluation_flow.mjs',
  'scripts/test_speaking_evaluation.mjs',
  'scripts/test_speaking_ui.mjs',
])assert.ok(existsSync(resolve(root,path)),`missing matrix contract: ${path}`);

runNode('scripts/test_writing_evaluation_flow.mjs');
runNode('scripts/test_review_summary.mjs');
runNode('scripts/test_speaking_evaluation.mjs');
runNode('scripts/test_speaking_ui.mjs');
runNode('scripts/validate_browser_esm_graph.mjs', [root]);

const speechApi=read('writing_coach/speech_api.py');
const app=read('app.py');
const speaking=read('static/becoming/screens/speaking.js');
const writing=read('static/becoming/screens/write.js');
const review=read('static/becoming/screens/review.js');
for(const [label,text,needles] of [
  ['speaking persistence API',speechApi,['/attempts','current_language_code','SpeakingAttemptIn','speaking_attempt_invalid']],
  ['PostgreSQL-only runtime wiring',app,['backend == "postgresql"','configure_speaking_attempt_repository']],
  ['Speaking history UI',speaking,['saveSpeakingAttempt','speakingAttempts','data-speaking-history','notMeasured']],
  ['Writing evaluation flow',writing,['api.evaluate','api.practiceOutcome']],
  ['Review evidence flow',review,['reviewSummaryText','data-review-evaluation-state']],
]){
  for(const needle of needles)assert.ok(text.includes(needle),`${label} missing ${needle}`);
  inspected.push({check:label,status:'static-inspection'});
}

const report={schema_version:1,matrix:'R8-pre-public-en-zh',verified,inspected,deferred,release:{writing_public:false,speaking_public:false,capability_activation:false}};
const serialized=JSON.stringify(report,null,2)+'\n';
if(output){writeFileSync(resolve(root,output),serialized,'utf8');}
else {
  assert.ok(existsSync(canonicalReport),`missing canonical matrix report: ${canonicalReport}`);
  assert.equal(readFileSync(canonicalReport,'utf8'),serialized,'canonical R8 matrix report is stale; regenerate with --output and review the diff');
}
console.log(JSON.stringify(report,null,2));
