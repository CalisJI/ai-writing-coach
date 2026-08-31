(function(){
  const $ = (s) => document.querySelector(s);
  let providers = [];
  let capabilities = [];
  let learnerRuntime = {mode:'legacy'};
  let active = {provider:'', model:''};
  let currentFilter = 'all';
  let selectedProviderId = '';
  let searchText = '';
  let operations = {available:false, has_data:false, recent:[], by_capability:[]};
  let accountState = null;
  let productActivity = {available:false,has_data:false,skills:[]};
  let readinessSummary = {available:false,state:'unavailable',indicators:[]};

  const capabilityLabels = {
    writing_evaluator:'Writing evaluation',
    writing_linguistic:'Writing language quality',
    reading_generator:'Reading content generation',
    writing_task_generator:'Writing task generation',
    writing_improver:'Writing improvement',
    learner_dictionary:'Learner dictionary',
    learner_translation:'Learner translation',
    grammar_lesson_generator:'Grammar lesson generation',
    reading_evaluator:'Reading evaluation',
    speech_asr:'Speech recognition',
    pronunciation_evaluator:'Pronunciation evaluation',
    speaking_evaluator:'Speaking evaluation',
  };

  const operationLabels = {
    structured_text_generation:'AI text generation',
    deterministic:'Deterministic local processing',
    speech_recognition:'Speech recognition',
    pronunciation_evaluation:'Pronunciation evaluation',
    speaking_evaluation:'Speaking evaluation',
  };

  const capabilityDescriptions = {
    writing_evaluator:'Reviews a learner\'s writing and returns structured feedback and evidence.',
    writing_linguistic:'Checks grammar, vocabulary, naturalness, clarity, and other language quality signals.',
    reading_generator:'Creates reading practice content when a configured provider is available.',
    writing_task_generator:'Creates a guided writing prompt or practice brief for the learner.',
    writing_improver:'Suggests improvements to an existing learner draft while preserving the learner\'s intent.',
    learner_dictionary:'Looks up meaning and usage for words selected by a learner.',
    learner_translation:'Translates supported learning content into the learner\'s support language.',
    grammar_lesson_generator:'Creates or supports grammar lesson content for a learner.',
    reading_evaluator:'Checks a reading attempt and its supporting evidence.',
    speech_asr:'Converts a learner recording into text for speech practice.',
    pronunciation_evaluator:'Assesses pronunciation evidence from a learner recording.',
    speaking_evaluator:'Evaluates a speaking attempt against its selected practice task.',
  };

  const readinessLabels = {
    capability_configuration:'Capability configuration',
    capability_health:'Capability health',
    product_observability:'Product observability',
    learner_impact_evidence:'Learner impact evidence',
    runtime_activation:'Runtime activation',
  };

  const entitlementLabels = {
    'writing.evaluate':'Writing evaluation',
    'writing.improve':'Writing improvement',
    'library.grammar':'Grammar library',
    'dictionary.lookup':'Dictionary lookup',
    'vocabulary.save':'Save vocabulary',
    'analytics.basic':'Basic analytics',
    'analytics.advanced':'Advanced analytics',
    'practice.personalized':'Personalized practice',
    'export.report':'Export report',
  };

  const skillLabels = {
    writing:'Writing', reading:'Reading', listening:'Listening', speaking:'Speaking',
    grammar:'Grammar', library:'Library', vocabulary:'Vocabulary', review:'Review',
  };

  function capabilityLabel(key){
    return capabilityLabels[key] || String(key||'Capability').replace(/[_-]+/g,' ').replace(/\b\w/g,letter=>letter.toUpperCase());
  }

  function operationLabel(key){
    return operationLabels[key] || String(key||'Operation').replace(/[_-]+/g,' ').replace(/\b\w/g,letter=>letter.toUpperCase());
  }

  function capabilityDescription(key){
    return capabilityDescriptions[key] || `Controls the ${capabilityLabel(key).toLowerCase()} capability.`;
  }

  function readinessLabel(key){
    return readinessLabels[key] || String(key||'Readiness indicator').replace(/[_-]+/g,' ').replace(/\b\w/g,letter=>letter.toUpperCase());
  }

  function entitlementLabel(key){
    return entitlementLabels[key] || String(key||'Feature').replace(/[_.-]+/g,' ').replace(/\b\w/g,letter=>letter.toUpperCase());
  }

  function skillLabel(key){
    return skillLabels[key] || String(key||'Skill').replace(/[_.-]+/g,' ').replace(/\b\w/g,letter=>letter.toUpperCase());
  }

  function operationDescription(key){
    return `The runtime path used for ${operationLabel(key).toLowerCase()}.`;
  }

  function esc(s=''){
    return String(s).replace(/[&<>"']/g,c=>({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'
    }[c]));
  }

  function humanLabel(key){
    return capabilityLabels[key] || readinessLabels[key] || entitlementLabels[key] || skillLabels[key]
      || String(key || 'Field').replace(/[_.-]+/g,' ').replace(/\b\w/g,letter=>letter.toUpperCase());
  }

  function humanizeVisibleLabels(root){
    if(!root) return;
    root.querySelectorAll('b,span,small,strong').forEach(node=>{
      if(node.children.length || node.querySelector('svg')) return;
      const raw=node.textContent.trim();
      if(!/^[A-Za-z][A-Za-z0-9_.-]*$/.test(raw) || !/[_.]/.test(raw)) return;
      const label=humanLabel(raw);
      node.textContent=label;
      node.title = node.title || `Meaning: ${label}.`;
      node.classList.add('admin-tooltip-target');
      node.tabIndex = 0;
    });
    const walker=root.ownerDocument.createTreeWalker(root,NodeFilter.SHOW_TEXT);
    const textNodes=[];
    let current;
    while((current=walker.nextNode())) textNodes.push(current);
    textNodes.forEach(node=>{
      node.nodeValue=node.nodeValue.replace(/\b[A-Za-z][A-Za-z0-9]*_[A-Za-z0-9_]*\b/g,token=>humanLabel(token));
    });
  }

  function observeHumanLabels(){
    const root=$('#page-admin');
    if(!root || root.dataset.humanLabelsObserved) return;
    root.dataset.humanLabelsObserved='true';
    const observer=new MutationObserver(()=>humanizeVisibleLabels(root));
    observer.observe(root,{subtree:true,childList:true});
    humanizeVisibleLabels(root);
  }

  function setMessage(text, kind=''){
    const el = $('#adminAiMessage');
    if(!el) return;
    el.textContent = text || '';
    el.className = 'admin-message ' + kind;
  }

  function providerById(id){
    return providers.find(x => x.id === id);
  }

  function modelKindLabel(provider){
    return provider?.kind === 'local' ? 'LOCAL' : 'CLOUD';
  }


  const providerAssetPaths = {
    ollama:'/becoming-assets/assets/providers/ollama.svg',
    openai:'/becoming-assets/assets/providers/openai.svg',
    deepseek:'/becoming-assets/assets/providers/deepseek.svg',
    groq:'/becoming-assets/assets/providers/groq.svg',
    // Official Google AI Studio mark; Gemini has no local hand-drawn fallback.
    gemini:'https://www.gstatic.com/aistudio/ai_studio_favicon_2_32x32.svg',
  };

  function providerIcon(id){
    const path=providerAssetPaths[id];
    return path ? `<img class="provider-logo-image" src="${path}" alt="" aria-hidden="true">` : '';
  }

  function providerState(provider){
    const configured = provider.configured ?? provider.server_configured;
    if(!configured) return {label:'Not configured', cls:'muted'};
    if(provider.available || provider.server_configured) return {label:'Ready', cls:'ready'};
    return {label:'Configured · unavailable', cls:'warn'};
  }

  function renderOperations(){
    const host = $('#adminOperations');
    if(!host) return;
    if(!operations.has_data){
      host.innerHTML = '<div class="admin-capability-empty">No operation data yet. Provider probes are never automatic.</div>';
      return;
    }
    const healthLabels = {no_data:'No data', healthy:'Healthy', degraded:'Degraded', provider_failure:'Provider failure'};
    const quotaLabels = {unavailable:'Rate limits unavailable', reported:'Rate limits reported', reported_exhausted:'Provider reports exhausted'};
    const rows = (operations.by_capability||[]).map(row=>{
      const tokens = row.token_totals || {};
      const tokenLabel = name => tokens[name] == null ? `${name.replace('_tokens','')} unknown` : `${tokens[name]} ${name.replace('_tokens','')}`;
      const usageEvidence = [
        row.usage_partial ? `${row.usage_partial} partial usage` : '',
        row.usage_unknown ? `${row.usage_unknown} usage unavailable` : '',
      ].filter(Boolean).join(' · ') || 'Usage complete';
      const quotaEvidence = `${quotaLabels[row.quota_state] || 'Rate limits unknown'} · ${row.rate_limit_reported_count || 0} reported`;
      const costTotals = (row.cost_totals || []).map(item=>`${esc(item.currency)} ${Number(item.amount).toFixed(6)} (${item.evidence_count} events · ${esc(item.catalog_version || 'pricing unknown')})`).join(' · ') || 'Cost unpriced or unavailable';
      const costStates = row.cost_state_counts || {};
      const costEvidence = [
        costStates.unpriced ? `${costStates.unpriced} unpriced` : '',
        costStates.partial ? `${costStates.partial} partial cost` : '',
        costStates.unknown ? `${costStates.unknown} cost unknown` : '',
      ].filter(Boolean).join(' · ');
      const trend = (row.trend || []).slice(0, 7).map(bucket=>{
        const total = bucket.token_totals?.total_tokens == null ? 'tokens unknown' : `${bucket.token_totals.total_tokens} tokens`;
        const latency = bucket.avg_latency_ms == null ? 'latency unknown' : `${bucket.avg_latency_ms} ms avg`;
        const bucketCost = (bucket.cost_totals || []).map(item=>`${esc(item.currency)} ${Number(item.amount).toFixed(6)}`).join(' · ') || 'cost unavailable';
        return `<span>${esc(bucket.bucket || 'unknown')} · ${bucket.request_count} requests · ${bucket.failure_count} failures · ${total} · ${bucketCost} · ${latency}</span>`;
      }).join('') || '<span>No trend data</span>';
      return `<div class="admin-operation-row">
      <b>${esc(row.capability)}</b><strong>${esc(healthLabels[row.health_state] || 'Health unknown')}</strong>
      <span>${row.total} total · ${row.success} success · ${row.failure} failure · ${row.evidence_count ?? row.total} events sampled</span>
      <span>${row.failure_rate_percent == null ? 'Failure rate unknown' : `${row.failure_rate_percent}% failures`} · ${row.avg_latency_ms == null ? 'Latency unknown' : `${row.avg_latency_ms} ms average`} · ${row.usage_known ? `${row.usage_known} usage reported` : row.usage_partial ? 'Usage partial' : 'Usage unknown'}</span>
      <span>Tokens: ${tokenLabel('prompt_tokens')} · ${tokenLabel('completion_tokens')} · ${tokenLabel('total_tokens')} · ${usageEvidence}</span>
      <span>Estimated cost: ${costTotals}${costEvidence ? ` · ${esc(costEvidence)}` : ''}</span>
      <span>${esc(quotaEvidence)}</span>
      <div class="admin-operation-trend"><small>Recent trend (${operations.trend_window_days || 7} days)</small>${trend}</div>
    </div>`;
    }).join('');
    const recent = (operations.recent||[]).slice(0,10).map(event=>`<div class="admin-operation-recent-row">
      <b>${esc(event.capability)}</b><span>${esc(event.outcome)} · ${esc(event.provider || 'Provider unknown')} · ${esc(event.model || 'Model unknown')}</span>
      <span>${event.latency_ms == null ? 'Latency unknown' : `${Number(event.latency_ms)} ms`} · ${!event.usage || event.usage.total_tokens == null ? 'Usage unknown' : 'Usage reported'}</span>
    </div>`).join('');
    host.innerHTML = `<section class="admin-operation-group"><h3>By capability</h3>${rows || '<div class="admin-capability-empty">No aggregate data yet.</div>'}</section>
      <section class="admin-operation-group"><h3>Recent events</h3>${recent || '<div class="admin-capability-empty">No recent operation data.</div>'}</section>`;
  }

  async function fetchOperations(){
    const response = await fetch('/api/admin/ai/operations',{cache:'no-store'});
    const data = await response.json();
    if(!response.ok) throw new Error('Could not load AI operations');
    operations = data && typeof data === 'object' ? data : {available:false,has_data:false,recent:[],by_capability:[]};
    renderOperations();
  }

  function renderAccountState(){
    const host=$('#adminAccountState');
    if(!host)return;
    if(!accountState || accountState.available===false){
      host.innerHTML='<div class="admin-capability-empty">Account plan and usage are unavailable.</div>';
      return;
    }
    const plan=accountState.plan||{};
    const status=accountState.subscription?.state||'unknown';
    const rows=Object.entries(accountState.features||{}).map(([key,item])=>{
      const limit=item.monthly_limit===null?'unlimited':item.monthly_limit;
      const usage=item.usage_state==='unavailable'?'usage unavailable':`${item.used} used · ${item.remaining===null?'unlimited':`${item.remaining} remaining`} / ${limit}`;
      return `<div class="admin-account-row"><b>${esc(key)}</b><span>${esc(item.entitlement_state||'unknown')}</span><small>${esc(usage)}</small></div>`;
    }).join('');
    host.innerHTML=`<div class="admin-account-summary"><strong>${esc(plan.name||'Plan unavailable')}</strong><span>${esc(status)} · read only</span></div><div class="admin-account-features">${rows||'<span>No entitlement data.</span>'}</div>`;
  }

  function renderProductActivity(){
    const host=$('#adminProductActivity');
    if(!host)return;
    if(productActivity.available===false){host.innerHTML='<div class="admin-capability-empty">Product activity is unavailable on this environment.</div>';return;}
    if(!productActivity.has_data){host.innerHTML='<div class="admin-capability-empty">Not enough activity data for this window; return trends are insufficient.</div>';const impact=productActivity.learner_impact_failures;if(impact?.available===false){host.innerHTML += '<div class="admin-activity-impact">Learner-impact failure trends are unavailable.</div>';}else if(impact?.data_state==='ready'){const impactRows=(impact.by_capability||[]).map(item=>`<div><b>${esc(item.capability)}</b><span>${item.failure_count} learner-impact failures Â· ${item.degraded_count} degraded</span></div>`).join('');host.innerHTML += `<div class="admin-activity-impact"><strong>Learner-impact failure trends</strong>${impactRows}</div>`;}else{host.innerHTML += '<div class="admin-activity-impact">No validated learner-impact failures in this window.</div>';}return;}
    const rows=(productActivity.skills||[]).map(item=>{const trend=(item.days||[]).map(day=>`${esc(day.date)}: ${day.activities}/${day.completions}`).join(' · ')||'No daily data'; const funnel=(item.funnel?.stages||[]).map(stage=>`${esc(stage.stage)}: ${stage.available===false?'unavailable':`${stage.count} (${stage.rate_percent==null?'rate unknown':`${stage.rate_percent}%`})`}`).join(' · ')||'Funnel unavailable'; return `<div class="admin-activity-row"><b>${esc(item.skill)}</b><span>${item.activities} activities · ${item.completions} completed</span><span>${item.completion_rate_percent==null?'Completion rate unknown':`${item.completion_rate_percent}% completion rate`}</span><small>Daily activity/completions: ${trend}</small><small>Funnel: ${funnel}</small></div>`;}).join('');
    host.innerHTML=`<div class="admin-activity-summary"><strong>${productActivity.active_learners==null?'Active learners unknown':`${productActivity.active_learners} active learners`}</strong><span>${productActivity.total_activities} activities · ${productActivity.total_completions} completed · last ${productActivity.window_days} days</span></div><div class="admin-activity-rows">${rows}</div>`;
    const windows=(productActivity.return_windows||[]).map(item=>`<span>${item.days}-day return: ${item.returned_learners}/${item.eligible_learners}${item.return_rate_percent==null?' (rate unknown)':` (${item.return_rate_percent}%)`}</span>`).join(' Â· ')||'Return windows unavailable';
    const daily=(productActivity.daily_returning||[]).map(item=>`${esc(item.date)}: ${item.returning_learners}`).join(' Â· ')||'No return trend data';
    host.innerHTML += `<div class="admin-activity-retention"><span>${productActivity.returning_learners==null?'Returning learners unknown':`${productActivity.returning_learners} returning learners`}</span><span>${productActivity.repeat_practice_learners==null?'Repeat practice unknown':`${productActivity.repeat_practice_learners} repeat-practice learners`}</span><span>${productActivity.cross_skill_returning_learners==null?'Cross-skill return unknown':`${productActivity.cross_skill_returning_learners} cross-skill returning learners`}</span><small>Return windows: ${windows}</small><small>Daily returning learners: ${daily}</small></div>`;
    const impact=productActivity.learner_impact_failures;
    if(impact?.available===false){host.innerHTML += '<div class="admin-activity-impact">Learner-impact failure trends are unavailable.</div>';}
    else if(impact?.data_state!=='ready'){host.innerHTML += '<div class="admin-activity-impact">No validated learner-impact failures in this window.</div>';}
    else {const impactRows=(impact.by_capability||[]).map(item=>{const days=(item.days||[]).map(day=>`${esc(day.date)}: ${day.failure_count} failures / ${day.degraded_count} degraded`).join(' Â· ')||'No daily data'; return `<div><b>${esc(item.capability)}</b><span>${item.failure_count} learner-impact failures Â· ${item.degraded_count} degraded</span><small>Daily learner-impact failures/degraded: ${days}</small></div>`;}).join(''); host.innerHTML += `<div class="admin-activity-impact"><strong>Learner-impact failure trends</strong>${impactRows}</div>`;}
    const unit=productActivity.cost_per_active_learner;
    if(unit?.available===false){host.innerHTML += '<div class="admin-activity-cost">Cost per active learner is unavailable.</div>';}else if(unit?.data_state!=='ready'){host.innerHTML += `<div class="admin-activity-cost">Cost per active learner is ${unit?.evidence_state==='unpriced'?'unpriced or unavailable':'insufficient'}; no unit-cost claim is shown.</div>`;}else{const costs=(unit.cost_totals||[]).map(item=>`${esc(item.currency)} ${Number(item.cost_per_active_learner).toFixed(8)} per active learner (${esc(item.catalog_version||'unknown')})`).join(' · ')||'No priced cost evidence';const context=(unit.capability_cost||[]).map(item=>`${esc(item.capability)}: ${(item.cost_totals||[]).map(cost=>`${esc(cost.currency)} ${Number(cost.amount).toFixed(6)}`).join(' · ')}`).join(' · ')||'Capability cost context unavailable';host.innerHTML += `<div class="admin-activity-cost"><span>Cost per active learner: ${costs}</span><small>Evidence: ${esc(unit.evidence_state||'unknown')} · currency: ${esc(unit.currency_state||'unknown')} · operations in window: ${unit.considered_operations||0}</small><small>Capability cost context: ${context}</small></div>`;}
  }

  function renderReadinessSummary(){
    const host=$('#adminReadinessSummary');
    if(!host)return;
    if(readinessSummary.available===false){host.innerHTML='<div class="admin-capability-empty">Operational readiness evidence is unavailable.</div>';return;}
    const labels={ready:'Ready',degraded:'Degraded',insufficient:'Insufficient evidence',unavailable:'Unavailable',deferred:'Deferred'};
    const rows=(readinessSummary.indicators||[]).map(item=>`<div class="admin-operation-row"><b>${esc(item.name)}</b><strong>${esc(labels[item.state]||'Unknown')}</strong><span>Source: ${esc(item.source)}</span>${item.detail?`<small>${esc(item.detail)}</small>`:''}</div>`).join('');
    host.innerHTML=`<div class="admin-activity-summary"><strong>Overall: ${esc(labels[readinessSummary.state]||'Unknown')}</strong><span>Evidence: ${esc(labels[readinessSummary.evidence_state]||'Unknown')} · approval: not granted</span></div><div class="admin-activity-rows">${rows}</div><small>This read-only view is not production-release approval.</small>`;
  }

  async function fetchReadinessSummary(){
    const response=await fetch('/api/admin/readiness-summary',{cache:'no-store'});
    const data=await response.json();
    if(!response.ok)throw new Error('Could not load readiness evidence');
    readinessSummary=data&&typeof data==='object'?data:{available:false};
    renderReadinessSummary();
  }

  async function fetchProductActivity(){
    const response=await fetch('/api/admin/product-activity?window_days=7',{cache:'no-store'});
    const data=await response.json();
    if(!response.ok)throw new Error('Could not load product activity');
    productActivity=data&&typeof data==='object'?data:{available:false,has_data:false,skills:[]};
    renderProductActivity();
  }

  async function fetchAccountState(){
    const response=await fetch('/api/product/admin/account',{cache:'no-store'});
    if(!response.ok)throw new Error('Could not load account state');
    const data=await response.json();
    accountState=data?.account&&typeof data.account==='object'?data.account:{available:false};
    renderAccountState();
  }

  function capabilityState(capability){
    if(!capability?.implemented) return {label:'Reserved', cls:'muted'};
    if(!capability.provider_backed) return {label:'Deterministic', cls:'ready'};
    if(!capability.explicit_config_exists || !capability.config){
      return {label:'Not configured', cls:'muted'};
    }
    if(capability.config.enabled === false){
      return {label:'Configured · disabled', cls:'warn'};
    }
    const provider = providers.find(item=>item.id===capability.config.provider);
    if(!provider?.server_configured){
      return {label:'Configured · provider unavailable', cls:'warn'};
    }
    return {label:'Configured', cls:'ready'};
  }

  function capabilityIsConfigurable(capability){
    return Boolean(capability?.implemented && capability.provider_backed && capability.configurable);
  }

  function capabilityProviderOptions(capability, selected){
    const operation = capability?.operation;
    const compatible = providers.filter(provider=>
      !Array.isArray(provider.supported_operations)
      || provider.supported_operations.includes(operation)
    );
    return compatible.map(provider=>`<option value="${esc(provider.id)}" ${provider.id===selected?'selected':''}>${esc(provider.name || provider.id)}</option>`).join('');
  }

  function capabilityModelOptions(providerId, selected=''){
    const provider=providerById(providerId);
    const models=[...(provider?.models || [])];
    if(!models.length && provider?.default_model) models.push(provider.default_model);
    if(selected && !models.includes(selected)) models.unshift(selected);
    if(!models.length) return '<option value="">No models discovered</option>';
    return `<option value="">Select a model</option>${models.map(model=>`<option value="${esc(model)}" ${model===selected?'selected':''}>${esc(model)}</option>`).join('')}`;
  }

  function syncCapabilityModelPicker(row, selector, selected=''){
    const providerId=row?.querySelector?.('[data-capability-provider]')?.value || '';
    const modelSelect=row?.querySelector?.(selector);
    if(!modelSelect) return;
    modelSelect.innerHTML=capabilityModelOptions(providerId,selected);
    modelSelect.value=selected && [...modelSelect.options].some(option=>option.value===selected) ? selected : (modelSelect.options.length > 1 ? modelSelect.options[1].value : '');
    modelSelect.dispatchEvent(new Event('change',{bubbles:true}));
  }

  function backupProviderOptions(capability, selected){
    return `<option value="">No standby provider</option>${capabilityProviderOptions(capability, selected || '')}`;
  }

  function capabilityHealthLabel(errorClass){
    const labels = Object.create(null);
    labels.capability_disabled = 'Capability disabled';
    labels.capability_not_configured = 'Capability not configured';
    labels.provider_not_configured = 'Provider not configured';
    labels.model_catalog_empty = 'Provider has no models';
    labels.model_unavailable = 'Configured model unavailable';
    labels.provider_unavailable = 'Provider unavailable';
    labels.provider_response_invalid = 'Provider response invalid';
    labels.provider_error = 'Provider request failed';
    labels.capability_invalid = 'Capability configuration invalid';
    return labels[errorClass] || 'Health check failed';
  }

  function renderCapabilityMatrix(){
    const host = $('#adminCapabilityMatrix');
    if(!host) return;
    if(!capabilities.length){
      host.innerHTML = '<div class="admin-capability-empty">Capability matrix is unavailable.</div>';
      return;
    }
    host.innerHTML = `<div class="admin-capability-runtime">Learner runtime: <b>${esc(learnerRuntime.mode || 'unknown')}</b></div>
      <div class="admin-capability-table" role="table" aria-label="AI capability matrix">
        <div class="admin-capability-row admin-capability-head" role="row">
          <span role="columnheader">Capability</span><span role="columnheader">State</span>
          <span role="columnheader">Provider / model</span><span role="columnheader">Operation</span>
        </div>
        ${capabilities.map(capability=>{
          const state = capabilityState(capability);
          const config = capability.config || {};
          const provider = config.provider || '—';
          const model = config.model || '—';
          const editableModel = config.model_redacted ? '' : (config.model || '');
          const backupProvider = config.backup_provider || '';
          const backupModel = config.backup_model_redacted ? '' : (config.backup_model || '');
          const provenance = capability.config_provenance || {};
          const savedState = provenance.saved
            ? `${provenance.updated_at ? `Saved ${provenance.updated_at}` : 'Saved configuration'}${provenance.updated_by_present ? ' · Updated by administrator' : ''}`
            : 'No saved configuration';
          const runtime = capability.provider_backed
            ? (learnerRuntime.mode==='capability'?'Capability mode':'Legacy routing')
            : 'Local deterministic';
          const controls = capabilityIsConfigurable(capability) ? `
            <div class="admin-capability-controls">
              <label>Provider<select data-capability-provider>${capabilityProviderOptions(capability, config.provider || providers[0]?.id || '')}</select></label>
              <label>Model<select data-capability-model>${capabilityModelOptions(config.provider || providers[0]?.id || '', editableModel)}</select></label>
              <label>Standby provider<select data-capability-backup-provider>${backupProviderOptions(capability, backupProvider)}</select></label>
              <label>Standby model<select data-capability-backup-model>${capabilityModelOptions(backupProvider, backupModel)}</select></label>
              <label class="admin-capability-enabled"><input data-capability-enabled type="checkbox" ${config.enabled === false?'':'checked'}><span class="admin-check-box" aria-hidden="true">✓</span><span>Enabled</span></label>
              <button class="primary compact" type="button" data-save-capability="${esc(capability.key)}" data-capability-fallback="${esc(config.fallback_policy || (capability.allowed_fallback_policies || ['none'])[0])}" data-capability-timeout="${esc(config.timeout_seconds ?? '')}" data-capability-temperature="${esc(config.temperature ?? '')}">Save configuration</button>
              <small>Saved configuration only · learner runtime remains ${esc(learnerRuntime.mode || 'unknown')}</small>
              ${capability.explicit_config_exists && config.enabled !== false ? '<button class="ghost compact" type="button" data-health-capability="'+esc(capability.key)+'">Verify health</button><small data-capability-health-status></small>' : ''}
              ${capability.explicit_config_exists && config.enabled !== false && backupProvider && backupModel ? '<button class="ghost compact" type="button" data-health-standby-capability="'+esc(capability.key)+'">Verify standby</button><small data-capability-standby-health-status></small>' : ''}
            </div>` : '';
          return `<div class="admin-capability-row" role="row" data-capability-key="${esc(capability.key)}">
            <span role="cell"><span class="admin-tooltip-target" tabindex="0" title="${esc(capabilityDescription(capability.key))}"><b>${esc(capabilityLabel(capability.key))}</b><span class="admin-tooltip" role="tooltip">${esc(capabilityDescription(capability.key))}</span></span><small>${esc(runtime)}</small></span>
            <span role="cell"><i class="admin-capability-dot ${state.cls}"></i>${esc(state.label)}<small>${esc(savedState)}</small></span>
            <span role="cell">${esc(provider)} / ${esc(model)}</span>
            <span role="cell"><span class="admin-tooltip-target" tabindex="0" title="${esc(operationDescription(capability.operation))}">${esc(operationLabel(capability.operation))}<span class="admin-tooltip" role="tooltip">${esc(operationDescription(capability.operation))}</span></span>${controls}</span>
          </div>`;
        }).join('')}
      </div>`;
    host.querySelectorAll('[data-save-capability]').forEach(button=>{
      button.addEventListener('click',()=>saveCapability(button).catch(()=>{
        setMessage('Capability configuration could not be saved.','error');
      }));
    });
    host.querySelectorAll('[data-health-capability]').forEach(button=>{
      button.addEventListener('click',()=>runCapabilityHealth(button));
    });
    host.querySelectorAll('[data-health-standby-capability]').forEach(button=>{
      button.addEventListener('click',()=>runCapabilityHealth(button));
    });
    host.querySelectorAll('[data-capability-provider]').forEach(select=>{
      select.addEventListener('change',()=>{
        const row=select.closest('[data-capability-key]');
        syncCapabilityModelPicker(row,'[data-capability-model]');
      });
    });
    host.querySelectorAll('[data-capability-backup-provider]').forEach(select=>{
      select.addEventListener('change',()=>{
        const row=select.closest('[data-capability-key]');
        syncCapabilityModelPicker(row,'[data-capability-backup-model]');
      });
    });
    window.installOrenaSelectEnhancements?.(host);
  }

  function resetCapabilityMatrix(){
    capabilities = [];
    learnerRuntime = {mode:'unknown'};
    renderCapabilityMatrix();
  }

  function showConfigFailure(){
    resetCapabilityMatrix();
    setMessage('Platform Admin failed to load.','error');
  }

  async function saveCapability(button){
    const key = button?.dataset?.saveCapability;
    const row = button?.closest?.('[data-capability-key]');
    const provider = row?.querySelector?.('[data-capability-provider]')?.value || '';
    const model = row?.querySelector?.('[data-capability-model]')?.value || '';
    const backupProvider = row?.querySelector?.('[data-capability-backup-provider]')?.value || '';
    const backupModel = row?.querySelector?.('[data-capability-backup-model]')?.value || '';
    const enabled = row?.querySelector?.('[data-capability-enabled]')?.checked !== false;
    const fallbackPolicy = button?.dataset?.capabilityFallback || 'none';
    const timeoutValue = button?.dataset?.capabilityTimeout || '';
    const temperatureValue = button?.dataset?.capabilityTemperature || '';
    if(!key || !provider || !String(model).trim()) throw new Error('Capability configuration is incomplete');
    button.disabled = true;
    try{
      const response = await fetch(`/api/admin/ai/config/${encodeURIComponent(key)}`,{
        method:'PUT',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          enabled,
          provider,
          model:String(model).trim(),
          backup_provider: backupProvider || null,
          backup_model: String(backupModel).trim() || null,
          timeout_seconds: timeoutValue === '' ? null : Number(timeoutValue),
          temperature: temperatureValue === '' ? null : Number(temperatureValue),
          fallback_policy:fallbackPolicy,
        })
      });
      await response.json();
      if(!response.ok) throw new Error('Capability configuration was rejected');
      try{
        await fetchConfig({quiet:true});
      }catch(_refreshError){
        showConfigFailure();
        setMessage('Capability configuration saved, but Admin could not refresh.','error');
        return;
      }
      setMessage('Capability configuration saved. Learner runtime remains unchanged.','ok');
    }finally{
      button.disabled = false;
    }
  }

  async function runCapabilityHealth(button){
    const standby = button?.dataset?.healthStandbyCapability ? true : false;
    const key = button?.dataset?.healthCapability || button?.dataset?.healthStandbyCapability;
    const row = button?.closest?.('[data-capability-key]');
    const status = row?.querySelector?.('[data-capability-health-status]');
    const standbyStatus = row?.querySelector?.('[data-capability-standby-health-status]');
    const targetStatus = standby ? standbyStatus : status;
    if(!key) return;
    button.disabled = true;
    if(targetStatus) targetStatus.textContent = 'Checking…';
    try{
      const response = await fetch(`/api/admin/ai/test/${encodeURIComponent(key)}${standby ? '?standby=true' : ''}`,{method:'POST'});
      const data = await response.json();
      if(!response.ok){
        const errorClass = data?.detail?.error_class || data?.error_class;
        if(targetStatus) targetStatus.textContent = capabilityHealthLabel(errorClass);
        return;
      }
      const latency = Number.isFinite(Number(data?.latency_ms)) ? ` · ${Number(data.latency_ms)} ms` : '';
      if(targetStatus) targetStatus.textContent = `${standby ? 'Standby healthy' : 'Healthy'}${latency}`;
    }catch(_error){
      if(targetStatus) targetStatus.textContent = 'Health check failed';
    }finally{
      button.disabled = false;
    }
  }

  function renderSummary(){
    const activeProvider = providerById(active.provider);
    $('#adminCurrentEngine').textContent = activeProvider
      ? `${activeProvider.name} · ${active.model}`
      : `${active.provider || '—'} · ${active.model || '—'}`;
    $('#adminCurrentKind').textContent = activeProvider?.kind === 'local'
      ? 'Local engine · platform-wide'
      : 'Cloud API engine · platform-wide';

    const configured = providers.filter(p=>p.configured).length;
    const ready = providers.filter(p=>p.available).length;
    const modelCount = providers.reduce((n,p)=>n+(p.models||[]).length,0);
    $('#adminProviderCount').textContent = `${configured} / ${providers.length}`;
    $('#adminReadyCount').textContent = String(ready);
    $('#adminModelCount').textContent = String(modelCount);
  }

  function renderProviderConfig(){
    const host=$('#adminProviderConfig');
    if(!host) return;
    const provider=providerById(selectedProviderId) || providers[0];
    if(!provider){
      host.innerHTML='<div class="admin-empty">No provider configuration is available.</div>';
      return;
    }
    selectedProviderId=provider.id;
    const config=provider.configuration || {};
    const credentialRequired=config.credential_env !== null && config.credential_env !== undefined;
    const credentialState=config.credential_source === 'encrypted_server_store'
      ? 'Encrypted server credential'
      : config.credential_state === 'configured'
        ? 'Environment credential'
        : credentialRequired ? 'Credential not configured' : 'No credential required';
    const models=[...(provider.models || [])];
    if(!models.length && provider.default_model) models.push(provider.default_model);
    const endpoint=String(config.endpoint_url || '');
    const modelList=models.join('\n');
    host.innerHTML=`<div class="admin-provider-config-head">
      <div class="admin-provider-config-identity"><span class="provider-icon provider-icon--${esc(provider.id)} large">${providerIcon(provider.id)}</span><div><h4>${esc(provider.name)}</h4><p>${provider.kind==='local'?'Local provider':'Cloud provider'} · ${esc(credentialState)}</p></div></div>
      <span class="admin-read-only">SERVER MANAGED</span>
    </div>
    <form id="adminProviderSetupForm" class="admin-provider-setup-form">
      <div class="admin-provider-fields">
        <label>Endpoint URL<input type="url" data-provider-endpoint value="${esc(endpoint)}" placeholder="https://provider.example/v1" autocomplete="url" /></label>
        <label>Default model<input type="text" data-provider-default-model value="${esc(provider.default_model || '')}" placeholder="For example, gpt-4.1-mini" autocomplete="off" /></label>
        <label class="admin-provider-field-wide">Available models<textarea data-provider-models rows="4" placeholder="One model name per line">${esc(modelList)}</textarea><small class="admin-provider-help">The provider's model list is tested live before it is saved.</small></label>
        <label class="admin-provider-field-wide">API key or token<input type="password" data-provider-secret placeholder="${credentialState === 'Encrypted server credential' ? 'Leave empty to keep the stored credential' : 'Enter a provider credential'}" autocomplete="new-password" ${credentialRequired?'':'disabled'} /><small class="admin-provider-help">The credential is sent to this authenticated server, encrypted before storage, and never returned to the browser.</small></label>
      </div>
      <div class="admin-provider-config-foot"><span>Connection tests contact the provider. Saving replaces the server-side configuration without exposing the credential.</span><div class="admin-provider-config-actions"><button class="o-button o-button--quiet" type="button" data-provider-test>Test connection</button><button class="o-button primary" type="submit" data-provider-save>Save securely</button>${config.credential_source === 'encrypted_server_store' ? '<button class="o-button o-button--quiet admin-provider-delete" type="button" data-provider-delete>Remove stored credential</button>' : ''}</div></div>
    </form>`;
    const form=host.querySelector('#adminProviderSetupForm');
    const readPayload=()=>{
      const endpointValue=String(host.querySelector('[data-provider-endpoint]')?.value || '').trim();
      const modelValue=String(host.querySelector('[data-provider-default-model]')?.value || '').trim();
      const modelsValue=String(host.querySelector('[data-provider-models]')?.value || '');
      const secretInput=host.querySelector('[data-provider-secret]');
      const secretValue=String(secretInput?.value || '').trim();
      const models=[...new Set(modelsValue.split(/\r?\n|,/).map(value=>value.trim()).filter(Boolean))];
      const payload={base_url:endpointValue,default_model:modelValue,models};
      if(secretValue) payload.api_key=secretValue;
      // Clear the only DOM copy before the request leaves this page.
      if(secretInput) secretInput.value='';
      return payload;
    };
    const validatePayload=payload=>{
      if(!payload.base_url){ setMessage('Enter the provider endpoint URL.','error'); return false; }
      try{ new URL(payload.base_url); }catch(_error){ setMessage('Enter a valid provider endpoint URL.','error'); return false; }
      if(!payload.default_model){ setMessage('Choose a default model.','error'); return false; }
      if(!payload.models.length){ setMessage('Add at least one available model.','error'); return false; }
      if(credentialRequired && config.credential_source !== 'encrypted_server_store' && config.credential_state !== 'configured' && !payload.api_key){
        setMessage('Enter a provider credential before testing or saving.','error'); return false;
      }
      return true;
    };
    const runCredentialAction=async(mode)=>{
      const payload=readPayload();
      if(!validatePayload(payload)) return;
      const testButton=host.querySelector('[data-provider-test]');
      const saveButton=host.querySelector('[data-provider-save]');
      const deleteButton=host.querySelector('[data-provider-delete]');
      [testButton,saveButton,deleteButton].forEach(button=>{if(button) button.disabled=true;});
      try{
        const response=await fetch(mode==='test' ? `/api/admin/ai/credentials/${encodeURIComponent(provider.id)}/test` : `/api/admin/ai/credentials/${encodeURIComponent(provider.id)}`,{
          method:mode==='test'?'POST':'PUT',
          headers:{'Content-Type':'application/json'},
          cache:'no-store',
          body:JSON.stringify(payload)
        });
        const data=await response.json().catch(()=>({}));
        if(!response.ok) throw new Error(data.detail || (mode==='test'?'Provider connection test failed.':'Provider credential could not be saved.'));
        if(mode==='test'){
          const count=Array.isArray(data.models) ? data.models.length : 0;
          setMessage(`${provider.name} connection verified. ${count} text model${count===1?'':'s'} returned. Nothing was saved.`,'ok');
        }else{
          setMessage(`${provider.name} credential encrypted and saved on the server. The key was not returned.`,'ok');
          await fetchConfig({quiet:true});
        }
      }catch(error){
        setMessage(error?.message || 'Provider configuration request failed.','error');
      }finally{
        [testButton,saveButton,deleteButton].forEach(button=>{if(button) button.disabled=false;});
      }
    };
    form?.addEventListener('submit',event=>{ event.preventDefault(); runCredentialAction('save'); });
    host.querySelector('[data-provider-test]')?.addEventListener('click',()=>runCredentialAction('test'));
    host.querySelector('[data-provider-delete]')?.addEventListener('click',async()=>{
      if(!confirm(`Remove the encrypted ${provider.name} credential from this server?`)) return;
      const button=host.querySelector('[data-provider-delete]');
      if(button) button.disabled=true;
      try{
        const response=await fetch(`/api/admin/ai/credentials/${encodeURIComponent(provider.id)}`,{method:'DELETE',cache:'no-store'});
        const data=await response.json().catch(()=>({}));
        if(!response.ok) throw new Error(data.detail || 'Stored provider credential could not be removed.');
        setMessage(`${provider.name} stored credential removed. No key was exposed.`,'ok');
        await fetchConfig({quiet:true});
      }catch(error){
        setMessage(error?.message || 'Provider credential removal failed.','error');
        if(button) button.disabled=false;
      }
    });
    window.installOrenaSelectEnhancements?.(host);
  }

  function renderProviderCards(){
    const host = $('#adminProviderCards');
    if(!host) return;
    if(!selectedProviderId && providers.length) selectedProviderId=providers.find(provider=>provider.configured)?.id || providers[0].id;
    host.innerHTML = providers.map(p=>{
      const state = providerState(p);
      const count = (p.models||[]).length;
      const selected = selectedProviderId === p.id ? 'selected' : '';
      return `<button class="admin-provider-card ${selected}" type="button" data-provider-filter="${esc(p.id)}">
        <span class="provider-icon provider-icon--${esc(p.id)}" aria-label="${esc(p.name || p.id)} provider">${providerIcon(p.id)}</span>
        <span class="provider-copy">
          <b>${esc(p.name)}</b>
          <small>${p.kind==='local'?'Runs on this machine':'Server-managed API'} · ${count} model${count===1?'':'s'}</small>
        </span>
        <span class="admin-provider-state ${state.cls}">${esc(state.label)}</span>
      </button>`;
    }).join('');

    host.querySelectorAll('[data-provider-filter]').forEach(btn=>{
      btn.addEventListener('click',()=>{
        selectedProviderId=btn.dataset.providerFilter || selectedProviderId;
        currentFilter = currentFilter === btn.dataset.providerFilter ? 'all' : btn.dataset.providerFilter;
        renderProviderCards();
        renderProviderConfig();
        renderModels();
        syncFilterButtons();
      });
    });
  }

  function allModels(){
    const rows = [];
    for(const p of providers){
      for(const model of (p.models||[])){
        rows.push({provider:p, model});
      }
      if(!(p.models||[]).length && p.default_model){
        rows.push({provider:p, model:p.default_model, placeholder:true});
      }
    }
    return rows;
  }

  function matchesFilter(row){
    if(currentFilter !== 'all' && row.provider.id !== currentFilter) return false;
    if(!searchText) return true;
    const hay = `${row.model} ${row.provider.name} ${row.provider.id}`.toLowerCase();
    return hay.includes(searchText);
  }

  function renderModels(){
    const host = $('#adminModelGrid');
    if(!host) return;
    const rows = allModels().filter(matchesFilter);

    if(!rows.length){
      host.innerHTML = `<div class="admin-model-empty">
        <b>No models match this view.</b>
        <span>Install a local model, configure a cloud provider, or clear the filter.</span>
      </div>`;
      return;
    }

    host.innerHTML = rows.map(({provider,model,placeholder})=>{
      const isActive = active.provider === provider.id && active.model === model;
      const usable = provider.configured && (provider.available || placeholder);
      const state = !provider.configured
        ? 'Provider not configured'
        : provider.kind === 'local'
          ? 'Installed locally'
          : 'Available from API';
      return `<article class="admin-model-card ${isActive?'active':''}">
        <div class="model-card-top">
          <span class="provider-icon provider-icon--${esc(provider.id)} large" aria-label="${esc(provider.name || provider.id)} provider">${providerIcon(provider.id)}</span>
          <div class="model-title">
            <div class="model-badges">
              <span class="model-kind ${provider.kind}">${modelKindLabel(provider)}</span>
              ${isActive?'<span class="active-badge">ACTIVE</span>':''}
            </div>
            <h3>${esc(model)}</h3>
            <small>${esc(provider.name)}</small>
          </div>
        </div>
        <div class="model-state-row">
          <span class="model-dot ${usable?'ready':''}"></span>
          <span>${esc(state)}</span>
        </div>
        <div class="model-card-actions">
          <span class="admin-model-read-only">Catalog only · configure per capability above</span>
        </div>
      </article>`;
    }).join('');
  }

  function syncFilterButtons(){
    document.querySelectorAll('[data-admin-filter]').forEach(btn=>{
      btn.classList.toggle('active', btn.dataset.adminFilter === currentFilter);
    });
  }

  async function fetchCatalog(){
    const response=await fetch('/api/admin/ai/catalog',{cache:'no-store'});
    const data=await response.json();
    if(!response.ok || data?.read_only !== true) throw new Error('Could not load provider model catalog');
    const catalogById=new Map((data.providers || []).map(provider=>[provider.id,provider]));
    providers=providers.map(provider=>({...provider,...(catalogById.get(provider.id) || {})}));
  }

  async function fetchConfig({quiet=false}={}){
    if(!quiet) setMessage('Refreshing AI model catalog…');
    const r = await fetch('/api/admin/ai/config',{cache:'no-store'});
    const d = await r.json();
    if(!r.ok) throw new Error('Could not load platform AI settings');
    capabilities = Array.isArray(d.capabilities) ? d.capabilities : [];
    learnerRuntime = d.learner_runtime || {mode:'unknown'};
    providers = d.providers || [];
    active = d.active || {provider:'',model:''};
    await fetchCatalog().catch(()=>undefined);
    renderCapabilityMatrix();
    renderSummary();
    renderProviderCards();
    renderProviderConfig();
    renderModels();
    if(!quiet) setMessage('Model catalog refreshed.','ok');
  }

  async function useModel(provider, model){
    const p = providerById(provider);
    if(!confirm(`Use ${model} (${p?.name||provider}) for the whole Writing Coach platform?`)) return;
    setMessage(`Applying ${model} to the whole platform…`);
    const r = await fetch('/api/admin/ai/config',{
      method:'PUT',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({provider,model})
    });
    const d = await r.json();
    if(!r.ok) throw new Error(d.detail || 'Could not apply platform model');
    active = d.active || {provider,model};
    providers = d.providers || providers;
    renderSummary();
    renderProviderCards();
    renderProviderConfig();
    renderModels();
    setMessage(`Active platform model: ${active.provider_name||p?.name||provider} · ${active.model}.`,'ok');
  }

  async function testModel(provider, model){
    setMessage(`Testing ${model}…`);
    const r = await fetch('/api/admin/ai/test',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({provider,model})
    });
    const d = await r.json();
    if(!r.ok) throw new Error(d.detail || 'Model test failed');
    setMessage(`Connection OK: ${d.provider} · ${d.model}.`,'ok');
  }

  async function initializeAdmin(){
    if(!document.getElementById('page-admin')) return;
    observeHumanLabels();
    try{
      const meResponse = await fetch('/api/me',{cache:'no-store'});
      if(!meResponse.ok) return;
      const me = await meResponse.json();
      if(!me.is_admin) return;

      $('#adminNav')?.classList.remove('hidden');
      $('#adminNav')?.addEventListener('click',()=>{
        fetchConfig({quiet:true}).catch(showConfigFailure);
      });

      $('#adminRefreshModels')?.addEventListener('click',()=>{
        fetchConfig().catch(showConfigFailure);
      });
      $('#adminRefreshOperations')?.addEventListener('click',()=>{
        fetchOperations().catch(()=>setMessage('AI operation activity could not be loaded.','error'));
      });
      $('#adminRefreshProductActivity')?.addEventListener('click',()=>{
        fetchProductActivity().catch(()=>{productActivity={available:false,has_data:false,skills:[]};renderProductActivity();});
      });

      $('#adminModelSearch')?.addEventListener('input',ev=>{
        searchText = String(ev.target.value||'').trim().toLowerCase();
        renderModels();
      });

      document.querySelectorAll('[data-admin-filter]').forEach(btn=>{
        btn.addEventListener('click',()=>{
          currentFilter = btn.dataset.adminFilter || 'all';
          syncFilterButtons();
          renderProviderCards();
          renderModels();
        });
      });

      // Preload once so the admin page is instant when opened.
      await fetchConfig({quiet:true});
      await fetchOperations().catch(()=>renderOperations());
      await fetchProductActivity().catch(()=>renderProductActivity());
      await fetchReadinessSummary().catch(()=>{readinessSummary={available:false};renderReadinessSummary();});
      await fetchAccountState().catch(()=>renderAccountState());
    }catch(err){
      console.error('Admin dashboard initialization failed:',err);
      showConfigFailure();
    }
  }

  window.initializePlatformAdmin = initializeAdmin;

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',initializeAdmin);
  }else{
    initializeAdmin();
  }
})();
