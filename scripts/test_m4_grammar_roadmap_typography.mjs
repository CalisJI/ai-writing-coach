import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const css=readFileSync(
  new URL('../static/becoming/grammar.css',import.meta.url),'utf8'
);

const marker='/* ORENA Grammar Roadmap Typography — M4.3 Phase 3B.2';
assert.equal(css.includes(marker),true,'Phase 3B.2 roadmap marker missing');

const phase=css.slice(css.indexOf(marker));
for(const needle of [
  '.grammar-level-rail',
  '.grammar-level-pill',
  '.grammar-level-pill>strong',
  '.grammar-level-pill>span',
  'font-variant-numeric:tabular-nums',
  'white-space:nowrap',
  'scroll-snap-type:x proximity',
  'grid-auto-columns:108px',
  'overflow-x:auto',
]){
  assert.equal(phase.includes(needle),true,`Roadmap typography missing ${needle}`);
}

assert.equal(
  phase.includes('word-break:break-all'),
  false,
  'Roadmap level/progress text must not break into characters'
);

assert.equal(
  phase.includes('.grammar-level-rail'),
  true,
  'Roadmap navigation rail missing'
);
assert.equal(
  phase.includes('overflow-x:auto'),
  true,
  'Roadmap navigation-only horizontal scroll must remain intentional'
);

const lessonSelectors=[
  '.grammar-formula-line',
  '.grammar-sentence-flow',
  '.grammar-transformation',
  '.grammar-common-mistake',
  '.grammar-exception',
  '.grammar-skill-transfer',
];
for(const selector of lessonSelectors){
  assert.equal(
    phase.includes(selector),
    false,
    'Roadmap Phase 3B.2 must not redefine core lesson selector '+selector
  );
}
// navigation-only horizontal scroll
console.log('M4 Grammar Phase 3B.2 roadmap typography: PASS');
