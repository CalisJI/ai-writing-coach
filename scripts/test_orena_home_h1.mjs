/* Orena Golden Home H1 contract.
 *
 * The eight things H1 has to be able to prove (H1 brief §14):
 *
 *   1. server Continue Learning wins over the local Listening resume
 *   2. nothing on Home is fabricated - no invented progress or counts
 *   3. World availability and counts come from real content mapping
 *   4. one failing optional section does not blank Home
 *   5. Home renders in EN and ZH
 *   6. Home no longer contains Writing dashboard analytics
 *   7. product components receive semantic data, not page markup
 *   8. the 390 composition contract holds and nothing is desktop-only
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import {api} from '../static/becoming/api.js';
import {state} from '../static/becoming/store.js';
import {renderHome} from '../static/becoming/screens/home.js';
import {rememberMediaLesson} from '../static/becoming/domain/media-lesson-history.js';
import {availableWorlds, durationMinutes, homeContinuation, serverListeningContinuation} from '../static/becoming/domain/home-model.js';
import {worldCard, journeyHero, recommendationTile} from '../static/becoming/orena/product-components.js';

/* ------------------------------------------------------------ fake DOM --- */

class FakeElement{
  constructor(){this.dataset={};this.listeners={};this.classList={add(){},remove(){},toggle(){}};this.style={};}
  addEventListener(name,listener){this.listeners[name]=listener;}
  removeEventListener(){}
  async click(){return this.listeners.click?.({currentTarget:this});}
  querySelector(){return null;}
}

function homeRoot(){
  return {
    innerHTML:'',
    nodes:new Map(),
    querySelector(selector){
      if(!this.nodes.has(selector))this.nodes.set(selector,new FakeElement());
      return this.nodes.get(selector);
    },
    querySelectorAll(selector){
      const name=selector.replace(/^\[|\]$/g,'').split('=')[0];
      if(!this.innerHTML.includes(name))return [];
      const button=this.nodes.get(selector)||new FakeElement();
      this.nodes.set(selector,button);
      return [button];
    },
    insertAdjacentHTML(_position,html){this.innerHTML+=String(html||'');},
  };
}

const storage=new Map();
globalThis.localStorage={getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,String(value)),removeItem:key=>storage.delete(key)};
const session=new Map();
globalThis.sessionStorage={getItem:key=>session.get(key)??null,setItem:(key,value)=>session.set(key,String(value)),removeItem:key=>session.delete(key)};
globalThis.document={querySelector:()=>null,querySelectorAll:()=>[],addEventListener(){},removeEventListener(){},body:{classList:{add(){},remove(){}}}};
globalThis.window={dispatchEvent(){},setInterval(){return 1;},clearInterval(){}};
globalThis.location={hash:'#/home'};
globalThis.HashChangeEvent=class {};

/* ----------------------------------------------------------- fixtures --- */

const LESSON={
  lesson_id:'en-daily-pen-in-my-bag',
  title:'A pen in my bag',
  description:'A quick everyday exchange about finding a pen.',
  duration_ms:8547,
  artwork:'daily-life',
  poster_url:'',
  source:{source_url:'https://example.invalid/pen'},
};
const OTHER_LESSON={
  lesson_id:'en-travel-rainy-day-taxi',
  title:'A rainy day taxi',
  description:'Getting a taxi in the rain.',
  duration_ms:41000,
  artwork:'travel',
  poster_url:'',
  source:{source_url:'https://example.invalid/taxi'},
};

const LIBRARY={
  items:[LESSON,OTHER_LESSON],
  sections:[
    {id:'continue-learning',item_ids:['en-daily-pen-in-my-bag']},
    {id:'recommended',item_ids:['en-travel-rainy-day-taxi','en-daily-pen-in-my-bag']},
  ],
  resume:{'en-daily-pen-in-my-bag':{lesson_id:'en-daily-pen-in-my-bag',segment_id:'segment-002',presentation:'checked',checked_attempt_count:3,best_exact:false}},
};

