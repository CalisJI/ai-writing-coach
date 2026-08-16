import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const css=readFileSync(
  new URL('../static/becoming/grammar.css',import.meta.url),'utf8'
);
const marker='/* ORENA Grammar Mobile Viewport Containment — M4.3 Phase 3B.1';
assert.equal(css.includes(marker),true,'Phase 3B.1 marker missing');

const phase=css.slice(css.indexOf(marker));
for(const needle of [
  '@media(max-width:640px)',
  'body:has(.main-content[data-screen-contract="grammar"])',
  '.app-shell',
  '.app-workspace',
  '.main-content[data-screen-contract="grammar"]',
  'width:100%',
  'min-width:0',
  'max-width:100%',
  'max-width:100vw',
  'overflow-x:hidden',
  'contain:inline-size',
  'overflow-wrap:anywhere',
  'white-space:normal',
]){
  assert.equal(phase.includes(needle),true,`Viewport containment missing ${needle}`);
}

for(const forbidden of [
  'overflow-x:auto',
  'min-width:max-content',
]){
  assert.equal(
    phase.includes(forbidden),
    false,
    `Viewport containment reintroduced horizontal dependency: ${forbidden}`
  );
}

console.log('M4 Grammar Phase 3B.1 mobile viewport containment: PASS');
