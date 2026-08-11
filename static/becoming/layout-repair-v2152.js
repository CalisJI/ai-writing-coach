/* BECOMING v2.15.2 — LAYOUT REPAIR MODE
   Layout/spacing only. No content or business behavior. */

const qsa=(root,selector)=>[...(root?.querySelectorAll?.(selector)||[])];
const children=node=>[...(node?.children||[])].filter(x=>x.nodeType===1);
const px=value=>Number.parseFloat(value)||0;

const PAGE_SELECTORS=[
  '.page',
  '.home-page',
  '.write-page',
  '.review-page',
  '.reading-page',
  '.library-page',
  '.journey-page',
  '.profile-page',
];

function visible(node){
  if(!node?.getClientRects)return false;
  const s=getComputedStyle(node);
  const r=node.getBoundingClientRect();
  return s.display!=='none' &&
    s.visibility!=='hidden' &&
    r.width>0 &&
    r.height>0;
}

function overlayLike(node){
  if(!node?.matches)return false;
  return node.matches(
    'script,style,.dialog-backdrop,.modal-backdrop,.overlay,'+
    '[role="dialog"],.tooltip-layer,.toast-layer,[data-overlay-root]'
  );
}

function flowChild(node){
  if(!visible(node)||overlayLike(node))return false;
  const s=getComputedStyle(node);
  return s.position!=='fixed' && s.position!=='absolute';
}

function screenRoots(root=document){
  const explicit=qsa(root,'[data-screen-contract]').filter(visible);
  if(explicit.length)return explicit;

  const hosts=qsa(root,'.main-content,[data-main-content],#main-content,main')
    .filter(visible);

  const found=[];
  for(const host of hosts){
    const direct=children(host).filter(flowChild);
    const semantic=direct.filter(node=>
      PAGE_SELECTORS.some(selector=>node.matches?.(selector))
    );
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
  if(preferred &&
     preferred!==document.body &&
     preferred!==document.documentElement){
    return preferred;
  }
  return screen.parentElement || screen;
}

function hasOwnSurface(node){
  const s=getComputedStyle(node);
  const r=node.getBoundingClientRect();
  if(r.width<180 || r.height<56)return false;

  const radius=Math.max(
    px(s.borderTopLeftRadius),
    px(s.borderTopRightRadius),
    px(s.borderBottomLeftRadius),
    px(s.borderBottomRightRadius)
  );
  const border=
    px(s.borderLeftWidth)+px(s.borderRightWidth)+
    px(s.borderTopWidth)+px(s.borderBottomWidth);

  const shadow=s.boxShadow && s.boxShadow!=='none';
  const bg=s.backgroundColor &&
    s.backgroundColor!=='rgba(0, 0, 0, 0)' &&
    s.backgroundColor!=='transparent';

  const classHint=/card|panel|surface|tile|hero|sheet|box/i
    .test(String(node.className||''));

  return classHint || radius>=8 || shadow || (border>0 && bg);
}

function verticalStack(childrenList){
  if(childrenList.length<2)return false;

  const pairs=[];
  for(let i=1;i<childrenList.length;i++){
    const a=childrenList[i-1].getBoundingClientRect();
    const b=childrenList[i].getBoundingClientRect();

    // Same general horizontal lane and ordered vertically.
    const widthBase=Math.max(1,Math.min(a.width,b.width));
    const overlap=Math.max(0,Math.min(a.right,b.right)-Math.max(a.left,b.left));
    const horizontalAffinity=overlap/widthBase;

    pairs.push(
      b.top>=a.bottom-2 &&
      horizontalAffinity>=0.55
    );
  }
  return pairs.every(Boolean);
}

function sectionCandidates(parent){
  return children(parent)
    .filter(flowChild)
    .filter(node=>{
      const r=node.getBoundingClientRect();
      if(r.height<48 || r.width<120)return false;
      if(['SECTION','ARTICLE','HEADER','FOOTER','ASIDE'].includes(node.tagName)){
        return true;
      }
      if(hasOwnSurface(node))return true;
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

    if((s.display==='flex' && s.flexDirection==='column') ||
       s.display==='grid'){
      if(rowGap<16)parent.classList.add('bc152-gap-only');
    }else{
      parent.classList.add('bc152-section-stack');
    }

    items.forEach(item=>item.classList.add('bc152-section'));
  }
}

function markCards(page){
  const nodes=[...qsa(page,'section,article,aside,div')].filter(visible);

  for(const node of nodes){
    if(node===page || !hasOwnSurface(node))continue;
    if(node.matches('button,input,textarea,select,[role="button"]'))continue;

    const r=node.getBoundingClientRect();
    if(r.height<56 || r.width<180)continue;

    node.classList.add('bc152-layout-card');

    const s=getComputedStyle(node);
    const left=px(s.paddingLeft);
    const right=px(s.paddingRight);
    const top=px(s.paddingTop);
    const bottom=px(s.paddingBottom);

    if(left<16 || right<16)node.classList.add('bc152-pad-x');
    if(top<12 || bottom<12)node.classList.add('bc152-pad-y');

    for(const child of children(node).filter(visible)){
      const cs=getComputedStyle(child);
      if(cs.display==='flex' || cs.display==='grid'){
        child.classList.add('bc152-min-zero');
      }
    }
  }
}

function enforceContainment(page){
  const nodes=[page,...qsa(page,'*')].filter(visible).slice(0,1800);

  for(const node of nodes){
    const parent=node.parentElement;
    if(!parent || !visible(parent) || overlayLike(node))continue;

    const r=node.getBoundingClientRect();
    const pr=parent.getBoundingClientRect();
    const s=getComputedStyle(node);

    const exceeds=
      r.width>pr.width+2 ||
      r.left<pr.left-2 ||
      r.right>pr.right+2;

    if(exceeds && s.position!=='fixed' && s.position!=='absolute'){
      node.classList.add('bc152-contain');
    }

    if((px(s.marginLeft)<-1 || px(s.marginRight)<-1) &&
       s.position!=='fixed' && s.position!=='absolute'){
      node.classList.add('bc152-reset-x-margin');
    }

    if((s.display==='flex' || s.display==='grid') && s.minWidth!=='0px'){
      node.classList.add('bc152-min-zero');
    }
  }
}

function clearLegacyClasses(root){
  qsa(root,'.bc15-page-container,.bc15-major-section,.bc15-two-column,'+
           '.bc151-page-container,.bc151-major-section,.bc151-two-column')
    .forEach(node=>{
      node.classList.remove(
        'bc15-page-container','bc15-major-section','bc15-two-column',
        'bc151-page-container','bc151-major-section','bc151-two-column'
      );
    });
}

function normalizeScreen(screen){
  const page=pageRoot(screen);
  if(!page)return;

  const shell=pageShell(screen,page);

  shell.classList.add('bc152-page-shell');
  page.classList.add('bc152-page-container');

  markSectionStacks(page);
  markCards(page);
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

export function installLayoutRepairV2152(){
  normalize(document);

  const observer=new MutationObserver(schedule);
  observer.observe(document.documentElement,{
    subtree:true,
    childList:true
  });

  return observer;
}
