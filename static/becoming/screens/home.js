import {api} from '../api.js';
import {oIcon} from '../orena/icons.js';
import {state,saveDraft} from '../store.js';
import {go} from '../router.js';
import {homeInsight,metricOverview} from '../domain/feedback.js';
import {requestLessonAutostart,resumableLesson} from '../domain/media-lesson-history.js';
import {listeningHabitSnapshot} from '../domain/listening-habit.js';
import {getSharedMediaSession,selectSharedMediaSegment} from '../domain/shared-media-session.js';
import {difficultyAdjustment} from '../domain/adaptive.js';
import {crossSkillCueMarkup} from '../domain/cross-skill.js';
import {attr,esc,errorBlock,loadingBlock,runBusy,sectionHeading,helpTip} from '../components/primitives.js';
import {t,categoryLabel,masteryLabel,statusLabel,practiceModeLabel,topicLabel,unitLabel,uiLocale} from '../domain/i18n.js';

function sortedEssays(rows=[]){
  return [...rows].sort((a,b)=>String(b.created_at||'').localeCompare(String(a.created_at||'')));
}

function essayTitle(row){
  return String((row?.prompt||'').split('\n').find(Boolean)||t('common.free_writing')).trim();
}

function excerpt(value='',limit=220){
  const clean=String(value||'').replace(/\s+/g,' ').trim();
  if(clean.length<=limit)return clean;
  return `${clean.slice(0,limit).replace(/\s+\S*$/,'').trim()}…`;
}

function recentRows(rows=[]){
  if(!rows.length){
    return `<div class="empty-state home-empty-history">
      <h2>${t('home.history_empty_title')}</h2>
      <p>${t('home.history_empty_body')}</p>
    </div>`;
  }

  return `<div class="recent-work-list">${sortedEssays(rows).slice(0,3).map(row=>`
    <button class="recent-work button-tertiary" data-open-essay="${row.id}">
      <span class="recent-work-index" aria-hidden="true">${String(row.revision_no||1).padStart(2,'0')}</span>
      <span class="recent-work-copy">
        <strong>${esc(essayTitle(row))}</strong>
        <small>${esc(String(row.created_at||'').replace('T',' ').slice(0,16))} · ${t('common.revision')} ${esc(row.revision_no||1)}</small>
      </span>
      <span class="recent-work-score">${esc(row.cefr_estimate||row.level_estimate||'')} ${row.overall!=null?`· ${esc(row.overall)}`:''}</span>
      <span class="recent-work-arrow" aria-hidden="true">→</span>
    </button>`).join('')}</div>`;
}

const HOME_MASTERY_STAGES=new Set(['Emerging','Developing','Stable','Mastered']);

function normalizedHomeMemory(memory){
  if(!memory||typeof memory!=='object'||Array.isArray(memory))return {strengths:[],revision_wins:[]};
  const numberValue=value=>{
    if(typeof value==='number'&&Number.isFinite(value))return value;
    if(typeof value==='string'&&value.trim()!==''){
      const parsed=Number(value);
      if(Number.isFinite(parsed))return parsed;
    }
    return null;
  };
  const countValue=value=>{
    const parsed=numberValue(value);
    return parsed!==null&&Number.isInteger(parsed)&&parsed>=0?parsed:null;
  };
  const strengths=Array.isArray(memory.strengths)
    ?memory.strengths
      .filter(item=>item&&typeof item==='object'&&!Array.isArray(item))
      .map(item=>{
        const evidenceCount=countValue(item.evidence_count);
        const seriesCount=countValue(item.series_count);
        const category=typeof item.category==='string'?item.category.trim():'';
        const stage=typeof item.stage==='string'?item.stage.trim():'';
        if(!category||!HOME_MASTERY_STAGES.has(stage)||evidenceCount===null||seriesCount===null)return null;
        return {...item,category,stage,evidence_count:evidenceCount,series_count:seriesCount,
          example:typeof item.example==='string'?item.example.trim():''};
      })
      .filter(Boolean)
    :[];
  const wins=Array.isArray(memory.revision_wins)
    ?memory.revision_wins
      .filter(item=>item&&typeof item==='object'&&!Array.isArray(item))
      .map(item=>{
        const overallDelta=numberValue(item.overall_delta);
        const errorDelta=numberValue(item.error_delta);
        const revisions=countValue(item.revisions);
        if(overallDelta===null||errorDelta===null||revisions===null||revisions<2)return null;
        return {...item,overall_delta:overallDelta,error_delta:errorDelta,revisions};
      })
      .filter(Boolean)
    :[];
  return {strengths,revision_wins:wins};
}

