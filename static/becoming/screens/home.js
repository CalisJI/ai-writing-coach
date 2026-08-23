import {api} from '../api.js';
import {state,saveDraft} from '../store.js';
import {go} from '../router.js';
import {homeInsight,metricOverview} from '../domain/feedback.js';
import {esc,errorBlock,loadingBlock,runBusy,sectionHeading,helpTip} from '../components/primitives.js';
import {t,categoryLabel,masteryLabel,practiceModeLabel,topicLabel,unitLabel} from '../domain/i18n.js';

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

function memorySignal(memory){
  const strength=(memory?.strengths||[])[0];
  const win=(memory?.revision_wins||[])[0];

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

function practiceOutcomeSignal(outcome){
  if(!outcome)return '';
  const key=String(outcome.status||'');
  const supported=new Set([
    'improved','transferred','held','still_working',
    'needs_attention','not_observed','needs_more_evidence',
  ]);
  if(!supported.has(key))return '';

  return `<article class="home-signal-card practice-outcome-signal status-${esc(key)} visual-raised-surface">
    <span class="context-label">${t(`outcome.${key}.kicker`)}</span>
    <strong>${t(`outcome.${key}.title`)}</strong>
    <p>${t(`outcome.${key}.body`,{
      previous:outcome.previous_issue_count??'—',
      count:outcome.issue_count??0,
      focus:outcome.focus_label||t('common.current_focus'),
    })}</p>
    <small>${esc(outcome.focus_label||t('common.current_focus'))} · ${t('outcome.revision')} ${esc(outcome.revision_no||1)}</small>
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

/* Effort reward. `streak` is consecutive days with real written evidence,
   computed server-side from essays.created_at. It reports behaviour only --
   never proficiency -- so it stays inside UIUX contract rule 10 and
   regression rule 16. A zero streak is not rendered: an empty reward is
   discouraging and says nothing. */
function streakMarkup(dashboard){
  const days=Number(dashboard&&dashboard.streak)||0;
  if(days<1)return '';
  const ring=88;                                   // 2*pi*r for r=14
  const offset=Math.round(ring*(1-Math.min(days,7)/7));
  const label=days===1?t('home.streak_day'):t('home.streak_days');
  const note=t('home.streak_note');
  return `<div class="reward-surface home-streak" title="${esc(note)}">
    <span class="reward-ring" style="--reward-ring-offset:${offset};--reward-ring-empty:${ring}" aria-hidden="true">
      <svg width="34" height="34" viewBox="0 0 34 34">
        <circle class="reward-ring-track" cx="17" cy="17" r="14"></circle>
        <circle class="reward-ring-fill" cx="17" cy="17" r="14" stroke-dasharray="${ring}" stroke-dashoffset="${offset}"></circle>
      </svg>
    </span>
    <span class="reward-text">
      <span class="reward-value">${days}</span>
      <span class="reward-label">${esc(label)}</span>
    </span>
  </div>`;
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
      <button id="dashboardJourneyLink" class="button button-secondary" type="button">${t('home.dashboard_open')} <span aria-hidden="true">→</span></button>
    </div>

    <div class="writing-dashboard-layout">
      <div class="dashboard-focus-object">
        <span>${t('home.dashboard_focus')}</span>
        <strong>${esc(focusLabel)}</strong>
        <p>${focus
          ?`${esc(focus.status||'')} · ${esc(focus.total||0)} ${t('common.evidence')} · ${esc(focus.series_count||1)} ${t('common.writing_series')}`
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

export async function renderHome(root){
  document.querySelector('#primaryNav')?.classList.remove('hidden');
  root.innerHTML=`<section class="page">${loadingBlock(5)}</section>`;

  try{
    const [dashboard,essays,memory,recommendation,outcomes]=await Promise.all([
      api.dashboard(),
      api.essays(),
      api.learningMemory(),
      api.practiceRecommendation(),
      api.practiceOutcomes(1),
    ]);
    state.dashboard=dashboard;
    state.essays=essays;
    state.memory=memory;
    state.practiceRecommendation=recommendation;
    state.latestPracticeOutcome=outcomes?.latest||null;

    const insight=homeInsight(dashboard,memory,state.language);
    const personalized=recommendation && recommendation.intent!=='baseline';
    const currentEssay=sortedEssays(essays)[0]||null;

    root.innerHTML=`<section class="page canonical-home">
      <section class="home-editorial-hero">
        <div class="home-editorial-copy">
          ${streakMarkup(dashboard)}
          <div class="action-row home-hero-actions">
            <button id="homePrimary" class="button button-primary">${esc(personalized?t('home.practice_action'):insight.action)}</button>
            <button id="journeyLinkTop" class="button button-secondary" type="button">${t('home.journey')}</button>
          </div>
        </div>
        ${currentWorkFolio(currentEssay,insight)}
      </section>

      ${writingDashboardMarkup(dashboard,essays,memory)}

      <section class="home-composed-grid">
        ${journeyMarkup(essays,memory,currentEssay)}
        <aside class="home-signal-rail">
          ${personalized?`<article class="home-signal-card visual-raised-surface home-next-practice">
            <span class="context-label">${t('home.today_signal')}</span>
            <strong>${esc(categoryLabel(recommendation.focus_category||recommendation.focus_label||'expression'))}</strong>
            <p>${esc(practiceModeLabel(recommendation.task_type))} · ${esc(topicLabel(recommendation.topic))}</p>
            <small>~${esc(recommendation.word_target)} ${esc(unitLabel(state.language))}</small>
          </article>`:''}
          ${memorySignal(memory)}
          ${practiceOutcomeSignal(outcomes?.latest)}
        </aside>
      </section>

      <section class="home-recent-section visual-section-surface" aria-labelledby="recentHeading">
        ${sectionHeading({
          kicker:t('home.recent_work'),
          title:t('home.recent'),
          id:'recentHeading',
          action:`<button id="journeyLink" class="text-link" type="button">${t('home.journey')} →</button>`,
        })}
        ${recentRows(essays)}
      </section>
    </section>`;

    root.querySelector('#homePrimary')?.addEventListener('click',async()=>{
      if(!personalized){
        go('write');
        return;
      }
      const button=root.querySelector('#homePrimary');
      try{
        await runBusy(button,async()=>{
          const task=await api.nextPractice({target_level:state.draft.level||recommendation.target_level||''});
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
            parentEssayId:null,
          });
          state.practiceRecommendation=personalization;
          go('write');
        },{label:t('busy.creating')});
      }catch(error){
        root.insertAdjacentHTML('afterbegin',errorBlock(error.message||t('busy.working')));
      }
    });

    root.querySelector('#journeyLink')?.addEventListener('click',()=>go('journey'));
    root.querySelector('#journeyLinkTop')?.addEventListener('click',()=>go('journey'));
    root.querySelector('#dashboardJourneyLink')?.addEventListener('click',()=>go('journey'));

    async function openEssay(id){
      try{
        const essay=await api.essay(id);
        state.lastEvaluation=essay;
        state.draft={
          ...state.draft,
          text:essay.text||'',
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

    root.querySelector('[data-open-current]')?.addEventListener('click',()=>openEssay(currentEssay.id));
    root.querySelectorAll('[data-open-essay]').forEach(button=>{
      button.addEventListener('click',()=>openEssay(button.dataset.openEssay));
    });
  }catch(error){
    root.innerHTML=`<section class="page">${errorBlock(error.message)}</section>`;
  }
}
