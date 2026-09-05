import assert from 'node:assert/strict';
import {contentFor,importedContent,EXPLORE_LANGUAGES} from '../static/becoming/domain/explore-content.js';
import {createExploreSession} from '../static/becoming/domain/explore-session.js';
import {exploreCopy} from '../static/becoming/domain/explore-copy.js';
import {routeAvailable} from '../static/becoming/domain/skill-release.js';

const records=new Map();
const storage={getItem:key=>records.get(key)||null,setItem:(key,value)=>records.set(key,value)};
let checks=0;
for(const language of EXPLORE_LANGUAGES){
  const catalog=contentFor(language);
  assert.equal(catalog.length,3);
  assert.equal(new Set(catalog.map(x=>x.id)).size,catalog.length);
  for(const item of catalog){
    assert.equal(item.origin,'generated');
    assert.ok(item.prompt && item.question && item.thought);
    for(const note of item.phrases){
      assert.ok(item.paragraphs[note.paragraph].includes(note.word),`${language}: ${note.word} must occur in its claimed context`);
      assert.ok(note.definition && note.example);
    }
  }
  const session=createExploreSession(storage,'learner-a',language);
  assert.deepEqual(session.value,{saved:[],imports:[],responses:{},last:null});
  session.enter(catalog[0].id);session.toggle(catalog[0].id);session.respond(catalog[0].id,`Response in ${language}`);
  const imported=importedContent({id:`import-${language}`,title:'My text',text:'First paragraph.\n\nSecond paragraph.',language});
  session.add(imported);
  assert.equal(imported.origin,'imported');
  assert.equal(imported.paragraphs.length,2);
  const restored=createExploreSession(storage,'learner-a',language);
  assert.deepEqual(restored.value,session.value);
  assert.equal(createExploreSession(storage,'learner-b',language).value.last,null);
  restored.toggle(catalog[0].id);
  assert.deepEqual(restored.value.saved,[]);
  assert.equal(restored.value.imports[0].origin,'imported');
  assert.throws(()=>importedContent({id:'bad',language,title:'',text:'x'}));
  assert.throws(()=>importedContent({id:'bad',language,title:'x',text:'x'.repeat(12001)}));
  checks+=12;
}
assert.notEqual(createExploreSession(storage,'learner-a','en').value.responses['last-train'],createExploreSession(storage,'learner-a','zh').value.responses['last-train']);
const denied=createExploreSession({getItem(){throw Error('blocked');},setItem(){throw Error('quota');}},'a','en');
assert.equal(denied.available,false);
assert.equal(denied.respond('last-train','Still here'),false);
assert.equal(denied.value.responses['last-train'],'Still here');
const malformed=createExploreSession({getItem:()=>'{broken',setItem(){}},'a','en');
assert.equal(malformed.value.last,null);
for(const locale of ['zh','vi'])assert.deepEqual(Object.keys(exploreCopy[locale]).sort(),Object.keys(exploreCopy.en).sort());
assert.equal(routeAvailable('explore',[],{internal:true}),true);
assert.equal(routeAvailable('explore',[],{internal:false}),false);
assert.equal(routeAvailable('write',[],{internal:false}),false);
assert.deepEqual(contentFor('unsupported'),[]);
console.log(`Orena exploration: PASS (${checks+11} catalog, origin, context, import, continuity, isolation, failure, locale, and release-boundary checks)`);
