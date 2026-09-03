/* Orena Home — migrated to the Orena Product UI System (H1).
 *
 * Home's job is motivation, discovery and real continuation. It is not a
 * dashboard, and the analytics that used to live here - the Writing cycle, the
 * latest score, learning-memory cards, the streak block, recent drafts - have
 * been removed from this screen. None of that data was deleted: Journey and
 * Review still read `/api/dashboard` and `/api/learning-memory`, and Home still
 * fetches the dashboard for one reason only, which is that the global chrome's
 * streak cue reads `state.dashboard`.
 *
 * Composition recipe: Hero + Mosaic + Rail (ORENA_COMPONENT_CONTRACT §8).
 *
 *   JourneyHero -> Continue -> Explore Worlds -> For You Today
 *   -> Challenge -> Continue Exploring
 *
 * Two rules run through the whole file.
 *
 * Nothing is invented. Every card is backed by a real record; a section with no
 * data says so rather than showing a plausible number. There is deliberately no
 * completion percentage on the continuation card: the D-049 resume contract
 * carries a lesson and a segment, not a ratio.
 *
 * Every section fails alone. Worlds, the listening library, recommendations and
 * the vocabulary library are fetched independently, and a failure in any of
 * them degrades that one section. Losing the network must not erase a real
 * writing draft or a real resume point.
 */

import {api} from '../api.js';
import {state,saveDraft} from '../store.js';
import {go} from '../router.js';
import {requestLessonAutostart,resumableLesson} from '../domain/media-lesson-history.js';
import {listeningHabitSnapshot} from '../domain/listening-habit.js';
import {selectSharedMediaSegment,getSharedMediaSession} from '../domain/shared-media-session.js';
import {difficultyAdjustment} from '../domain/adaptive.js';
import {crossSkillCueMarkup} from '../domain/cross-skill.js';
import {attr,esc,errorBlock,loadingBlock,runBusy} from '../components/primitives.js';
import {t,categoryLabel,statusLabel,uiLocale} from '../domain/i18n.js';
import {
  availableWorlds,
  discoveryItems,
  durationMinutes,
  homeContinuation,
} from '../domain/home-model.js';
import {
  challengeCard,
  continueJourneyCard,
  discoveryCard,
  discoveryRail,
  journeyHero,
  productSection,
  recommendationRail,
  recommendationTile,
  worldCard,
  worldRail,
} from '../orena/product-components.js';

const isCjk=()=>state.language==='zh'||uiLocale()==='zh';

/* An optional data source. Home renders whatever succeeded, so a rejection is
   a section state rather than a page state. */
async function optional(load){
  try{ return await load(); }
  catch{ return null; }
}

function greeting(){
  const hour=new Date().getHours();
  const key=hour<12?'home.greet_morning':hour<18?'home.greet_afternoon':'home.greet_evening';
  const name=String(state.me?.name||'').trim().split(/\s+/)[0]||'';
  return name?`${t(key)}, ${name}.`:`${t(key)}.`;
}

function hasLocalWritingDraft(draft=state.draft){
  if(!draft||typeof draft!=='object')return false;
  const text=value=>typeof value==='string'&&value.trim()!=='';
  return text(draft.text)||text(draft.html)||text(draft.prompt)
    ||Boolean(draft.generatedTask&&typeof draft.generatedTask==='object'&&!Array.isArray(draft.generatedTask));
}

/* ===================================================== validated records == */

const PRACTICE_OUTCOME_STATUSES=new Set(['improved','partial','regressed','unchanged']);

/* A practice outcome is only shown when every field it renders is well formed.
   A malformed record produces nothing at all - never "[object Object]" and
   never a half-claim about the learner's revision. */
