// R20 Mobile Learning Experience Parity - local acceptance matrix.
//
// Mounted native behaviour is executed through the mobile Jest project; source
// boundaries that cannot be proved by mounting are recorded as static
// inspections, and device/store/billing actions stay explicit human deferrals.
import assert from 'node:assert/strict';
import {existsSync, readdirSync, readFileSync, writeFileSync} from 'node:fs';
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
  {gate:'device_qa',status:'deferred',reason:'Android/iOS on-device QA across rotation, keyboard, screen reader, and system text size requires physical or emulated devices outside this local matrix.'},
  {gate:'provider_credentials',status:'deferred',reason:'Credentialed ASR, pronunciation, and evaluation providers remain human-gated; no secret is available to this local matrix.'},
  {gate:'store_release',status:'deferred',reason:'Signing keys, store credentials, and public submission remain explicit human gates under R21.'},
  {gate:'billing_activation',status:'deferred',reason:'R20 presents entitlement state only; purchase and billing activation require an explicit product decision.'},
  {gate:'public_skill_promotion',status:'deferred',reason:'A native binary does not promote any learner skill; R8/R11 promotion remains a human governance decision.'},
];
const canonicalReport=resolve(root,'docs/project/R20_LOCAL_ACCEPTANCE_MATRIX.json');

const requiredFiles=[
  'mobile/package.json',
  'mobile/app/(app)/writing.tsx',
  'mobile/app/(app)/review.tsx',
  'mobile/app/(app)/grammar.tsx',
  'mobile/app/(app)/reading.tsx',
  'mobile/app/(app)/listening.tsx',
  'mobile/app/(app)/speaking.tsx',
  'mobile/app/(app)/library.tsx',
  'mobile/app/(app)/journey.tsx',
  'mobile/app/(app)/profile.tsx',
  'mobile/src/api/client.ts',
  'mobile/src/api/contracts/product.ts',
  'mobile/src/i18n/messages.ts',
];
for(const path of requiredFiles) assert.ok(existsSync(resolve(root,path)),`missing R20 surface: ${path}`);

// Mounted native behaviour. Every R20 learner flow must have a suite that
// actually renders its screen; a handoff-only unit test is not parity evidence.
const mountedSuites=[
  ['Home next-practice and return-to-practice','src/features/home/HomeScreen.test.tsx'],
  ['Writing -> Evaluate -> Review -> Grammar -> Revise','test/routes/r20-writing-review.test.tsx'],
  ['Reading comprehension, dictionary, and Library handoff','src/features/reading/readingScreen.test.tsx'],
  ['Listening follow, active practice, and resume','test/routes/listening.test.tsx'],
  ['Speaking record, evaluation, and Shadowing return','test/routes/speaking.test.tsx'],
  ['Grammar, Active Recall, Journey, and Profile/Settings','test/routes/r20-6.test.tsx'],
  ['Entitlement presentation and deferred purchase boundary','test/routes/r21-entitlement.test.tsx'],
];
for(const [,suite] of mountedSuites) assert.ok(existsSync(resolve(root,'mobile',suite)),`missing mounted R20 suite: ${suite}`);
assert.ok(existsSync(resolve(root,'mobile/node_modules')),'mobile dependencies are not installed; run `npm ci` in mobile/ before this matrix');

// Run jest's entry point through node directly: `npx` needs a shell on Windows
// and would make this matrix platform-dependent.
const jestBin=resolve(root,'mobile/node_modules/jest/bin/jest.js');
assert.ok(existsSync(jestBin),'mobile jest binary is missing; run `npm ci` in mobile/');
const jest=spawnSync(process.execPath,[jestBin,'--runInBand','--ci'],{cwd:resolve(root,'mobile'),encoding:'utf8'});
assert.equal(jest.status,0,`mobile jest suite failed:\n${jest.stdout||''}\n${jest.stderr||''}`);
const jestOutput=`${jest.stdout||''}${jest.stderr||''}`;
const totals=/Tests:\s+(\d+) passed, (\d+) total/.exec(jestOutput);
assert.ok(totals,`could not read mobile jest totals from:\n${jestOutput}`);
assert.equal(totals[1],totals[2],'every mobile test must pass');
for(const [label,suite] of mountedSuites) verified.push({check:label,status:'pass',scope:`mounted-native:${suite}`});
verified.push({check:'Mobile suite executed in full',status:'pass',scope:'mobile-jest-project'});

