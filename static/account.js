(function(){
  const $ = (s) => document.querySelector(s);

  function setStatus(text){
    const el = $('#accountStatus');
    if(el) el.textContent = text || '';
  }

  async function getMe(){
    const r = await fetch('/api/me', {
      credentials: 'same-origin',
      cache: 'no-store'
    });

    if(r.status === 401){
      location.href = '/login';
      return null;
    }

    if(!r.ok){
      throw new Error(`Account API returned HTTP ${r.status}`);
    }

    return await r.json();
  }

  function renderAvatar(me){
    const img = $('#accountAvatarImage');
    const fallback = $('#accountAvatarFallback');

    if(me.picture){
      img.src = me.picture;
      img.alt = me.name || 'User avatar';
      img.referrerPolicy = 'no-referrer';
      img.classList.remove('hidden');
      fallback.classList.add('hidden');
    }else{
      img.classList.add('hidden');
      fallback.classList.remove('hidden');
      fallback.textContent = (me.name || me.email || 'U').slice(0,1).toUpperCase();
    }
  }

  function renderAccount(me){
    renderAvatar(me);

    $('#accountName').textContent = me.name || me.email || 'Google user';
    $('#accountEmail').textContent = me.email || '';
    $('#accountMode').textContent = me.mode === 'google' ? 'Google account' : 'Local mode';

    const googleActions = $('#googleAccountActions');
    if(googleActions){
      googleActions.classList.toggle('hidden', me.mode !== 'google');
    }

    setStatus('');
    $('#accountPanel').classList.remove('account-loading');
  }

  async function logout(next='/login'){
    const btns = document.querySelectorAll('.account-action');
    btns.forEach(b => b.disabled = true);
    setStatus('Signing out…');

    try{
      await fetch('/auth/logout', {
        method: 'POST',
        credentials: 'same-origin'
      });
    }finally{
      location.href = next;
    }
  }

  window.signOutAccount = function(){
    logout('/login');
  };

  window.switchGoogleAccount = function(){
    // /auth/google already uses prompt=select_account,
    // so after clearing our app session Google will show the account picker.
    logout('/auth/google');
  };

  window.toggleAccountMenu = function(){
    const menu = $('#accountMenu');
    const button = $('#accountToggle');
    const open = menu.classList.toggle('open');
    button.setAttribute('aria-expanded', open ? 'true' : 'false');
  };

  document.addEventListener('click', (ev) => {
    const panel = $('#accountPanel');
    const menu = $('#accountMenu');
    const toggle = $('#accountToggle');
    if(!panel || !menu || !toggle) return;
    if(menu.classList.contains('open') && !panel.contains(ev.target)){
      menu.classList.remove('open');
      toggle.setAttribute('aria-expanded','false');
    }
  });

  async function init(){
    try{
      const me = await getMe();
      if(me) renderAccount(me);
    }catch(err){
      console.error('Account profile load failed:', err);
      $('#accountName').textContent = 'Account unavailable';
      $('#accountEmail').textContent = 'Reload or check /api/me';
      $('#accountMode').textContent = 'Error';
      setStatus(err.message || 'Could not load account.');
      $('#accountPanel').classList.remove('account-loading');
    }
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  }else{
    init();
  }
})();
