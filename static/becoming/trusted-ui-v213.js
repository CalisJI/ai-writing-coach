
/* BECOMING v2.13 — trusted UI completion runtime.
   Presentation only: assigns semantic classes, owns no learner/business data. */

const qsa=(root,selector)=>[...(root?.querySelectorAll?.(selector)||[])];
const directElements=node=>[...(node?.children||[])].filter(x=>x.nodeType===1);

function addAll(root,selector,...classes){
  qsa(root,selector).forEach(node=>node.classList.add(...classes));
}

const ROUTE_MAP={
  home:{
    frame:[
      '.home-recent','.recent-work','.recent-evidence','.recent-writing',
      '.recent-list','.home-evidence-list','.recent-work-surface'
    ],
    list:[
      '.home-recent','.recent-work','.recent-evidence','.recent-writing',
      '.recent-list','.home-evidence-list','.recent-work-surface'
    ],
  },
  write:{
    raised:['.practice-context','.write-setup','.writing-setup','.setup-panel','.practice-setup'],
    select:['select'],
  },
  read:{
    frame:['.reading-history','.reading-recent','.reading-history-panel','.reading-recent-panel'],
    raised:['.reading-questions','.reading-question-set','.question-panel','.reading-quiz','.reading-answer-sheet'],
    choice:['.reading-option','.answer-option','.question-option','.choice-option','label.option'],
  },
  library:{
    frame:[
      '.library-saved','.saved-language','.saved-language-section',
      '.saved-vocabulary','.vocabulary-saved','.vocabulary-list','.library-section'
    ],
    hero:['.library-recall-hero','.recall-hero','.review-queue','.recall-queue'],
    raised:['.recall-card'],
  },
  journey:{
    frame:[
      '.pattern-memory','.journey-patterns',
      '.benchmark-panel','.benchmark-summary','.journey-section-surface'
    ],
    list:[
      '.pattern-memory-list','.mastery-memory-list','.journey-list'
    ],
  },
  profile:{
    raised:['.profile-sections','.profile-settings','.preferences-panel','.settings-panel'],
    choice:['.radio-option','.theme-choice','.goal-option','.language-option'],
  },
  review:{
    frame:[
      '.strength-section','.positive-section','.strength-group',
      '.positive-feedback-group','.next-step-section'
    ],
    raised:[
      '.strength-card','.strength-surface','.positive-feedback',
      '.positive-evidence','.next-action-surface'
    ],
  },
};

function rowCandidates(frame){
  const known=qsa(frame,
    ':scope > .recent-work-item,:scope > .recent-evidence-item,'+
    ':scope > .reading-history-item,:scope > .saved-language-item,'+
    ':scope > .saved-vocabulary-item,:scope > .pattern-memory-row,'+
    ':scope > .mastery-memory-row,:scope > .journey-entry'
  );
  if(known.length)return known;

  const children=directElements(frame);
  if(children.length<2)return [];

  // Structure-only fallback: repeated article/li siblings are evidence rows even
  // when the frame also contains a heading/header sibling.
  const repeated=children.filter(node=>['ARTICLE','LI'].includes(node.tagName));
  if(repeated.length>=2)return repeated;
  return [];
}

function normalizeRoutes(root=document){
  qsa(root,'[data-screen-contract]').forEach(screen=>{
    const route=screen.dataset.screenContract;
    const map=ROUTE_MAP[route];
    if(!map)return;

    for(const selector of map.frame||[]){
      addAll(screen,selector,'bc13-frame');
    }
    for(const selector of map.raised||[]){
      addAll(screen,selector,'bc13-raised');
    }
    for(const selector of map.hero||[]){
      addAll(screen,selector,'bc13-hero');
    }
    for(const selector of map.choice||[]){
      addAll(screen,selector,'bc13-choice');
    }

    // Selects are only normalized inside the screen's known support areas.
    if(route==='write'){
      qsa(screen,
        '.practice-context select,.write-setup select,.writing-setup select,'+
        '.setup-panel select,.practice-setup select'
      ).forEach(node=>node.classList.add('bc13-select'));
    }

    for(const selector of map.list||[]){
      qsa(screen,selector).forEach(frame=>{
        frame.classList.add('bc13-list-frame');
        rowCandidates(frame).forEach(row=>row.classList.add('bc13-row'));
      });
    }
  });
}

