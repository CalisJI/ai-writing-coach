import {api} from '../api.js';
import {state} from '../store.js';
import {go} from '../router.js';
import {metricOverview} from '../domain/feedback.js';
import {esc,errorBlock,loadingBlock,helpTip} from '../components/primitives.js';
import {t,categoryLabel,masteryLabel,statusLabel} from '../domain/i18n.js';
import {masteryObject} from '../components/identity.js';

function groupEssays(rows=[]){
  const groups=new Map();
  for(const row of rows){
    const key=row.series_id||row.id;
    if(!groups.has(key))groups.set(key,[]);
    groups.get(key).push(row);
  }
  return [...groups.values()]
    .map(group=>group.sort((a,b)=>(a.revision_no||1)-(b.revision_no||1)))
    .sort((a,b)=>String(b.at(-1)?.created_at||'').localeCompare(String(a.at(-1)?.created_at||'')));
}

function masteryTags(stage){
  const stages=['Emerging','Developing','Stable','Mastered'];
  const idx=Math.max(0,stages.indexOf(stage));
  return `<div class="mastery-row">${stages.map((item,index)=>`
    <span class="mastery-tag ${index===idx?'current':''}">${esc(masteryLabel(item))}</span>`).join('')}</div>`;
}

function strengthMemory(strengths=[]){
  if(!strengths.length){
    return `<div class="empty-inline">
      <strong>${t('journey.strength_empty')}</strong>
      <p>${t('journey.strength_empty_desc')}</p>
    </div>`;
  }

  return strengths.slice(0,6).map(item=>`
    <article class="mastery-memory-row bc13-row">
      <div class="mastery-memory-head">
        <div>
          <strong>${esc(categoryLabel(item.category))}</strong>
          <span>${t('journey.evidence_series',{
            evidence:item.evidence_count||0,
            series:item.series_count||0,
          })}</span>
        </div>
        <span class="mastery-stage">${esc(masteryLabel(item.stage))}</span>
      </div>
      ${masteryTags(item.stage)}
      ${item.example?`<blockquote>“${esc(item.example)}”</blockquote>`:''}
    </article>`).join('');
}

function patternMemory(patterns=[]){
  const useful=patterns.filter(item=>item.status!=='historical').slice(0,6);
  if(!useful.length){
    return `<p class="journey-quiet-copy">${t('journey.pattern_empty')}</p>`;
  }

  return useful.map(item=>`
    <article class="pattern-memory-row bc13-row">
      <div>
        <strong>${esc(categoryLabel(item.category))}</strong>
        <span>${esc(statusLabel(item.status))}</span>
      </div>
      <p>${t('journey.pattern_series',{
        evidence:item.total||0,
        series:item.series_count||0,
      })}</p>
      ${item.example?`<blockquote>“${esc(item.example)}”</blockquote>`:''}
    </article>`).join('');
}

function writingProgressOverview(dashboard,groups,memory){
  const focus=memory?.focus||null;
  const strengths=memory?.strengths||[];
  const reliable=strengths.filter(item=>['Stable','Mastered'].includes(item.stage)).length;
  const revised=groups.filter(group=>group.length>1).length;
  const latestGroups=groups.slice(0,5);
  const first=latestGroups.at(-1)?.at(-1);
  const latest=latestGroups[0]?.at(-1);
  const movement=first&&latest
    ?Number(latest.overall||0)-Number(first.overall||0)
    :null;
  const leadStage=strengths[0]?.stage||'Emerging';

  return `<section class="writing-progress-overview progress-hero visual-hero-surface" aria-labelledby="writingProgressHeading">
    <div class="progress-hero-layout">
      <div class="progress-core">
        <div class="progress-object-wrap">${masteryObject(leadStage)}</div>
        <div class="progress-core-copy">
          <div class="section-title-row">
            <span class="context-label">${t('journey.progress')}</span>
            ${helpTip(t('journey.tooltip_progress'),t('journey.progress'))}
          </div>
          <h2 id="writingProgressHeading">${t('journey.progress_title')}</h2>
          <p class="progress-focus-label">${t('journey.current_focus')}</p>
          <strong class="progress-focus-value">${esc(focus?categoryLabel(focus.category):t('journey.progress_focus_collecting'))}</strong>
          <p class="progress-focus-proof">${focus
            ?`${esc(statusLabel(focus.status))} · ${t('journey.evidence_series',{evidence:focus.total||0,series:focus.series_count||1})}`
            :t('journey.progress_focus_more')}</p>
        </div>
      </div>

      <div class="progress-support-list" aria-label="${esc(t('journey.progress'))}">
        <article>
          <span>${t('journey.revision_evidence')}</span>
          <strong>${esc(revised)}</strong>
          <p>${t('journey.progress_revision_desc')}</p>
        </article>
        <article>
          <span>${t('journey.reliable_strengths')}</span>
          <strong>${esc(reliable)}</strong>
          <p>${t('journey.progress_strength_desc')}</p>
        </article>
        <article class="quiet">
          <span>${t('journey.benchmark_movement')}</span>
          <strong>${movement==null?'—':`${movement>=0?'+':''}${movement.toFixed(1)}`}</strong>
          <p>${t('journey.progress_benchmark_desc',{level:dashboard.cefr||'—'})}</p>
        </article>
      </div>
    </div>
    <p class="progress-hero-note">${t('journey.progress_note')}</p>
  </section>`;
}