function memorySignal(memory){
  const safe=normalizedHomeMemory(memory);
  const strength=safe.strengths[0];
  const win=safe.revision_wins[0];

  if(strength){
    return `<article class="home-signal-card visual-raised-surface">
      <span class="context-label">${t('home.learning_memory')}</span>
      <strong>${esc(categoryLabel(strength.category))}</strong>
      <p>${esc(masteryLabel(strength.stage))} · ${esc(strength.evidence_count)} ${t('common.evidence')} · ${esc(strength.series_count)} ${t('common.writing_series')}</p>
      ${strength.example?`<blockquote>“${esc(strength.example)}”</blockquote>`:''}
    </article>`;
  }

  if(win){
    return `<article class="home-signal-card visual-raised-surface">
      <span class="context-label">${t('home.learning_memory')}</span>
      <strong>${t('home.before_now')}</strong>
      <p>${t('home.before_now_detail',{
        overall:`${win.overall_delta>=0?'+':''}${esc(win.overall_delta)}`,
        errors:`${win.error_delta>=0?'+':''}${esc(win.error_delta)}`,
        revisions:esc(win.revisions),
      })}</p>
    </article>`;
  }

  return `<article class="home-signal-card quiet visual-section-surface">
    <span class="context-label">${t('home.learning_memory')}</span>
    <strong>${t('home.collecting')}</strong>
    <p>${t('home.collecting_body')}</p>
  </article>`;
}

const PRACTICE_OUTCOME_STATUSES=new Set([
    'improved','transferred','held','still_working',
    'needs_attention','not_observed','needs_more_evidence',
]);

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
  const state=typeof value.state==='string'?value.state.trim().toLowerCase():'';
  const source=typeof value.source==='string'?value.source.trim().toLowerCase():'';
  const status=typeof value.status==='string'?value.status.trim().toLowerCase():'';
  const evidence=typeof value.evidence==='string'?value.evidence.trim().slice(0,260):'';
  const essayId=typeof value.essay_id==='number'&&Number.isInteger(value.essay_id)&&value.essay_id>0?value.essay_id:null;
  if(!available||!['recurring','unresolved'].includes(state)||!['error_memory','practice_outcome'].includes(source)
    ||!REVIEW_CUE_STATUSES.has(status)||!evidence)return null;
  return {...value,available:true,state,source,status,evidence,essay_id:essayId,
    category:typeof value.category==='string'?value.category.trim():'',
    suggestion:typeof value.suggestion==='string'?value.suggestion.trim().slice(0,320):''};
}

function reviewCueSignal(value){
  const cue=normalizedReviewCue(value);
  if(!cue)return `<section class="o-card o-panel home-review-cue" data-review-cue-state="none">
    <span class="o-label">${esc(t('home.review_cue_kicker'))}</span>
    <p class="o-panel-copy">${esc(t('home.review_cue_empty'))}</p>
  </section>`;
  const source=t(`home.review_cue_source_${cue.source}`);
  return `<section class="o-card o-panel home-review-cue" data-review-cue-state="${esc(cue.state)}">
    <span class="o-label">${esc(t('home.review_cue_kicker'))}</span>
    <h2>${esc(t(`home.review_cue_title_${cue.state}`))}</h2>
    <p class="o-panel-copy">${esc(t('home.review_cue_body',{category:categoryLabel(cue.category||'expression'),status:statusLabel(cue.status),source}))}</p>
    <blockquote>“${esc(cue.evidence)}”</blockquote>
    ${cue.essay_id?`<button class="o-btn o-btn--outline o-btn--compact" type="button" data-open-review-cue="${attr(cue.essay_id)}">${esc(t('home.review_cue_open'))}</button>`:''}
  </section>`;
}

function practiceOutcomeSignal(outcome){
  outcome=normalizedPracticeOutcome(outcome);
  if(!outcome)return '';
  const key=outcome.status;
  const grammarId=typeof outcome.grammar_id==='string'?outcome.grammar_id.trim():'';

  return `<article class="home-signal-card practice-outcome-signal status-${esc(key)} visual-raised-surface">
    <span class="context-label">${t(`outcome.${key}.kicker`)}</span>
    <strong>${t(`outcome.${key}.title`)}</strong>
    <p>${t(`outcome.${key}.body`,{
      previous:outcome.previous_issue_count??'—',
      count:outcome.issue_count??0,
      focus:outcome.focus_label||t('common.current_focus'),
    })}</p>
    <small>${esc(outcome.focus_label||t('common.current_focus'))} · ${t('outcome.revision')} ${esc(outcome.revision_no||1)}</small>
    ${grammarId?`<div class="action-row">
      <button type="button" class="o-btn o-btn--outline o-btn--compact" data-home-open-grammar="${attr(grammarId)}">${esc(t('review.open_grammar'))}</button>
      <button type="button" class="o-btn o-btn--primary o-btn--compact" data-home-practice-grammar="${attr(grammarId)}" data-home-practice-evidence="${attr(outcome.error_evidence[0]||'')}" data-home-practice-essay="${attr(outcome.essay_id||'')}">${esc(t('review.practice_grammar'))}</button>
      ${outcome.essay_id!==null?`<button type="button" class="text-link" data-home-open-review="${attr(outcome.essay_id)}">${esc(t('home.open_review'))}</button>`:''}
    </div>`:outcome.essay_id!==null?`<div class="action-row"><button type="button" class="text-link" data-home-open-review="${attr(outcome.essay_id)}">${esc(t('home.open_review'))}</button></div>`:''}
  </article>`;
}

