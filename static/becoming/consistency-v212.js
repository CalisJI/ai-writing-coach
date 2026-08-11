
/* BECOMING v2.12 consistency runtime.
   Adds semantic classes only. It does not read/modify learner data or business state. */

const SURFACE_SELECTOR = [
  '.feedback-card',
  '.feedback-item',
  '.review-card',
  '.insight-block',
  '.strength-surface',
  '.next-action-surface',
  '.lookup-result',
  '.functional-surface'
].join(',');

function directElementChildren(node){
  return [...(node?.children||[])].filter(child=>child.nodeType===1);
}

function normalizeReview(root=document){
  root.querySelectorAll('.review-page').forEach(page=>{
    page.querySelectorAll(SURFACE_SELECTOR).forEach(node=>{
      node.classList.add('bc12-surface');
    });

    // The first priority/focus object is allowed to carry hero treatment.
    const priority=page.querySelector(
      '.review-focus-hero,.focus-surface,.priority-feedback,.primary-feedback'
    );
    priority?.classList.add('bc12-priority-feedback');

    // Positive/strength group becomes one quieter section family.
    page.querySelectorAll(
      '.strength-section,.positive-section,[class*="strength-group"]'
    ).forEach(section=>section.classList.add('bc12-positive-section'));
  });
}

function probableComparisonGrid(dialog){
  const known=dialog.querySelector(
    '.comparison-grid,.version-comparison,.stronger-version-grid,'+
    '[class*="comparison-grid"],[class*="version-grid"],[class*="compare-grid"],'+
    '[class*="polish-grid"],[class*="improvement-grid"]'
  );
  if(known)return known;

  // Fallback is structural, not language/text based:
  // choose a body child whose only two substantial element children are
  // similarly-sized reading surfaces.
  const bodies=[
    dialog.querySelector('.dialog-body'),
    dialog.querySelector('.modal-body'),
    dialog.querySelector('.dialog-content'),
    dialog.querySelector('.modal-content'),
    dialog
  ].filter(Boolean);

  for(const body of bodies){
    for(const candidate of directElementChildren(body)){
      const children=directElementChildren(candidate);
      if(children.length!==2)continue;

      const layout=getComputedStyle(candidate);
      if(!['grid','flex'].includes(layout.display))continue;

      const rects=children.map(x=>x.getBoundingClientRect());
      if(rects.some(r=>r.width<220))continue;
      const widthRatio=Math.max(...rects.map(r=>r.width))/Math.max(1,Math.min(...rects.map(r=>r.width)));
      if(widthRatio>1.35)continue;

      const textLengths=children.map(x=>(x.textContent||'').trim().length);
      if(Math.min(...textLengths)<180)continue;
      const textRatio=Math.max(...textLengths)/Math.max(1,Math.min(...textLengths));
      if(textRatio>1.8)continue;

      return candidate;
    }
  }
  return null;
}

function normalizeDialogs(root=document){
  root.querySelectorAll('.dialog,.modal,[role="dialog"]').forEach(dialog=>{
    dialog.classList.add('bc12-dialog');

    const grid=probableComparisonGrid(dialog);
    if(!grid)return;

    grid.classList.add('bc12-comparison-grid');
    const cards=directElementChildren(grid);
    cards.forEach((card,index)=>{
      card.classList.add('bc12-comparison-card');
      if(index===cards.length-1)card.classList.add('is-improved');
    });
  });
}

function applyConsistency(root=document){
  normalizeReview(root);
  normalizeDialogs(root);
}

let scheduled=false;
function schedule(){
  if(scheduled)return;
  scheduled=true;
  requestAnimationFrame(()=>{
    scheduled=false;
    applyConsistency(document);
  });
}

export function installConsistencyV212(){
  applyConsistency(document);
  const observer=new MutationObserver(schedule);
  observer.observe(document.documentElement,{childList:true,subtree:true});
  return observer;
}
