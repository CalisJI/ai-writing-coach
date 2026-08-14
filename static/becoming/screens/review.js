import {api} from '../api.js';
import {state,saveDraft} from '../store.js';
import {go} from '../router.js';
import {metricsFrom,reviewInsight,benchmarkLabel,changedSegments} from '../domain/feedback.js';
import {guidanceMode,guidanceLabel,feedbackBudget} from '../domain/adaptive.js';
import {highlightedLearnerText,bindEvidenceLinks,sentenceContext} from '../domain/feedback-map.js';
import {esc,errorBlock,loadingBlock,metricRows,showDialog,toast,helpTip,runBusy,spinner,setBusy} from '../components/primitives.js';
import {supportCopy,supportNote,categoryReason,categoryRule,nativeLanguage} from '../domain/support.js';
import {openDictionary} from '../components/dictionary.js';
import {t,uiLocale,categoryLabel} from '../domain/i18n.js';

function patternName(item={}){
  return categoryLabel(item.category||'expression');
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

    return `<article class="evidence-item contextual" tabindex="0" data-feedback-key="error-${index}">
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
      <span class="editorial-kicker">${t('review.empty_kicker')}</span>
      <h1 class="editorial-title">${t('review.empty_title')}</h1>
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
  const baseInsight=reviewInsight(result,state.language);
  const errors=result.errors||[];
  const strengthEvidence=result.strength_evidence||[];
  const locale=nativeLanguage(state.profile||{});
  const insight={
    ...baseInsight,
    context:locale==='vi'
      ?baseInsight.context
      :categoryReason(errors[0]?.category||baseInsight.weak?.key||'expression',state.profile||{}),
  };
  const benchmark=benchmarkLabel(result);
  const strength=(locale==='vi'&&(result.strengths_vi||[])[0])
    ||(strengthEvidence[0]
      ?categoryReason(strengthEvidence[0].category,state.profile||{})
      :'Your work contains useful evidence of what is already working.');

  root.innerHTML=`<section class="page review guidance-${esc(mode)}">
    <div class="review-hero">
      <div>
        <span class="editorial-kicker">${esc(insight.kicker)}</span>
        <h1 class="editorial-title ${state.language==='zh'?'cjk':''}">${esc(insight.statement)}</h1>
        <p class="editorial-lead">${esc(insight.context)}</p>
        ${supportNote('review_intro',state.profile||{})}
        <div class="guidance-row">
          <span class="guidance-badge">${esc(guidanceLabel(mode))}</span>
          ${helpTip(supportCopy('score_tip',state.profile||{}),t('help.review'))}
        </div>
      </div>
      <div class="review-benchmark">
        <span class="section-title-row">${t('review.benchmark')} ${helpTip(supportCopy('benchmark_tip',state.profile||{}),t('help.benchmark'))}</span>
        <strong>${result.overall!=null?esc(result.overall):'—'}</strong>
        <span>${esc(benchmark||t('review.estimate_unavailable'))}</span>
      </div>
    </div>

    <div class="section-rule"></div>

    <div class="review-grid">
      <section class="learner-evidence review-paper-surface visual-raised-surface" aria-labelledby="workHeading">
        <span class="context-label">${t('review.work')}</span>
        <h2 id="workHeading" style="font-size:28px;margin:8px 0 12px">${t('review.work_title')}</h2>
        <p class="review-density-note">${t('review.highlight_note')}</p>
        ${supportNote('lookup_tip',state.profile||{})}

        <div id="posLens" class="linguistic-lens-bar visual-section-surface" data-state="off" aria-labelledby="posLensTitle">
          <span class="linguistic-lens-mark" aria-hidden="true">Aa</span>
          <div class="linguistic-lens-copy">
            <div class="section-title-row">
              <span class="context-label">${t('review.pos_kicker')}</span>
              ${helpTip(t('review.pos_help'),t('review.pos_title'))}
            </div>
            <strong id="posLensTitle">${t('review.pos_title')}</strong>
            <p>${t('review.pos_intro')}</p>
            ${posLegend('pos-preview')}
            <small id="posLensStatus" aria-live="polite">${t('review.pos_off')}</small>
          </div>
          <button id="posLensToggle" class="button button-secondary linguistic-lens-toggle" type="button" aria-pressed="false">${t('review.pos_show')}</button>
        </div>
        <div id="posLensLegend" class="hidden">${posLegend()}</div>

        <div id="learnerTextEvidence" class="learner-text contextual ${state.language==='zh'?'cjk':''}" lang="${state.language==='zh'?'zh-Hans':'en'}">${highlightedLearnerText(learnerText,errors.slice(0,budget.visibleEvidence),strengthEvidence.slice(0,3),[])}</div>

        ${state.language==='zh'&&state.profile?.pinyin!=='off'?`<div class="review-pinyin-summary">
          <div class="section-title-row">
            <span class="context-label">${t('review.pinyin_title')}</span>
            ${helpTip(t('profile.pinyin_desc'),t('profile.pinyin'))}
          </div>
          <p>${t('review.pinyin_desc')}</p>
          <div class="review-pinyin-overview">
            ${errors.slice(0,budget.visibleEvidence).map((item,index)=>{
              const term=String(item.suggestion||item.fragment||'').trim();
              if(!term)return '';
              return `<div class="review-pinyin-overview-row"><span>${esc(term)}</span>${pinyinPlaceholder(term,`overview-error-${index}`)}</div>`;
            }).join('')}
            ${!errors.length?strengthEvidence.slice(0,2).map((item,index)=>{
              const term=String(item.fragment||'').trim();
              if(!term)return '';
              return `<div class="review-pinyin-overview-row"><span>${esc(term)}</span>${pinyinPlaceholder(term,`overview-strength-${index}`)}</div>`;
            }).join(''):''}
          </div>
        </div>`:''}

        <button id="mobileFeedbackTrigger" class="mobile-feedback-trigger" type="button" aria-controls="reviewSide" aria-expanded="false">
          <span>
            <strong>${t('review.mobile_focus')}</strong>
            <span>${esc(insight.weak?.label||t('review.selected_feedback'))} · ${t('review.evidence_count',{count:Math.min(errors.length,budget.visibleEvidence)})}</span>
          </span>
          <span class="trigger-arrow" aria-hidden="true">↑</span>
        </button>
      </section>

      <div id="reviewSheetBackdrop" class="review-sheet-backdrop" aria-hidden="true"></div>

      <aside id="reviewSide" class="review-side" aria-label="${esc(t('review.feedback_aria'))}">
        <div class="mobile-sheet-close">
          <button id="mobileSheetClose" type="button" aria-label="${esc(t('review.close_feedback'))}">×</button>
        </div>

        <section class="insight-block functional-surface focus-surface review-focus-hero visual-hero-surface">
          <div class="section-title-row"><span class="context-label">${t('review.start_here')}</span>${helpTip(supportCopy("current_focus_tip",state.profile||{}),t('help.focus'))}</div>
          <h2>${esc(insight.weak?.label||t('common.current_focus'))}</h2>
          <p class="review-density-note">${t('review.showing_count',{count:Math.min(errors.length,budget.visibleEvidence)})}</p>
          ${evidenceItems(errors,{
            count:budget.visibleEvidence,
            showRule:budget.showRule,
            learnerText,
          })}
        </section>

        <section class="insight-block functional-surface strength-surface visual-section-surface">
          <div class="section-title-row"><span class="context-label">${t('review.already_working')}</span>${helpTip(supportCopy('strength_tip',state.profile||{}),t('help.strength'))}</div>
          <div class="strength-line">
            <span class="semantic-dot" aria-hidden="true"></span>
            <p>${esc(strength)}</p>
          </div>
          ${strengthEvidence.length
            ?strengthEvidenceItems(strengthEvidence)
            :`<p class="review-density-note" style="margin-top:12px">${t('review.no_strength_fragment')}</p>`}
        </section>

        ${practiceOutcomeBlock(result.practice_outcome)}

        <section class="insight-block functional-surface next-action-surface visual-raised-surface">
          <div class="section-title-row"><span class="context-label">${t('review.next_action')}</span>${helpTip(supportCopy('next_action_tip',state.profile||{}),t('help.next_action'))}</div>
          <h2>${t('review.revise_title')}</h2>
          <p>${t('review.revise_body')}</p>
          ${supportNote('next_action_tip',state.profile||{})}
          <div class="action-row" style="margin-top:18px">
            <button id="reviseButton" class="button button-primary">${t('review.revise_title')}</button>
            <button id="polishButton" class="button button-tertiary">${t('review.strong_compare')}</button>
          </div>
        </section>

        ${disclosure(result,budget,learnerText)}
      </aside>
    </div>
  </section>`;

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

  root.querySelector('#reviseButton').addEventListener('click',()=>{
    saveDraft({
      text:learnerText,
      prompt:result.prompt||state.draft.prompt||'',
      level:result.target_cefr||state.draft.level,
      parentEssayId:result.id,
      practiceContext:result.practice_context||state.draft.practiceContext||state.draft.generatedTask?.personalization||null,
    });
    go('write');
  });

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
