import { state } from '../store.js';

/* The Platform Admin view keeps the existing capability-centric contract. It
   is deliberately mounted inside the Orena shell only for administrators;
   the controller loaded by the shell handles read-only evidence and leaves
   explicit provider/configuration actions behind their existing buttons. */
export async function renderAdmin(root) {
  if (!state.me?.is_admin) {
    root.innerHTML = '<section class="o-page admin-page" role="alert"><h2>Admin access required</h2><p>This surface is available only to platform administrators.</p></section>';
    return;
  }

  root.innerHTML = `
    <section id="page-admin" class="o-page admin-page">
      <header class="admin-page-head">
        <div>
          <p class="admin-eyebrow">INTERNAL OPERATIONS</p>
          <h2>Platform Admin</h2>
          <p>Capability-scoped AI configuration, activity evidence, and operational readiness.</p>
        </div>
        <button id="adminRefreshModels" class="o-button o-button--quiet" type="button">Refresh models</button>
      </header>

      <div class="admin-hero">
        <article class="admin-card admin-engine-card">
          <span class="admin-kicker">ACTIVE PLATFORM AI</span>
          <div id="adminCurrentEngine" class="admin-engine-value">Loading…</div>
          <div id="adminCurrentKind" class="admin-engine-kind">One model powers all language modules and users.</div>
        </article>
        <article class="admin-card admin-stat-card"><span class="admin-kicker">PROVIDERS</span><strong id="adminProviderCount">—</strong><small>configured</small></article>
        <article class="admin-card admin-stat-card"><span class="admin-kicker">READY</span><strong id="adminReadyCount">—</strong><small>providers online</small></article>
        <article class="admin-card admin-stat-card"><span class="admin-kicker">MODELS</span><strong id="adminModelCount">—</strong><small>discovered</small></article>
      </div>

      <article class="admin-card admin-panel admin-capability-panel">
        <div class="admin-panel-head"><div><h3>Capability configuration</h3><p>Scoped saved configuration per capability; learner runtime remains separate.</p></div><span class="admin-read-only">SCOPED CONFIG</span></div>
        <div id="adminCapabilityMatrix" class="admin-capability-matrix"><div class="admin-empty">Loading capability matrix…</div></div>
      </article>

      <article class="admin-card admin-panel">
        <div class="admin-panel-head"><div><h3>AI operations</h3><p>Read-only capability activity; provider usage is unknown when not reported.</p></div><button id="adminRefreshOperations" class="o-button o-button--quiet" type="button">Refresh activity</button></div>
        <div id="adminOperations" class="admin-operations" aria-live="polite"><div class="admin-empty">No operation data yet.</div></div>
      </article>

      <article class="admin-card admin-panel">
        <div class="admin-panel-head"><div><h3>Product activity and return trends</h3><p>Aggregate learner activity and readiness evidence. No learner text, media URLs, or identifiers are shown.</p></div><button id="adminRefreshProductActivity" class="o-button o-button--quiet" type="button">Refresh activity</button></div>
        <div id="adminProductActivity" class="admin-operations" aria-live="polite"><div class="admin-empty">Loading product activity…</div></div>
        <div class="admin-section-head"><div><h3>Operational readiness evidence</h3><p>Read-only evidence summary; this is not production-release approval.</p></div></div>
        <div id="adminReadinessSummary" class="admin-operations" aria-live="polite"><div class="admin-empty">Loading readiness evidence…</div></div>
      </article>

      <article class="admin-card admin-panel">
        <div class="admin-panel-head"><div><h3>Account state</h3><p>Read-only plan, entitlement, and monthly usage for the signed-in administrator.</p></div><span class="admin-read-only">READ ONLY</span></div>
        <div id="adminAccountState" class="admin-account-state"><div class="admin-empty">Loading account state…</div></div>
      </article>

      <article class="admin-card admin-panel">
        <div class="admin-panel-head"><div><h3>Provider catalog</h3><p>Read-only provider/model availability. Configure supported capabilities above.</p></div></div>
        <div class="admin-toolbar"><div class="admin-toolbar-left"><button class="admin-filter active" type="button" data-admin-filter="all">All</button><button class="admin-filter" type="button" data-admin-filter="ollama">Local</button><button class="admin-filter" type="button" data-admin-filter="openai">OpenAI</button><button class="admin-filter" type="button" data-admin-filter="deepseek">DeepSeek</button></div><div class="admin-toolbar-right"><input id="adminModelSearch" class="admin-search" type="search" placeholder="Search models or providers…"></div></div>
        <div id="adminProviderCards" class="admin-provider-list"></div>
        <div id="adminProviderConfig" class="admin-provider-config" aria-live="polite"><div class="admin-empty">Select a provider to view its connection settings.</div></div>
        <div id="adminModelGrid" class="admin-model-grid"></div>
        <div id="adminAiMessage" class="admin-message" role="status"></div>
        <div class="admin-policy-box"><div class="admin-policy-item"><span>Scope</span><b>Whole platform</b></div><div class="admin-policy-item"><span>API secrets</span><b>Server only</b></div><div class="admin-policy-item"><span>Paid failover</span><b>Disabled</b></div></div>
      </article>
    </section>`;

  if (typeof window.initializePlatformAdmin === 'function') {
    await window.initializePlatformAdmin();
  }
}
