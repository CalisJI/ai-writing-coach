/* BECOMING v2.15.3 — CARD CONTENT BOX REPAIR
   Layout/spacing only. */

const qsa=(root,selector)=>[...(root?.querySelectorAll?.(selector)||[])];
const children=node=>[...(node?.children||[])].filter(x=>x.nodeType===1);
const px=value=>Number.parseFloat(value)||0;

const PAGE_SELECTORS=[
  '.page','.home-page','.write-page','.review-page',
  '.reading-page','.library-page','.journey-page','.profile-page'
];

function visible(node){
  if(!node?.getClientRects)return false;
  const s=getComputedStyle(node);
  const r=node.getBoundingClientRect();
  return s.display!=='none' && s.visibility!=='hidden' && r.width>0 && r.height>0;
}

function overlayLike(node){
  if(!node?.matches)return false;
  return node.matches(
    'script,style,.dialog-backdrop,.modal-backdrop,.overlay,'+
    '[role="dialog"],.tooltip-layer,.toast-layer,[data-overlay-root]'
  );
}

function controlLike(node){
  if(!node?.matches)return false;
  return node.matches(
    'button,input,textarea,select,option,'+
    '[role="button"],[role="switch"],[role="slider"],progress,meter'
  );
}

function decorativeLike(node){
  if(!node?.matches)return false;
  return node.matches('hr,.divider,[class*="divider"],[aria-hidden="true"]');
}

function flowChild(node){
  if(!visible(node)||overlayLike(node))return false;
  const s=getComputedStyle(node);
  return s.position!=='fixed' && s.position!=='absolute';
}

function screenRoots(root=document){
  const explicit=qsa(root,'[data-screen-contract]').filter(visible);
  if(explicit.length)return explicit;

  const hosts=qsa(root,'.main-content,[data-main-content],#main-content,main').filter(visible);
  const found=[];
  for(const host of hosts){
    const direct=children(host).filter(flowChild);
    const semantic=direct.filter(node=>PAGE_SELECTORS.some(selector=>node.matches?.(selector)));
    if(semantic.length)found.push(...semantic);
    else if(direct.length===1)found.push(direct[0]);
  }
  return [...new Set(found)];
}

function pageRoot(screen){
  const direct=children(screen).filter(flowChild);
  for(const selector of PAGE_SELECTORS){
    const hit=direct.find(node=>node.matches?.(selector));
    if(hit)return hit;
  }
  return screen;
}

function pageShell(screen,page){
  const preferred=page.parentElement;
  if(preferred && preferred!==document.body && preferred!==document.documentElement){
    return preferred;
  }
  return screen.parentElement || screen;
}

function surfaceLike(node){
  if(!visible(node)||controlLike(node)||overlayLike(node))return false;

  const s=getComputedStyle(node);
  const r=node.getBoundingClientRect();
  if(r.width<180 || r.height<56)return false;

  const radius=Math.max(
    px(s.borderTopLeftRadius),px(s.borderTopRightRadius),
    px(s.borderBottomLeftRadius),px(s.borderBottomRightRadius)
  );
  const border=
    px(s.borderLeftWidth)+px(s.borderRightWidth)+
    px(s.borderTopWidth)+px(s.borderBottomWidth);
  const shadow=s.boxShadow && s.boxShadow!=='none';
  const sourceClasses=[...node.classList]
    .filter(name=>!name.startsWith('bc153-'))
    .join(' ');
  const classHint=/card|panel|surface|tile|hero|sheet|box|queue|pattern|recall/i
    .test(sourceClasses);

  return classHint || radius>=8 || shadow || border>=2;
}

function verticalStack(items){
  if(items.length<2)return false;
  for(let i=1;i<items.length;i++){
    const a=items[i-1].getBoundingClientRect();
    const b=items[i].getBoundingClientRect();
    const widthBase=Math.max(1,Math.min(a.width,b.width));
    const overlap=Math.max(0,Math.min(a.right,b.right)-Math.max(a.left,b.left));
    if(b.top<a.bottom-2)return false;
    if(overlap/widthBase<0.55)return false;
  }
  return true;
}

function sectionCandidates(parent){
  return children(parent).filter(flowChild).filter(node=>{
    const r=node.getBoundingClientRect();
    if(r.height<48 || r.width<120)return false;
    if(['SECTION','ARTICLE','HEADER','FOOTER','ASIDE'].includes(node.tagName))return true;
    if(surfaceLike(node))return true;
    return /section|hero|evidence|queue|progress|practice|review|recent|journey|library|profile/i
      .test(String(node.className||''));
  });
}