function comparisonGrid(dialog){
  const known=dialog.querySelector(
    '.bc12-comparison-grid,.comparison-grid,.version-comparison,.stronger-version-grid,'+
    '[class*="comparison-grid"],[class*="version-grid"],[class*="compare-grid"],'+
    '[class*="polish-grid"],[class*="improvement-grid"]'
  );
  if(known)return known;

  // Structural fallback: two similarly sized, long-form panels in grid/flex.
  for(const candidate of qsa(dialog,'div,section')){
    const children=directElements(candidate);
    if(children.length!==2)continue;
    const display=getComputedStyle(candidate).display;
    if(!['grid','flex'].includes(display))continue;
    const textLengths=children.map(x=>(x.textContent||'').trim().length);
    if(Math.min(...textLengths)<180)continue;
    const ratio=Math.max(...textLengths)/Math.max(1,Math.min(...textLengths));
    if(ratio>1.8)continue;
    return candidate;
  }
  return null;
}

function dialogHeader(dialog){
  return dialog.querySelector(
    '.dialog-header,.modal-header,[data-dialog-header]'
  ) || directElements(dialog).find(node=>{
    const close=node.querySelector?.(
      '.dialog-close,.modal-close,[aria-label*="Close"],[aria-label*="close"]'
    );
    return Boolean(close);
  }) || null;
}

function dialogScrollOwner(dialog,grid,header){
  const known=dialog.querySelector(
    '.dialog-body,.modal-body,.dialog-content,.modal-content,[data-dialog-scroll]'
  );
  if(known && known!==dialog)return known;

  // Prefer the direct child that contains the comparison grid.
  let node=grid;
  while(node && node.parentElement!==dialog)node=node.parentElement;
  if(node && node!==header)return node;

  // Last structural fallback: largest non-header direct child.
  const children=directElements(dialog).filter(x=>x!==header);
  if(!children.length)return dialog;
  return children.sort((a,b)=>b.scrollHeight-a.scrollHeight)[0];
}

function normalizeDialogs(root=document){
  qsa(root,'.dialog,.modal,[role="dialog"]').forEach(dialog=>{
    const grid=comparisonGrid(dialog);
    if(!grid)return; // Only comparison/long-form dialogs get this contract.

    dialog.classList.add('bc13-dialog-shell');

    const header=dialogHeader(dialog);
    header?.classList.add('bc13-dialog-header');

    const scroll=dialogScrollOwner(dialog,grid,header);
    if(scroll && scroll!==dialog){
      scroll.classList.add('bc13-dialog-scroll');
      if(!scroll.hasAttribute('tabindex'))scroll.tabIndex=0;
    }

    const overlay=dialog.parentElement;
    if(overlay && (
      overlay.classList.contains('dialog-backdrop') ||
      overlay.classList.contains('modal-backdrop') ||
      overlay.classList.contains('overlay') ||
      overlay.getAttribute('role')==='presentation'
    )){
      overlay.classList.add('bc13-dialog-overlay');
    }

    grid.classList.add('bc13-comparison-grid');
    directElements(grid).forEach((card,index)=>{
      card.classList.add('bc13-comparison-card');
      if(index===directElements(grid).length-1)card.classList.add('is-improved');
    });
  });
}

function normalize(root=document){
  normalizeRoutes(root);
  normalizeDialogs(root);
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

export function installTrustedUiV213(){
  normalize(document);
  const observer=new MutationObserver(schedule);
  observer.observe(document.documentElement,{subtree:true,childList:true});
  return observer;
}
