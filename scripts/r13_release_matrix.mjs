import assert from 'node:assert/strict';
import {existsSync, readFileSync, writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {spawnSync} from 'node:child_process';

const args=process.argv.slice(2);
const outputIndex=args.indexOf('--output');
const output=outputIndex>=0 ? args[outputIndex+1] : null;
const projectArg=args.find((arg,index)=>index!==outputIndex && index!==outputIndex+1 && !arg.startsWith('--'));
const root=resolve(projectArg||'.');
const read=path=>readFileSync(resolve(root,path),'utf8');
const verified=[];
const inspected=[];
const deferred=[
  {gate:'credentialed_provider_health',status:'deferred',reason:'Credentialed provider health validation remains human-gated; no secret is available to this local matrix.'},
  {gate:'learner_runtime_activation',status:'deferred',reason:'Saved capability configuration must not activate learner runtime without explicit human approval.'},
];
const canonicalReport=resolve(root,'docs/project/R13_LOCAL_ACCEPTANCE_MATRIX.json');

function runNode(script,args=[]){
  const result=spawnSync(process.execPath,[resolve(root,script),...args],{cwd:root,encoding:'utf8'});
  assert.equal(result.status,0,`${script} failed:\n${result.stdout||''}\n${result.stderr||''}`);
  verified.push({check:script,status:'pass',scope:'mounted-behavior'});
}

runNode('scripts/test_r13_admin_capability_matrix.mjs');

const requiredFiles=[
  'writing_coach/ai/platform.py',
  'writing_coach/ai/control_plane.py',
  'static/admin.js',
  'templates/index.html',
  'tests/test_ai_control_plane.py',
];
for(const path of requiredFiles) assert.ok(existsSync(resolve(root,path)),`missing R13 contract: ${path}`);

const platform=read('writing_coach/ai/platform.py');
const controlPlane=read('writing_coach/ai/control_plane.py');
const admin=read('static/admin.js');
const template=read('templates/index.html');
const backendTests=read('tests/test_ai_control_plane.py');
for(const [label,text,needles] of [
  ['Canonical capability API',platform,['@router.get("/config")','@router.put("/config/{capability_key}")','@router.post("/test/{capability_key}")','CapabilityConfigIn']],
  ['Offline inspection/provenance',controlPlane,['def inspect(', 'config_provenance', 'updated_by_present', 'safe_model_display']],
  ['Mounted Admin controls and health',admin,['data-save-capability','data-health-capability','/api/admin/ai/config/','/api/admin/ai/test/','Learner runtime remains unchanged.']],
  ['Admin scoped configuration surface',template,['id="adminCapabilityMatrix"','Scoped saved configuration per capability','SCOPED CONFIG']],
  ['Backend API contract coverage',backendTests,['test_get_is_capability_centric_network_free_and_secret_safe','test_capability_put_updates_one_row_offline_without_legacy_or_network','test_capability_put_rejects_nonconfigurable_or_invalid_static_contracts','test_live_test_failure_taxonomy_is_distinct_and_sanitized']],
]){
  for(const needle of needles) assert.ok(text.includes(needle),`${label} missing ${needle}`);
  inspected.push({check:label,status:'static-contract',scope:'source-and-test-boundary'});
}

assert.doesNotMatch(admin,/fetch\([^)]*data-health-capability|runCapabilityHealth\([^)]*initializeAdmin/i,'health checks must remain explicit, not automatic');
assert.match(admin,/method:'PUT'/,'capability save must use PUT');
assert.match(admin,/method:'POST'/,'health check must use POST');
assert.doesNotMatch(admin,/data-use-provider|data-test-provider/,'legacy whole-platform mutation controls must stay absent');
inspected.push({check:'No automatic probes, runtime activation, or legacy global controls',status:'static-contract',scope:'Admin wiring'});

const report={
  schema_version:1,
  matrix:'R13-local-admin-acceptance',
  verified,
  inspected,
  deferred,
  release:{r13_local_complete:true,learner_runtime_activation:false,production_mutation:false},
};
const serialized=JSON.stringify(report,null,2)+'\n';
if(output){
  writeFileSync(resolve(root,output),serialized,'utf8');
}else{
  assert.ok(existsSync(canonicalReport),`missing canonical R13 matrix report: ${canonicalReport}`);
  assert.equal(readFileSync(canonicalReport,'utf8'),serialized,'canonical R13 matrix report is stale; regenerate with --output and review the diff');
}
console.log(JSON.stringify(report,null,2));
