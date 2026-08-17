import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const css=readFileSync(
  new URL('../static/becoming/grammar.css',import.meta.url),'utf8'
);
const marker='/* ORENA Grammar Mobile Hardening — M4.3 Phase 3B';
assert.equal(css.includes(marker),true,'Phase 3B mobile CSS marker missing');

const phaseStart=css.indexOf(marker);
const nextMarker='/* ORENA Grammar Mobile Viewport Containment — M4.3 Phase 3B.1';
const phaseEnd=css.indexOf(nextMarker,phaseStart);
const phase=css.slice(phaseStart,phaseEnd>phaseStart?phaseEnd:css.length);
for(const needle of [
  '@media(max-width:640px)',
  '.main-content[data-screen-contract="grammar"]',
  '.grammar-lesson',
  '.grammar-lesson-layout',
  '.grammar-learning-shell',
  '.grammar-visual-canvas',
  '.grammar-formula-line',
  '.grammar-formula-part',
  '.grammar-sentence-flow',
  '.grammar-sentence-segment',
  '.grammar-transformation',
  '.grammar-contrast-grid',
  '.grammar-skill-transfer',
  '.grammar-mistake-row',
  '.grammar-lesson-actions',
  'grid-template-columns:minmax(0,1fr)',
  'max-width:100%',
  'min-width:0',
  'overflow:hidden',
]){
  assert.equal(phase.includes(needle),true,`Phase 3B mobile contract missing ${needle}`);
}

for(const forbidden of [
  'overflow-x:auto',
  'min-width:max-content',
  'white-space:nowrap',
]){
  assert.equal(
    phase.includes(forbidden),
    false,
    `Phase 3B core lesson contract may force horizontal layout: ${forbidden}`
  );
}

const formulaSection=phase.slice(
  phase.indexOf('.grammar-formula-line'),
  phase.indexOf('.grammar-sentence-flow')
);
assert.match(formulaSection,/display:grid/);
assert.match(formulaSection,/grid-template-columns:minmax\(0,1fr\)/);
assert.match(formulaSection,/width:100%/);
assert.match(formulaSection,/min-width:0/);

const doc=readFileSync(
  new URL('../docs/ORENA_GRAMMAR_PHASE3B_MOBILE_HARDENING.md',import.meta.url),
  'utf8'
);
for(const width of ['320','360','375','390','414','430']){
  assert.equal(doc.includes(width),true,`Missing required visual QA width ${width}px`);
}
assert.match(doc,/VISUAL RECHECK PENDING/);
assert.match(doc,/MASS MIGRATION REMAINS BLOCKED/);

console.log('M4 Grammar Phase 3B mobile layout contract: PASS');
