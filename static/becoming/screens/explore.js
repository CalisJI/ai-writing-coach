import {api} from '../api.js';
import {state,resetDraft,setSupportLanguage,supportLanguage} from '../store.js';
import {go} from '../router.js?v=2.17.5';
import {esc,toast} from '../components/primitives.js';
import {toggleTheme} from '../theme.js';
import {contentFor,importedContent,EXPLORE_LANGUAGES} from '../domain/explore-content.js';
import {createExploreSession} from '../domain/explore-session.js';
import {exploreCopy} from '../domain/explore-copy.js';

const arrow='<span aria-hidden="true">↗</span>';
const art='/becoming-assets/orena/assets/last-train.png';

export function renderExplore(root){
  const language=state.language;
  let copy=exploreCopy[supportLanguage()]||exploreCopy.en;
  let storage;
  try{storage=window.sessionStorage;}catch{storage={getItem(){throw new Error();},setItem(){throw new Error();}};}
  const session=createExploreSession(storage,state.me?.email||state.me?.mode||'local',language);
  const stories=contentFor(language);
  let disposed=false;
  let view='explore';
  let selected=null;
  let opener=null;
  let scrollPosition=0;
  const manualDrafts=new Map();
  const all=()=>[...stories,...session.value.imports];
  const origin=item=>copy[item.origin==='imported'?'imported':'generated'];
  const saved=id=>session.value.saved.includes(id);
  const notice=()=>session.available?copy.tabNote:copy.memoryOnly;

  function image(item,extra=''){
    if(item.art==='train')return `<img class="o-world-art ${extra}" src="${art}" alt="" width="1536" height="1024">`;
    return `<div class="o-world-art o-world-art--${esc(item.art)} ${extra}" aria-hidden="true">${item.art==='table'?'<span class="o-world-cup"></span><span class="o-world-cup second"></span>':item.art==='street'?'<span class="o-world-door"></span>':'<span class="o-world-paper">Aa<br>字</span>'}</div>`;
  }

  function header(){return `<header class="o-world-header">
    <button class="o-world-brand" data-view="explore" aria-label="Orena — ${esc(copy.explore)}"><span class="o-world-mark" aria-hidden="true">o</span>orena<span class="o-world-brand-dot">.</span></button>
    <nav aria-label="${esc(copy.explore)}"><button data-view="explore" ${view==='explore'?'aria-current="page"':''}>${copy.explore}</button><button data-view="saved" ${view==='saved'?'aria-current="page"':''}>${copy.saved}</button><a href="#/library">${copy.language}</a><a href="#/journey">${copy.journey}</a></nav>
    <div class="o-world-header-actions"><label class="o-world-learning"><span class="o-sr">${copy.learning}</span><select data-field-language data-orena-select="native" aria-label="${copy.learning}">${(state.languages||[]).filter(x=>EXPLORE_LANGUAGES.includes(x.code)).map(x=>`<option value="${esc(x.code)}" ${language===x.code?'selected':''}>${esc(x.native_name||x.name||x.code)}</option>`).join('')}</select></label><button class="o-world-theme" data-theme-toggle aria-label="${copy.theme}">◐</button><button class="o-world-bring" data-bring><span aria-hidden="true">＋</span> ${copy.bring}</button></div>
  </header>`;}

  function footer(){return `<footer class="o-world-footer"><span>${copy.footer}</span><div><label>${copy.interface} <select data-field-interface data-orena-select="native">${[['en','English'],['zh','中文'],['vi','Tiếng Việt']].map(([code,name])=>`<option value="${code}" ${supportLanguage()===code?'selected':''}>${name}</option>`).join('')}</select></label><a href="#/home">${copy.existing} ↗</a></div><details><summary>${copy.about}</summary><p>${copy.tabNote}</p><p>${copy.originNote}</p></details></footer>`;}

  function itemRow(item){
    const control=item.origin==='imported'?'':`<button class="o-world-quiet" data-save="${esc(item.id)}" aria-pressed="${saved(item.id)}">${saved(item.id)?copy.remove:copy.save}</button>`;
    return `<article class="o-world-saved-row">${image(item)}<div><span class="o-world-meta">${esc(origin(item))}</span><h2 lang="${language}"><button data-open="${esc(item.id)}">${esc(item.title)} ${arrow}</button></h2>${session.value.responses[item.id]?`<p class="o-world-response-excerpt">${esc(session.value.responses[item.id])}</p>`:''}</div>${control}</article>`;
  }

  function discovery(){
    const [lead,second,third]=stories;
    const last=all().find(x=>x.id===session.value.last);
    return `<div class="o-world-intro"><div><span class="o-world-kicker">${copy.edition}</span><h1 tabindex="-1">${copy.title}</h1><p>${copy.intro}</p></div><span class="o-world-collection-note">${copy.collection}</span></div>
      <section class="o-world-feature" aria-labelledby="fieldFeatureTitle"><button class="o-world-image-link" data-open="${lead.id}" aria-label="${esc(lead.title)}">${image(lead)}<span class="o-world-image-caption">ORENA / ${copy.story}</span><span class="o-world-orbit" aria-hidden="true">↗</span></button><div class="o-world-feature-copy"><span class="o-world-kicker">01 / ${esc(lead.topic)}</span><h2 id="fieldFeatureTitle" lang="${language}">${esc(lead.title)}</h2><p lang="${language}">${esc(lead.subtitle)}</p><div class="o-world-meta">${esc(lead.level)} <span>·</span> ${esc(lead.time)}</div><button class="o-world-primary" data-open="${lead.id}">${copy.enter} ${arrow}</button><button class="o-world-quiet" data-save="${lead.id}" aria-pressed="${saved(lead.id)}">${saved(lead.id)?copy.kept:copy.save} <span aria-hidden="true">${saved(lead.id)?'✓':'＋'}</span></button><small>${copy.generated}</small></div></section>
      <section class="o-world-thread" aria-label="${copy.continuity}"><span class="o-world-thread-line" aria-hidden="true">⌁</span><div><span class="o-world-kicker">${copy.continuity}</span><p>${last?`${copy.resume} <button data-open="${esc(last.id)}" lang="${language}">${esc(last.title)} →</button>`:copy.empty}</p>${last?'':`<small>${copy.emptyNote}</small>`}</div><span class="o-world-tab-label">${copy.preview}</span></section>
      <section aria-labelledby="fieldMore"><div class="o-world-section-head"><h2 id="fieldMore">${copy.next}</h2><span class="o-world-meta">02 — 03</span></div><div class="o-world-more"><article class="o-world-conversation"><button class="o-world-story-button" data-open="${second.id}"><div class="o-world-conversation-top"><span class="o-world-kicker">02 / ${copy.conversation}</span>${image(second)}</div><blockquote lang="${language}">${language==='zh'?exploreCopy.zh.quote:exploreCopy.en.quote}</blockquote><h3 lang="${language}">${esc(second.title)} ${arrow}</h3><p lang="${language}">${esc(second.subtitle)}</p><span class="o-world-meta">${esc(second.level)} · ${esc(second.time)}</span></button></article><article class="o-world-street"><button class="o-world-story-button" data-open="${third.id}">${image(third)}<span class="o-world-kicker">03 / ${copy.reflection}</span><h3 lang="${language}">${esc(third.title)} ${arrow}</h3><p lang="${language}">${esc(third.subtitle)}</p><span class="o-world-meta">${esc(third.level)} · ${esc(third.time)}</span></button></article></div></section>
      <section class="o-world-invitation"><span class="o-world-invitation-mark" aria-hidden="true">＋</span><div><h2>${copy.bringTitle}</h2><p>${copy.bringIntro}</p></div><button class="o-world-outline" data-bring>${copy.bring} ${arrow}</button></section>`;
  }

  function savedView(){
    const items=all().filter(x=>saved(x.id)||x.origin==='imported');
    return `<div class="o-world-intro"><div><span class="o-world-kicker">${copy.saved}</span><h1 tabindex="-1">${copy.savedTitle}</h1><p>${copy.savedIntro}</p></div></div><p class="o-world-storage" role="status">${notice()}</p><section class="o-world-saved-list">${items.length?items.map(itemRow).join(''):`<div class="o-world-empty"><span aria-hidden="true">⌁</span><h2>${copy.savedEmpty}</h2><p>${copy.savedEmptyNote}</p><button class="o-world-primary" data-view="explore">${copy.browse} ${arrow}</button></div>`}</section><button class="o-world-outline" data-bring>＋ ${copy.bring}</button>`;
  }

  function paragraph(item,text,index){
    let result=esc(text);
    item.phrases.filter(x=>x.paragraph===index).sort((a,b)=>b.word.length-a.word.length).forEach(phrase=>{
      result=result.replace(esc(phrase.word),`<button class="o-world-expression" data-phrase="${item.phrases.indexOf(phrase)}" aria-controls="fieldLanguageNote">${esc(phrase.word)}</button>`);
    });
    return `<p>${result.replace(/\n/g,'<br>')}</p>`;
  }

  function reader(){
    const item=selected;
    return `<div class="o-world-reader-top"><button class="o-world-quiet" data-back>← ${copy.back}</button><span class="o-world-meta">${copy.reading}</span><button class="o-world-quiet" data-save="${esc(item.id)}" aria-pressed="${saved(item.id)}">${saved(item.id)?copy.kept:copy.save} ${saved(item.id)?'✓':'＋'}</button></div><div class="o-world-reader-heading"><span class="o-world-kicker">${esc(origin(item))}</span><h1 tabindex="-1" lang="${language}">${esc(item.title)}</h1>${item.subtitle?`<p lang="${language}">${esc(item.subtitle)}</p>`:''}</div>
      <div class="o-world-reader-layout"><article class="o-world-passage" lang="${language}">${item.paragraphs.map((p,i)=>paragraph(item,p,i)).join('')}<div class="o-world-end" aria-hidden="true">• • •</div><section class="o-world-thought">${item.question?`<span class="o-world-kicker">${copy.pause}</span><h2>${esc(item.question)}</h2><details><summary>${copy.think}</summary><p>${esc(item.thought)}</p></details>`:''}</section></article><aside class="o-world-notes"><div class="o-world-notes-art">${image(item)}</div><h2>${copy.notice}</h2><p class="o-world-note-hint">${item.phrases.length?copy.noticeHint:copy.manualHint}</p><div id="fieldLanguageNote" aria-live="polite">${item.phrases.length?phraseNote(item.phrases[0]):manualNote()}</div></aside></div>
      <section class="o-world-response"><div><span class="o-world-kicker">${copy.respond}</span><h2 lang="${language}">${esc(item.prompt||copy.importPrompt)}</h2><p>${copy.responseHint}</p></div><div><label class="o-sr" for="fieldResponse">${copy.responseLabel}</label><textarea id="fieldResponse" lang="${language}" maxlength="12000" rows="5" placeholder="${copy.responseLabel}…">${esc(session.value.responses[item.id]||'')}</textarea><p class="o-world-meta" id="fieldResponseStatus" role="status">${session.available?(session.value.responses[item.id]?copy.draftSaved:''):copy.memoryOnly}</p><button class="o-world-primary" data-write>${copy.write} ${arrow}</button><p class="o-world-meta">${copy.writeNote}</p></div></section><p class="o-world-provenance">${item.origin==='imported'?copy.importOrigin:copy.originNote}</p><section class="o-world-reader-next"><span class="o-world-kicker">${copy.end}</span><button data-open="${stories[(stories.findIndex(x=>x.id===item.id)+1)%stories.length].id}">${esc(stories[(stories.findIndex(x=>x.id===item.id)+1)%stories.length].title)} ${arrow}</button></section>`;
  }

  function phraseNote(phrase){return `<div class="o-world-note" lang="${language}"><h3>${esc(phrase.word)}</h3>${phrase.phonetic?`<p class="o-world-pinyin">${esc(phrase.phonetic)}</p>`:''}<span class="o-world-kicker">${copy.inContext}</span><p>${esc(phrase.definition)}</p><span class="o-world-kicker">${copy.tryIt}</span><p class="o-world-note-example">${esc(phrase.example)}</p><button class="o-world-outline" data-keep-phrase="${selected.phrases.indexOf(phrase)}">＋ ${copy.keepPhrase}</button><p class="o-world-meta" data-save-status role="status"></p></div>`;}
  function manualNote(){
    const draft=manualDrafts.get(selected.id)||{};
    return `<form data-manual-phrase><label>${copy.manualWord}<input name="word" maxlength="180" value="${esc(draft.word||'')}" required></label><label>${copy.manualMeaning}<textarea name="meaning" maxlength="2400" rows="3">${esc(draft.meaning||'')}</textarea></label><button class="o-world-outline">＋ ${copy.keepPhrase}</button><p class="o-world-meta" data-save-status role="status"></p></form>`;
  }

  function draw({focus=false}={}){
    if(disposed)return;
    root.innerHTML=`<div class="o-world">${header()}<div class="o-world-body">${selected?reader():view==='saved'?savedView():discovery()}${footer()}</div></div>`;
    bind();
    if(focus){root.querySelector('h1')?.focus({preventScroll:true});window.scrollTo(0,0);}
  }

  async function keepPhrase(button,phrase){
    const item=selected;
    const status=button.parentElement.querySelector('[data-save-status]');
    button.disabled=true; status.textContent=copy.saving;
    const fullContext=item.paragraphs[phrase.paragraph]||item.paragraphs.find(x=>x.includes(phrase.word))||'';
    const position=fullContext.indexOf(phrase.word);
    const start=Math.max(0,position-400);
    try{
      await api.saveLibraryVocabulary({word:phrase.word,phonetic:phrase.phonetic||'',definition:phrase.definition||'',source_kind:'manual',source_fragment:fullContext.slice(start,start+1200),focus_note:`${origin(item)} · ${item.title}`.slice(0,2400)});
      state.libraryVocabulary=null;
      if(!disposed){status.textContent=copy.phraseSaved;button.textContent=`✓ ${copy.phraseSaved}`;}
    }catch{if(!disposed){status.textContent=copy.saveFailed;button.disabled=false;}}
  }

  function openDialog(html){
    const trigger=document.activeElement;
    const dialog=document.createElement('dialog');dialog.className='o-world-dialog';
    dialog.innerHTML=`<button class="o-world-dialog-close" aria-label="${copy.close}">×</button>${html}`;
    dialog.setAttribute('aria-labelledby','fieldDialogTitle');
    dialog.addEventListener('keydown',event=>{
      if(event.key!=='Tab')return;
      const controls=[...dialog.querySelectorAll('button:not(:disabled),input,textarea,select,a[href]')];
      const first=controls[0],last=controls.at(-1);
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
    });
    root.appendChild(dialog);
    dialog.querySelector('.o-world-dialog-close').onclick=()=>dialog.close();
    dialog.addEventListener('close',()=>{dialog.remove();trigger?.focus();});
    dialog.showModal();return dialog;
  }

  function bring(){
    const dialog=openDialog(`<span class="o-world-kicker">${copy.bring}</span><h2 id="fieldDialogTitle">${copy.bringTitle}</h2><p>${copy.bringIntro}</p><form id="fieldImport"><label>${copy.textTitle}<input name="title" maxlength="120" required></label><label>${copy.textBody}<textarea name="text" rows="7" maxlength="12000" required lang="${language}"></textarea></label><p class="o-world-meta">${copy.sourceNote}</p>${session.value.imports.length>=20?`<p>${copy.limit}</p>`:''}<p role="alert" data-import-error></p><button class="o-world-primary">${copy.importAction} ${arrow}</button></form>`);
    dialog.querySelector('form').onsubmit=event=>{
      event.preventDefault();const data=new FormData(event.currentTarget);
      try{
        const item=importedContent({title:data.get('title'),text:data.get('text'),language,id:crypto.randomUUID()});
        session.add(item);session.enter(item.id);dialog.close();selected=item;draw({focus:true});
        if(!session.available)toast(copy.memoryOnly);
      }catch{dialog.querySelector('[data-import-error]').textContent=copy.importInvalid;}
    };
  }

  function writeResponse(){
    const text=root.querySelector('#fieldResponse').value.trim();
    if(!text){root.querySelector('#fieldResponseStatus').textContent=copy.responseRequired;root.querySelector('#fieldResponse').focus();return;}
    const handoff=()=>{
      resetDraft({mode:'custom',prompt:`${selected.title}\n${origin(selected)}\n\n${selected.prompt||copy.importPrompt}\n\n${selected.paragraphs.join('\n\n').slice(0,2400)}`,text,html:null});
      go('write');
    };
    if(state.draft?.text?.trim()&&state.draft.text.trim()!==text){
      const dialog=openDialog(`<h2 id="fieldDialogTitle">${copy.replace}</h2><div class="o-world-dialog-actions"><button class="o-world-outline" data-cancel>${copy.cancel}</button><button class="o-world-primary" data-confirm>${copy.confirm}</button></div>`);
      dialog.querySelector('[data-cancel]').onclick=()=>dialog.close();
      dialog.querySelector('[data-confirm]').onclick=()=>{dialog.close();handoff();};
    }else handoff();
  }

  function bind(){
    root.querySelectorAll('[data-view]').forEach(button=>button.onclick=()=>{view=button.dataset.view;selected=null;draw({focus:true});});
    root.querySelectorAll('[data-open]').forEach(button=>button.onclick=()=>{
      if(!selected){scrollPosition=window.scrollY;opener=button.dataset.open;}
      selected=all().find(x=>x.id===button.dataset.open);session.enter(selected.id);draw({focus:true});
      if(!session.available)toast(copy.memoryOnly);
    });
    root.querySelector('[data-back]')?.addEventListener('click',()=>{selected=null;draw();window.scrollTo(0,scrollPosition);root.querySelector(`[data-open="${CSS.escape(opener||'')}"]`)?.focus({preventScroll:true});});
    root.querySelectorAll('[data-save]').forEach(button=>button.onclick=()=>{
      session.toggle(button.dataset.save);const id=button.dataset.save;draw();root.querySelector(`[data-save="${CSS.escape(id)}"]`)?.focus({preventScroll:true});if(!session.available)toast(copy.memoryOnly);
    });
    root.querySelectorAll('[data-bring]').forEach(button=>button.onclick=bring);
    root.querySelector('[data-theme-toggle]').onclick=toggleTheme;
    root.querySelector('[data-field-interface]').onchange=event=>{
      setSupportLanguage(event.target.value);
      copy=exploreCopy[supportLanguage()]||exploreCopy.en;
      window.dispatchEvent(new CustomEvent('becoming:explore-locale-changed'));
      draw();root.querySelector('[data-field-interface]')?.focus({preventScroll:true});
    };
    root.querySelector('[data-field-language]').onchange=async event=>{
      const select=event.target;select.disabled=true;
      const surface=root.querySelector('.o-world');surface.inert=true;
      try{await api.setLanguage(select.value);if(!disposed)window.dispatchEvent(new CustomEvent('becoming:language-changed',{detail:{language:select.value}}));}
      catch{surface.inert=false;select.value=language;select.disabled=false;toast(copy.saveFailed);}
    };
    function bindNotes(){
      root.querySelector('[data-manual-phrase]')?.addEventListener('input',event=>{
        const data=new FormData(event.currentTarget);
        manualDrafts.set(selected.id,{word:String(data.get('word')||''),meaning:String(data.get('meaning')||'')});
      });
      root.querySelector('[data-keep-phrase]')?.addEventListener('click',event=>keepPhrase(event.currentTarget,selected.phrases[Number(event.currentTarget.dataset.keepPhrase)]));
      root.querySelector('[data-manual-phrase]')?.addEventListener('submit',event=>{
        event.preventDefault();const form=event.currentTarget;const data=new FormData(form);const word=String(data.get('word')).trim();
        if(!word||word.length>180||!selected.paragraphs.some(x=>x.includes(word))){form.querySelector('[data-save-status]').textContent=copy.manualInvalid;return;}
        keepPhrase(form.querySelector('button'),{word,definition:String(data.get('meaning')||'')});
      });
    }
    root.querySelectorAll('[data-phrase]').forEach(button=>button.onclick=()=>{
      root.querySelectorAll('[data-phrase]').forEach(x=>x.setAttribute('aria-pressed',String(x===button)));
      root.querySelector('#fieldLanguageNote').innerHTML=phraseNote(selected.phrases[Number(button.dataset.phrase)]);bindNotes();
      if(window.matchMedia('(max-width: 800px)').matches)root.querySelector('#fieldLanguageNote').scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'center'});
    });
    bindNotes();
    root.querySelector('#fieldResponse')?.addEventListener('input',event=>{session.respond(selected.id,event.target.value);root.querySelector('#fieldResponseStatus').textContent=session.available?copy.draftSaved:copy.memoryOnly;});
    root.querySelector('[data-write]')?.addEventListener('click',writeResponse);
  }
  root._cleanupScreen=()=>{disposed=true;root.querySelector('dialog')?.close();};
  draw();
}