function normalizedPracticeOutcome(outcome){
  if(!outcome||typeof outcome!=='object'||Array.isArray(outcome))return null;
  const status=typeof outcome.status==='string'?outcome.status.trim().toLowerCase():'';
  if(!PRACTICE_OUTCOME_STATUSES.has(status))return null;
  const numberValue=value=>{
    if(typeof value==='number'&&Number.isFinite(value))return value;
    if(typeof value==='string'&&value.trim()!==''){
      const parsed=Number(value);
      if(Number.isFinite(parsed))return parsed;
    }
    return null;
  };
  const issueCount=numberValue(outcome.issue_count);
  const revisionNo=numberValue(outcome.revision_no);
  const essayId=numberValue(outcome.essay_id);
  if(
    issueCount===null||!Number.isInteger(issueCount)||issueCount<0
    ||revisionNo===null||!Number.isInteger(revisionNo)||revisionNo<1
  )return null;
  let previous=null;
  if(outcome.previous_issue_count!=null){
    previous=numberValue(outcome.previous_issue_count);
    if(previous===null||!Number.isInteger(previous)||previous<0)return null;
  }
  return {
    ...outcome,
    status,
    focus_label:typeof outcome.focus_label==='string'?outcome.focus_label.trim():'',
    previous_issue_count:previous,
    issue_count:issueCount,
    revision_no:revisionNo,
    essay_id:essayId!==null&&Number.isInteger(essayId)&&essayId>0?essayId:null,
    error_evidence:Array.isArray(outcome.error_evidence)
      ?outcome.error_evidence.filter(item=>typeof item==='string'&&item.trim()).map(item=>item.trim().slice(0,260)).slice(0,3)
      :[],
  };
}

const REVIEW_CUE_STATUSES=new Set(['recurring','new','watch','still_working','needs_attention']);
function normalizedReviewCue(value){
  if(!value||typeof value!=='object'||Array.isArray(value))return null;
  const available=value.available===true;
  const cueState=typeof value.state==='string'?value.state.trim().toLowerCase():'';
  const source=typeof value.source==='string'?value.source.trim().toLowerCase():'';
  const status=typeof value.status==='string'?value.status.trim().toLowerCase():'';
  const evidence=typeof value.evidence==='string'?value.evidence.trim().slice(0,260):'';
  const essayId=typeof value.essay_id==='number'&&Number.isInteger(value.essay_id)&&value.essay_id>0?value.essay_id:null;
  if(!available||!['recurring','unresolved'].includes(cueState)||!['error_memory','practice_outcome'].includes(source)
    ||!REVIEW_CUE_STATUSES.has(status)||!evidence)return null;
  return {...value,available:true,state:cueState,source,status,evidence,essay_id:essayId,
    category:typeof value.category==='string'?value.category.trim():'',
    suggestion:typeof value.suggestion==='string'?value.suggestion.trim().slice(0,320):''};
}

function dueLibraryReview(payload){
  const items=Array.isArray(payload)
    ?payload
    :payload&&typeof payload==='object'&&!Array.isArray(payload)&&Array.isArray(payload.items)
      ?payload.items:[];
  return items
    .map((item,index)=>{
      if(!item||typeof item!=='object'||Array.isArray(item)||item.due!==true||typeof item.word!=='string')return null;
      const word=item.word.trim();
      const next=typeof item.next_review_at==='string'?item.next_review_at.trim():'';
      const timestamp=next?Date.parse(next):NaN;
      if(!word||!next||!Number.isFinite(timestamp))return null;
      return {word,next,timestamp,index};
    })
    .filter(Boolean)
    .sort((a,b)=>a.timestamp-b.timestamp||a.index-b.index)[0]||null;
}

function readingReturnEvidence(history){
  const items=Array.isArray(history)?history:(Array.isArray(history?.items)?history.items:[]);
  return items.find(item=>item&&Number.isInteger(Number(item.id))&&item.latest_attempt==null)||null;
}

function speakingReturnEvidence(history,session){
  const items=Array.isArray(history)?history:(Array.isArray(history?.items)?history.items:[]);
  const assetId=session?.payload?.asset?.asset_id;
  const segments=Array.isArray(session?.payload?.transcript?.segments)
    ?session.payload.transcript.segments
      .map(segment=>segment?.segment_id)
      .filter(value=>typeof value==='string'&&value)
    :[];
  if(assetId==null||segments.length===0)return null;
  return items.find(item=>item&&String(item.asset_id)===String(assetId)
    &&item.segment_id!=null&&segments.includes(String(item.segment_id)))||null;
}

/* The single most useful next practice, chosen from real evidence in a fixed
   order. Unchanged from R12: this is a stable learner contract, and only its
   presentation has moved into a product component. */