function stageIcon(name){
  const icons={
    capture:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg>',
    review:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5.5h16v10H9l-5 4Z"/><path d="M8 9h8M8 12h5"/></svg>',
    refine:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 7a7 7 0 0 0-12 2M6 17a7 7 0 0 0 12-2"/><path d="m18 3 .2 4.4-4.4.2M6 21l-.2-4.4 4.4-.2"/></svg>',
    grow:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21V9"/><path d="M12 13c-4.5 0-7-2.6-7-7 4.4 0 7 2.5 7 7ZM12 10c4.5 0 7-2.6 7-7-4.4 0-7 2.5-7 7Z"/></svg>',
  };
  return icons[name]||'';
}

function journeyState(essays,memory){
  const rows=essays||[];
  const hasEssay=rows.length>0;
  const hasReview=rows.some(row=>row.overall!=null || row.cefr_estimate || row.level_estimate);
  const hasRevision=rows.some(row=>Number(row.revision_no||1)>1);
  const reliable=(memory?.strengths||[]).some(item=>['Stable','Mastered'].includes(String(item.stage||'')));
  const hasWin=(memory?.revision_wins||[]).length>0;
  const done=[hasEssay,hasReview,hasRevision,reliable||hasWin];
  const active=Math.min(done.findIndex(value=>!value)===-1?3:done.findIndex(value=>!value),3);
  const completed=done.filter(Boolean).length;
  return {done,active,completed,percent:Math.max(8,Math.round((completed/4)*100))};
}

function journeyMarkup(essays,memory,currentEssay){
  const stateInfo=journeyState(essays,memory);
  const stages=[
    ['capture','home.stage.capture','home.stage.capture_desc'],
    ['review','home.stage.review','home.stage.review_desc'],
    ['refine','home.stage.refine','home.stage.refine_desc'],
    ['grow','home.stage.grow','home.stage.grow_desc'],
  ];

  return `<section class="home-journey-panel visual-raised-surface" aria-labelledby="homeJourneyHeading">
    <div class="home-journey-head">
      <div>
        <span class="context-label">${t('home.journey_kicker')}</span>
        <h2 id="homeJourneyHeading">${t('home.journey_title')}</h2>
        <p>${t('home.journey_body')}</p>
      </div>
      <div class="home-cycle-meter" aria-label="${t('home.cycle_progress')}: ${stateInfo.completed}/4">
        <span>${t('home.cycle_progress')}</span>
        <strong>${stateInfo.completed}<small>/4</small></strong>
      </div>
    </div>

    <div class="home-stage-track" style="--cycle-progress:${stateInfo.percent}%">
      <span class="home-stage-line" aria-hidden="true"><i></i></span>
      ${stages.map(([name,label,desc],index)=>`
        <div class="home-stage ${stateInfo.done[index]?'complete':''} ${index===stateInfo.active?'active':''}">
          <span class="home-stage-object">${stageIcon(name)}</span>
          <strong>${t(label)}</strong>
          <small>${t(desc)}</small>
        </div>`).join('')}
    </div>

    <div class="home-current-row">
      <div>
        <span class="context-label">${t('home.current_piece')}</span>
        <strong>${currentEssay?esc(essayTitle(currentEssay)):t('home.no_piece_title')}</strong>
        <p>${currentEssay?esc(excerpt(currentEssay.text||currentEssay.prompt,140)):t('home.no_piece_body')}</p>
      </div>
      ${currentEssay?`<button class="button button-secondary" type="button" data-open-current>${t('home.open_review')} <span aria-hidden="true">→</span></button>`:''}
    </div>
  </section>`;
}

function dashboardEvidence(essays=[],memory={}){
  const groups=new Map();
  for(const row of essays||[]){
    const key=row.series_id||row.id;
    if(!groups.has(key))groups.set(key,[]);
    groups.get(key).push(row);
  }

  const revisionSeries=[...groups.values()].filter(group=>
    group.some(row=>Number(row.revision_no||1)>1)
  ).length;

  const reliable=(memory?.strengths||[]).filter(item=>
    ['Stable','Mastered'].includes(String(item.stage||''))
  ).length;

  return {
    seriesCount:groups.size,
    revisionSeries,
    reliable,
  };
}

/* The streak card, as the reference draws it: a flame, the count at display
   size, and a week of dots underneath.
 *
 * The dots are the part that makes it a habit signal rather than a number.
 * They come from the learner's own essay dates -- one filled dot per day that
 * has written evidence -- so nothing here is decorative and nothing is
 * invented. The week runs to today, so the last dot is always now.
 */
