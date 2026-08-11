
/* BECOMING v2.14 — lively details runtime.
   Presentation only. No learner/business state is created or modified. */

const qsa=(root,selector)=>[...(root?.querySelectorAll?.(selector)||[])];
const directElements=node=>[...(node?.children||[])].filter(x=>x.nodeType===1);

const sparkSvg=()=>`
<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
  <path d="M12 2.8v5.1M12 16.1v5.1M2.8 12h5.1M16.1 12h5.1"/>
  <path d="M5.6 5.6l3.6 3.6M14.8 14.8l3.6 3.6M18.4 5.6l-3.6 3.6M9.2 14.8l-3.6 3.6"/>
</svg>`;

const checkSvg=()=>`
<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
  <path d="M6.7 12.2l3.3 3.3 7.2-7.2"/>
</svg>`;

const leafSvg=()=>`
<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
  <path d="M19 4.8c-6.9.2-11.2 2.6-12.7 7.2-1.1 3.3.9 6.1 4 6.4 4.7.4 7.5-4.7 8.7-13.6Z"/>
  <path d="M6.7 18.6c2.4-3.7 5.1-6.1 8.8-8.2"/>
</svg>`;

function ensureSparkTile(header){
  if(header.querySelector('.bc14-spark-tile'))return;

  const tile=document.createElement('span');
  tile.className='bc14-spark-tile bc14-tactile';
  tile.setAttribute('aria-hidden','true');
  tile.innerHTML=sparkSvg();

  const copy=document.createElement('div');
  copy.className='bc14-dialog-copy';

  const children=directElements(header);
  const close=children.find(node=>
    node.matches?.('.dialog-close,.modal-close,[aria-label*="Close"],[aria-label*="close"]')
  );

  const copyNodes=children.filter(node=>node!==close);
  copyNodes.forEach(node=>copy.appendChild(node));

  header.prepend(tile);
  header.insertBefore(copy,close||null);
}

function normalizeComparisonDialogs(root=document){
  qsa(root,'.bc13-dialog-shell').forEach(dialog=>{
    const grid=dialog.querySelector('.bc13-comparison-grid');
    if(!grid)return;

    dialog.classList.add('bc14-lively-dialog');

    const header=dialog.querySelector('.bc13-dialog-header');
    if(header)ensureSparkTile(header);

    const cards=directElements(grid);
    cards.forEach((card,index)=>{
      card.classList.add('bc14-tactile');
      if(index!==cards.length-1)return;
      card.classList.add('bc14-improved-card');

      if(!card.querySelector('.bc14-positive-badge')){
        const badge=document.createElement('span');
        badge.className='bc14-positive-badge';
        badge.setAttribute('aria-hidden','true');
        badge.innerHTML=checkSvg();
        card.appendChild(badge);
      }
    });
  });
}

function normalizePriorityChip(root=document){
  qsa(root,'[data-screen-contract="review"]').forEach(screen=>{
    const priority=screen.querySelector(
      '.bc12-priority-feedback,.bc13-priority-feedback,.review-focus-hero,'+
      '.focus-surface,.priority-feedback,.primary-feedback'
    );
    if(!priority)return;

    const chip=priority.querySelector(
      '.feedback-category,.chip,.badge,[class*="tag"]'
    );
    if(!chip || chip.classList.contains('bc14-accent-chip'))return;

    chip.classList.add('bc14-accent-chip','bc14-tactile');
    const icon=document.createElement('span');
    icon.className='bc14-accent-chip-icon';
    icon.setAttribute('aria-hidden','true');
    icon.innerHTML=leafSvg();
    chip.prepend(icon);
  });
}

function normalizeDashboardCards(root=document){
  qsa(root,'[data-screen-contract="home"]').forEach(screen=>{
    const cards=qsa(screen,
      '.dashboard-evidence-strip > article,'+
      '.dashboard-evidence-strip > div,'+
      '.dashboard-summary-grid > article,'+
      '.dashboard-summary-grid > div,'+
      '.hero-progress-card,'+
      '.insight-card'
    );

    cards.forEach((card,index)=>{
      card.classList.add('bc14-mini-card','bc14-tactile');
      if(index>0)card.classList.add('bc14-mini-card-quiet');
    });
  });
}

function normalizeProgressEndpoints(root=document){
  qsa(root,
    '.dashboard-metric-track > i,'+
    '.progress-track > i,'+
    '.progress-fill,'+
    '[class*="progress-fill"]'
  ).forEach(fill=>{
    if(fill.clientWidth<=0)return;
    fill.classList.add('bc14-progress-fill');
  });
}

function normalizeTactileControls(root=document){
  qsa(root,
    '.bc13-choice,.bc13-control,.bc13-select,'+
    '.button-primary,.button-secondary,'+
    '.help-tip-trigger,.info-button,'+
    '.theme-button,.language-select'
  ).forEach(node=>node.classList.add('bc14-tactile'));
}

function normalize(root=document){
  normalizeComparisonDialogs(root);
  normalizePriorityChip(root);
  normalizeDashboardCards(root);
  normalizeProgressEndpoints(root);
  normalizeTactileControls(root);
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

export function installLivelyDetailsV214(){
  normalize(document);
  const observer=new MutationObserver(schedule);
  observer.observe(document.documentElement,{subtree:true,childList:true});
  return observer;
}
