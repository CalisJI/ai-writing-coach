(function(){
  const $ = (s, root=document) => root.querySelector(s);
  const $$ = (s, root=document) => [...root.querySelectorAll(s)];

  const NAV_LABELS = {
    dashboard: ['⌂','Home'],
    write: ['✎','Write'],
    history: ['◷','My writing'],
    library: ['▤','Library'],
    analytics: ['↗','Progress'],
  };

  const METRIC_COPY = {
    grammar: {
      en: ['Strengthen grammar accuracy','Focus on one reusable grammar pattern in your next piece.'],
      zh: ['Củng cố ngữ pháp tiếng Trung','Tập trung vào một mẫu ngữ pháp lặp lại trong bài viết tiếp theo.']
    },
    vocabulary: {
      en: ['Use more precise vocabulary','Practice replacing a few generic words with natural choices.'],
      zh: ['Dùng từ chính xác hơn','Luyện chọn từ và kết hợp từ tự nhiên hơn thay vì dịch từng chữ.']
    },
    coherence: {
      en: ['Make your ideas flow','Practice linking sentences so each idea leads naturally to the next.'],
      zh: ['Làm mạch ý rõ hơn','Luyện liên kết các câu và sắp xếp ý theo trình tự tự nhiên.']
    },
    task_achievement: {
      en: ['Answer the task more completely','Practice covering every requested point before polishing style.'],
      zh: ['Hoàn thành đề đầy đủ hơn','Ưu tiên trả lời đủ yêu cầu của đề trước khi nâng cấp cách diễn đạt.']
    },
    naturalness: {
      en: ['Write more naturally','Practice simpler, more idiomatic phrasing instead of translated structures.'],
      zh: ['Viết tự nhiên hơn','Luyện câu ngắn gọn, tự nhiên và giảm dấu vết dịch từng chữ.']
    }
  };

  function activeLanguage(){
    return window.WRITING_COACH_LANGUAGE || 'en';
  }

  function moveUserControls(){
    const language = $('.language-switcher');
    const languageHost = $('#productTopbarLanguage');
    if(language && languageHost) languageHost.appendChild(language);

    const controls = $('.ui-controls');
    const accountMenu = $('#accountMenu');
    if(controls && accountMenu){
      const block = document.createElement('div');
      block.className = 'product-account-settings';
      block.innerHTML = '<span>Appearance</span>';
      block.appendChild(controls);
      accountMenu.appendChild(block);
    }

    $('#modelBuddy')?.remove();
    $('#ollamaStatus')?.remove();

    $$('.sidebar-bottom small').forEach(el=>{
      if((el.textContent||'').includes('Data stays in local SQLite')) el.remove();
    });
  }

  function relabelNavigation(){
    $$('.nav[data-page]').forEach(btn=>{
      const page = btn.dataset.page;
      const config = NAV_LABELS[page];
      if(!config) return;
      btn.innerHTML = `<span class="nav-icon" aria-hidden="true">${config[0]}</span><span class="nav-label">${config[1]}</span>`;
      btn.setAttribute('aria-label', config[1]);
    });

    const admin = $('#adminNav');
    if(admin){
      admin.innerHTML = '<span class="nav-icon" aria-hidden="true">⚙</span><span class="nav-label">Admin</span>';
    }
  }

  function createMobileNav(){
    if($('#productMobileNav')) return;
    const host = document.createElement('nav');
    host.id = 'productMobileNav';
    host.className = 'product-mobile-nav';
    host.setAttribute('aria-label','Primary navigation');

    Object.entries(NAV_LABELS).forEach(([page,[icon,label]])=>{
      const b = document.createElement('button');
      b.type = 'button';
      b.dataset.page = page;
      b.innerHTML = `<span>${icon}</span><small>${label}</small>`;
      b.addEventListener('click',()=>{
        if(typeof window.go === 'function') window.go(page);
        syncMobileNav();
      });
      host.appendChild(b);
    });
    document.body.appendChild(host);

    $$('.nav[data-page]').forEach(btn=>{
      btn.addEventListener('click',()=>setTimeout(syncMobileNav,0));
    });
    syncMobileNav();
  }

  function syncMobileNav(){
    const page = $('.page.active')?.id?.replace('page-','') || 'dashboard';
    $$('#productMobileNav button').forEach(b=>b.classList.toggle('active', b.dataset.page===page));
  }

  function installDashboardNextStep(){
    const dashboard = $('#page-dashboard');
    const cards = $('#page-dashboard .cards.four');
    if(!dashboard || !cards || $('#productNextStep')) return;

    const section = document.createElement('section');
    section.id = 'productNextStep';
    section.className = 'product-next-step card';
    section.innerHTML = `
      <div class="next-step-copy">
        <span class="eyebrow">YOUR NEXT STEP</span>
        <h2>Loading your learning focus…</h2>
        <p>Writing Coach is preparing a useful next action.</p>
      </div>
      <button class="primary" type="button">Start writing</button>`;
    cards.parentNode.insertBefore(section, cards);

    section.querySelector('button').addEventListener('click',()=>{
      if(typeof window.newWriting === 'function') window.newWriting();
    });
  }

  function updateDashboardNextStep(d){
    const section = $('#productNextStep');
    if(!section) return;
    const title = $('h2',section);
    const desc = $('p',section);
    const button = $('button',section);
    const zh = activeLanguage()==='zh';

    if(!d || !d.essay_count){
      title.textContent = zh ? 'Bắt đầu bài viết đầu tiên' : 'Write your first piece';
      desc.textContent = zh
        ? 'Viết một đoạn ngắn để AI Coach bắt đầu xây dựng lộ trình cá nhân cho bạn.'
        : 'Write a short piece so your coach can start building a personalized learning path.';
      button.textContent = zh ? 'Bắt đầu viết' : 'Start writing';
      return;
    }

    const entries = Object.entries(d.metrics||{}).filter(([,v])=>Number.isFinite(Number(v)));
    if(!entries.length) return;
    entries.sort((a,b)=>Number(a[1])-Number(b[1]));
    const [metric] = entries[0];
    const copy = METRIC_COPY[metric] || METRIC_COPY.grammar;
    const langCopy = zh ? copy.zh : copy.en;
    title.textContent = langCopy[0];
    desc.textContent = langCopy[1];
    button.textContent = zh ? 'Luyện ngay' : 'Practice now';
  }

  async function loadProductState(){
    const [meResult, productResult, dashboardResult] = await Promise.allSettled([
      fetch('/api/me',{cache:'no-store'}).then(async r=>{
        const d=await r.json(); if(!r.ok) throw new Error(d.detail||'Account unavailable'); return d;
      }),
      fetch('/api/product/me',{cache:'no-store'}).then(async r=>{
        const d=await r.json(); if(!r.ok) throw new Error(d.detail||'Product state unavailable'); return d;
      }),
      fetch('/api/dashboard',{cache:'no-store'}).then(async r=>{
        const d=await r.json(); if(!r.ok) throw new Error(d.detail||'Dashboard unavailable'); return d;
      }),
    ]);

    if(meResult.status==='fulfilled'){
      const me=meResult.value;
      const first = String(me.name||'').trim().split(/\s+/)[0] || '';
      const h1 = $('#page-dashboard header h1');
      const p = $('#page-dashboard header p');
      if(h1){
        h1.textContent = first
          ? (activeLanguage()==='zh' ? `Chào ${first}` : `Welcome back, ${first}`)
          : (activeLanguage()==='zh' ? 'Chào bạn' : 'Welcome back');
      }
      if(p){
        p.textContent = activeLanguage()==='zh'
          ? 'Mỗi lần chỉ cần tập trung vào một bước hữu ích tiếp theo.'
          : 'Keep improving one focused step at a time.';
      }
    }

    if(productResult.status==='fulfilled'){
      const state=productResult.value;
      const badge=$('#productPlanBadge');
      if(badge){
        badge.textContent=state.plan?.name||'Free';
        badge.dataset.plan=state.plan?.id||'free';
        badge.title=state.billing_ready
          ? 'Manage your plan'
          : 'Plan foundation is ready; billing will be connected in a later release.';
      }

      const accountMenu=$('#accountMenu');
      if(accountMenu && !$('#productPlanRow')){
        const row=document.createElement('div');
        row.id='productPlanRow';
        row.className='product-plan-row';
        row.innerHTML=`<span>Plan</span><b>${state.plan?.name||'Free'}</b>`;
        accountMenu.insertBefore(row, $('.product-account-settings', accountMenu));
      }
    }

    if(dashboardResult.status==='fulfilled'){
      updateDashboardNextStep(dashboardResult.value);
    }
  }

  function makeShellProductFriendly(){
    document.body.classList.add('product-shell-v120');
    relabelNavigation();
    moveUserControls();
    installDashboardNextStep();
    createMobileNav();

    const writeHeader=$('#page-write header');
    if(writeHeader){
      const subtitle=$('#writeSubtitle');
      if(subtitle && activeLanguage()!=='zh'){
        subtitle.textContent='Write first. Your coach will turn the result into clear next steps.';
      }
    }
  }

  async function init(){
    makeShellProductFriendly();
    try{ await loadProductState(); }
    catch(err){ console.error('Product shell initialization failed:',err); }
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',init);
  }else{
    init();
  }
})();