const WORLDS={
  language:'en',
  worlds:[
    {world_id:'en-daily-life',learning_language:'en',title:{en:'Daily Life',zh:'日常生活',vi:'Đời sống'},description:{en:'Ordinary days.',zh:'平常的日子。',vi:'Ngày thường.'},artwork:'daily-life',accent_family:'listening',topics:['daily-life'],available:true,lesson_count:1,lead_lesson_id:'en-daily-pen-in-my-bag',lead_lesson_title:'A pen in my bag',lead_lesson_source_url:'https://example.invalid/pen',lead_lesson_poster_url:''},
    {world_id:'en-stories-media',learning_language:'en',title:{en:'Stories & Media',zh:'故事',vi:'Chuyện'},description:{en:'Scenes.',zh:'场景。',vi:'Cảnh.'},artwork:'stories',accent_family:'speaking',topics:['stories'],available:false,lesson_count:0,lead_lesson_id:'',lead_lesson_title:'',lead_lesson_source_url:'',lead_lesson_poster_url:''},
  ],
  available_count:1,
};

const original={...api};

function resetApis({library=LIBRARY,worlds=WORLDS}={}){
  api.dashboard=async()=>({essay_count:0,streak:0,metrics:{}});
  api.essays=async()=>[];
  api.learningMemory=async()=>({strengths:[],revision_wins:[]});
  api.practiceRecommendation=async()=>null;
  api.practiceOutcomes=async()=>({items:[],latest:null});
  api.readingSessions=async()=>({items:[]});
  api.speakingAttempts=async()=>({items:[]});
  api.crossSkillCue=async()=>null;
  api.libraryVocabulary=async()=>({items:[]});
  api.listeningLibrary=async()=>{ if(library instanceof Error)throw library; return library; };
  api.worlds=async()=>{ if(worlds instanceof Error)throw worlds; return worlds; };
}

function cleanState(language='en'){
  state.language=language;
  state.supportLanguage=language;
  state.me={id:`h1-${language}`};
  state.draft={mode:'free',topic:'random',level:'B2',length:150,prompt:'',text:'',html:'',generatedTask:null,practiceContext:null,parentEssayId:null,savedAt:null};
  storage.clear();
  session.clear();
}