function nextPracticePlan({recommendation,readingHistory,speakingHistory,listeningResume}){
  if(hasLocalWritingDraft())return {kind:'writing-draft'};
  if(recommendation&&recommendation.intent!=='baseline')return {kind:'writing'};
  const reading=readingReturnEvidence(readingHistory);
  if(reading)return {kind:'reading',sessionId:reading.id};
  if(listeningResume)return {kind:'listening',lesson:listeningResume};
  const speakingSession=getSharedMediaSession(state.language);
  const speaking=speakingReturnEvidence(speakingHistory,speakingSession);
  if(speaking)return {kind:'speaking',segmentId:String(speaking.segment_id)};
  if(recommendation?.intent==='baseline')return {kind:'baseline'};
  return null;
}

/* ============================================================ For You ===== */

function practiceDifficultyMarkup(recommendation){
  const difficulty=difficultyAdjustment(recommendation);
  return difficulty
    ?`<p class="oc-meta" data-practice-difficulty>${esc(t(difficulty.key,{delta:difficulty.delta}))}</p>`
    :'';
}

function nextPlanTile(plan,recommendation){
  const kind=plan?.kind||'empty';
  if(kind==='empty'){
    return recommendationTile({
      contentKind:'next-plan',
      reason:t('home.next_plan_title'),
      title:t('home.next_plan_empty'),
      accentFamily:'writing',
      cjk:isCjk(),
      attributes:{'data-home-next-plan':'','data-plan-kind':'empty'},
    });
  }
  return recommendationTile({
    contentKind:'next-plan',
    reason:t('home.next_plan_title'),
    title:t(`home.next_plan_${kind}_title`),
    subtitle:t(`home.next_plan_${kind}_body`),
    bodyHtml:practiceDifficultyMarkup(recommendation),
    accentFamily:kind==='listening'?'listening':kind==='reading'?'reading':kind==='speaking'?'speaking':'writing',
    cjk:isCjk(),
    actionLabel:t('home.next_plan_action'),
    actionAttributes:{'data-home-next-plan-action':''},
    attributes:{'data-home-next-plan':'','data-plan-kind':kind},
  });
}

/* The Grammar handoff carried by the latest practice outcome. Evidence and
   parent-essay lineage travel on the button exactly as before, so Write still
   receives the sentence the learner actually got wrong. */
function practiceOutcomeTile(rawOutcome){
  const outcome=normalizedPracticeOutcome(rawOutcome);
  if(!outcome)return '';
  const key=outcome.status;
  const grammarId=typeof outcome.grammar_id==='string'?outcome.grammar_id.trim():'';
  const secondary=[
    grammarId?`<button type="button" class="oc-link" data-home-open-grammar="${attr(grammarId)}">${esc(t('review.open_grammar'))}</button>`:'',
    outcome.essay_id!==null?`<button type="button" class="oc-link" data-home-open-review="${attr(outcome.essay_id)}">${esc(t('home.open_review'))}</button>`:'',
  ].join('');
  return recommendationTile({
    contentKind:'practice-outcome',
    contentId:grammarId,
    reason:t('home.h1_reason_grammar'),
    title:t(`outcome.${key}.title`),
    subtitle:t(`outcome.${key}.body`,{
      previous:outcome.previous_issue_count??'—',
      count:outcome.issue_count??0,
      focus:outcome.focus_label||t('common.current_focus'),
    }),
    meta:`${outcome.focus_label||t('common.current_focus')} · ${t('outcome.revision')} ${outcome.revision_no||1}`,
    accentFamily:'grammar',
    cjk:isCjk(),
    actionLabel:grammarId?t('review.practice_grammar'):'',
    actionAttributes:grammarId?{
      'data-home-practice-grammar':grammarId,
      'data-home-practice-evidence':outcome.error_evidence[0]||'',
      'data-home-practice-essay':outcome.essay_id||'',
    }:null,
    secondaryActions:secondary,
    attributes:{'data-practice-outcome-status':key},
  });
}

/* A recurring issue worth another look. This is a handoff into the learner's
   own work, not an analytics readout: it shows the exact sentence and opens
   the review that contains it. */
