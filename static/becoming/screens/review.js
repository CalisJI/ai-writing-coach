import {api} from '../api.js';
import {state,saveDraft} from '../store.js';
import {go} from '../router.js';
import {metricsFrom,weakestMetric,benchmarkLabel,changedSegments} from '../domain/feedback.js';
import {guidanceMode,guidanceLabel,feedbackBudget} from '../domain/adaptive.js';
import {highlightedLearnerText,bindEvidenceLinks,sentenceContext,feedbackCategoryKey} from '../domain/feedback-map.js';
import {esc,errorBlock,loadingBlock,metricRows,showDialog,toast,helpTip,runBusy,spinner,setBusy} from '../components/primitives.js';
import {supportCopy,supportNote,categoryReason,categoryRule,nativeLanguage} from '../domain/support.js';
import {openDictionary} from '../components/dictionary.js';
import {t,uiLocale,categoryLabel,unitLabel} from '../domain/i18n.js';
import {countUnits} from '../language.js';
import {attr} from '../components/primitives.js';
import {oIcon} from '../orena/icons.js';
import {installDisclosures} from '../orena/shell.js';

function reviewInfo(text){
  if(!text)return '';
  return `<button class="o-info" type="button" tabindex="0" data-tooltip="${attr(text)}" aria-label="${attr(t('chrome.details'))}">${oIcon('info')}</button>`;
}

function grammarTransferBlock(result={}){
  const links=Array.isArray(result.grammar_links)?result.grammar_links:[];
  if(!links.length)return '';
  return `<section class="o-card o-panel review-grammar-transfer">
    <h2 class="o-label">${esc(t('review.grammar_transfer'))}</h2>
    <ul class="o-issues">${links.slice(0,4).map(link=>`<li class="o-issue">
      <div class="o-issue-head"><strong>${esc(link.title||link.grammar_id||'Grammar')}</strong><span>${esc(link.level||'')}</span></div>
      <p class="o-panel-copy">${esc(link.reason||'')}</p>
      <button type="button" class="o-btn o-btn--outline o-btn--compact" data-open-grammar="${attr(link.grammar_id||'')}">${esc(t('review.open_grammar'))}</button>
      <button type="button" class="o-btn o-btn--primary o-btn--compact" data-practice-grammar="${attr(link.grammar_id||'')}">${esc(t('review.practice_grammar'))}</button>
    </li>`).join('')}</ul>
  </section>`;
}

function patternName(item={}){
  return categoryLabel(item.category||'expression');
}

function feedbackCategoryLegend(errors=[]){
  const categories=[
    ...new Set((errors||[]).map(item=>feedbackCategoryKey(item?.category))),
  ];
  if(!categories.length)return '';
  return `<div class="feedback-category-legend" aria-label="${esc(t('review.feedback_aria'))}">
    ${categories.map(category=>`<span class="feedback-category-legend-item feedback-category-${esc(category)}">
      <i aria-hidden="true"></i><span>${esc(categoryLabel(category))}</span>
    </span>`).join('')}
  </div>`;
}

function diffMarkup(before='',after='',language='en'){
  if(!before||!after)return '';
  const parts=changedSegments(before,after,language);
  const beforeHtml=`${esc(parts.beforePrefix)}${parts.beforeChange?`<mark class="change-before">${esc(parts.beforeChange)}</mark>`:''}${esc(parts.beforeSuffix)}`;
  const afterHtml=`${esc(parts.afterPrefix)}${parts.afterChange?`<mark class="change-after">${esc(parts.afterChange)}</mark>`:''}${esc(parts.afterSuffix)}`;

  return `<div class="feedback-change">
    <div><span>${t('common.before')}</span><p>${beforeHtml}</p></div>
    <div><span>${t('common.better')}</span><p>${afterHtml}</p></div>
  </div>`;
}

function feedbackExplanation(item={}){
  const locale=nativeLanguage(state.profile||{});
  const concrete=categoryReason(item.category,state.profile||{});
  if(locale==='vi' && item.explanation_vi){
    const original=String(item.explanation_vi).trim();
    if(!original)return concrete;
    if(original.toLocaleLowerCase().includes(concrete.toLocaleLowerCase()))return original;
    return `${original} ${concrete}`;
  }
  return concrete;
}

function feedbackRule(item={}){
  const locale=nativeLanguage(state.profile||{});
  const reusable=categoryRule(item.category,state.profile||{});
  if(locale==='vi' && item.mini_rule_vi){
    const original=String(item.mini_rule_vi).trim();
    if(!original)return reusable;
    if(original.toLocaleLowerCase().includes(reusable.toLocaleLowerCase()))return original;
    return `${original} ${reusable}`;
  }
  return reusable;
}

function pinyinPlaceholder(term='',key=''){
  if(
    state.language!=='zh'
    || state.profile?.pinyin==='off'
    || !String(term||'').trim()
  )return '';

  return `<div class="review-pinyin" data-pinyin-key="${esc(key)}" data-pinyin-term="${esc(String(term).trim().slice(0,180))}">
    ${spinner(t('busy.loading_pinyin'))}
  </div>`;
}

