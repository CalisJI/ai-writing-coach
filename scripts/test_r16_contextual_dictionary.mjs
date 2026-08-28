import assert from 'node:assert/strict';
import fs from 'node:fs';
import {contextualResultMarkup} from '../static/becoming/components/dictionary.js';
import {state} from '../static/becoming/store.js';
import {t} from '../static/becoming/domain/i18n.js';

const api=fs.readFileSync(new URL('../static/becoming/api.js',import.meta.url),'utf8');
const dictionary=fs.readFileSync(new URL('../static/becoming/components/dictionary.js',import.meta.url),'utf8');
const write=fs.readFileSync(new URL('../static/becoming/screens/write.js',import.meta.url),'utf8');
const review=fs.readFileSync(new URL('../static/becoming/screens/review.js',import.meta.url),'utf8');
const listening=fs.readFileSync(new URL('../static/becoming/screens/listening.js',import.meta.url),'utf8');
const i18n=fs.readFileSync(new URL('../static/becoming/domain/i18n.js',import.meta.url),'utf8');
const backend=fs.readFileSync(new URL('../writing_coach/media_interaction.py',import.meta.url),'utf8');
const app=fs.readFileSync(new URL('../app.py',import.meta.url),'utf8');

assert.match(api,/contextualDictionary:\(payload\)=>request\('\/api\/dictionary\/contextual'/);
assert.match(dictionary,/groundedContext/);
assert.match(dictionary,/api\.contextualDictionary\(/);
assert.match(dictionary,/contextual_dictionary_unavailable/);
assert.match(dictionary,/state\.supportLanguage\|\|state\.profile\?\.native_language/);
assert.match(write,/context: editor\.innerText \|\| state\.draft\.text/);
assert.match(review,/context:learnerText/);
assert.match(listening,/data-contextual-lookup/);
assert.match(listening,/openDictionary\(context/);
assert.match(backend,/class ContextualDictionaryIn/);
assert.match(backend,/Selected text must come from the supplied learner context/);
assert.match(backend,/contextual_dictionary_unavailable/);
assert.match(backend,/if not str\(result\.get\("summary"\)/);
assert.match(app,/app\.include_router\(contextual_dictionary_router\)/);
for(const key of ['dictionary.context_lookup','dictionary.context_unavailable'])assert.ok(i18n.includes("'"+key+"'"),key+' must be localized');

const contextualPayload={
  available:true,
  selected_text:'I usually walk to school.',
  summary:'A repeated weekday habit.',
  natural_translation:'Tôi thường đi bộ.',
  grammar_notes:['usually marks a repeated habit'],
  vocabulary:[],
  usage_note:'Use this meaning for the supplied sentence only.',
  claim:'contextual_dictionary',
};
for(const locale of ['en','zh']){
  state.supportLanguage=locale;
  state.profile={native_language:'en'};
  const markup=contextualResultMarkup(contextualPayload);
  assert.match(markup,/I usually walk to school\./,`${locale} contextual result must retain selected evidence`);
  assert.match(markup,/A repeated weekday habit\./,`${locale} contextual result must render grounded explanation`);
  assert.doesNotMatch(markup,/\b(?:CEFR|HSK|proficient|intermediate)\b/i,`${locale} contextual result must not claim proficiency`);
  const unavailableMarkup=contextualResultMarkup({available:false,selected_text:'I usually walk to school.'});
  assert.match(unavailableMarkup,/I usually walk to school\./,`${locale} unavailable result must retain selected evidence`);
  assert.match(unavailableMarkup,new RegExp(t('dictionary.context_unavailable')));
}
console.log('R16 contextual dictionary contract passed');