function reviewCueTile(value){
  const cue=normalizedReviewCue(value);
  if(!cue){
    return recommendationTile({
      contentKind:'review-cue',
      reason:t('home.review_cue_kicker'),
      title:t('home.review_cue_empty'),
      accentFamily:'review',
      cjk:isCjk(),
      attributes:{'data-review-cue-state':'none'},
    });
  }
  return recommendationTile({
    contentKind:'review-cue',
    reason:t('home.review_cue_kicker'),
    title:t(`home.review_cue_title_${cue.state}`),
    subtitle:t('home.review_cue_body',{
      category:categoryLabel(cue.category||'expression'),
      status:statusLabel(cue.status),
      source:t(`home.review_cue_source_${cue.source}`),
    }),
    bodyHtml:`<blockquote>“${esc(cue.evidence)}”</blockquote>`,
    accentFamily:'review',
    cjk:isCjk(),
    secondaryActions:cue.essay_id
      ?`<button type="button" class="oc-link" data-open-review-cue="${attr(cue.essay_id)}">${esc(t('home.review_cue_open'))}</button>`
      :'',
    attributes:{'data-review-cue-state':cue.state},
  });
}

/* A short listening entry point drawn from the real catalog. Only rendered
   when the library actually returned something the learner has not already
   been offered as their continuation. */
function listeningTile(item){
  if(!item)return '';
  const minutes=durationMinutes(item);
  return recommendationTile({
    contentKind:'listening-lesson',
    contentId:String(item.lesson_id||''),
    reason:t('home.h1_reason_listening'),
    title:String(item.title||''),
    subtitle:String(item.description||''),
    meta:minutes?t('home.h1_minutes',{count:minutes}):'',
    accentFamily:'listening',
    cjk:isCjk(),
    actionLabel:t('home.h1_open_lesson'),
    actionAttributes:{
      'data-home-open-lesson':String(item.lesson_id||''),
      'data-home-open-lesson-url':String(item.source?.source_url||''),
    },
  });
}

/* ========================================================== Challenge ===== */

/* The due-review challenge. The word, the handoff and the language scoping are
   the R14 contract; only the surface changed. */
function libraryReviewChallenge(item){
  if(!item){
    return challengeCard({
      challengeId:'library-review',
      kicker:t('home.library_review_title'),
      title:t('home.library_review_neutral'),
      accentFamily:'review',
      cjk:isCjk(),
      attributes:{'data-home-library-review-state':'none'},
    });
  }
  return challengeCard({
    challengeId:'library-review',
    kicker:t('home.library_review_title'),
    title:t('home.library_review_due'),
    description:t('home.library_review_body',{word:item.word}),
    accentFamily:'review',
    cjk:isCjk(),
    actionLabel:t('home.library_review_action'),
    actionAttributes:{'data-home-library-review-action':''},
    attributes:{
      'data-home-library-review-state':'due',
      'data-home-library-review-word':item.word,
    },
  });
}

/* The listening goal, as an action rather than a statistic. Minutes appear
   because the learner set the goal and the time is really recorded; an
   unavailable or malformed snapshot says so instead of showing zero. */
function listeningHabitChallenge(snapshot){
  if(!snapshot)return '';
  const status=snapshot.status==='unavailable'||snapshot.status==='malformed'?snapshot.status:'ok';
  if(status!=='ok'){
    return challengeCard({
      challengeId:'listening-habit',
      kicker:t('home.listening_habit_title'),
      title:t(`home.listening_habit_${status}`),
      accentFamily:'listening',
      cjk:isCjk(),
      actionLabel:t('home.listening_habit_action'),
      actionAttributes:{'data-home-listening-goal':''},
      attributes:{'data-home-listening-habit':'','data-state':status},
    });
  }
  const minutes=value=>Math.max(0,Math.floor(Number(value||0)/60));
  const today=minutes(snapshot.today_seconds);
  const goal=Number(snapshot.daily_goal_minutes);
  return challengeCard({
    challengeId:'listening-habit',
    kicker:t('home.listening_habit_title'),
    title:t('home.listening_habit_body',{today,goal:snapshot.daily_goal_minutes}),
    description:t('home.listening_habit_week',{week:minutes(snapshot.week_seconds)}),
    current:today,
    target:Number.isFinite(goal)&&goal>0?goal:null,
    accentFamily:'listening',
    cjk:isCjk(),
    actionLabel:t('home.listening_habit_action'),
    actionAttributes:{'data-home-listening-goal':''},
    attributes:{'data-home-listening-habit':'','data-state':'ok'},
  });
}

/* ============================================================= Worlds ===== */

