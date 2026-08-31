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
  {gate:'provider_credentials',status:'deferred',reason:'Credentialed provider validation remains human-gated; no secret is available to this local matrix.'},
  {gate:'billing_or_quota_enforcement',status:'deferred',reason:'R14 observes cost and quota evidence only; billing and enforcement require an explicit product decision.'},
  {gate:'learner_runtime_activation',status:'deferred',reason:'Capability configuration and health checks must not activate learner runtime without explicit human approval.'},
  {gate:'production_postgresql_observation',status:'deferred',reason:'Production persistence observation remains a human-gated operation outside this local checkpoint.'},
];
const canonicalReport=resolve(root,'docs/project/R14_LOCAL_ACCEPTANCE_MATRIX.json');

function runNode(script,args=[]){
  const result=spawnSync(process.execPath,[resolve(root,script),...args],{cwd:root,encoding:'utf8'});
  assert.equal(result.status,0,`${script} failed:\n${result.stdout||''}\n${result.stderr||''}`);
  verified.push({check:script,status:'pass',scope:'mounted-behavior'});
}

const requiredFiles=[
  'scripts/test_r13_admin_capability_matrix.mjs',
  'tests/test_ai_telemetry.py',
  'tests/test_ai_control_plane.py',
  'writing_coach/ai/base.py',
  'writing_coach/ai/platform.py',
  'writing_coach/ai/control_plane.py',
  'writing_coach/ai/pricing.py',
  'writing_coach/persistence/platform_repository.py',
  'static/admin.js',
];
for(const path of requiredFiles) assert.ok(existsSync(resolve(root,path)),`missing R14 contract: ${path}`);

runNode('scripts/test_r13_admin_capability_matrix.mjs');

const telemetry=read('writing_coach/ai/base.py');
const platform=read('writing_coach/ai/platform.py');
const controlPlane=read('writing_coach/ai/control_plane.py');
const pricing=read('writing_coach/ai/pricing.py');
const repository=read('writing_coach/persistence/platform_repository.py');
const admin=read('static/admin.js');
const telemetryTests=read('tests/test_ai_telemetry.py');
const controlPlaneTests=read('tests/test_ai_control_plane.py');
for(const [label,text,needles] of [
  ['Sanitized telemetry contract',telemetry,['def sanitize_telemetry','normalized_usage','normalized_rate_limit','quota_available']],
  ['Learner/provider operation capture',platform,['def generate_structured','_persist_operation_telemetry','origin": "learner"','estimate_token_cost']],
  ['Bounded operations aggregation',controlPlane,['def operations','_operation_health','trend_window_days','quota_state','cost_state_counts']],
  ['Exact-match cost observation',pricing,['PRICING_CATALOG_VERSION','def estimate_token_cost','model_not_cataloged','usage_out_of_range']],
  ['PostgreSQL audit persistence boundary',repository,['record_ai_operation','AuditLog','action="ai.operation"','list_ai_operation_events','SQLite is frozen archive']],
  ['Read-only Admin operations view',admin,['fetchOperations','/api/admin/ai/operations','adminRefreshOperations','Provider probes are never automatic']],
  ['Telemetry runtime and safety tests',telemetryTests,['test_success_telemetry_keeps_capability_provider_model_and_reported_usage','test_admin_operations_aggregates_cost_by_catalog_and_trend','test_operations_health_states_use_explicit_evidence_thresholds']],
  ['Control-plane API and provider tests',controlPlaneTests,['test_operations_endpoint_is_read_only_and_aggregates_without_provider_probe','test_openai_structured_response_captures_allowlisted_rate_limit_headers','test_live_test_failure_taxonomy_is_distinct_and_sanitized']],
]){
  for(const needle of needles) assert.ok(text.includes(needle),`${label} missing ${needle}`);
  inspected.push({check:label,status:'static-contract',scope:'source-and-test-boundary'});
}
assert.doesNotMatch(admin,/fetch\([^)]*data-health-capability|runCapabilityHealth\([^)]*initializeAdmin/i,'health checks must remain explicit, not automatic');
assert.doesNotMatch(admin,/data-use-provider|data-test-provider/,'legacy whole-platform mutation controls must stay absent');
inspected.push({check:'No automatic probes, learner routing, billing, or failover',status:'static-contract',scope:'Admin and runtime boundaries'});

const report={
  schema_version:1,
  matrix:'R14-local-ai-operations-foundation',
  verified,
  inspected,
  deferred,
  release:{r14_local_complete:true,learner_runtime_activation:false,production_mutation:false,billing_enforcement:false},
};
const serialized=JSON.stringify(report,null,2)+'\n';
if(output) writeFileSync(resolve(root,output),serialized,'utf8');
else{
  assert.ok(existsSync(canonicalReport),`missing canonical R14 matrix report: ${canonicalReport}`);
  assert.equal(readFileSync(canonicalReport,'utf8'),serialized,'canonical R14 matrix report is stale; regenerate with --output and review the diff');
}
console.log(JSON.stringify(report,null,2));
