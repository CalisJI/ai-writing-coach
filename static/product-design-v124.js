(function(){
  const ICONS={
    dashboard:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 10.5 12 4l8 6.5"/><path d="M6.5 9.5V20h11V9.5"/></svg>`,
    write:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 19h4l10-10-4-4L5 15v4Z"/><path d="m13.5 6.5 4 4"/></svg>`,
    history:`<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/></svg>`,
    library:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4.5h12.5A1.5 1.5 0 0 1 19 6v13.5H6.5A1.5 1.5 0 0 1 5 18V4.5Z"/><path d="M8 8h8M8 11h8M8 14h6"/></svg>`,
    analytics:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 18 10 13l3 3 6-8"/><path d="M15 8h4v4"/></svg>`,
    admin:`<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.9 4.9 7 7M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1 7 17M17 7l2.1-2.1"/></svg>`
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

  function desiredLanguageLabel(option){
    const value=String(option?.value||'').toLowerCase();
    if(value==='en')return 'English';
    if(value==='zh')return '中文';
    return null;
  }

  function cleanLanguageOptions(){
    const select=document.getElementById('languageSelect');
    if(!select)return;

    function simplify(){
      // IMPORTANT: only write when the label is actually different.
      // Setting textContent unconditionally creates a child-list mutation.
      // The old v1.2.3 observer watched subtree mutations and could therefore
      // trigger itself forever, freezing the browser tab.
      for(const option of [...select.options]){
        const wanted=desiredLanguageLabel(option);
        if(wanted && option.textContent!==wanted){
          option.textContent=wanted;
        }
      }
    }

    simplify();

    // language.js replaces/appends OPTION nodes directly under SELECT.
    // Watching only direct child-list changes is sufficient and avoids
    // observing the text-node changes made by simplify().
    const observer=new MutationObserver(()=>{
      observer.disconnect();
      simplify();
      observer.observe(select,{childList:true});
    });
    observer.observe(select,{childList:true});
  }

  function init(){
    polishNav();
    cleanLanguageOptions();
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',init,{once:true});
  }else{
    init();
  }
})();