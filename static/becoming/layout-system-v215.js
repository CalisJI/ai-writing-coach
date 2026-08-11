
/* BECOMING v2.15 — shared page-container runtime.
   Presentation/layout only. No business state or data ownership. */

const qsa=(root,selector)=>[...(root?.querySelectorAll?.(selector)||[])];
const directElements=node=>[...(node?.children||[])].filter(x=>x.nodeType===1);

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

function pageRoot(screen){
  if(!screen)return null;

  // Preferred real app structure: main[data-screen-contract] > .page
  const directPage=directElements(screen).find(node=>node.classList?.contains('page'));
  if(directPage)return directPage;

  // If a route already renders its semantic page root directly, use it.
  const known=screen.querySelector?.(
    ':scope > .home-page,:scope > .write-page,:scope > .review-page,'+
    ':scope > .reading-page,:scope > .library-page,:scope > .journey-page,'+
    ':scope > .profile-page'
  );
  if(known)return known;

  // Final fallback: the screen root itself becomes the page container.
  return screen;
}

function isOverlayLike(node){
  if(!node?.matches)return false;
  return node.matches(
    '.dialog-backdrop,.modal-backdrop,.overlay,[role="dialog"],'+
    '.tooltip-layer,.toast-layer,[data-overlay-root]'
  );
}

function markMajorSections(container){
  directElements(container).forEach(node=>{
    if(isOverlayLike(node))return;
    node.classList.add('bc15-major-section');
  });
}

function normalizeTwoColumns(container){
  for(const selector of TWO_COLUMN_SELECTORS){
    qsa(container,selector).forEach(node=>node.classList.add('bc15-two-column'));
  }
}

function normalizeScreen(screen){
  const container=pageRoot(screen);
  if(!container)return;

  container.classList.add('bc15-page-container');
  markMajorSections(container);
  normalizeTwoColumns(container);
}

function normalize(root=document){
  qsa(root,'[data-screen-contract]').forEach(normalizeScreen);
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

export function installLayoutSystemV215(){
  normalize(document);
  const observer=new MutationObserver(schedule);
  observer.observe(document.documentElement,{subtree:true,childList:true});
  return observer;
}