try{

/* 1 — server Continue Learning wins over the local Listening resume -------- */
{
  resetApis();
  cleanState('en');
  // A local resume exists and points somewhere ELSE. The durable server signal
  // must win, because it is the one that survives a different device.
  rememberMediaLesson({learning_language:'en',source_url:'https://example.invalid/local-only',lesson_id:'en-travel-rainy-day-taxi',title:'A local-only lesson',selected_segment_id:'segment-009',mode:'shadowing'});
  const root=homeRoot();
  await renderHome(root);
  assert.match(root.innerHTML,/data-home-continue-source="server"/,
    'the durable server continuation must own the continue card');
  assert.doesNotMatch(root.innerHTML,/data-home-continue-source="local"/,
    'the local resume must not also render a competing continuation');
  assert.match(root.innerHTML,/data-journey-id="en-daily-pen-in-my-bag"/,
    'the continue card must name the lesson the server says was in progress');
  assert.doesNotMatch(root.innerHTML,/A local-only lesson/,
    'the local guess must not appear once the server has a real answer');

  // With no server progress, the local resume is still a true statement and
  // remains the fallback rather than being deleted.
  resetApis({library:{items:[],sections:[],resume:{}}});
  const fallback=homeRoot();
  await renderHome(fallback);
  assert.match(fallback.innerHTML,/data-home-continue-source="local"/,
    'without server progress the local resume is the honest fallback');

  // Model level, independent of any rendering.
  assert.equal(serverListeningContinuation(LIBRARY)?.lessonId,'en-daily-pen-in-my-bag');
  assert.equal(serverListeningContinuation({items:[],sections:[],resume:{}}),null);
  assert.equal(homeContinuation({library:null,hasWritingDraft:false}),null,
    'no data means no continuation, not an invented one');
}

/* 2 — nothing fabricated -------------------------------------------------- */
{
  resetApis();
  cleanState('en');
  const root=homeRoot();
  await renderHome(root);

  /* The continuation is the one place a fake "62%" would be most tempting. The
     resume contract carries a lesson and a segment, so the card carries a
     lesson and a segment. The listening-goal meter elsewhere on the page is a
     different thing: the learner set that goal and the minutes are recorded. */
  const continueCard=root.innerHTML.slice(
    root.innerHTML.indexOf('data-oc-component="continue-journey"'),
    root.innerHTML.indexOf('</article>'));
  assert.ok(continueCard.length>0,'the continuation card should be present for this fixture');
  assert.doesNotMatch(continueCard,/%/,
    'the continuation must not claim a completion percentage: no contract supplies one');
  assert.doesNotMatch(continueCard,/oc-meter/,
    'the continuation must not render a progress meter it cannot fill truthfully');
  assert.doesNotMatch(root.innerHTML,/Episode \d+/i,
    'Home must not invent episode numbers');
  assert.doesNotMatch(root.innerHTML,/\[object Object\]|undefined|NaN/,
    'Home must never render a malformed value');

  // A lesson with no real duration gets no duration, not a plausible zero.
  assert.equal(durationMinutes({duration_ms:0}),null);
  assert.equal(durationMinutes({}),null);
  resetApis({library:{items:[{...LESSON,duration_ms:0}],sections:[{id:'recommended',item_ids:[LESSON.lesson_id]}],resume:{}}});
  const noDuration=homeRoot();
  await renderHome(noDuration);
  const card=noDuration.innerHTML.slice(
    noDuration.innerHTML.indexOf('data-oc-component="discovery-card"'),
    noDuration.innerHTML.indexOf('data-oc-component="discovery-card"')+1200);
  assert.doesNotMatch(card,/min</,'an unknown duration renders no duration at all');

  // A resume record whose lesson is not in the payload is not renderable.
  assert.equal(serverListeningContinuation({items:[],sections:[{id:'continue-learning',item_ids:['ghost']}],resume:{ghost:{segment_id:'s1'}}}),null,
    'a continue id with no matching item must not become a card');
}

/* 3 — world availability and counts come from real content mapping --------- */
{
  const worlds=availableWorlds(WORLDS,{locale:'en'});
  assert.equal(worlds.length,1,'only worlds the server measured as available are shown');
  assert.equal(worlds[0].worldId,'en-daily-life');
  assert.equal(worlds[0].lessonCount,1,'the count is the measured one');
  assert.equal(worlds[0].leadLessonId,'en-daily-pen-in-my-bag');
  assert.deepEqual(
    availableWorlds({worlds:[{world_id:'x',available:true,lesson_count:0,title:{en:'X'},description:{en:''}}]},{locale:'en'}),
    [],
    'available with a zero count is a contradiction and must render nothing');

  resetApis();
  cleanState('en');
  const root=homeRoot();
  await renderHome(root);
  assert.match(root.innerHTML,/data-world-id="en-daily-life"/,'the available world renders');
  assert.doesNotMatch(root.innerHTML,/data-world-id="en-stories-media"/,
    'an editorial world with no real lesson must not be offered');
  assert.match(root.innerHTML,/data-world-lesson="en-daily-pen-in-my-bag"/,
    'entering a world must hand off to a real lesson');
}

/* 4 — one failing section does not blank Home ------------------------------ */
{
  for(const failure of ['worlds','listening','both']){
    resetApis({
      worlds:failure==='listening'?WORLDS:new Error('worlds down'),
      library:failure==='worlds'?LIBRARY:new Error('library down'),
    });
    cleanState('en');
    // A real local draft must survive every remote failure.
    state.draft={...state.draft,html:'<p>Real unsaved work.</p>'};
    const root=homeRoot();
    await renderHome(root);
    assert.match(root.innerHTML,/data-oc-component="journey-hero"/,
      `${failure}: the hero must survive`);
    if(failure==='worlds'){
      // The listening library answered, so its durable progress rightly owns
      // the continuation; what matters is that Worlds failing changed nothing.
      assert.match(root.innerHTML,/data-home-continue-source="server"/,
        `${failure}: a Worlds failure must not disturb the real continuation`);
    }else{
      assert.match(root.innerHTML,/data-home-continue-source="draft"/,
        `${failure}: a real writing draft must survive a network failure`);
    }
    assert.match(root.innerHTML,/data-oc-section="for-you"/,
      `${failure}: For You must still render`);
    assert.match(root.innerHTML,/data-home-library-review-state=/,
      `${failure}: the Challenge section must still render`);
    if(failure!=='worlds'){
      assert.match(root.innerHTML,/data-oc-section="worlds"/,
        `${failure}: a failed Worlds section keeps its own scoped state`);
    }
  }
}

/* 5 — EN and ZH both render ------------------------------------------------ */
{
  for(const language of ['en','zh']){
    resetApis();
    cleanState(language);
    const root=homeRoot();
    await renderHome(root);
    assert.match(root.innerHTML,/data-oc-component="journey-hero"/,`${language} hero renders`);
    assert.match(root.innerHTML,/data-oc-section="worlds"/,`${language} worlds render`);
    assert.match(root.innerHTML,/data-oc-section="continue-exploring"/,`${language} discovery renders`);
    assert.doesNotMatch(root.innerHTML,/\[object Object\]|undefined/,`${language} renders no malformed value`);
    if(language==='zh'){
      // CJK gets its own typography class rather than Latin display tricks.
      assert.match(root.innerHTML,/class="oc-hero-title cjk"/,'ZH hero uses CJK typography');
    }
  }
}

/* 6 — Home is not a dashboard --------------------------------------------- */
{
  resetApis();
  cleanState('en');
  const root=homeRoot();
  await renderHome(root);
  for(const forbidden of [
    /class="writing-dashboard/,
    /o-stages/,
    /home\.latest_score|Latest score/,
    /Insight of the day/,
    /Recent drafts/,
    /skill radar|Weekly chart|Monthly trend/i,
  ]){
    assert.doesNotMatch(root.innerHTML,forbidden,`Home must not contain ${forbidden}`);
  }
  const source=fs.readFileSync(new URL('../static/becoming/screens/home.js',import.meta.url),'utf8');
  assert.doesNotMatch(source,/metricOverview|writingDashboardMarkup|streakCard/,
    'the dashboard renderers must be gone from Home, not merely hidden');
}

/* 7 — product components take semantic data -------------------------------- */
{
  // No component accepts a layout decision, and none emits one.
  const world=worldCard({worldId:'w',title:'T',description:'D',artwork:'a',accentFamily:'listening',countLabel:'1 lesson',variant:'featured'});
  const hero=journeyHero({title:'T',supportingText:'S',primaryAction:{id:'homePrimary',label:'Go'}});
  const tile=recommendationTile({contentKind:'k',title:'T',subtitle:'S',actionLabel:'Go',actionAttributes:{'data-x':'1'}});
  for(const [name,markup] of [['worldCard',world],['journeyHero',hero],['recommendationTile',tile]]){
    assert.doesNotMatch(markup,/style="[^"]*(?:width|grid-template|column|flex-basis)/,
      `${name} must not emit layout decisions; composition belongs to CSS`);
    assert.doesNotMatch(markup,/\d+px/,`${name} must not emit pixel values`);
  }
  // A component escapes what it is given rather than trusting a fragment.
  assert.doesNotMatch(worldCard({worldId:'w',title:'<img src=x onerror=1>'}),/<img src=x/,
    'semantic text props must be escaped');
  // Attribute pass-through only accepts data attributes.
  assert.doesNotMatch(recommendationTile({title:'T',attributes:{onclick:'alert(1)'}}),/onclick/,
    'only data-* attributes may pass through a component');
  // The backend contract carries no layout keys.
  const worldKeys=Object.keys(WORLDS.worlds[0]);
  for(const key of worldKeys){
    assert.doesNotMatch(key,/column|width|pixel|span|layout/i,
      `the world contract must stay semantic, found ${key}`);
  }
}