function streakCard(dashboard,essays=[]){
  const days=Number(dashboard?.streak)||0;
  const written=new Set(
    (Array.isArray(essays)?essays:[])
      .map(item=>String(item?.created_at||'').slice(0,10))
      .filter(Boolean)
  );

  const today=new Date();
  const week=[];
  for(let back=6;back>=0;back--){
    const day=new Date(today);
    day.setDate(today.getDate()-back);
    const iso=`${day.getFullYear()}-${String(day.getMonth()+1).padStart(2,'0')}-${String(day.getDate()).padStart(2,'0')}`;
    week.push({
      iso,
      done:written.has(iso),
      initial:day.toLocaleDateString(uiLocale()==='vi'?'vi-VN':uiLocale()==='zh'?'zh-CN':'en-US',{weekday:'narrow'}),
    });
  }
  if(!days && !week.some(day=>day.done))return '';

  return `<article class="home-streak-card visual-raised-surface">
    <div class="home-streak-head">
      <span class="context-label">${t('home.streak_title')}</span>
      <svg class="home-streak-flame" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.7c2.6 3 3.9 5.4 3.9 7.2 0 1.3-.6 2.3-1.7 2.9.5-1.6.2-3-1-4.2.2 2.4-.8 4-3 4.9-1.6.6-2.5 1.8-2.5 3.4 0 2.4 2 4.4 4.7 4.4 3.2 0 5.6-2.4 5.6-5.8 0-4.2-2-8.4-6-12.8Z"/></svg>
    </div>
    <p class="home-streak-count"><strong>${esc(String(days))}</strong><span>${t('home.streak_days')}</span></p>
    <p class="home-streak-note">${t('home.streak_note')}</p>
    <ul class="home-streak-week">
      ${week.map(day=>`<li class="${day.done?'is-done':''}">
        <span class="home-streak-dot" aria-hidden="true"></span>
        <span class="home-streak-day">${esc(day.initial)}</span>
      </li>`).join('')}
    </ul>
  </article>`;
}

function writingDashboardMarkup(dashboard,essays,memory){
  const evidence=dashboardEvidence(essays,memory);
  const metrics=metricOverview(dashboard).slice(0,4);
  const focus=memory?.focus||null;
  const level=dashboard?.cefr||sortedEssays(essays)[0]?.cefr_estimate||sortedEssays(essays)[0]?.level_estimate||'—';
  const focusLabel=focus
    ?categoryLabel(focus.category)
    :t('home.dashboard_collecting');

  return `<section class="writing-dashboard visual-raised-surface" aria-labelledby="writingDashboardHeading">
    <div class="writing-dashboard-head">
      <div>
        <span class="context-label">${t('home.dashboard_kicker')}</span>
        <h2 id="writingDashboardHeading">${t('home.dashboard_title')}</h2>
        <p>${t('home.dashboard_body')}</p>
      </div>
      <button id="writingDashboardJourneyLink" class="button button-secondary" type="button">${t('home.dashboard_open')} <span aria-hidden="true">→</span></button>
    </div>

    <div class="writing-dashboard-layout">
      <div class="dashboard-focus-object">
        <span>${t('home.dashboard_focus')}</span>
        <strong>${esc(focusLabel)}</strong>
        <p>${focus
          ?`${esc(statusLabel(focus.status||''))} · ${esc(focus.total||0)} ${t('common.evidence')} · ${esc(focus.series_count||1)} ${t('common.writing_series')}`
          :t('home.dashboard_collecting')}</p>
        <div class="dashboard-level-chip">
          <span>${t('home.dashboard_level')}</span>
          <strong>${esc(level)}</strong>
        </div>
      </div>

      <div class="dashboard-evidence-strip">
        <article>
          <span>${t('home.dashboard_series')}</span>
          <strong>${esc(evidence.seriesCount)}</strong>
        </article>
        <article>
          <span>${t('home.dashboard_revisions')}</span>
          <strong>${esc(evidence.revisionSeries)}</strong>
        </article>
        <article>
          <span>${t('home.dashboard_strengths')} ${helpTip(t('home.tooltip_reliable_strengths'))}</span>
          <strong>${esc(evidence.reliable)}</strong>
        </article>
      </div>

      <div class="dashboard-dimensions">
        <div class="dashboard-dimensions-head">
          <span>${t('home.dashboard_dimensions')}</span>
          <small>${t('home.dashboard_note')}</small>
        </div>
        <div class="dashboard-metric-list">
          ${metrics.length?metrics.map(item=>{
            const value=Math.max(0,Math.min(100,Number(item.value)||0));
            return `<div class="dashboard-metric-row">
              <span>${esc(categoryLabel(item.key||item.label))}</span>
              <div class="dashboard-metric-track" aria-hidden="true"><i style="width:${value}%"></i></div>
              <strong>${value.toFixed(0)}</strong>
            </div>`;
          }).join(''):`<p class="dashboard-empty-metrics">${t('home.dashboard_collecting')}</p>`}
        </div>
      </div>
    </div>
  </section>`;
}

