(function(){
  const $=(s,root=document)=>root.querySelector(s);

  function initials(name,email){
    const source=String(name||email||'U').trim();
    const parts=source.split(/\s+/).filter(Boolean);
    if(parts.length>=2)return (parts[0][0]+parts[parts.length-1][0]).toUpperCase();
    return source.slice(0,2).toUpperCase();
  }

  function renderTopbarUser(me){
    const host=$('.product-topbar-right');
    if(!host)return;

    let chip=$('#productUserChip');
    if(!chip){
      chip=document.createElement('div');
      chip.id='productUserChip';
      chip.className='product-user-chip';
      chip.setAttribute('aria-label','Signed-in account');

      const plan=$('#productPlanBadge');
      if(plan)host.insertBefore(chip,plan);
      else host.appendChild(chip);
    }

    const displayName=String(me?.name||me?.email||'Account').trim();
    const email=String(me?.email||'').trim();
    const avatar=me?.picture
      ? `<span class="product-user-avatar"><img src="${escapeAttr(me.picture)}" alt="" referrerpolicy="no-referrer"></span>`
      : `<span class="product-user-avatar">${escapeHtml(initials(displayName,email))}</span>`;

    chip.innerHTML=`${avatar}<span class="product-user-copy"><b title="${escapeAttr(displayName)}">${escapeHtml(displayName)}</b>${email?`<small title="${escapeAttr(email)}">${escapeHtml(email)}</small>`:''}</span>`;
  }

  function escapeHtml(value=''){
    return String(value).replace(/[&<>"']/g,c=>({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'
    }[c]));
  }

  function escapeAttr(value=''){
    return escapeHtml(value);
  }

  async function loadIdentity(){
    try{
      const r=await fetch('/api/me',{credentials:'same-origin',cache:'no-store'});
      if(!r.ok)return;
      renderTopbarUser(await r.json());
    }catch(err){
      console.error('Topbar account identity failed:',err);
    }
  }

  function syncModalState(){
    const modal=$('#modal');
    if(!modal)return;
    const open=!modal.classList.contains('hidden');
    document.body.classList.toggle('modal-open',open);
    modal.setAttribute('role','dialog');
    modal.setAttribute('aria-modal','true');
    const close=$('.close',modal);
    if(close){
      close.setAttribute('aria-label','Close');
      close.setAttribute('title','Close');
    }
  }

  function installModalBehavior(){
    const modal=$('#modal');
    if(!modal)return;

    syncModalState();

    const observer=new MutationObserver(syncModalState);
    observer.observe(modal,{attributes:true,attributeFilter:['class']});

    modal.addEventListener('click',(event)=>{
      if(event.target===modal && typeof window.closeModal==='function'){
        window.closeModal();
      }
    });

    document.addEventListener('keydown',(event)=>{
      if(event.key!=='Escape')return;

      const dictionary=$('#dictionaryPopover');
      if(dictionary && !dictionary.classList.contains('hidden') && typeof window.hideDictionary==='function'){
        window.hideDictionary();
        return;
      }

      if(!modal.classList.contains('hidden') && typeof window.closeModal==='function'){
        window.closeModal();
      }
    });
  }

  function init(){
    installModalBehavior();
    loadIdentity();
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',init);
  }else{
    init();
  }
})();