async function hydrateReviewPinyin(root){
  if(state.language!=='zh'||state.profile?.pinyin==='off')return;

  const nodes=[...root.querySelectorAll('[data-pinyin-term]')];
  const cache=new Map();

  await Promise.all(nodes.map(async node=>{
    const term=node.dataset.pinyinTerm||'';
    if(!term)return;

    try{
      let payload=cache.get(term);
      if(!payload){
        payload=api.dictionary(term);
        cache.set(term,payload);
      }
      const resolved=await payload;
      const phonetic=String(resolved?.phonetic||'').trim();
      node.innerHTML=phonetic
        ?`<span class="review-pinyin-label">${t('review.pinyin_label')}</span><strong>${esc(phonetic)}</strong>`
        :`<span class="review-pinyin-unavailable">${t('review.pinyin_unavailable')}</span>`;
    }catch{
      node.innerHTML=`<span class="review-pinyin-unavailable">${t('review.pinyin_unavailable')}</span>`;
    }
  }));
}

function evidenceItems(errors=[],{
  start=0,
  count=3,
  showRule=true,
  learnerText='',
}={}){
  const prioritized=(errors||[]).slice(start,start+count);
  if(!prioritized.length){
    return `<p class="review-density-note">${t('review.no_extra_evidence')}</p>`;
  }

  return `<div class="evidence-list contextual">${prioritized.map((item,offset)=>{
    const index=start+offset;
    const sentence=sentenceContext(learnerText,item.fragment||'');
    const explanation=feedbackExplanation(item);
    const rule=feedbackRule(item);
    const lookupLabel=state.language==='zh'?`Pinyin · ${t('review.lookup')}`:t('review.lookup');

    const category=feedbackCategoryKey(item.category);
    return `<article class="evidence-item contextual feedback-category-${esc(category)}" tabindex="0" data-feedback-key="error-${index}" data-feedback-category="${esc(category)}">
      <div class="evidence-item-head">
        <span class="pattern-label">${esc(patternName(item))}</span>
        ${helpTip(supportCopy('current_focus_tip',state.profile||{}),t('common.current_focus'))}
      </div>
      ${sentence?`<div class="feedback-sentence-context">
        <span>${t('review.sentence_context')}</span>
        <p>“${esc(sentence)}”</p>
      </div>`:`<blockquote>“${esc(item.fragment||t('review.evidence_unavailable'))}”</blockquote>`}

      ${item.suggestion?diffMarkup(item.fragment||sentence,item.suggestion,state.language):''}
      ${pinyinPlaceholder(item.suggestion||item.fragment,`error-${index}`)}

      <div class="feedback-anatomy">
        <div class="feedback-anatomy-row"><span>${t('common.why')}</span><p>${esc(explanation)}</p></div>
        ${showRule?`<div class="feedback-anatomy-row rule"><span>${t('common.reuse')}</span><p>${esc(rule)}</p></div>`:''}
      </div>

      <div class="feedback-item-actions">
        <button class="text-link feedback-lookup" type="button" data-lookup-feedback="${index}">${esc(lookupLabel)}</button>
        ${item.suggestion&&String(item.suggestion).trim().length<=180
          ?`<button class="text-link feedback-save-library" type="button" data-save-library="${index}">${t('review.save_better')}</button>`
          :''}
      </div>
    </article>`;
  }).join('')}</div>`;
}

function strengthEvidenceItems(items=[]){
  if(!items.length)return '';

  return `<div class="strength-evidence-list">${items.slice(0,3).map((item,index)=>`
    <article class="strength-evidence-item" tabindex="0" data-feedback-key="strength-${index}">
      <div class="evidence-item-head">
        <span class="strength-evidence-label">${esc(categoryLabel(item.category||'strength'))}</span>
        ${helpTip(supportCopy('strength_tip',state.profile||{}),t('review.already_working'))}
      </div>
      <blockquote>“${esc(item.fragment||'')}”</blockquote>
      ${pinyinPlaceholder(item.fragment,`strength-${index}`)}
      <p>${esc(
        nativeLanguage(state.profile||{})==='vi' && item.explanation_vi
          ?item.explanation_vi
          :categoryReason(item.category,state.profile||{})
      )}</p>
      <div class="feedback-item-actions">
        <button class="text-link feedback-lookup" type="button" data-lookup-strength="${index}">${state.language==='zh'?`Pinyin · ${t('review.lookup')}`:t('review.lookup')}</button>
        ${item.fragment&&String(item.fragment).trim().length<=180
          ?`<button class="text-link feedback-save-library" type="button" data-save-strength="${index}">${t('review.save_useful')}</button>`
          :''}
      </div>
    </article>`).join('')}</div>`;
}

