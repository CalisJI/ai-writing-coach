
/* BECOMING v2.15.1 — live page geometry runtime.
   Presentation/layout only. No data/business behavior. */

const qsa=(root,selector)=>[...(root?.querySelectorAll?.(selector)||[])];
const directElements=node=>[...(node?.children||[])].filter(x=>x.nodeType===1);

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

const TWO_COLUMN_SELECTORS=[
  '.home-editorial-hero',
  '.writing-dashboard-layout',
  '.write-layout',
  '.review-grid',
  '.reading-layout',
  '.library-layout',
  '.progress-hero-layout',
  '.profile-layout',
  '.journey-layout',
];

function isOverlayLike(node){
  if(!node?.matches)return false;
  return node.matches(
    '.dialog-backdrop,.modal-backdrop,.overlay,[role="dialog"],'+
    '.tooltip-layer,.toast-layer,[data-overlay-root],script,style'
  );
}

function isVisible(node){
  if(!node?.getClientRects)return false;
  const style=getComputedStyle(node);
  return style.display!=='none' && style.visibility!=='hidden' && node.getClientRects().length>0;
}

function semanticPageInside(screen){
  const direct=directElements(screen);
  for(const selector of PAGE_SELECTORS){
    const hit=direct.find(node=>node.matches?.(selector));
    if(hit)return hit;
  }
  return null;
}

function pageRoot(screen){
  if(!screen)return null;

  const semantic=semanticPageInside(screen);
  if(semantic)return semantic;

  /*
    Live fix:
    If [data-screen-contract] itself is the large physical surface, it MUST be
    the page geometry owner. The CSS now creates OUTER gutter via width/margin,
    not inner padding.
  */
  return screen;
}

function fallbackScreens(root=document){
  const hosts=qsa(root,'.main-content,[data-main-content],#main-content,main');
  const found=[];

  for(const host of hosts){
    const direct=directElements(host).filter(node=>!isOverlayLike(node) && isVisible(node));

    // Prefer semantic page roots.
    const semantic=direct.filter(node=>PAGE_SELECTORS.some(sel=>node.matches?.(sel)));
    if(semantic.length){
      found.push(...semantic);
      continue;
    }

    // Last structural fallback: visible direct content root(s).
    // No translated copy is inspected.
    if(direct.length===1)found.push(direct[0]);
  }

  return [...new Set(found)];
}

function screens(root=document){
  const explicit=qsa(root,'[data-screen-contract]').filter(isVisible);
  if(explicit.length)return explicit;
  return fallbackScreens(root);
}

function markMajorSections(container){
  directElements(container).forEach(node=>{
    if(isOverlayLike(node))return;
    node.classList.add('bc151-major-section');
  });
}

function normalizeTwoColumns(container){
  for(const selector of TWO_COLUMN_SELECTORS){
    qsa(container,selector).forEach(node=>node.classList.add('bc151-two-column'));
  }
}

function normalizeScreen(screen){
  const container=pageRoot(screen);
  if(!container)return;

  container.classList.add('bc151-page-container');
  markMajorSections(container);
  normalizeTwoColumns(container);
}

function expectedGutter(){
  const raw=getComputedStyle(document.documentElement)
    .getPropertyValue('--bc151-page-gutter').trim();
  return Number.parseFloat(raw)||0;
}

function measureVisible(){
  const result=[];
  for(const screen of screens(document)){
    const container=pageRoot(screen);
    if(!container || !isVisible(container))continue;

    const r=container.getBoundingClientRect();
    const workspace=container.closest('.app-workspace,.main-content,[data-main-content],main') || container.parentElement;
    const wr=workspace?.getBoundingClientRect?.();

    const majors=directElements(container)
      .filter(node=>!isOverlayLike(node) && isVisible(node))
      .map(node=>{
        const x=node.getBoundingClientRect();
        return {
          tag:node.tagName,
          className:String(node.className||''),
          left:x.left,right:x.right,width:x.width
        };
      });

    result.push({
      gutter:expectedGutter(),
      container:{
        left:r.left,right:r.right,width:r.width
      },
      workspace:wr?{
        left:wr.left,right:wr.right,width:wr.width
      }:null,
      major:majors,
      documentOverflow:Math.max(
        0,
        document.documentElement.scrollWidth-document.documentElement.clientWidth
      )
    });
  }
  return result;
}


function auditVisible(){
  const measurements=measureVisible();
  const failures=[];

  for(const item of measurements){
    const {gutter,container,workspace,major,documentOverflow}=item;

    if(documentOverflow>1){
      failures.push(`horizontal overflow ${documentOverflow}px`);
    }

    if(workspace){
      const left=container.left-workspace.left;
      const right=workspace.right-container.right;
      const tolerance=2;

      // For max-width centered content, outer space may be larger than gutter.
      if(left<gutter-tolerance || right<gutter-tolerance){
        failures.push(
          `page root outer gutter too small: left=${left.toFixed(1)}, right=${right.toFixed(1)}, expected>=${gutter}`
        );
      }
    }

    for(const child of major){
      if(child.left<container.left-1 || child.right>container.right+1){
        failures.push(`major section exceeds page container: ${child.className}`);
      }
    }
  }

  const pass=measurements.length>0 && failures.length===0;
  document.documentElement.dataset.bcLayoutAudit=pass?'pass':'fail';

  return {pass,failures,measurements};
}

function normalize(root=document){
  screens(root).forEach(normalizeScreen);
  requestAnimationFrame(()=>{
    const audit=auditVisible();
    if(!audit.pass){
      console.error('[BECOMING layout v2.15.1] LIVE AUDIT FAILED',audit);
    }
  });
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

export function installLayoutSystemV2151(){
  normalize(document);
  const observer=new MutationObserver(schedule);
  observer.observe(document.documentElement,{subtree:true,childList:true});

  // Expose actual-DOM geometry audit for DevTools diagnostics.
  window.BECOMING_LAYOUT_AUDIT={
    version:'2.15.1',
    measure:measureVisible,
    audit:auditVisible,
    normalize:()=>normalize(document),
  };

  return observer;
}
