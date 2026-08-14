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
  await Promise.all([view.nodes['#posLensToggle'].click(),view.nodes['#posLensToggle'].click()]);
  assert.equal(calls,1,'one Review load must make one linguistic API call');
  assert.match(view.nodes['#learnerTextEvidence'].innerHTML,/error-mark/);
  assert.match(view.nodes['#learnerTextEvidence'].innerHTML,/pos-token/);
  assert.equal(view.nodes['#posLensToggle'].attributes['aria-pressed'],'true');
  assert.equal(view.nodes['#posLensLegend'].classList.values.has('hidden'),false);
  await view.nodes['#posLensToggle'].click();
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
assert.doesNotMatch(unavailable.nodes['#learnerTextEvidence'].innerHTML,/pos-token/);

const source=fs.readFileSync(new URL('../static/becoming/screens/review.js',import.meta.url),'utf8');
assert.match(source,/id="posLensToggle"/,'Review must visibly render the lens control');
assert.equal((source.match(/function installLinguisticLens/g)||[]).length,1,'EN and ZH must share one lens implementation');

console.log('Review linguistic lens checks passed: 9');