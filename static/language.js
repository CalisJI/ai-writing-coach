(function(){
  const select = document.getElementById('languageSelect');
  const note = document.getElementById('languageAvailability');
  if(!select) return;

  async function loadLanguages(){
    try{
      const r = await fetch('/api/platform/languages', {cache:'no-store'});
      if(!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();

      select.innerHTML = '';
      for(const lang of data.languages || []){
        const option = document.createElement('option');
        option.value = lang.code;
        option.disabled = !lang.enabled;
        option.textContent = `${lang.icon || ''} ${lang.native_name || lang.name}${lang.enabled ? '' : ' · Coming later'}`;
        if(lang.code === data.active) option.selected = true;
        select.appendChild(option);
      }

      const enabled = (data.languages || []).filter(x=>x.enabled);
      note.textContent = enabled.length > 1
        ? 'Progress is stored separately for each language.'
        : 'Choose English or Chinese. Progress is stored separately for each language.';
      select.disabled = enabled.length < 2;
    }catch(err){
      console.error('Language registry load failed:', err);
      note.textContent = 'Language registry unavailable.';
      select.disabled = true;
    }
  }

  select.addEventListener('change', async ()=>{
    const language = select.value;
    select.disabled = true;
    try{
      const r = await fetch('/api/platform/language', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({language})
      });
      const data = await r.json();
      if(!r.ok) throw new Error(data.detail || 'Could not switch language');
      location.reload();
    }catch(err){
      alert(err.message);
      await loadLanguages();
    }
  });

  loadLanguages();
})();
