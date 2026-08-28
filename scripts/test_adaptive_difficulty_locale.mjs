import assert from 'node:assert/strict';
import fs from 'node:fs';
import {difficultyAdjustment} from '../static/becoming/domain/adaptive.js';
import {state} from '../static/becoming/store.js';
import {t} from '../static/becoming/domain/i18n.js';

const home=fs.readFileSync(new URL('../static/becoming/screens/home.js',import.meta.url),'utf8');
const write=fs.readFileSync(new URL('../static/becoming/screens/write.js',import.meta.url),'utf8');
const app=fs.readFileSync(new URL('../app.py',import.meta.url),'utf8');
assert.match(home,/difficultyAdjustment\(recommendation\)/);
assert.match(home,/data-practice-difficulty/);
assert.match(write,/difficultyAdjustment\(/);
assert.match(write,/data-practice-difficulty/);
assert.match(app,/outcomes=_recommendation_outcomes\(\)/);
assert.match(app,/word_target=int\(recommendation\["word_target"\]\)/);

const improving={difficulty:{state:'stretch',length_delta:30}};
const unresolved={difficulty:{state:'scaffold',length_delta:-30}};
assert.deepEqual(difficultyAdjustment(improving),{state:'stretch',delta:30,key:'write.difficulty_stretch'});
assert.deepEqual(difficultyAdjustment(unresolved),{state:'scaffold',delta:30,key:'write.difficulty_scaffold'});
assert.equal(difficultyAdjustment({difficulty:{state:'unknown',length_delta:'bad'}}).state,'insufficient');
assert.equal(difficultyAdjustment({difficulty:{state:'stretch',length_delta:'30'}}).state,'insufficient');
assert.equal(difficultyAdjustment({difficulty:null}),null);

for(const locale of ['en','vi','zh']){
  state.supportLanguage=locale;
  state.profile={native_language:'en'};
  for(const stateName of ['stretch','scaffold','hold','insufficient']){
    const copy=t(`write.difficulty_${stateName}`,{delta:30});
    assert.ok(copy&&copy.length>12,`${locale} ${stateName} rationale must be localized`);
    assert.doesNotMatch(copy,/\b(?:CEFR|HSK|TOEIC|IELTS|proficien|mastery)\b/i,
      `${locale} ${stateName} rationale must not claim proficiency`);
  }
}
console.log('R16 adaptive Writing difficulty EN/VI/ZH contract passed');
