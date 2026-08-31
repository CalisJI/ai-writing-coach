/* Hanzi stroke-order practice in the Chinese learner dictionary.
 *
 * The rule this holds is UPGRADE_REGRESSION_RULES.md §33: stroke order may only
 * be shown when verified stroke data exists. That makes three things worth
 * pinning, and none of them is a screenshot:
 *
 *   - the data really is vendored, with its licence, and the provider reads it
 *     rather than asking a model;
 *   - the frontend gets its strokes from that provider through the shared API
 *     wrapper, never from a CDN or an AI call;
 *   - the whole surface stays inside the shared dictionary component, so
 *     Writing, Review and Library keep one implementation between them
 *     (UPGRADE_REGRESSION_RULES.md §32).
 */
import assert from 'node:assert/strict';
import {readFileSync,existsSync,statSync} from 'node:fs';

const url=path=>new URL(path,import.meta.url);
const read=path=>readFileSync(url(path),'utf8');

/* ---- the data is present, intact and licensed --------------------------- */

const dataDir='../writing_coach/languages/chinese/stroke_data/';
for(const file of ['hanzi_strokes.pack','hanzi_strokes.index.json','ARPHICPL.TXT','README.md']){
  assert.ok(existsSync(url(dataDir+file)),`vendored stroke data must include ${file}`);
}

/* The Arphic Public License permits redistribution only while ARPHICPL.TXT
   travels unaltered with the data (§1), and a reformatted copy must say how and
   when it was changed (§2a). */
const licence=read(dataDir+'ARPHICPL.TXT');
assert.ok(licence.includes('ARPHIC PUBLIC LICENSE'),'the licence file must be the real one');
const provenance=read(dataDir+'README.md');
assert.ok(/Arphic Public License/.test(provenance),'provenance must name the licence');
assert.ok(/Make Me a Hanzi/.test(provenance),'provenance must name the upstream project');
assert.ok(/Modification notice/i.test(provenance),'§2a modification notice is missing');

const index=JSON.parse(read(dataDir+'hanzi_strokes.index.json'));
assert.equal(index.format,'orena.hanzi-strokes.v1','index format changed without the reader');
assert.ok(index.count>9000,`stroke pack covers only ${index.count} characters`);
assert.equal(Object.keys(index.offsets).length,index.count,'index count and offsets disagree');
assert.ok(typeof index.pack_sha256==='string'&&index.pack_sha256.length===64,
  'the index must carry a digest of the pack it describes');

/* Every offset has to land inside the pack, or a lookup serves another
   character's bytes rather than failing. */
const packBytes=statSync(url(dataDir+'hanzi_strokes.pack')).size;
for(const [character,[offset,length]] of Object.entries(index.offsets)){
  assert.ok(offset>=0&&offset+length<=packBytes,`offset for ${character} falls outside the pack`);
}

/* ---- the provider is deterministic ------------------------------------- */

const provider=read('../writing_coach/languages/chinese/stroke_order.py');
for(const forbidden of ['ai_json','generate_structured','requests.','http://','https://']){
  assert.ok(!provider.includes(forbidden),
    `stroke order must not reach for ${forbidden}; it is vendored data, not a provider call`);
}
assert.ok(provider.includes('def stroke_order_for'),'stroke_order_for must exist');
assert.ok(provider.includes('unavailable'),
  'a character with no data must be reported, not approximated');

const app=read('../app.py');
assert.ok(app.includes('@app.get("/api/chinese/stroke-order")'),'the stroke-order route is missing');
assert.ok(app.includes('stroke_data_unavailable'),
  'missing stroke data must answer with the canonical error envelope');

/* ---- the frontend reads the app, not the internet ----------------------- */

const api=read('../static/becoming/api.js');
assert.ok(api.includes("request(`/api/chinese/stroke-order?word="),
  'stroke order must go through the shared API wrapper');

const component=read('../static/becoming/components/hanzi-stroke.js');
assert.ok(component.includes('api.chineseStrokeOrder'),
  'the component must fetch through api.js');
for(const forbidden of ['cdn.jsdelivr.net','unpkg.com','fetch(','/api/chat','OLLAMA_URL']){
  assert.ok(!component.includes(forbidden),
    `the stroke component must not reach ${forbidden}`);
}

/* The renderer is vendored, so the feature does not depend on a CDN being
   reachable, and it is imported lazily so an English learner never pays for it. */
assert.ok(existsSync(url('../static/becoming/vendor/hanzi-writer/index.js')),
  'hanzi-writer must be vendored');