function practiceOutcomeBlock(outcome){
  if(!outcome)return '';

  const key=String(outcome.status||'');
  const supported=new Set([
    'improved','transferred','held','still_working',
    'needs_attention','not_observed','needs_more_evidence',
  ]);
  if(!supported.has(key))return '';

  const evidence=(outcome.strength_evidence||[])[0]||(outcome.error_evidence||[])[0]||'';
  return `<section class="insight-block practice-check status-${esc(key)}">
    <span class="context-label">${t(`outcome.${key}.kicker`)}</span>
    <h2>${t(`outcome.${key}.title`)}</h2>
    <p>${t(`outcome.${key}.body`,{
      previous:outcome.previous_issue_count??'—',
      count:outcome.issue_count??0,
      focus:outcome.focus_label||t('common.current_focus'),
    })}</p>
    <div class="practice-check-meta">
      <span>${esc(outcome.focus_label||t('common.current_focus'))}</span>
      <span>${t('outcome.revision')} ${esc(outcome.revision_no||1)}</span>
    </div>
    ${evidence?`<blockquote>“${esc(evidence)}”</blockquote>`:''}
  </section>`;
}

function disclosure(result,budget,learnerText=''){
  const metrics=metricsFrom(result);
  const priorities=(result.priorities_vi||[]).slice(1);
  const errors=result.errors||[];
  const extra=errors.slice(
    budget.visibleEvidence,
    budget.visibleEvidence+budget.extraEvidence,
  );

  return `<div class="disclosure">
    <details ${budget.showMetrics?'open':''}>
      <summary><span>${t('review.benchmark_estimate')}</span><span>${esc(benchmarkLabel(result)||t('review.not_available'))}</span></summary>
      <div class="detail-body">
        <p>${t('review.benchmark_note')}</p>
        <div class="metric-list">${metricRows(metrics)}</div>
      </div>
    </details>

    <details>
      <summary><span>${t('review.more_priorities')}</span><span>${priorities.length}</span></summary>
      <div class="detail-body">
        ${priorities.length?`<ul>${priorities.map(item=>`<li>${esc(item)}</li>`).join('')}</ul>`:`<p>${t('review.no_priority')}</p>`}
      </div>
    </details>

    <details>
      <summary><span>${t('review.more_evidence')}</span><span>${extra.length}</span></summary>
      <div class="detail-body">
        ${extra.length?evidenceItems(errors,{
          start:budget.visibleEvidence,
          count:budget.extraEvidence,
          showRule:budget.showRule,
          learnerText,
        }):`<p>${t('review.no_more_evidence')}</p>`}
      </div>
    </details>
  </div>`;
}

const POS_LENS_KEY='becoming.pos-lens.v1';

function posLensEnabled(){
  try{
    return localStorage.getItem(POS_LENS_KEY)==='on';
  }catch{
    return false;
  }
}

function savePosLensPreference(enabled){
  try{
    localStorage.setItem(POS_LENS_KEY,enabled?'on':'off');
  }catch{}
}

function posLegend(className='pos-legend'){
  const groups=[
    ['noun','review.pos_group_noun'],
    ['verb','review.pos_group_verb'],
    ['modifier','review.pos_group_modifier'],
    ['connector','review.pos_group_connector'],
    ['reference','review.pos_group_reference'],
    ['number','review.pos_group_number'],
  ];
  return `<div class="${className}" aria-label="${esc(t('review.pos_legend'))}">
    ${groups.map(([group,key])=>`<span><i class="pos-swatch pos-${group}" aria-hidden="true"></i>${esc(t(key))}</span>`).join('')}
  </div>`;
}

export async function installLinguisticLens(root,{
  essayId,
  learnerText,
  errors,
  strengths,
}={}){
  const textNode=root.querySelector('#learnerTextEvidence');
  const toggle=root.querySelector('#posLensToggle');
  const status=root.querySelector('#posLensStatus');
  const legend=root.querySelector('#posLensLegend');
  const lens=root.querySelector('#posLens');
  if(!textNode||!toggle)return;

  let enabled=posLensEnabled();
  let annotations=[];
  let loaded=false;
  let unavailable=false;

  const renderText=()=>{
    textNode.innerHTML=highlightedLearnerText(
      learnerText,
      errors,
      strengths,
      enabled?annotations:[],
    );
    bindEvidenceLinks(root);
  };

  const syncUi=()=>{
    const viewState=unavailable?'unavailable':enabled?(loaded?'ready':'loading'):'off';
    lens?.setAttribute('data-state',viewState);
    lens?.classList.toggle('active',viewState==='ready');
    toggle.setAttribute('aria-pressed',enabled?'true':'false');
    toggle.textContent=enabled?t('review.pos_hide'):t('review.pos_show');
    legend?.classList.toggle('hidden',!(enabled&&loaded&&annotations.length));
    if(status){
      if(unavailable)status.textContent=t('review.pos_unavailable');
      else if(!enabled)status.textContent=t('review.pos_off');
    }
  };

  async function load(){
    if(!enabled||loaded)return;
    if(!essayId){
      enabled=false;
      unavailable=true;
      syncUi();
      return;
    }

    unavailable=false;
    syncUi();
    setBusy(toggle,true,{label:t('review.pos_loading')});
    if(status)status.textContent=t('review.pos_loading');

    try{
      const payload=await api.linguisticAnnotations(essayId);
      if(!payload?.found){
        throw new Error(t('review.pos_unavailable'));
      }
      annotations=Array.isArray(payload.annotations)?payload.annotations:[];
      loaded=true;
      renderText();
      if(status){
        status.textContent=payload.truncated
          ?t('review.pos_partial')
          :t('review.pos_ready');
      }
    }catch(error){
      enabled=false;
      unavailable=true;
      loaded=false;
      annotations=[];
      renderText();
      toast(error.message||t('review.pos_unavailable'));
    }finally{
      setBusy(toggle,false);
      syncUi();
    }
  }

  toggle.addEventListener('click',async()=>{
    enabled=!enabled;
    savePosLensPreference(enabled);
    if(!enabled){
      renderText();
      syncUi();
      return;
    }
    syncUi();
    await load();
  });

  syncUi();
  if(enabled)await load();
}