function revisionList(groups=[]){
  if(!groups.length)return `<p>${t('journey.no_saved')}</p>`;

  return groups.slice(0,8).map(group=>{
    const first=group[0];
    const latest=group.at(-1);
    const gain=Number(latest.overall||0)-Number(first.overall||0);
    const label=(latest.prompt||t('common.free_writing')).split('\n').find(Boolean)||t('common.free_writing');
    const gainLabel=`${gain>=0?'+':''}${gain.toFixed(1)}`;

    return `<article class="journey-entry bc13-row">
      <div class="journey-date">${esc(String(latest.created_at||'').slice(0,10))}</div>
      <div>
        <h2>${esc(label)}</h2>
        <p>${group.length>1
          ?t('journey.revision_gain',{
            before:first.overall,
            after:latest.overall,
            count:group.length,
            gain:gainLabel,
          })
          :t('journey.revision_single')}</p>
        <button class="text-link" data-journey-essay="${latest.id}" type="button">${t('journey.open_latest')}</button>
      </div>
    </article>`;
  }).join('');
}

export async function renderJourney(root){
  root.innerHTML=`<section class="page">${loadingBlock(5)}</section>`;
  try{
    const [dashboard,essays,memory]=await Promise.all([
      api.dashboard(),
      api.essays(),
      api.learningMemory(),
    ]);
    state.dashboard=dashboard;
    state.essays=essays;
    state.memory=memory;

    const groups=groupEssays(essays);
    const strengths=memory.strengths||[];
    const patterns=memory.patterns||[];
    const metrics=metricOverview(dashboard);
    const leadStage=strengths[0]?.stage||'Emerging';
    const hasWriting=groups.length>0;

    root.innerHTML=`<section class="page">
      <header class="journey-header">
        <span class="editorial-kicker">${t('journey.kicker')}</span>
        <h1 class="editorial-title">${t('journey.title')}</h1>
        <p class="editorial-lead">${t('journey.lead')}</p>
      </header>

      ${!hasWriting?`
        <div class="empty-state">
          <h2>${t('journey.empty_title')}</h2>
          <p>${t('journey.empty_body')}</p>
          <button id="journeyStart" class="button button-primary">${t('journey.start')}</button>
        </div>
      `:`
        ${writingProgressOverview(dashboard,groups,memory)}

        <section class="journey-memory-section journey-section-surface visual-raised-surface">
          <div class="milestone-intro milestone-intro-secondary">
            <div>
              <span class="context-label">${t('journey.positive')}</span>
              <h2 class="journey-section-title">${t('journey.positive_title')}</h2>
              <p class="journey-section-copy">${t('journey.positive_body')}</p>
            </div>
          </div>
          <div class="mastery-memory-list bc13-list-frame">${strengthMemory(strengths)}</div>
          <p class="memory-disclaimer">${t('journey.mastery_disclaimer')}</p>
        </section>

        <div class="section-rule"></div>

        <section class="journey-memory-grid journey-section-surface visual-section-surface">
          <div>
            <span class="context-label">${t('journey.attention')}</span>
            <h2 class="journey-section-title">${t('journey.attention_title')}</h2>
            <div class="pattern-memory-list bc13-list-frame">${patternMemory(patterns)}</div>
          </div>
          <aside>
            <div class="section-title-row">
              <span class="context-label">${t('journey.benchmark')}</span>
              ${helpTip(t('journey.tooltip_benchmark'),t('journey.benchmark'))}
            </div>
            <h2 class="journey-benchmark-title">${esc(dashboard.cefr||'—')} ${t('common.estimated')}</h2>
            <p class="journey-section-copy">${t('journey.benchmark_note')}</p>
            <div class="quiet-metric-list">
              ${metrics.map(item=>`<div><span>${esc(categoryLabel(item.key||item.label))}</span><strong>${esc(item.value)}</strong></div>`).join('')}
            </div>
          </aside>
        </section>

        <div class="section-rule"></div>

        <section class="journey-list journey-section-surface visual-section-surface bc13-list-frame" aria-labelledby="journeyEvidenceHeading">
          <span class="context-label">${t('journey.before_now')}</span>
          <h2 id="journeyEvidenceHeading" class="journey-section-title">${t('journey.before_now_title')}</h2>
          ${revisionList(groups)}
        </section>
      `}
    </section>`;

    root.querySelector('#journeyStart')?.addEventListener('click',()=>go('write'));
    root.querySelectorAll('[data-journey-essay]').forEach(button=>{
      button.addEventListener('click',async()=>{
        const essay=await api.essay(button.dataset.journeyEssay);
        state.lastEvaluation=essay;
        state.draft={
          ...state.draft,
          text:essay.text||'',
          prompt:essay.prompt||'',
          parentEssayId:essay.id,
          level:essay.target_cefr||state.draft.level,
        };
        go('review');
      });
    });
  }catch(error){
    root.innerHTML=`<section class="page">${errorBlock(error.message)}</section>`;
  }
}