/* 8 — 390 composition, and nothing desktop-only ---------------------------- */
{
  resetApis();
  cleanState('en');
  const root=homeRoot();
  await renderHome(root);
  // Source order IS the mobile order: the narrow layout is the stacked default
  // and wider viewports opt into simultaneous visibility.
  const order=['journey-hero','continue-journey','data-oc-section="worlds"','data-oc-section="for-you"','data-oc-section="challenge"','data-oc-section="continue-exploring"'];
  let cursor=-1;
  for(const marker of order){
    const at=root.innerHTML.indexOf(marker);
    assert.ok(at>cursor,`390 order broken at ${marker}`);
    cursor=at;
  }
  const css=fs.readFileSync(new URL('../static/becoming/orena/product-components.css',import.meta.url),'utf8');
  assert.match(css,/@media \(max-width:639px\)/,'a deliberate mobile composition must exist');
  assert.match(css,/--oc-touch-min:44px/,'touch targets must meet the 44px minimum');
  assert.match(css,/overflow-x:auto/,'wide rails must scroll inside themselves, not the page');
  assert.match(css,/@media \(prefers-reduced-motion:reduce\)/,'reduced motion must be honoured');
  assert.match(css,/@media \(hover:hover\)/,'hover affordances must not be required on touch');
  // The v2 namespace must not leak onto screens that have not migrated.
  const leaked=css.split('\n').filter(line=>/^[.#a-zA-Z\[]/.test(line)&&!line.includes('[data-orena-ui="v2"]')&&!line.startsWith('@')&&!line.startsWith('html[data-theme'));
  assert.deepEqual(leaked,[],`every v2 rule must stay inside the namespace, found: ${leaked.join(' | ')}`);
}

console.log('Orena Golden Home H1 contract: PASS');
}finally{
  Object.assign(api,original);
}