function worldsSection(worldsPayload){
  if(worldsPayload===null){
    return worldRail({
      id:'worlds',
      title:t('home.h1_worlds_title'),
      description:t('home.h1_worlds_lede'),
      cards:[],
      empty:t('home.h1_worlds_unavailable'),
    });
  }
  const worlds=availableWorlds(worldsPayload,{locale:uiLocale()});
  const cards=worlds.map((world,index)=>worldCard({
    worldId:world.worldId,
    title:world.title,
    description:world.description,
    artwork:world.artwork,
    posterUrl:world.posterUrl,
    accentFamily:world.accentFamily,
    cjk:isCjk(),
    // Both are measured server-side against the real catalog.
    countLabel:world.lessonCount===1
      ?t('home.h1_world_count',{count:world.lessonCount})
      :t('home.h1_world_count_plural',{count:world.lessonCount}),
    leadLabel:world.leadLessonTitle?t('home.h1_world_lead',{title:world.leadLessonTitle}):'',
    variant:index===0?'featured':'standard',
    openAttributes:{
      'data-world-lesson':world.leadLessonId,
      'data-world-url':world.leadLessonSourceUrl,
    },
  }));
  return worldRail({
    id:'worlds',
    title:t('home.h1_worlds_title'),
    description:t('home.h1_worlds_lede'),
    cards,
    empty:t('home.h1_worlds_empty'),
  });
}

/* ========================================================== Discovery ===== */

function discoverySection(library,excludeIds){
  if(library===null){
    return discoveryRail({
      id:'continue-exploring',
      title:t('home.h1_discovery_title'),
      description:t('home.h1_discovery_lede'),
      cards:[],
      empty:t('home.h1_listening_unavailable'),
    });
  }
  const cards=discoveryItems(library,{exclude:excludeIds}).map(item=>{
    const minutes=durationMinutes(item);
    return discoveryCard({
      contentId:String(item.lesson_id||''),
      title:String(item.title||''),
      description:String(item.description||''),
      meta:minutes?t('home.h1_minutes',{count:minutes}):'',
      artwork:String(item.artwork||''),
      posterUrl:String(item.poster_url||''),
      accentFamily:'listening',
      cjk:isCjk(),
      openAttributes:{
        'data-home-open-lesson':String(item.lesson_id||''),
        'data-home-open-lesson-url':String(item.source?.source_url||''),
      },
    });
  });
  return discoveryRail({
    id:'continue-exploring',
    title:t('home.h1_discovery_title'),
    description:t('home.h1_discovery_lede'),
    cards,
    empty:t('home.h1_discovery_empty'),
  });
}

/* ======================================================== continuation ==== */

/* Priority: durable server-backed Listening progress, then a real local
 * Writing draft, then the per-device Listening resume. The server signal wins
 * because it is the only one that survives a different device, which is
 * exactly why D-049 built it; the local resume stays as the fallback rather
 * than being deleted, because for a learner with no persisted progress it is
 * still a true statement about what they were doing.
 */
function continuationModel(library,localListening){
  const resolved=homeContinuation({library,hasWritingDraft:hasLocalWritingDraft()});
  if(resolved)return resolved;
  if(localListening)return {kind:'listening-local',lesson:localListening};
  return null;
}

function continuationMarkup(continuation){
  if(!continuation)return '';
  if(continuation.kind==='listening'){
    return continueJourneyCard({
      journeyId:continuation.lessonId,
      kicker:t('home.h1_continue_kicker'),
      title:continuation.title,
      subtitle:continuation.segmentId?t('home.h1_continue_segment'):t('home.h1_continue_start'),
      artwork:continuation.artwork,
      posterUrl:continuation.posterUrl,
      accentFamily:'listening',
      cjk:isCjk(),
      resumeLabel:t('home.h1_continue_action'),
      actionAttributes:{'data-home-continue':'listening'},
      attributes:{'data-home-continue-source':'server'},
    });
  }
  if(continuation.kind==='writing'){
    return continueJourneyCard({
      journeyId:'writing-draft',
      kicker:t('home.h1_continue_kicker'),
      title:t('home.h1_continue_writing_title'),
      subtitle:t('home.h1_continue_writing_sub'),
      artwork:'writing',
      accentFamily:'writing',
      cjk:isCjk(),
      resumeLabel:t('home.h1_continue_action'),
      actionAttributes:{'data-home-continue':'writing'},
      attributes:{'data-home-continue-source':'draft'},
    });
  }
  return continueJourneyCard({
    journeyId:continuation.lesson.lesson_id||'',
    kicker:t('home.listening_resume_title'),
    title:continuation.lesson.title||t('title.listen'),
    subtitle:t('home.listening_resume_body'),
    artwork:'listening',
    accentFamily:'listening',
    cjk:isCjk(),
    resumeLabel:t('home.listening_resume_action'),
    actionAttributes:{'data-home-resume-listening':''},
    attributes:{'data-home-continue-source':'local'},
  });
}