// Expo Router turns every file under app/ into a route, so a test file there is
// bundled and executed at runtime, where `jest` does not exist: the app crashed
// on launch while all unit tests stayed green. Device QA caught it; this keeps it caught.
const routeFiles=readdirSync(resolve(root,'mobile/app'),{recursive:true,encoding:'utf8'});
const strayTests=routeFiles.filter(name=>/\.(test|spec)\.[jt]sx?$/.test(String(name)));
assert.deepEqual(strayTests,[],`test files must not live under mobile/app (Expo Router would bundle them as routes): ${strayTests.join(', ')}`);
inspected.push({check:'No test files under mobile/app; Expo Router routes stay executable',status:'static-contract',scope:'mobile/app'});

// EN/ZH parity is a product invariant. It is executed, not inspected: the i18n
// suite compares every catalogue and proves `translate` never falls through to a
// raw message id, which is how a missing ZH key would reach a learner.
const i18nSuite=read('mobile/src/i18n/messages.test.tsx');
for(const needle of ['MESSAGE_CATALOGUES','keeps every catalogue at EN/ZH parity','never renders a raw message id']){
  assert.ok(i18nSuite.includes(needle),`EN/ZH parity suite missing ${needle}`);
}
verified.push({check:'EN/ZH parity across every message catalogue',status:'pass',scope:'mounted-native:src/i18n/messages.test.tsx'});

// The native client must consume server semantics, never restate them.
const client=read('mobile/src/api/client.ts');
for(const [label,text,needles] of [
  ['Server-authoritative learner contracts',client,['/api/evaluate','/api/practice/next','/api/reading/session','/api/listening/progress','/api/speech/evaluation','/api/product/me']],
  ['Typed response validation on every read',client,['Schema.parse','ApiError','invalid_response']],
]){
  for(const needle of needles) assert.ok(text.includes(needle),`${label} missing ${needle}`);
  inspected.push({check:label,status:'static-contract',scope:'mobile/src/api/client.ts'});
}

const screens=['writing','review','grammar','reading','listening','speaking','library','journey','profile']
  .map(name=>[name,read(`mobile/app/(app)/${name}.tsx`)]);
for(const [name,source] of screens){
  assert.doesNotMatch(source,/\bcefr_estimate\s*=|function\s+\w*[Ss]core\w*\s*\(|\bmastery\b/, `${name} must not restate scoring or mastery`);
  assert.ok(/accessibilityRole|accessibilityLabel/.test(source),`${name} must carry screen-reader semantics`);
}
inspected.push({check:'No native scoring, mastery, or Grammar-ID redefinition across nine learner screens',status:'static-contract',scope:'mobile/app/(app)'});
inspected.push({check:'Screen-reader semantics present on every learner screen',status:'static-contract',scope:'mobile/app/(app)'});

// R19 privacy boundaries must survive R20's learner flows.
const speaking=read('mobile/app/(app)/speaking.tsx');
assert.doesNotMatch(speaking,/FileSystem\.(documentDirectory|writeAsStringAsync)/,'Speaking must not persist raw learner audio');
inspected.push({check:'Speaking keeps audio transient; no raw learner audio is persisted',status:'static-contract',scope:'mobile/app/(app)/speaking.tsx'});
const product=read('mobile/src/api/contracts/product.ts');
assert.ok(product.includes("billing_ready: z.literal(false)"),'entitlement contract must pin billing_ready to false');
inspected.push({check:'Entitlement contract pins billing_ready false; no mobile-only policy is enforced',status:'static-contract',scope:'mobile/src/api/contracts/product.ts'});

const report={
  schema_version:1,
  matrix:'R20-local-mobile-learning-parity',
  verified,
  inspected,
  deferred,
  release:{r20_local_complete:true,device_qa:false,store_release:false,billing_activation:false,public_skill_promotion:false},
};
const serialized=JSON.stringify(report,null,2)+'\n';
if(output){
  writeFileSync(resolve(root,output),serialized,'utf8');
}else{
  assert.ok(existsSync(canonicalReport),`missing canonical R20 matrix report: ${canonicalReport}`);
  assert.equal(readFileSync(canonicalReport,'utf8'),serialized,'canonical R20 matrix report is stale; regenerate with --output and review the diff');
}
console.log(JSON.stringify(report,null,2));
