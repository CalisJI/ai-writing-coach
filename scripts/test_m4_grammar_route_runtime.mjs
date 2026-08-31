import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
// Read the frontend version instead of hard-coding it. Pinning the literal
// string made this test break on every release -- the same defect that left 35
// validators permanently red (see scripts/archive/release-gates/README.md).
// The contract is that these imports ARE versioned, not which version it is.
const V=readFileSync(new URL('../BECOMING_FRONTEND_VERSION',import.meta.url),'utf-8').trim();

globalThis.location={hash:'#/grammar'};
globalThis.history={replaceState(){}};
globalThis.window={dispatchEvent(){}};
globalThis.HashChangeEvent=class HashChangeEvent {};

const router=await import(new URL(`../static/becoming/router.js?runtime-test=${V}`,import.meta.url));
const release=await import(new URL(`../static/becoming/domain/skill-release.js?runtime-test=${V}`,import.meta.url));
const contract=await import(new URL(`../static/becoming/domain/screen-contract.js?runtime-test=${V}`,import.meta.url));

assert.equal(router.currentRoute(),'grammar','#/grammar must resolve to grammar, never home');
assert.equal(release.routeAvailable('grammar',[],{internal:false}),true,'Grammar must not be blocked by skill release');
assert.ok(contract.screenContract('grammar'),'Grammar screen contract must exist');

const app=readFileSync(new URL('../static/becoming/app.js',import.meta.url),'utf8');
for(const needle of [
  `./router.js?v=${V}`,
  `./domain/screen-contract.js?v=${V}`,
  `./domain/skill-release.js?v=${V}`,
  `./screens/grammar.js?v=${V}`,
]){
  assert.equal(app.includes(needle),true,`Routing-critical import is not versioned: ${needle}`);
}

const grammar=readFileSync(new URL('../static/becoming/screens/grammar.js',import.meta.url),'utf8');
assert.equal(grammar.includes(`../router.js?v=${V}`),true,'Grammar screen must use current router module');

const backend=readFileSync(new URL('../app.py',import.meta.url),'utf8');
assert.equal(
  backend.includes('Cache-Control": "no-store, max-age=0'),
  true,
  'BECOMING assets must not permit stale mixed-version ESM'
);

console.log('M4 Grammar route runtime/cache contract: PASS');