function installMobileSheet(root){
  const trigger=root.querySelector('#mobileFeedbackTrigger');
  const sheet=root.querySelector('#reviewSide');
  const backdrop=root.querySelector('#reviewSheetBackdrop');
  const close=root.querySelector('#mobileSheetClose');
  if(!trigger||!sheet||!backdrop||!close)return;

  let previousFocus=null;

  function setOpen(open){
    if(open){
      previousFocus=document.activeElement;
      sheet.classList.add('open');
      backdrop.classList.add('open');
      document.body.classList.add('review-sheet-open');
      trigger.setAttribute('aria-expanded','true');
      backdrop.setAttribute('aria-hidden','false');
      requestAnimationFrame(()=>close.focus());
    }else{
      sheet.classList.remove('open');
      backdrop.classList.remove('open');
      document.body.classList.remove('review-sheet-open');
      trigger.setAttribute('aria-expanded','false');
      backdrop.setAttribute('aria-hidden','true');
      if(previousFocus instanceof HTMLElement)previousFocus.focus();
    }
  }

  trigger.addEventListener('click',()=>setOpen(true));
  close.addEventListener('click',()=>setOpen(false));
  backdrop.addEventListener('click',()=>setOpen(false));

  const keyHandler=event=>{
    if(event.key==='Escape'&&sheet.classList.contains('open'))setOpen(false);
  };
  document.addEventListener('keydown',keyHandler,{once:false});

  root._cleanupReviewSheet=()=>{
    document.removeEventListener('keydown',keyHandler);
    document.body.classList.remove('review-sheet-open');
  };
}

/* ---------------------------------------------------------------------------
 * Review, rebuilt against docs/visual-references/Orena-prod/ORENA-WRITING-
 * REIVEW-*. The reference reads the piece as one document with the findings
 * numbered in the margin, rather than as a stack of separate feedback cards.
 *
 * What the reference could not know, and this build has to be honest about:
 *
 *  - The reference prints a score of 7.5. The evaluator returns 0-100 with one
 *    decimal, and Home and Journey both show that scale. Showing 7.5 here would
 *    mean two scales for the same number, so the real one is used.
 *  - The reference labels each issue High / Medium / Low, which reads as
 *    severity. The evaluator does not return severity; it returns `confidence`
 *    in the evidence. The chip carries confidence and says so in its tooltip,
 *    because relabelling it severity would assert something the data does not.
 *  - The compact list in the reference hides the quote, the correction and the
 *    save action that this screen already has. Each row expands instead of
 *    dropping them.
 * ------------------------------------------------------------------------ */

/* The same six-step ladder Writing uses for the level chip. */
const BAND_TIERS={
  A1:'beginner',A2:'elementary',B1:'intermediate',
  B2:'upper',C1:'advanced',C2:'proficient',
  HSK1:'beginner',HSK2:'beginner',HSK3:'elementary',
  HSK4:'intermediate',HSK5:'upper',HSK6:'advanced','HSK7-9':'proficient',
};

function bandLabel(level){
  const tier=BAND_TIERS[String(level||'').toUpperCase()]||BAND_TIERS[level];
  return tier?t(`band.${tier}`):'';
}

function scoreBand(overall){
  const value=Number(overall);
  if(!Number.isFinite(value))return '';
  if(value>=90)return t('review.score_excellent');
  if(value>=78)return t('review.score_strong');
  if(value>=65)return t('review.score_good');
  if(value>=50)return t('review.score_fair');
  return t('review.score_weak');
}

/* The evaluator reports confidence in the evidence, not severity of the
   mistake. Bands mirror the confidence filter the backend already applies. */
function confidenceBand(item={}){
  const value=Number(item.confidence);
  if(!Number.isFinite(value))return 'medium';
  if(value>=0.8)return 'high';
  if(value>=0.6)return 'medium';
  return 'low';
}

function reviewSummaryText(result,focusMetric,strengthEvidence){
  const locale=nativeLanguage(state.profile||{});
  const written=locale==='vi'?(result.priorities_vi||'') : '';
  if(typeof written==='string'&&written.trim())return written.trim();
  const strong=strengthEvidence[0]?categoryLabel(strengthEvidence[0].category):'';
  const focus=focusMetric?categoryLabel(focusMetric.key||focusMetric):'';
  if(strong&&focus)return t('review.summary_focus',{strong,focus});
  return t('review.summary_plain');
}