assert.ok(existsSync(url('../static/becoming/vendor/hanzi-writer/LICENSE.hanzi-writer')),
  'hanzi-writer must ship its MIT licence');
assert.ok(/import\('\.\.\/vendor\/hanzi-writer\/index\.js'\)/.test(component),
  'the renderer must be imported lazily');

/* The step diagram is built from the payload rather than by the renderer, so
   the learner still gets the numbered stroke order if the vendor module fails
   to load. */
assert.ok(component.includes('function stepMarkup'),'the step diagram must be built here');
assert.ok(/hanzi-step-current/.test(component)&&/hanzi-step-past/.test(component),
  'each step must distinguish the stroke it adds from the ones already written');

/* Practice is real tracing, not a static grid. */
assert.ok(/instance\.quiz\(/.test(component),'the learner must be able to write the character');
assert.ok(/onMistake/.test(component)&&/onCorrectStroke/.test(component),
  'tracing must tell the learner which stroke went wrong');

/* ---- a word never traps the learner inside it --------------------------- */

/* Chinese subtitles are segmented into words, so a tap opens the whole word.
   The per-character breakdown the backend already returns is the way back out
   to a single character -- and it must not cost another provider call. */
const dictionary=read('../static/becoming/components/dictionary.js');
assert.ok(dictionary.includes('function characterChips'),
  'a Chinese entry must offer its characters individually');
assert.ok(dictionary.includes('payload.characters'),
  'the character chips must reuse the breakdown the dictionary payload already carries');
assert.ok(dictionary.includes('data-dict-char'),
  'each character must be its own control');
assert.ok(/openDictionary\(chip\.dataset\.dictChar/.test(dictionary),
  'tapping a character must open that character on its own');
assert.ok(!/api\.(translate|explain)/.test(dictionary),
  'the breakdown must not trigger a second AI call');

assert.ok(app.includes('"characters"'),
  'the Chinese dictionary contract must keep returning the per-character breakdown');

/* A dialog taller than the window has to be reachable. `overflow:hidden` on the
   runtime dialog class silently made the bottom of every long entry - the
   writing practice included - impossible to scroll to on a phone. */
const consistency=read('../static/becoming/consistency-v212.css');
const dialogRule=consistency.slice(consistency.indexOf('.bc12-dialog{'));
const dialogBody=dialogRule.slice(0,dialogRule.indexOf('}'));
assert.ok(!/overflow\s*:\s*hidden/.test(dialogBody),
  'the dialog must not clip its own scrollable content');
assert.ok(/overflow-y\s*:\s*auto/.test(dialogBody),
  'the dialog must scroll on the block axis');

/* ---- one dictionary surface, not one per screen ------------------------- */

assert.ok(dictionary.includes("from './hanzi-stroke.js'"),
  'the shared dictionary component owns the writing surface');
assert.ok(dictionary.includes('mountHanziStroke'),'openDictionary must mount the section');
assert.ok(dictionary.includes('export function mountDictionaryResult'),
  'one mount entry point finishes the rendered card');
/* Importing a screen module must not touch the DOM: the contract tests load
   these under Node, where there is no document. */
const importTime=dictionary.slice(0,dictionary.indexOf('export function mountDictionaryResult'));
assert.ok(!/^document\.addEventListener/m.test(importTime),
  'dictionary.js must not bind to document at import time');
assert.ok(dictionary.includes("language==='zh'"),
  'the writing surface stays gated to Chinese');

const library=read('../static/becoming/screens/library.js');
assert.ok(library.includes('mountDictionaryResult'),
  'Library renders the dictionary card itself, so it must mount it too');

/* Every string the component shows exists in all three interface languages.
   Keys reach `t()` indirectly through `setStatus`, so this collects every copy
   key the file mentions rather than only the direct calls. */
const i18n=read('../static/becoming/domain/i18n.js');
const keys=new Set([...component.matchAll(/'((?:hanzi|dictionary|busy|chrome)\.[a-z_]+)'/g)]
  .map(match=>match[1]));
assert.ok(keys.size>18,`the component should be reading its copy from i18n (found ${keys.size})`);
for(const key of keys){
  const occurrences=i18n.split(`'${key}':`).length-1;
  assert.equal(occurrences,3,`${key} must be translated for en, vi and zh (found ${occurrences})`);
}

/* The old note promised stroke order only once a verified source existed. One
   exists now, so the copy must say where it comes from -- and must still not
   claim to judge handwriting. */
assert.ok(/Make Me a Hanzi/.test(i18n),'the learner-facing note must name the data source');

console.log('Orena Hanzi stroke-order contract OK');