function currentWorkFolio(currentEssay,insight){
  const title=currentEssay?essayTitle(currentEssay):t('home.no_piece_title');
  const body=currentEssay?excerpt(currentEssay.text||currentEssay.prompt,250):t('home.no_piece_body');
  const meta=currentEssay
    ?`${esc(currentEssay.cefr_estimate||currentEssay.level_estimate||state.draft.level||'')} · ${t('common.revision')} ${esc(currentEssay.revision_no||1)}`
    :`${state.language==='zh'?'中文':'English'} · ${esc(state.draft.level||'')}`;

  return `<div class="home-folio ${currentEssay?'has-work':'empty-work'}" aria-label="${t('home.current_piece')}">
    <div class="folio-back" aria-hidden="true"></div>
    <div class="folio-spread">
      <section class="folio-page folio-left">
        <span class="context-label">${t('home.current_piece')}</span>
        <h2>${esc(title)}</h2>
        <p>${esc(body)}</p>
        <div class="folio-meta">${meta}</div>
      </section>
      <span class="folio-gutter" aria-hidden="true"></span>
      <section class="folio-page folio-right">
        <span class="context-label">${t('home.today_signal')}</span>
        <strong>${esc(insight?.kicker||t('common.current_focus'))}</strong>
        <p>${esc(insight?.context||t('home.collecting_body'))}</p>
        ${insight?.evidence?`<blockquote>“${esc(insight.evidence)}”</blockquote>`:''}
        <span class="folio-mark" aria-hidden="true">✦</span>
      </section>
    </div>
    <span class="folio-edge" aria-hidden="true"></span>
  </div>`;
}

/* ---------------------------------------------------------------------------
 * Home, rebuilt against docs/visual-references/Orena-prod/ORENA_APPLICATION_*.
 * (The reference still carries the old BECOMING wordmark; the layout is the
 * target, the branding is not.)
 *
 * The reference opens on a statement, then reads as: where this piece sits in
 * the loop, what the evidence noticed, and what the learner has been keeping.
 * Every figure below comes from the learner's own dashboard, essays, memory
 * and library. Two places where the reference could not be followed literally:
 *
 *  - It illustrates the hero with a photographed notebook. There is no such
 *    asset, and a stock image would say nothing. The slot holds the piece the
 *    learner actually has in progress, which is the thing they came back for.
 *  - Its "Overall Progress 62%" has no counterpart in the data model. The
 *    number shown is the latest graded score, labelled as that, because
 *    inventing a progress metric would be inventing evidence.
 * ------------------------------------------------------------------------ */

function greeting(){
  const hour=new Date().getHours();
  const key=hour<12?'home.greet_morning':hour<18?'home.greet_afternoon':'home.greet_evening';
  const name=String(state.me?.name||'').trim().split(/\s+/)[0]||'';
  return name?`${t(key)}, ${name}.`:`${t(key)}.`;
}

const HOME_STAGES=[
  ['capture','home.stage_capture','home.stage_capture_note'],
  ['draft','home.stage_draft','home.stage_draft_note'],
  ['refine','home.stage_refine','home.stage_refine_note'],
  ['finalize','home.stage_finalize','home.stage_finalize_note'],
];

/* Which stage the learner is standing in, read from what exists rather than
   from a stored step: no piece yet is Capture, an ungraded draft is Draft, a
   graded piece with a revision is Refine, and a revision is Finalise. */
function homeStageIndex(essays,currentEssay){
  if(!currentEssay)return 0;
  if(Number(currentEssay.revision_no)>0)return 3;
  if(Number.isFinite(Number(currentEssay.overall)))return 2;
  return 1;
}

function homeHero(insight,personalized,currentEssay){
  return `<section class="o-hero o-card">
    <div class="o-hero-copy">
      <p class="o-hero-greet">${esc(greeting())}</p>
      <p class="o-hero-statement ${state.language==='zh'?'cjk':''}">${esc(insight.statement)}</p>
      <p class="o-hero-lede">${esc(insight.context)}</p>
      <div class="o-hero-actions">
        <button id="homePrimary" class="o-btn o-btn--primary" type="button">
          <span>${esc(personalized?t('home.practice_action'):insight.action)}</span>${oIcon('arrowRight')}
        </button>
        <button id="journeyLinkTop" class="o-btn o-btn--outline" type="button">${esc(t('home.journey'))}</button>
      </div>
    </div>
    ${homeCurrentPiece(currentEssay)}
  </section>`;
}