function reviewPromptBlock(result){
  const text=String(result.prompt||state.draft.prompt||'').trim();
  const level=result.target_cefr||state.draft.level||'';
  return `<article class="o-card o-prompt">
    <span class="o-prompt-tile" aria-hidden="true">${oIcon('document')}</span>
    <div class="o-prompt-body">
      <span class="o-prompt-kicker">${esc(t('write.prompt'))}</span>
      <p class="o-prompt-text">${text?esc(text):esc(t('write.no_prompt'))}</p>
      <div class="o-prompt-foot">
        ${level?`<span class="o-chip">${esc(level)}</span>`:''}
        ${level&&bandLabel(level)?`<span class="o-prompt-level">${esc(bandLabel(level))}</span>`:''}
        <button id="reviewRubric" class="o-btn o-btn--outline o-btn--compact" type="button">${oIcon('rubric')}<span>${esc(t('write.view_rubric'))}</span></button>
      </div>
    </div>
  </article>`;
}

/* One issue row: compact at rest, and carrying the full evidence when opened.
   The number matches the badge on the mark inside the learner's text. */
function issueRow(item,index,learnerText){
  const band=confidenceBand(item);
  const category=feedbackCategoryKey(item.category);
  const sentence=sentenceContext(learnerText,item.fragment||'');
  const lookupLabel=state.language==='zh'?`Pinyin · ${t('review.lookup')}`:t('review.lookup');
  const canSave=item.suggestion&&String(item.suggestion).trim().length<=180;

  return `<li class="o-issue o-disclosure feedback-category-${esc(category)}"
      data-collapsible="always" data-open="false"
      data-feedback-key="error-${index}" data-feedback-category="${esc(category)}">
    <button class="o-disclosure__toggle o-issue-head" type="button">
      <span class="o-issue-mark" data-band="${esc(band)}" aria-hidden="true">${index+1}</span>
      <span class="o-issue-name">${esc(patternName(item))}</span>
      <span class="o-chip o-chip--${esc(band)}">${esc(t('review.confidence_'+band))}</span>
      ${oIcon('chevronUp')}
    </button>
    <div class="o-disclosure__body o-issue-body">
      <blockquote>“${esc(item.fragment||sentence||t('review.evidence_unavailable'))}”</blockquote>
      ${item.suggestion?diffMarkup(item.fragment||sentence,item.suggestion,state.language):''}
      ${pinyinPlaceholder(item.suggestion||item.fragment,`error-${index}`)}
      <p class="o-issue-why">${esc(feedbackExplanation(item))}</p>
      <p class="o-issue-rule">${esc(feedbackRule(item))}</p>
      <div class="o-issue-actions">
        <button class="text-link feedback-lookup" type="button" data-lookup-feedback="${index}">${esc(lookupLabel)}</button>
        ${canSave?`<button class="text-link feedback-save-library" type="button" data-save-library="${index}">${t('review.save_better')}</button>`:''}
      </div>
    </div>
  </li>`;
}

function strengthRow(item,index){
  const canSave=item.fragment&&String(item.fragment).trim().length<=180;
  return `<li class="o-strength o-disclosure" data-collapsible="always" data-open="false"
      data-feedback-key="strength-${index}">
    <button class="o-disclosure__toggle o-strength-head" type="button">
      <span class="o-strength-tick" aria-hidden="true">${oIcon('check')}</span>
      <span>${esc(categoryLabel(item.category||'strength'))}</span>
      ${oIcon('chevronUp')}
    </button>
    <div class="o-disclosure__body o-issue-body">
      <blockquote>“${esc(item.fragment||'')}”</blockquote>
      ${pinyinPlaceholder(item.fragment,`strength-${index}`)}
      <p class="o-issue-why">${esc(
        nativeLanguage(state.profile||{})==='vi'&&item.explanation_vi
          ?item.explanation_vi
          :categoryReason(item.category,state.profile||{})
      )}</p>
      <div class="o-issue-actions">
        <button class="text-link feedback-lookup" type="button" data-lookup-strength="${index}">${state.language==='zh'?`Pinyin · ${t('review.lookup')}`:t('review.lookup')}</button>
        ${canSave?`<button class="text-link feedback-save-library" type="button" data-save-strength="${index}">${t('review.save_useful')}</button>`:''}
      </div>
    </div>
  </li>`;
}

