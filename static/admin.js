(function(){
  const $ = (s) => document.querySelector(s);
  let providers = [];
  let capabilities = [];
  let learnerRuntime = {mode:'legacy'};
  let active = {provider:'', model:''};
  let currentFilter = 'all';
  let searchText = '';
  let operations = {available:false, has_data:false, recent:[], by_capability:[]};

  function esc(s=''){
    return String(s).replace(/[&<>"']/g,c=>({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'
    }[c]));
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

  function providerIcon(id){
    if(id === 'ollama') return '◉';
    if(id === 'openai') return '✦';
    if(id === 'deepseek') return '◇';
    return '◆';
  }

  function modelKindLabel(provider){
    return provider?.kind === 'local' ? 'LOCAL' : 'CLOUD';
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
    const rows = (operations.by_capability||[]).map(row=>`<div class="admin-operation-row">
      <b>${esc(row.capability)}</b><strong>${esc(healthLabels[row.health_state] || 'Health unknown')}</strong>
      <span>${row.total} total · ${row.success} success · ${row.failure} failure · ${row.evidence_count ?? row.total} events sampled</span>
      <span>${row.failure_rate_percent == null ? 'Failure rate unknown' : `${row.failure_rate_percent}% failures`} · ${row.avg_latency_ms == null ? 'Latency unknown' : `${row.avg_latency_ms} ms average`} · ${row.usage_known ? `${row.usage_known} usage reported` : 'Usage unknown'}</span>
    </div>`).join('');
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
              <label>Model<input data-capability-model type="text" maxlength="160" value="${esc(editableModel)}" placeholder="Model identifier"></label>
              <label class="admin-capability-enabled"><input data-capability-enabled type="checkbox" ${config.enabled === false?'':'checked'}> Enabled</label>
              <button class="primary compact" type="button" data-save-capability="${esc(capability.key)}" data-capability-fallback="${esc(config.fallback_policy || (capability.allowed_fallback_policies || ['none'])[0])}" data-capability-timeout="${esc(config.timeout_seconds ?? '')}" data-capability-temperature="${esc(config.temperature ?? '')}">Save configuration</button>
              <small>Saved configuration only · learner runtime remains ${esc(learnerRuntime.mode || 'unknown')}</small>
              ${capability.explicit_config_exists && config.enabled !== false ? '<button class="ghost compact" type="button" data-health-capability="'+esc(capability.key)+'">Verify health</button><small data-capability-health-status></small>' : ''}
            </div>` : '';
          return `<div class="admin-capability-row" role="row" data-capability-key="${esc(capability.key)}">
            <span role="cell"><b>${esc(capability.key)}</b><small>${esc(runtime)}</small></span>
            <span role="cell"><i class="admin-capability-dot ${state.cls}"></i>${esc(state.label)}<small>${esc(savedState)}</small></span>
            <span role="cell">${esc(provider)} / ${esc(model)}</span>
            <span role="cell">${esc(capability.operation || '—')}${controls}</span>
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
    const key = button?.dataset?.healthCapability;
    const row = button?.closest?.('[data-capability-key]');
    const status = row?.querySelector?.('[data-capability-health-status]');
    if(!key) return;
    button.disabled = true;
    if(status) status.textContent = 'Checking…';
    try{
      const response = await fetch(`/api/admin/ai/test/${encodeURIComponent(key)}`,{method:'POST'});
      const data = await response.json();
      if(!response.ok){
        const errorClass = data?.detail?.error_class || data?.error_class;
        if(status) status.textContent = capabilityHealthLabel(errorClass);
        return;
      }
      const latency = Number.isFinite(Number(data?.latency_ms)) ? ` · ${Number(data.latency_ms)} ms` : '';
      if(status) status.textContent = `Healthy${latency}`;
    }catch(_error){
      if(status) status.textContent = 'Health check failed';
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

  function renderProviderCards(){
    const host = $('#adminProviderCards');
    if(!host) return;
    host.innerHTML = providers.map(p=>{
      const state = providerState(p);
      const count = (p.models||[]).length;
      const selected = currentFilter === p.id ? 'selected' : '';
      return `<button class="admin-provider-card ${selected}" type="button" data-provider-filter="${esc(p.id)}">
        <span class="provider-icon">${providerIcon(p.id)}</span>
        <span class="provider-copy">
          <b>${esc(p.name)}</b>
          <small>${p.kind==='local'?'Runs on this machine':'Server-managed API'} · ${count} model${count===1?'':'s'}</small>
        </span>
        <span class="admin-provider-state ${state.cls}">${esc(state.label)}</span>
      </button>`;
    }).join('');

    host.querySelectorAll('[data-provider-filter]').forEach(btn=>{
      btn.addEventListener('click',()=>{
        currentFilter = currentFilter === btn.dataset.providerFilter ? 'all' : btn.dataset.providerFilter;
        renderProviderCards();
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
          <span class="provider-icon large">${providerIcon(provider.id)}</span>
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

  async function fetchConfig({quiet=false}={}){
    if(!quiet) setMessage('Refreshing AI model catalog…');
    const r = await fetch('/api/admin/ai/config',{cache:'no-store'});
    const d = await r.json();
    if(!r.ok) throw new Error('Could not load platform AI settings');
    capabilities = Array.isArray(d.capabilities) ? d.capabilities : [];
    learnerRuntime = d.learner_runtime || {mode:'unknown'};
    providers = d.providers || [];
    active = d.active || {provider:'',model:''};
    renderCapabilityMatrix();
    renderSummary();
    renderProviderCards();
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
    }catch(err){
      console.error('Admin dashboard initialization failed:',err);
      showConfigFailure();
    }
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',initializeAdmin);
  }else{
    initializeAdmin();
  }
})();
