(function(){
  const $ = (s) => document.querySelector(s);
  let providers = [];
  let capabilities = [];
  let learnerRuntime = {mode:'legacy'};
  let active = {provider:'', model:''};
  let currentFilter = 'all';
  let searchText = '';

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
          const runtime = capability.provider_backed
            ? (learnerRuntime.mode==='capability'?'Capability mode':'Legacy routing')
            : 'Local deterministic';
          return `<div class="admin-capability-row" role="row" data-capability-key="${esc(capability.key)}">
            <span role="cell"><b>${esc(capability.key)}</b><small>${esc(runtime)}</small></span>
            <span role="cell"><i class="admin-capability-dot ${state.cls}"></i>${esc(state.label)}</span>
            <span role="cell">${esc(provider)} / ${esc(model)}</span>
            <span role="cell">${esc(capability.operation || '—')}</span>
          </div>`;
        }).join('')}
      </div>`;
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
          <button class="ghost compact" type="button" data-test-provider="${esc(provider.id)}" data-test-model="${esc(model)}" ${usable?'':'disabled'}>Test</button>
          <button class="${isActive?'ghost':'primary'} compact" type="button" data-use-provider="${esc(provider.id)}" data-use-model="${esc(model)}" ${usable&&!isActive?'':'disabled'}>${isActive?'In use':'Use model'}</button>
        </div>
      </article>`;
    }).join('');

    host.querySelectorAll('[data-use-provider]').forEach(btn=>{
      btn.addEventListener('click',()=>useModel(btn.dataset.useProvider,btn.dataset.useModel));
    });
    host.querySelectorAll('[data-test-provider]').forEach(btn=>{
      btn.addEventListener('click',()=>testModel(btn.dataset.testProvider,btn.dataset.testModel));
    });
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