function listeningResumeSignal(lesson){
  if(!lesson)return '';
  return `<section class="o-card o-panel home-listening-resume" data-home-listening-resume>
    <div>
      <span class="o-label">${esc(t('home.listening_resume_title'))}</span>
      <h2>${esc(lesson.title||t('title.listen'))}</h2>
      <p class="o-panel-copy">${esc(t('home.listening_resume_body'))}</p>
    </div>
    <button class="o-btn o-btn--outline o-btn--compact" type="button" data-home-resume-listening>${esc(t('home.listening_resume_action'))}</button>
  </section>`;
}

function listeningHabitSignal(snapshot){
  if(!snapshot)return '';
  const status=snapshot.status==='unavailable'||snapshot.status==='malformed'?snapshot.status:'ok';
  const action=`<button class="o-btn o-btn--outline o-btn--compact" type="button" data-home-listening-goal>${esc(t('home.listening_habit_action'))}</button>`;
  if(status!=='ok'){
    return `<section class="o-card o-panel home-listening-habit" data-home-listening-habit data-state="${status}">
      <div><span class="o-label">${esc(t('home.listening_habit_title'))}</span><p class="o-panel-copy">${esc(t(`home.listening_habit_${status}`))}</p></div>
      ${action}
    </section>`;
  }
  const minutes=value=>Math.max(0,Math.floor(Number(value||0)/60));
  return `<section class="o-card o-panel home-listening-habit" data-home-listening-habit data-state="ok">
    <div>
      <span class="o-label">${esc(t('home.listening_habit_title'))}</span>
      <p class="o-panel-copy">${esc(t('home.listening_habit_body',{today:minutes(snapshot.today_seconds),goal:snapshot.daily_goal_minutes}))}</p>
      <small class="o-panel-copy">${esc(t('home.listening_habit_week',{week:minutes(snapshot.week_seconds)}))}</small>
    </div>
    ${action}
  </section>`;
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

function hasLocalWritingDraft(draft=state.draft){
  if(!draft||typeof draft!=='object')return false;
  const text=value=>typeof value==='string'&&value.trim()!=='';
  return text(draft.text)||text(draft.html)||text(draft.prompt)
    ||Boolean(draft.generatedTask&&typeof draft.generatedTask==='object'&&!Array.isArray(draft.generatedTask));
}

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

function nextPracticePlanSignal(plan){
  const kind=plan?.kind||'empty';
  if(kind==='empty')return `<section class="o-card o-panel home-next-plan" data-home-next-plan data-plan-kind="empty">
    <span class="o-label">${esc(t('home.next_plan_title'))}</span>
    <p class="o-panel-copy">${esc(t('home.next_plan_empty'))}</p>
  </section>`;
  const title=t(`home.next_plan_${kind}_title`);
  const body=t(`home.next_plan_${kind}_body`);
  return `<section class="o-card o-panel home-next-plan" data-home-next-plan data-plan-kind="${kind}">
    <div><span class="o-label">${esc(t('home.next_plan_title'))}</span><h2>${esc(title)}</h2><p class="o-panel-copy">${esc(body)}</p></div>
    <button class="o-btn o-btn--primary o-btn--compact" type="button" data-home-next-plan-action>${esc(t('home.next_plan_action'))}</button>
  </section>`;
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

function normalizedLibraryItems(payload){
  const items=Array.isArray(payload)
    ?payload
    :payload&&typeof payload==='object'&&!Array.isArray(payload)&&Array.isArray(payload.items)
      ?payload.items:[];
  return items.filter(item=>item&&typeof item==='object'&&!Array.isArray(item)
    &&typeof item.word==='string'&&item.word.trim()!=='');
}

function libraryReviewSignal(item){
  if(!item)return `<section class="o-card o-panel home-library-review" data-home-library-review-state="none">
    <span class="o-label">${esc(t('home.library_review_title'))}</span>
    <p class="o-panel-copy">${esc(t('home.library_review_neutral'))}</p>
  </section>`;
  return `<section class="o-card o-panel home-library-review" data-home-library-review-state="due" data-home-library-review-word="${attr(item.word)}">
    <div><span class="o-label">${esc(t('home.library_review_title'))}</span>
      <h2>${esc(t('home.library_review_due'))}</h2>
      <p class="o-panel-copy">${esc(t('home.library_review_body',{word:item.word}))}</p>
    </div>
    <button class="o-btn o-btn--primary o-btn--compact" type="button" data-home-library-review-action>${esc(t('home.library_review_action'))}</button>
  </section>`;
}

function practiceDifficultyMarkup(recommendation){
  const difficulty=difficultyAdjustment(recommendation);
  return difficulty
    ?`<p class="o-panel-copy" data-practice-difficulty>${esc(t(difficulty.key,{delta:difficulty.delta}))}</p>`
    :'';
}

function homeCurrentPiece(currentEssay){
  if(!currentEssay){
    return `<aside class="o-hero-piece o-hero-piece--empty">
      <span class="o-label">${esc(t('home.current_piece_title'))}</span>
      <p class="o-panel-copy">${esc(t('home.no_current_piece'))}</p>
    </aside>`;
  }
  const score=Number(currentEssay.overall);
  return `<aside class="o-hero-piece">
    <span class="o-label">${esc(t('home.current_piece_title'))}</span>
    <h3 class="o-hero-piece-title">${esc(essayTitle(currentEssay))}</h3>
    <p class="o-hero-piece-body">${esc(excerpt(currentEssay.text||'',160))}</p>
    <div class="o-hero-piece-foot">
      ${currentEssay.target_cefr?`<span class="o-chip">${esc(currentEssay.target_cefr)}</span>`:''}
      ${Number.isFinite(score)?`<span class="o-hero-piece-score">${esc(String(score))}</span>`:''}
      <button class="o-btn o-btn--outline o-btn--compact" type="button" data-open-current>${esc(t('home.open_piece'))}</button>
    </div>
  </aside>`;
}

function homeJourney(essays,currentEssay){
  const active=homeStageIndex(essays,currentEssay);
  const latest=sortedEssays(essays).find(row=>Number.isFinite(Number(row.overall)));
  const score=latest?Number(latest.overall):null;

  return `<section class="o-card o-journey">
    <div class="o-journey-head">
      <h2>${esc(t('home.your_journey'))}</h2>
      <p class="o-panel-copy">${esc(t('home.journey_lead'))}</p>
    </div>

    <ol class="o-stages">
      ${HOME_STAGES.map(([key,labelKey,noteKey],index)=>`<li class="o-stage" data-state="${index<active?'done':index===active?'active':'ahead'}">
        <span class="o-stage-tile" aria-hidden="true">${oIcon(index<active?'check':key==='capture'?'document':key==='draft'?'write':key==='refine'?'undo':'flag')}</span>
        <span class="o-stage-name">${esc(t(labelKey))}</span>
        <span class="o-stage-note">${esc(t(noteKey))}</span>
      </li>`).join('')}
    </ol>

    <div class="o-well">
      <div class="o-well-copy">
        <span class="o-label">${esc(t('home.latest_score'))}</span>
        ${score===null
          ?`<p class="o-panel-copy">${esc(t('home.latest_score_none'))}</p>`
          :`<p class="o-well-figure">${esc(String(score))}</p>
            <div class="o-meter" role="img" aria-label="${attr(String(score))}"><span style="width:${Math.max(0,Math.min(100,score))}%"></span></div>`}
      </div>
      <button id="dashboardJourneyLink" class="o-btn o-btn--outline o-btn--compact" type="button">
        <span>${esc(t('home.view_insights'))}</span>${oIcon('chevronRight')}
      </button>
    </div>
  </section>`;
}

function homeLibrary(items=[]){
  const STAGES=['Emerging','Good','Strong','Mastered'];
  const rows=items.slice(0,4);
  return `<section class="o-card o-panel">
    <h2 class="o-label">${esc(t('home.from_library'))}</h2>
    ${rows.length?`<ul class="o-lib">
      ${rows.map(item=>{
        const stage=String(item.stage||item.mastery||'Emerging');
        const filled=Math.max(1,STAGES.indexOf(stage)+1);
        return `<li class="o-lib-row">
          <span class="o-lib-word">${esc(item.word||'')}</span>
          <span class="o-lib-gloss">${esc(item.translation||item.definition||'')}</span>
          <span class="o-lib-meter" role="img" aria-label="${attr(stage)}">
            ${STAGES.map((_,i)=>`<i${i<filled?' data-on="1"':''}></i>`).join('')}
          </span>
        </li>`;
      }).join('')}
    </ul>`:`<p class="o-panel-copy">${esc(t('home.library_empty'))}</p>`}
  </section>`;
}

export async function renderHome(root){
  document.querySelector('#primaryNav')?.classList.remove('hidden');
  root.innerHTML=`<section class="page">${loadingBlock(5)}</section>`;

  try{
    const [dashboard,essays,memory,recommendation,outcomes,readingHistory,speakingHistory,crossCue]=await Promise.all([
      api.dashboard(),
      api.essays(),
      api.learningMemory(),
      Promise.resolve().then(()=>api.practiceRecommendation()).catch(()=>null),
      api.practiceOutcomes(1),
      Promise.resolve().then(()=>api.readingSessions(8)).catch(()=>null),
      Promise.resolve().then(()=>api.speakingAttempts(1)).catch(()=>null),
      Promise.resolve().then(()=>api.crossSkillCue()).catch(()=>null),
    ]);
    /* The library panel is additive: Home is still useful without it, so a
       failure here degrades that one card rather than the screen. */
    let libraryPayload=null;
    let library=[];
    try{
      const saved=await api.libraryVocabulary();
      libraryPayload=saved;
      library=normalizedLibraryItems(saved);
    }catch{ library=[]; }
    state.dashboard=dashboard;
    state.essays=essays;
    state.memory=memory;
    state.practiceRecommendation=recommendation;
    state.latestPracticeOutcome=outcomes?.latest||null;

    const insight=homeInsight(dashboard,memory,state.language);
    const personalized=recommendation && recommendation.intent!=='baseline';
    const currentEssay=sortedEssays(essays)[0]||null;
    const listeningResume=resumableLesson(state.language);
    const listeningHabit=listeningHabitSnapshot();
    const nextPlan=nextPracticePlan({recommendation,readingHistory,speakingHistory,listeningResume});
    const dueReview=dueLibraryReview(libraryPayload);

    root.innerHTML=`<div class="o-page">
      <div class="o-home">
        ${homeHero(insight,personalized,currentEssay)}
        ${listeningResumeSignal(listeningResume)}
        ${listeningHabitSignal(listeningHabit)}
        ${nextPracticePlanSignal(nextPlan)}
        ${libraryReviewSignal(dueReview)}
        ${crossSkillCueMarkup(crossCue,{learningLanguage:state.language})}
        ${writingDashboardMarkup(dashboard,essays,memory)}

        <div class="o-home-split">
          ${homeJourney(essays,currentEssay)}
          <aside class="o-home-rail">
            <section class="o-card o-panel">
              <h2 class="o-label">${esc(t('home.insight_title'))}</h2>
              <p class="o-quote" aria-hidden="true">&ldquo;</p>
              <p class="o-insight-line">${esc(insight.statement)}</p>
              <p class="o-panel-copy">${esc(insight.context)}</p>
              ${personalized?`<p class="o-panel-copy"><strong>${esc(categoryLabel(recommendation.focus_category||recommendation.focus_label||'expression'))}</strong> · ${esc(practiceModeLabel(recommendation.task_type))}</p>`:''}
              ${practiceDifficultyMarkup(recommendation)}
            </section>
            ${memorySignal(memory)}
            ${reviewCueSignal(memory?.review_cue)}
            ${practiceOutcomeSignal(outcomes?.latest)}
            ${streakCard(dashboard,essays)}
          </aside>
        </div>

        <div class="o-home-split o-home-split--even">
          <section class="o-card o-panel" aria-labelledby="recentHeading">
            ${sectionHeading({
              title:t('home.recent_drafts'),
              id:'recentHeading',
              action:`<button id="journeyLink" class="text-link" type="button">${esc(t('home.journey'))} &rarr;</button>`,
            })}
            ${recentRows(essays)}
          </section>
          ${homeLibrary(library)}
        </div>
      </div>
    </div>`;

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

    root.querySelector('#homePrimary')?.addEventListener('click',async()=>{
      if(hasLocalWritingDraft()){
        go('write');
        return;
      }
      if(!personalized){
        go('write');
        return;
      }
      const button=root.querySelector('#homePrimary');
      try{
        await startRecommendedPractice(button);
      }catch(error){
        root.insertAdjacentHTML('afterbegin',errorBlock(error.message||t('busy.working')));
      }
    });

    root.querySelector('#journeyLink')?.addEventListener('click',()=>go('journey'));
    root.querySelector('#journeyLinkTop')?.addEventListener('click',()=>go('journey'));
    root.querySelector('#dashboardJourneyLink')?.addEventListener('click',()=>go('journey'));
    root.querySelector('#writingDashboardJourneyLink')?.addEventListener('click',()=>go('journey'));
    root.querySelector('[data-home-resume-listening]')?.addEventListener('click',()=>{
      if(!listeningResume?.source_url)return;
      requestLessonAutostart(state.language,listeningResume.source_url,listeningResume);
      go('listen');
    });
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
        const button=nextPlan.kind==='writing'?root.querySelector('#homePrimary'):root.querySelector('[data-home-next-plan-action]');
        try{
          await startRecommendedPractice(button);
        }catch(error){
          root.insertAdjacentHTML('afterbegin',errorBlock(error.message||t('busy.working')));
        }
      }else if(nextPlan.kind==='listening'&&nextPlan.lesson?.source_url){
        requestLessonAutostart(state.language,nextPlan.lesson.source_url,nextPlan.lesson);
        go('listen');
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

    root.querySelectorAll('[data-open-review-cue]').forEach(button=>{
      button.addEventListener('click',()=>openEssay(button.dataset.openReviewCue));
    });

    root.querySelector('[data-open-current]')?.addEventListener('click',()=>openEssay(currentEssay.id));
    root.querySelectorAll('[data-open-essay]').forEach(button=>{
      button.addEventListener('click',()=>openEssay(button.dataset.openEssay));
    });
  }catch(error){
    root.innerHTML=`<section class="page">${errorBlock(error.message)}</section>`;
  }
}
