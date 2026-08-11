(function(){
  const ICONS={
    dashboard:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 10.5 12 4l8 6.5"/><path d="M6.5 9.5V20h11V9.5"/></svg>`,
    write:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 19h4l10-10-4-4L5 15v4Z"/><path d="m13.5 6.5 4 4"/></svg>`,
    history:`<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/></svg>`,
    library:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4.5h12.5A1.5 1.5 0 0 1 19 6v13.5H6.5A1.5 1.5 0 0 1 5 18V4.5Z"/><path d="M8 8h8M8 11h8M8 14h6"/></svg>`,
    analytics:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 18 10 13l3 3 6-8"/><path d="M15 8h4v4"/></svg>`,
    admin:`<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19 13.5v-3l-2-.7a6.8 6.8 0 0 0-.7-1.7l.9-1.9-2.1-2.1-1.9.9a6.8 6.8 0 0 0-1.7-.7L10.8 2h-3l-.7 2.3a6.8 6.8 0 0 0-1.7.7l-1.9-.9-2.1 2.1.9 1.9a6.8 6.8 0 0 0-.7 1.7l-2 .7v3l2 .7c.2.6.4 1.2.7 1.7l-.9 1.9 2.1 2.1 1.9-.9c.5.3 1.1.5 1.7.7l.7 2.3h3l.7-2.3c.6-.2 1.2-.4 1.7-.7l1.9.9 2.1-2.1-.9-1.9c.3-.5.5-1.1.7-1.7l2-.7Z" transform="scale(.8) translate(3 3)"/></svg>`
  };

  const LABELS={
    dashboard:'Home',
    write:'Write',
    history:'My writing',
    library:'Library',
    analytics:'Progress',
    admin:'Admin'
  };

  function polishNav(){
    document.querySelectorAll('.nav[data-page]').forEach(btn=>{
      const page=btn.dataset.page;
      if(!ICONS[page])return;
      btn.innerHTML=`<span class="nav-icon">${ICONS[page]}</span><span class="nav-label">${LABELS[page]||page}</span>`;
      btn.setAttribute('aria-label',LABELS[page]||page);
      btn.title=LABELS[page]||page;
    });

    const admin=document.getElementById('adminNav');
    if(admin){
      admin.innerHTML=`<span class="nav-icon">${ICONS.admin}</span><span class="nav-label">${LABELS.admin}</span>`;
      admin.setAttribute('aria-label',LABELS.admin);
      admin.title=LABELS.admin;
    }
  }

  function cleanLanguageOptions(){
    const select=document.getElementById('languageSelect');
    if(!select)return;

    const simplify=()=>{
      [...select.options].forEach(option=>{
        const value=String(option.value||'').toLowerCase();
        if(value==='en')option.textContent='English';
        if(value==='zh')option.textContent='中文';
      });
    };

    simplify();

    const observer=new MutationObserver(simplify);
    observer.observe(select,{childList:true,subtree:true});
  }

  function init(){
    polishNav();
    cleanLanguageOptions();
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',init);
  }else{
    init();
  }
})();