export async function renderReview(root){
  if(typeof root._cleanupReviewSheet==='function')root._cleanupReviewSheet();

  let result=state.lastEvaluation;

  if(!result&&state.draft.parentEssayId){
    root.innerHTML=`<section class="page">${loadingBlock(4)}</section>`;
    try{
      result=await api.essay(state.draft.parentEssayId);
      state.lastEvaluation=result;
    }catch(error){
      root.innerHTML=`<section class="page">${errorBlock(error.message)}</section>`;
      return;
    }
  }

  if(!result){
    root.innerHTML=`<section class="page empty-state">
      <p class="editorial-lead">${t('review.empty_body')}</p>
      <div class="action-row" style="margin-top:32px"><button id="reviewWrite" class="button button-primary">${t('review.go_write')}</button></div>
    </section>`;
    root.querySelector('#reviewWrite').addEventListener('click',()=>go('write'));
    return;
  }

  if(result.id && result.practice_outcome===undefined){
    try{
      const outcomePayload=await api.practiceOutcome(result.id);
      result.practice_outcome=outcomePayload?.outcome||null;
    }catch{
      result.practice_outcome=null;
    }
  }

  const learnerText=state.draft.text||result.text||'';
  const level=result.target_cefr||state.draft.level||'';
  const mode=guidanceMode(state.profile||{},state.language,level);
  const budget=feedbackBudget(mode);
  const errors=result.errors||[];
  const strengthEvidence=result.strength_evidence||[];
  const locale=nativeLanguage(state.profile||{});
  const benchmark=benchmarkLabel(result);
  // OREN-15 removed this screen's editorial header and, with it, the insight
  // object it came from -- but two non-editorial references to that object's
  // weakest-metric field were left behind, so Review died with
  // "insight is not defined" before rendering anything at all. Only the
  // weakest metric is still needed, so compute it directly rather than
  // restoring a header the UI-02 contract forbids.
  const focusMetric=weakestMetric(metricsFrom(result));

  const strength=(locale==='vi'&&(result.strengths_vi||[])[0])
    ||(strengthEvidence[0]
      ?categoryReason(strengthEvidence[0].category,state.profile||{})
      :'Your work contains useful evidence of what is already working.');

  const visibleErrors=errors.slice(0,budget.visibleEvidence);
  const visibleStrengths=strengthEvidence.slice(0,3);
  const units=countUnits(learnerText,state.language);

  root.innerHTML=`<div class="o-page guidance-${esc(mode)}">
    <div class="o-review">
      <div class="o-review-main">
        ${reviewPromptBlock(result)}

        <section class="o-card o-doc">
          <div class="o-doc-tabs" role="tablist" aria-label="${attr(t('review.tab_review'))}">
            <button class="o-doc-tab" type="button" role="tab" aria-selected="false" data-doc-tab="draft">${esc(t('review.tab_draft'))}</button>
            <button class="o-doc-tab is-active" type="button" role="tab" aria-selected="true" data-doc-tab="review">${esc(t('review.tab_review'))}</button>
            <span class="o-doc-count">${units} ${esc(unitLabel(state.language))}</span>
            <button id="editDraftButton" class="o-btn o-btn--outline o-btn--compact" type="button">${oIcon('write')}<span>${esc(t('review.edit_draft'))}</span></button>
          </div>

          <div id="learnerTextEvidence" class="o-doc-body learner-text contextual ${state.language==='zh'?'cjk':''}" lang="${state.language==='zh'?'zh-Hans':'en'}" data-doc-view="review">${highlightedLearnerText(learnerText,visibleErrors,visibleStrengths,[])}</div>
          <div class="o-doc-body o-doc-plain hidden ${state.language==='zh'?'cjk':''}" data-doc-view="draft">${esc(learnerText)}</div>

          ${state.language==='zh'&&state.profile?.pinyin!=='off'?`<section class="review-pinyin-summary o-review-pinyin-summary" aria-labelledby="reviewPinyinHeading">
            <div class="section-title-row">
              <span id="reviewPinyinHeading" class="context-label">${esc(t('review.pinyin_title'))}</span>
              ${reviewInfo(t('profile.pinyin_desc'))}
            </div>
            <p>${esc(t('review.pinyin_desc'))}</p>
            <div class="review-pinyin-overview">
              ${visibleErrors.map((item,index)=>{
                const term=String(item.suggestion||item.fragment||'').trim();
                if(!term)return '';
                return `<div class="review-pinyin-overview-row"><span>${esc(term)}</span>${pinyinPlaceholder(term,`overview-error-${index}`)}</div>`;
              }).join('')}
              ${!visibleErrors.length?visibleStrengths.slice(0,2).map((item,index)=>{
                const term=String(item.fragment||'').trim();
                if(!term)return '';
                return `<div class="review-pinyin-overview-row"><span>${esc(term)}</span>${pinyinPlaceholder(term,`overview-strength-${index}`)}</div>`;
              }).join(''):''}
            </div>
          </section>`:''}

          <div id="posLens" class="o-lens" data-state="off" aria-labelledby="posLensTitle">
            <span class="o-lens-mark" aria-hidden="true">Aa</span>
            <span class="o-lens-copy">
              <span class="o-label">${esc(t('review.pos_kicker'))}</span>
              <strong id="posLensTitle">${esc(t('review.pos_title'))}</strong>
              <small id="posLensStatus" aria-live="polite">${esc(t('review.pos_off'))}</small>
              ${posLegend('pos-preview')}
            </span>
            <button id="posLensToggle" class="o-btn o-btn--outline o-btn--compact" type="button" aria-pressed="false">${esc(t('review.pos_show'))}</button>
          </div>
          <div id="posLensLegend" class="hidden o-lens-legend">${posLegend()}</div>

          <div class="o-doc-foot">
            <button id="downloadFeedback" class="o-btn o-btn--outline" type="button">${oIcon('cloud')}<span>${esc(t('review.download_feedback'))}</span></button>
            <button id="reviseButton" class="o-btn o-btn--primary" type="button"><span>${esc(t('review.revise_title'))}</span>${oIcon('arrowRight')}</button>
          </div>
        </section>
      </div>

      <aside class="o-review-aside" aria-label="${attr(t('review.summary_title'))}">
        <section class="o-card o-panel">
          <h2 class="o-label">${esc(t('review.summary_title'))}${reviewInfo(t('review.summary_help'))}</h2>
          <p class="o-score">${esc(Number.isFinite(Number(result.overall))?String(result.overall):'—')}</p>
          <p class="o-score-band">${esc(scoreBand(result.overall))}${benchmark?` · ${esc(benchmark)}`:''}</p>
          <p class="o-panel-copy">${esc(reviewSummaryText(result,focusMetric,strengthEvidence))}</p>
          <button id="fullRubricButton" class="o-btn o-btn--outline o-btn--compact" type="button">${esc(t('review.view_full_rubric'))}</button>
        </section>

        <section class="o-card o-panel">
          <h2 class="o-label">${esc(t('review.priority_issues'))}${reviewInfo(t('review.priority_help'))}</h2>
          ${visibleErrors.length
            ?`<ol class="o-issues">${visibleErrors.map((item,index)=>issueRow(item,index,learnerText)).join('')}</ol>`
            :`<p class="o-panel-copy">${esc(t('review.no_issues'))}</p>`}
        </section>

        ${visibleStrengths.length?`<section class="o-card o-panel">
          <h2 class="o-label">${esc(t('review.strengths_title'))}</h2>
          <ul class="o-strengths">${visibleStrengths.map((item,index)=>strengthRow(item,index)).join('')}</ul>
        </section>`:''}

        ${practiceOutcomeBlock(result.practice_outcome)}

        ${grammarTransferBlock(result)}

        <section class="o-card o-panel">
          <h2 class="o-label">${esc(t('review.whats_next'))}</h2>
          <p class="o-panel-copy">${esc(t('review.whats_next_body'))}</p>
          <button id="startRevision" class="o-btn o-btn--outline" type="button">${esc(t('review.start_revision'))}</button>
          <button id="polishButton" class="o-btn o-btn--outline o-btn--compact" type="button">${esc(t('review.strong_compare'))}</button>
        </section>
      </aside>
    </div>
  </div>`;

  installDisclosures(root);
  root.querySelectorAll('[data-open-grammar]').forEach(button=>button.addEventListener('click',()=>{
    const lessonId=button.dataset.openGrammar;
    if(!lessonId)return;
    try{ localStorage.setItem('becoming.grammar-focus',lessonId); }catch{}
    go('grammar');
  }));
  root.querySelectorAll('[data-practice-grammar]').forEach(button=>button.addEventListener('click',async()=>{
    const id=button.dataset.practiceGrammar;
    if(!id)return;
    try{
      const task=await api.grammarPractice(id);
      saveDraft({prompt:task.prompt||'',practiceContext:task.practice_context||null,generatedTask:null,parentEssayId:null});
      go('write');
    }catch(error){ toast(error.message||String(error)); }
  }));

  /* Draft / Review tabs. Both bodies stay in the DOM so switching does not
     re-run the annotation pass or lose the lens state. */
  root.querySelectorAll('[data-doc-tab]').forEach(tab=>{
    tab.addEventListener('click',()=>{
      const view=tab.dataset.docTab;
      root.querySelectorAll('[data-doc-tab]').forEach(other=>{
        const on=other===tab;
        other.classList.toggle('is-active',on);
        other.setAttribute('aria-selected',on?'true':'false');
      });
      root.querySelectorAll('[data-doc-view]').forEach(body=>{
        body.classList.toggle('hidden',body.dataset.docView!==view);
      });
    });
  });

  root.querySelector('#editDraftButton').addEventListener('click',()=>{
    saveDraft({text:learnerText,parentEssayId:result.id||null});
    go('write');
  });

  const rubricDialog=()=>showDialog(t('write.rubric_title'),
    `<p>${esc(t('write.rubric_intro'))}</p>${metricRows(metricsFrom(result))}`);
  root.querySelector('#reviewRubric').addEventListener('click',rubricDialog);
  root.querySelector('#fullRubricButton').addEventListener('click',rubricDialog);

  /* The feedback the learner can keep. Built from the same evidence shown on
     screen, so the file and the page never disagree. */
  root.querySelector('#downloadFeedback').addEventListener('click',()=>{
    const lines=[
      `${t('review.summary_title')}: ${result.overall} ${scoreBand(result.overall)}`,
      '',
      result.prompt?`${t('write.prompt')}: ${result.prompt}`:'',
      '',
      learnerText,
      '',
      `${t('review.priority_issues')}:`,
      ...visibleErrors.map((item,index)=>
        `  ${index+1}. ${patternName(item)} [${t('review.confidence_'+confidenceBand(item))}]\n     “${item.fragment||''}”\n     ${item.suggestion?'→ '+item.suggestion:''}\n     ${feedbackExplanation(item)}`),
      '',
      `${t('review.strengths_title')}:`,
      ...visibleStrengths.map(item=>`  · ${categoryLabel(item.category||'strength')} — “${item.fragment||''}”`),
    ].filter(line=>line!==undefined);

    const blob=new Blob([lines.join('\n')],{type:'text/plain;charset=utf-8'});
    const url=URL.createObjectURL(blob);
    const link=document.createElement('a');
    link.href=url;
    link.download=`${t('review.download_name')}-${result.id||'draft'}.txt`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  });

  bindEvidenceLinks(root);
  installMobileSheet(root);

  installLinguisticLens(root,{
    essayId:result.id||null,
    learnerText,
    errors:errors.slice(0,budget.visibleEvidence),
    strengths:strengthEvidence.slice(0,3),
  });

  hydrateReviewPinyin(root);

  root.querySelectorAll('[data-lookup-feedback]').forEach(button=>{
    button.addEventListener('click',async event=>{
      event.stopPropagation();
      const item=errors[Number(button.dataset.lookupFeedback)];
      const term=String(item?.suggestion||item?.fragment||'').trim();
      await openDictionary(term,{
        title:state.language==='zh'?`Pinyin · ${t('dictionary.title')}`:t('dictionary.title'),
        language:state.language,
      });
    });
  });

  root.querySelectorAll('[data-lookup-strength]').forEach(button=>{
    button.addEventListener('click',async event=>{
      event.stopPropagation();
      const item=strengthEvidence[Number(button.dataset.lookupStrength)];
      await openDictionary(item?.fragment||'',{
        title:state.language==='zh'?`Pinyin · ${t('dictionary.title')}`:t('dictionary.title'),
        language:state.language,
      });
    });
  });

  root.querySelectorAll('[data-save-library]').forEach(button=>{
    button.addEventListener('click',async event=>{
      const index=Number(event.currentTarget.dataset.saveLibrary);
      const item=errors[index];
      if(!item?.suggestion)return;
      const target=event.currentTarget;
      target.disabled=true;
      const previous=target.textContent;
      target.innerHTML=spinner(t('busy.saving'));
      try{
        await api.saveLibraryVocabulary({
          word:String(item.suggestion).trim().slice(0,180),
          definition:item.mini_rule_vi||item.explanation_vi||'',
          source_essay_id:result.id||null,
          source_fragment:item.fragment||'',
          source_kind:'feedback',
          focus_note:item.explanation_vi||item.mini_rule_vi||'',
        });
        target.textContent=t('review.saved');
        toast(t('review.saved'));
      }catch(error){
        target.disabled=false;
        target.textContent=previous;
        toast(error.message||t('review.save_failed'));
      }
    });
  });

  root.querySelectorAll('[data-save-strength]').forEach(button=>{
    button.addEventListener('click',async event=>{
      const index=Number(event.currentTarget.dataset.saveStrength);
      const item=strengthEvidence[index];
      if(!item?.fragment)return;
      const target=event.currentTarget;
      target.disabled=true;
      const previous=target.textContent;
      target.innerHTML=spinner(t('busy.saving'));
      try{
        await api.saveLibraryVocabulary({
          word:String(item.fragment).trim().slice(0,180),
          definition:item.explanation_vi||'',
          source_essay_id:result.id||null,
          source_fragment:item.fragment||'',
          source_kind:'strength',
          focus_note:item.explanation_vi||'',
        });
        target.textContent=t('review.saved');
        toast(t('review.saved'));
      }catch(error){
        target.disabled=false;
        target.textContent=previous;
        toast(error.message||t('review.save_failed'));
      }
    });
  });

  const beginRevision=()=>{
    saveDraft({
      text:learnerText,
      prompt:result.prompt||state.draft.prompt||'',
      level:result.target_cefr||state.draft.level,
      parentEssayId:result.id,
      practiceContext:result.practice_context||state.draft.practiceContext||state.draft.generatedTask?.personalization||null,
    });
    go('write');
  };
  root.querySelector('#reviseButton').addEventListener('click',beginRevision);
  root.querySelector('#startRevision').addEventListener('click',beginRevision);

  root.querySelector('#polishButton').addEventListener('click',async()=>{
    const button=root.querySelector('#polishButton');
    try{
      await runBusy(button,async()=>{
        const improved=await api.improve({
          text:learnerText,
          target_cefr:result.target_cefr||state.draft.level,
          mode:'polish',
        });
        showDialog(t('review.strong_dialog'),`
          <div class="strong-version-intro">
            <div class="section-title-row">
              <span class="context-label">${t('review.strong_kicker')}</span>
              ${helpTip(supportCopy('compare_tip',state.profile||{}),t('review.strong_compare'))}
            </div>
            <p>${t('review.strong_body')}</p>
          </div>
          <div class="comparison-grid">
            <section class="comparison-panel corrected">
              <span class="context-label">${t('review.corrected')}</span>
              <h3>${t('review.corrected_title')}</h3>
              <div class="learner-text ${state.language==='zh'?'cjk':''}">${esc(improved.corrected_text||'')}</div>
            </section>
            <section class="comparison-panel polished">
              <span class="context-label">${t('review.strong')}</span>
              <h3>${t('review.strong_title')}</h3>
              <div class="learner-text ${state.language==='zh'?'cjk':''}">${esc(improved.upgraded_text||'')}</div>
            </section>
          </div>
        `);
      },{label:t('busy.creating')});
    }catch(error){
      toast(error.message||t('review.compare_failed'));
    }
  });
}
