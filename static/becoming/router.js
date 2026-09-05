const VALID=new Set(['home','explore','write','review','read','listen','speak','library','grammar','journey','profile','onboarding']);

export function currentRoute(){
  const raw=location.hash.replace(/^#\/?/,'').split('?')[0] || 'home';
  return VALID.has(raw)?raw:'home';
}

export function go(route){
  const next=VALID.has(route)?route:'home';
  if(location.hash!==`#/${next}`){
    location.hash=`#/${next}`;
  }else{
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  }
}

export function syncNav(route){
  document.querySelectorAll('[data-route]').forEach(link=>{
    const active=link.dataset.route===route;
    link.classList.toggle('active',active);
    if(active)link.setAttribute('aria-current','page');
    else link.removeAttribute('aria-current');
  });
}
