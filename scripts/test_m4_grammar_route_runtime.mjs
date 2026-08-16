import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

globalThis.location={hash:'#/grammar'};
globalThis.history={replaceState(){}};
globalThis.window={dispatchEvent(){}};
globalThis.HashChangeEvent=class HashChangeEvent {};

const router=await import(new URL('../static/becoming/router.js?runtime-test=2.17.0',import.meta.url));
const release=await import(new URL('../static/becoming/domain/skill-release.js?runtime-test=2.17.0',import.meta.url));
const contract=await import(new URL('../static/becoming/domain/screen-contract.js?runtime-test=2.17.0',import.meta.url));

assert.equal(router.currentRoute(),'grammar','#/grammar must resolve to grammar, never home');
assert.equal(release.routeAvailable('grammar',[],{internal:false}),true,'Grammar must not be blocked by skill release');
assert.ok(contract.screenContract('grammar'),'Grammar screen contract must exist');

const app=readFileSync(new URL('../static/becoming/app.js',import.meta.url),'utf8');
for(const needle of [
  "./router.js?v=2.17.0",
  "./domain/screen-contract.js?v=2.17.0",
  "./domain/skill-release.js?v=2.17.0",
  "./screens/grammar.js?v=2.17.0",
]){
  assert.equal(app.includes(needle),true,`Routing-critical import is not versioned: ${needle}`);
}

const grammar=readFileSync(new URL('../static/becoming/screens/grammar.js',import.meta.url),'utf8');
assert.equal(grammar.includes("../router.js?v=2.17.0"),true,'Grammar screen must use current router module');

const backend=readFileSync(new URL('../app.py',import.meta.url),'utf8');
assert.equal(
  backend.includes('Cache-Control": "no-store, max-age=0'),
  true,
  'BECOMING assets must not permit stale mixed-version ESM'
);

console.log('M4 Grammar route runtime/cache contract: PASS');