function markSectionStacks(page){
  const candidates=[page,...qsa(page,'section,article,div')].filter(visible);
  for(const parent of candidates){
    const items=sectionCandidates(parent);
    if(items.length<2 || !verticalStack(items))continue;

    const s=getComputedStyle(parent);
    const rowGap=px(s.rowGap==='normal'?'0':s.rowGap);
    if((s.display==='flex' && s.flexDirection==='column') || s.display==='grid'){
      if(rowGap<16)parent.classList.add('bc153-gap-only');
    }else{
      parent.classList.add('bc153-section-stack');
    }
    items.forEach(item=>item.classList.add('bc153-section'));
  }
}

function minimumCardPadding(){
  const root=getComputedStyle(document.documentElement);
  return {
    x:px(root.getPropertyValue('--bc153-card-pad-x')) || 16,
    y:px(root.getPropertyValue('--bc153-card-pad-y')) || 16
  };
}

function markCards(page){
  const nodes=[...qsa(page,'section,article,aside,div')].filter(visible);
  const minimum=minimumCardPadding();

  for(const node of nodes){
    if(node===page || !surfaceLike(node))continue;
    node.classList.add('bc153-layout-card');

    const s=getComputedStyle(node);
    if(px(s.paddingLeft)<minimum.x-1 || px(s.paddingRight)<minimum.x-1){
      node.classList.add('bc153-pad-x');
    }
    if(px(s.paddingTop)<minimum.y-1 || px(s.paddingBottom)<minimum.y-1){
      node.classList.add('bc153-pad-y');
    }
  }
}

/* Root-cause fix: compare direct children with the PARENT CONTENT BOX,
   not merely the parent border box. */
function repairCardContentBoxes(page){
  const cards=qsa(page,'.bc153-layout-card').filter(visible);

  for(const card of cards){
    const cs=getComputedStyle(card);
    const cr=card.getBoundingClientRect();
    const contentLeft=cr.left + px(cs.borderLeftWidth) + px(cs.paddingLeft);
    const contentRight=cr.right - px(cs.borderRightWidth) - px(cs.paddingRight);

    for(const child of children(card).filter(flowChild)){
      if(decorativeLike(child))continue;
      const rr=child.getBoundingClientRect();
      if(rr.left<contentLeft-1 || rr.right>contentRight+1){
        child.classList.add('bc153-card-content-child');
      }

      const s=getComputedStyle(child);
      if((s.display==='flex' || s.display==='grid') && s.minWidth!=='0px'){
        child.classList.add('bc153-min-zero');
      }
    }
  }
}

function enforceContainment(page){
  const nodes=[page,...qsa(page,'*')].filter(visible).slice(0,2000);
  for(const node of nodes){
    const parent=node.parentElement;
    if(!parent || !visible(parent) || overlayLike(node))continue;

    const r=node.getBoundingClientRect();
    const pr=parent.getBoundingClientRect();
    const s=getComputedStyle(node);
    const exceedsBorderBox=
      r.width>pr.width+2 || r.left<pr.left-2 || r.right>pr.right+2;

    if(exceedsBorderBox && s.position!=='fixed' && s.position!=='absolute'){
      node.classList.add('bc153-contain');
    }
    if((px(s.marginLeft)<-1 || px(s.marginRight)<-1) &&
       s.position!=='fixed' && s.position!=='absolute'){
      node.classList.add('bc153-reset-x-margin');
    }
  }
}

function clearLegacyClasses(root){
  qsa(root,
    '.bc15-page-container,.bc15-major-section,.bc15-two-column,'+
    '.bc151-page-container,.bc151-major-section,.bc151-two-column,'+
    '.bc152-page-shell,.bc152-page-container,.bc152-section-stack,'+
    '.bc152-gap-only,.bc152-section,.bc152-layout-card,'+
    '.bc152-pad-x,.bc152-pad-y,.bc152-contain,'+
    '.bc152-reset-x-margin,.bc152-min-zero'
  ).forEach(node=>{
    for(const cls of [...node.classList]){
      if(/^bc(?:15|151|152)-/.test(cls))node.classList.remove(cls);
    }
  });
}

function normalizeScreen(screen){
  const page=pageRoot(screen);
  if(!page)return;

  const shell=pageShell(screen,page);
  shell.classList.add('bc153-page-shell');
  page.classList.add('bc153-page-container');

  markSectionStacks(page);
  markCards(page);
  repairCardContentBoxes(page);
  enforceContainment(page);
}

function normalize(root=document){
  clearLegacyClasses(root);
  screenRoots(root).forEach(normalizeScreen);
}

let scheduled=false;
function schedule(){
  if(scheduled)return;
  scheduled=true;
  requestAnimationFrame(()=>{
    scheduled=false;
    normalize(document);
  });
}

export function installLayoutRepairV2153(){
  normalize(document);
  const observer=new MutationObserver(schedule);
  observer.observe(document.documentElement,{subtree:true,childList:true});
  return observer;
}