/* ============================================================== render ==== */

export async function renderHome(root){
  document.querySelector('#primaryNav')?.classList.remove('hidden');
  root.innerHTML=`<section class="page">${loadingBlock(5)}</section>`;

  try{
    /* Every one of these is optional. The page is assembled from whatever came
       back, so one failing provider costs one section. */
    const [dashboard,memory,recommendation,outcomes,readingHistory,speakingHistory,crossCue,library,worldsPayload,libraryPayload]=await Promise.all([
      optional(()=>api.dashboard()),
      optional(()=>api.learningMemory()),
      optional(()=>api.practiceRecommendation()),
      optional(()=>api.practiceOutcomes(1)),
      optional(()=>api.readingSessions(8)),
      optional(()=>api.speakingAttempts(1)),
      optional(()=>api.crossSkillCue()),
      optional(()=>api.listeningLibrary(state.language)),
      optional(()=>api.worlds(state.language)),
      optional(()=>api.libraryVocabulary()),
    ]);

    /* The global chrome shows a streak cue from state.dashboard. Home renders
       no analytics itself; it just keeps that shared state populated. */
    if(dashboard)state.dashboard=dashboard;
    if(memory)state.memory=memory;
    state.practiceRecommendation=recommendation;
    state.latestPracticeOutcome=outcomes?.latest||null;

    const localListening=resumableLesson(state.language);
    const listeningHabit=listeningHabitSnapshot();
    const continuation=continuationModel(library,localListening);
    const nextPlan=nextPracticePlan({recommendation,readingHistory,speakingHistory,listeningResume:localListening});
    const dueReview=dueLibraryReview(libraryPayload);

    /* Whatever the continuation already offers must not reappear below it. */
    const surfaced=continuation?.kind==='listening'?[continuation.lessonId]:[];
    const suggestion=discoveryItems(library,{exclude:surfaced,limit:1})[0]||null;

    const forYouTiles=[
      nextPlanTile(nextPlan,recommendation),
      practiceOutcomeTile(outcomes?.latest),
      reviewCueTile(memory?.review_cue),
      suggestion?listeningTile(suggestion):'',
      /* Cross-skill still renders its own shared markup: it is used by Journey
         too, and forking it for one screen would create the second component
         the contract forbids. */
      `<div class="oc-legacy-slot">${crossSkillCueMarkup(crossCue,{learningLanguage:state.language})}</div>`,
    ].filter(Boolean);

    const challengeCards=[
      libraryReviewChallenge(dueReview),
      listeningHabitChallenge(listeningHabit),
    ].filter(Boolean);

    root.innerHTML=`<div class="o-page">
      <div class="o-home-v2" data-orena-ui="v2" data-home-composition="hero-mosaic-rail">
        ${journeyHero({
          eyebrow:greeting(),
          title:t('home.h1_hero_title'),
          supportingText:t('home.h1_hero_lede'),
          artwork:'orena-home',
          artworkLabel:'',
          accentFamily:'listening',
          cjk:isCjk(),
          primaryAction:{
            id:'homePrimary',
            label:continuation?t('home.h1_hero_continue'):t('home.h1_hero_explore'),
          },
          continuation:continuationMarkup(continuation),
        })}

        ${worldsSection(worldsPayload)}

        <div class="oc-home-row">
          ${recommendationRail({
            id:'for-you',
            title:t('home.h1_foryou_title'),
            description:t('home.h1_foryou_lede'),
            tiles:forYouTiles,
            empty:t('home.h1_foryou_empty'),
          })}
          ${productSection({
            id:'challenge',
            title:t('home.h1_challenge_title'),
            description:t('home.h1_challenge_lede'),
            variant:'challenge',
            body:`<div class="oc-challenge-stack">${challengeCards.join('')}</div>`,
          })}
        </div>

        ${discoverySection(library,surfaced)}
      </div>
    </div>`;

    /* ------------------------------------------------------ behaviour --- */

    /* The handoff carries the segment AND the mode the learner was in. Dropping
       the mode would silently return a shadowing learner to Follow. */
    const openLesson=(lessonId,sourceUrl,segmentId='',mode='')=>{
      if(!lessonId&&!sourceUrl)return;
      requestLessonAutostart(state.language,sourceUrl||'',{
        lesson_id:lessonId||'',
        selected_segment_id:segmentId||'',
        mode:mode||'',
      });
      go('listen');
    };

    const startRecommendedPractice=async(button)=>{
      await runBusy(button,async()=>{
        const task=await api.nextPractice({target_level:recommendation?.target_level||state.draft.level||''});
        const personalization=task.personalization||recommendation;
        saveDraft({
          mode:task.task_type||personalization.task_type||'opinion',
          topic:task.topic||personalization.topic||'random',
          level:personalization.target_level||state.draft.level,
          length:Number(task.word_target||personalization.word_target||state.draft.length),
          prompt:task.prompt||'',
          generatedTask:task,
          practiceContext:personalization,
          text:'',
          html:'',
          savedAt:null,
          parentEssayId:null,
        });
        state.practiceRecommendation=personalization;
        go('write');
      },{label:t('busy.creating')});
    };

    async function openEssay(id){
      try{
        const essay=await api.essay(id);
        state.lastEvaluation=essay;
        state.draft={
          ...state.draft,
          text:essay.text||'',
          html:essay.html||'',
          prompt:essay.prompt||'',
          parentEssayId:essay.id,
          level:essay.target_cefr||state.draft.level,
          practiceContext:essay.practice_context||null,
        };
        go('review');
      }catch(error){
        root.insertAdjacentHTML('afterbegin',errorBlock(error.message));
      }
    }

    /* The hero's single action follows the continuation it was rendered with,
       so the button never promises something the page cannot deliver. */
    root.querySelector('#homePrimary')?.addEventListener('click',async()=>{
      if(continuation?.kind==='listening'){
        openLesson(continuation.lessonId,continuation.sourceUrl,continuation.segmentId);
        return;
      }
      if(continuation?.kind==='listening-local'){
        openLesson(continuation.lesson.lesson_id,continuation.lesson.source_url,continuation.lesson.selected_segment_id,continuation.lesson.mode);
        return;
      }
      if(continuation?.kind==='writing'){
        go('write');
        return;
      }
      go('listen');
    });

    root.querySelector('[data-home-continue="listening"]')?.addEventListener('click',()=>{
      if(continuation?.kind!=='listening')return;
      openLesson(continuation.lessonId,continuation.sourceUrl,continuation.segmentId);
    });
    root.querySelector('[data-home-continue="writing"]')?.addEventListener('click',()=>go('write'));
    root.querySelector('[data-home-resume-listening]')?.addEventListener('click',()=>{
      const lesson=continuation?.lesson||localListening;
      if(!lesson)return;
      openLesson(lesson.lesson_id,lesson.source_url,lesson.selected_segment_id,lesson.mode);
    });

    /* Entering a World opens the lesson that leads it. There is no Explore
       route yet and inventing one would be a fake destination, so the card
       hands off through the existing lesson autostart contract. */
    root.querySelectorAll('[data-world-open]').forEach(button=>button.addEventListener('click',()=>{
      openLesson(button.dataset?.worldLesson||'',button.dataset?.worldUrl||'');
    }));

    root.querySelectorAll('[data-home-open-lesson]').forEach(button=>button.addEventListener('click',()=>{
      openLesson(button.dataset.homeOpenLesson||'',button.dataset.homeOpenLessonUrl||'');
    }));

    root.querySelector('[data-home-listening-goal]')?.addEventListener('click',()=>go('listen'));

    root.querySelector('[data-home-library-review-action]')?.addEventListener('click',()=>{
      if(!dueReview)return;
      state.libraryReviewWord=dueReview.word;
      state.libraryReviewLanguage=state.language;
      go('library');
    });

    root.querySelector('[data-home-next-plan-action]')?.addEventListener('click',async()=>{
      if(!nextPlan)return;
      if(nextPlan.kind==='writing-draft'){
        go('write');
      }else if(nextPlan.kind==='writing'||nextPlan.kind==='baseline'){
        const button=root.querySelector('[data-home-next-plan-action]');
        try{
          await startRecommendedPractice(button);
        }catch(error){
          root.insertAdjacentHTML('afterbegin',errorBlock(error.message||t('busy.working')));
        }
      }else if(nextPlan.kind==='listening'&&(nextPlan.lesson?.source_url||nextPlan.lesson?.lesson_id)){
        openLesson(nextPlan.lesson.lesson_id,nextPlan.lesson.source_url,nextPlan.lesson.selected_segment_id,nextPlan.lesson.mode);
      }else if(nextPlan.kind==='reading'){
        try{
          const loaded=await api.readingSession(nextPlan.sessionId);
          if(loaded?.found&&loaded.session){
            state.readingSession=loaded.session;
            state.readingResult=null;
            go('read');
            return;
          }
        }catch{}
        state.readingSession=null;
        state.readingResult=null;
        go('read');
      }else if(nextPlan.kind==='speaking'){
        selectSharedMediaSegment(state.language,nextPlan.segmentId);
        go('speak');
      }
    });

    root.querySelectorAll('[data-home-open-grammar]').forEach(button=>button.addEventListener('click',()=>{
      const id=button.dataset.homeOpenGrammar;
      if(!id)return;
      try{ localStorage.setItem('becoming.grammar-focus',id); }catch{}
      go('grammar');
    }));
    root.querySelectorAll('[data-home-open-review]').forEach(button=>button.addEventListener('click',()=>openEssay(button.dataset.homeOpenReview)));
    root.querySelectorAll('[data-home-practice-grammar]').forEach(button=>button.addEventListener('click',async()=>{
      const id=button.dataset.homePracticeGrammar;
      if(!id)return;
      try{
        await runBusy(button,async()=>{
          const task=await api.grammarPractice(id,button.dataset.homePracticeEvidence||'');
          if(!task||typeof task!=='object'||typeof task.prompt!=='string'||!task.prompt.trim()){
            throw new Error(t('review.practice_failed'));
          }
          const context=task.practice_context&&typeof task.practice_context==='object'
            ?task.practice_context:null;
          saveDraft({
            prompt:task.prompt.trim(),text:'',html:'',
            savedAt:null,
            mode:context?.task_type||state.draft.mode,
            topic:context?.topic||state.draft.topic,
            level:task.target_level||context?.target_level||state.draft.level,
            practiceContext:context,generatedTask:null,
            parentEssayId:Number(button.dataset.homePracticeEssay||0)>0
              &&Number.isInteger(Number(button.dataset.homePracticeEssay))
              ?Number(button.dataset.homePracticeEssay):null,
          });
          go('write');
        },{label:t('busy.creating')});
      }catch(error){ root.insertAdjacentHTML('afterbegin',errorBlock(error.message||t('review.practice_failed'))); }
    }));

    root.querySelectorAll('[data-open-review-cue]').forEach(button=>{
      button.addEventListener('click',()=>openEssay(button.dataset.openReviewCue));
    });

    root.querySelector('[data-cross-skill-kind]')?.addEventListener('click',async event=>{
      const button=event.currentTarget;
      const kind=button.dataset.crossSkillKind;
      if(kind==='review')return openEssay(button.dataset.crossSkillEssay);
      if(kind==='reading'){
        try{const loaded=await api.readingSession(button.dataset.crossSkillSession); if(loaded?.found&&loaded.session)state.readingSession=loaded.session;}catch{}
        state.readingResult=null; go('read'); return;
      }
      if(kind==='listening'){
        if(button.dataset.crossSkillUrl)requestLessonAutostart(state.language,button.dataset.crossSkillUrl,{source_url:button.dataset.crossSkillUrl,title:button.dataset.crossSkillTitle,selected_segment_id:button.dataset.crossSkillSegment});
        selectSharedMediaSegment(state.language,button.dataset.crossSkillSegment||''); go('listen'); return;
      }
      if(kind==='speaking'&&button.dataset.crossSkillAsset&&button.dataset.crossSkillSegment){
        selectSharedMediaSegment(state.language,button.dataset.crossSkillSegment); go('speak');
      }
    });
  }catch(error){
    root.innerHTML=`<section class="page">${errorBlock(error.message)}</section>`;
  }
}
