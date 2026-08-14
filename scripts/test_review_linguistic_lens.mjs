import assert from 'node:assert/strict';
import fs from 'node:fs';
import {api} from '../static/becoming/api.js';
import {state} from '../static/becoming/store.js';
import {installLinguisticLens} from '../static/becoming/screens/review.js';

const stored=new Map();
globalThis.localStorage={
  getItem:key=>stored.get(key)??null,
  setItem:(key,value)=>stored.set(key,value),
};
globalThis.document={getElementById:()=>null};

class ClassList{
  values=new Set(['hidden']);
  toggle(name,force){
    if(force)this.values.add(name);
    else this.values.delete(name);
  }
  contains(name){return this.values.has(name);}
}

class Element{
  constructor(){
    this.attributes={};
    this.classList=new ClassList();
    this.dataset={};
    this.disabled=false;
    this.innerHTML='';
    this.textContent='';
    this.listeners={};
  }
  setAttribute(name,value){this.attributes[name]=value;}
  removeAttribute(name){delete this.attributes[name];}
  addEventListener(name,listener){this.listeners[name]=listener;}
  async click(){
    if(!this.disabled)await this.listeners.click?.({});
  }
}

function root(){
  const nodes={
    '#learnerTextEvidence':new Element(),
    '#posLensToggle':new Element(),
    '#posLensStatus':new Element(),
    '#posLensLegend':new Element(),
    '#posLens':new Element(),
  };
  return {
    nodes,
    querySelector:selector=>nodes[selector]||null,
    querySelectorAll:()=>[],
  };
}

async function enabledLens(language,text,annotations){
  state.language=language;
  stored.clear();
  const view=root();
  let calls=0;
  api.linguisticAnnotations=async()=>{
    calls+=1;
    await Promise.resolve();
    return {found:true,annotations};
  };
  await installLinguisticLens(view,{
    essayId:1,
    learnerText:text,
    errors:[{fragment:annotations[0].fragment}],
    strengths:[],
  });
  assert.equal(view.nodes['#posLens'].attributes['data-state'],'off');
  assert.equal(view.nodes['#posLens'].classList.contains('active'),false);
  await Promise.all([view.nodes['#posLensToggle'].click(),view.nodes['#posLensToggle'].click()]);
  assert.equal(calls,1,'one lens lifecycle must make one linguistic API call');
  assert.match(
    view.nodes['#learnerTextEvidence'].innerHTML,
    new RegExp(`<mark class="evidence-mark error-mark"[^>]*data-feedback-key="error-0"[^>]*><span[^>]*>${annotations[0].fragment}</span></mark>`),
    'the exact evidence fragment and feedback key must survive POS rendering',
  );
  assert.match(view.nodes['#learnerTextEvidence'].innerHTML,/pos-token/);
  assert.equal(view.nodes['#posLensToggle'].attributes['aria-pressed'],'true');
  assert.equal(view.nodes['#posLens'].attributes['data-state'],'ready');
  assert.equal(view.nodes['#posLens'].classList.contains('active'),true);
  assert.equal(view.nodes['#posLensLegend'].classList.values.has('hidden'),false);
  await view.nodes['#posLensToggle'].click();
  assert.equal(view.nodes['#posLens'].attributes['data-state'],'off');
  assert.doesNotMatch(view.nodes['#learnerTextEvidence'].innerHTML,/pos-token/);
  assert.match(view.nodes['#learnerTextEvidence'].innerHTML,/error-mark/);
}

await enabledLens('en','I write clearly.',[
  {start:2,end:7,fragment:'write',pos:'verb'},
]);
await enabledLens('zh','我认真学习。',[
  {start:0,end:1,fragment:'我',pos:'pronoun'},
  {start:1,end:3,fragment:'认真',pos:'adverb'},
  {start:3,end:5,fragment:'学习',pos:'verb'},
]);

stored.clear();
state.supportLanguage='en';
const unavailable=root();
api.linguisticAnnotations=async()=>{throw new Error('offline');};
await installLinguisticLens(unavailable,{
  essayId:2,
  learnerText:'Try again.',
  errors:[],
  strengths:[],
});
await unavailable.nodes['#posLensToggle'].click();
assert.match(unavailable.nodes['#posLensStatus'].textContent,/unavailable/i);
assert.equal(unavailable.nodes['#posLensToggle'].attributes['aria-pressed'],'false');
assert.equal(unavailable.nodes['#posLens'].attributes['data-state'],'unavailable');
assert.doesNotMatch(unavailable.nodes['#learnerTextEvidence'].innerHTML,/pos-token/);

const source=fs.readFileSync(new URL('../static/becoming/screens/review.js',import.meta.url),'utf8');
const styles=fs.readFileSync(new URL('../static/becoming/phase3.css',import.meta.url),'utf8');
assert.match(source,/id="posLens" class="linguistic-lens-bar/,'Review must visibly render the lens container');
assert.match(source,/posLegend\('pos-preview'\)/,'Review must show the compact POS preview while off');
for(const group of ['noun','verb','modifier','connector','reference','number']){
  assert.match(source,new RegExp(`\\['${group}','review\\.pos_group_${group}'\\]`),`POS preview must include ${group}`);
}
assert.match(styles,/\.linguistic-lens-bar\.active\{/,'enabled lens must have a visible active treatment');
assert.match(styles,/@media\(max-width:640px\)[\s\S]*\.linguistic-lens-toggle\{[\s\S]*grid-column:1\/-1;/,'narrow layout must wrap the toggle below the preview');
assert.equal((source.match(/function installLinguisticLens/g)||[]).length,1,'EN and ZH must share one lens implementation');
assert.equal((source.match(/^  installLinguisticLens\(root,\{/gm)||[]).length,1,'Review must install the shared lens exactly once per render');

console.log('Review linguistic lens visible-contract checks passed');