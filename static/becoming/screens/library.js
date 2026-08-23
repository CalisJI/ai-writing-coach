import {api} from '../api.js';
import {state} from '../store.js';
import {esc,errorBlock,loadingBlock,toast,helpTip,runBusy} from '../components/primitives.js';
import {t,uiLocale} from '../domain/i18n.js';
import {dictionaryResultMarkup} from '../components/dictionary.js';
import {supportCopy,supportNote} from '../domain/support.js';

function firstDefinition(payload={}){
  const definitions=Array.isArray(payload.definitions)?payload.definitions:[];
  const first=definitions.find(item=>item&&typeof item==='object')||null;
  return {
    definition:String(first?.definition||payload.definition||''),
    partOfSpeech:String(first?.part_of_speech||payload.part_of_speech||''),
    example:String(first?.example||''),
  };
}

function showSavedPhonetic(item){
  if(!item?.phonetic)return false;
  if(state.language!=='zh')return true;
  return (state.profile?.pinyin||'auto')!=='off';
}

function nextReviewLabel(item){
  if(item.due)return t('library.ready_now');
  const value=String(item.next_review_at||'');
  if(!value)return t('library.not_scheduled');
  return value.replace('T',' ').slice(0,16);
}

function reviewCard(item){
  if(!item){
    return `<div class="library-empty">
      <strong>${t('library.nothing_due')}</strong>
      <p>${t('library.nothing_due_desc')}</p>
    </div>`;
  }

  return `<article class="recall-card" data-review-word="${esc(item.word)}">
    <span class="context-label">${t('library.active')}</span>
    <div class="recall-front">
      <h2 class="${state.language==='zh'?'cjk':''}">${esc(item.word)}</h2>
      ${showSavedPhonetic(item)?`<p class="recall-phonetic">${esc(item.phonetic)}</p>`:''}
      ${item.source_fragment?`<blockquote>“${esc(item.source_fragment)}”</blockquote>`:''}
      <p class="recall-prompt">${t('library.recall_desc')}</p>
      <button id="revealRecall" class="button button-secondary" type="button">${t('library.show_meaning')}</button>
    </div>
    <div id="recallAnswer" class="recall-answer hidden">
      ${item.part_of_speech?`<span class="library-pos">${esc(item.part_of_speech)}</span>`:''}
      ${item.definition?`<p>${esc(item.definition)}</p>`:''}
      ${uiLocale()==='vi'&&item.translation_vi?`<p class="library-translation">${esc(item.translation_vi)}</p>`:''}
      ${uiLocale()==='vi'&&item.focus_note?`<div class="library-note">${esc(item.focus_note)}</div>`:''}
      <div class="recall-actions">
        <button class="button button-tertiary" type="button" data-review-result="again">${t('library.again')}</button>
        <button class="button button-primary" type="button" data-review-result="got_it">${t('library.got_it')}</button>
      </div>
      <p class="recall-disclaimer">${t('library.self_report')}</p>
    </div>
  </article>`;
}

function libraryRows(items=[]){
  if(!items.length){
    return `<div class="library-empty">
      <strong>${t('library.empty')}</strong>
      <p>${t('library.empty_desc')}</p>
    </div>`;
  }

  return `<div class="library-list">${items.map(item=>`
    <article class="library-row" data-library-term="${esc(item.word)}">
      <div class="library-row-main">
        <div>
          <div class="library-term-line">
            <strong class="${state.language==='zh'?'cjk':''}">${esc(item.word)}</strong>
            ${showSavedPhonetic(item)?`<span>${esc(item.phonetic)}</span>`:''}
          </div>
          <p>${esc((uiLocale()==='vi'?item.translation_vi:'')||item.definition||t('library.no_definition'))}</p>
          ${item.source_fragment?`<blockquote>“${esc(item.source_fragment)}”</blockquote>`:''}
        </div>
        <div class="library-row-meta">
          <span class="library-stage">${esc(item.stage_label||t('library.new_stage'))}</span>
          <span>${esc(nextReviewLabel(item))}</span>
        </div>
      </div>
      <button class="text-link library-delete" type="button" data-delete-term="${esc(item.word)}">${t('common.remove')}</button>
    </article>`).join('')}</div>`;
}

function lookupCard(payload){
  if(!payload)return '';
  return `<article class="lookup-result">
    ${dictionaryResultMarkup(payload,{
      language:state.language,
      pinyinMode:state.profile?.pinyin||'auto',
      includeWriting:true,
    })}
    <button id="saveLookup" class="button button-primary" type="button">${t('library.save')}</button>
  </article>`;
}

export async function renderLibrary(root){
  root.innerHTML=`<section class="page">${loadingBlock(5)}</section>`;

  try{
    const payload=await api.libraryVocabulary();
    state.libraryVocabulary=payload;
    const items=payload.items||[];
    const due=items.find(item=>item.due)||null;
    const summary=payload.summary||{total:items.length,due:0,available:0};

    root.innerHTML=`<section class="page library-page">
      <section class="library-review-section functional-surface library-functional-section visual-hero-surface library-recall-hero" aria-labelledby="recallHeading">
        <div class="library-section-head">
          <div>
            <div class="section-title-row"><span class="context-label">${t('library.review_queue')}</span>${helpTip(t('library.active_tip'),t('library.active'))}</div>
            <h2 id="recallHeading">${t('library.recall_title')}</h2>
          </div>
          <p>${t('library.reveal_note')}</p>
        </div>
        ${supportNote('lookup_tip',state.profile||{})}
        <p class="library-summary">${t('library.summary',{total:summary.total,due:summary.due,available:summary.available})}</p>
        <div id="recallSlot">${reviewCard(due)}</div>
      </section>

      <div class="section-rule"></div>

      <section class="library-capture-section functional-surface library-functional-section visual-raised-surface" aria-labelledby="lookupHeading">
        <div class="library-section-head">
          <div>
            <div class="section-title-row"><span class="context-label">${t('library.add')}</span>${helpTip(t('dictionary.lookup_tip'),t('help.dictionary'))}</div>
            <h2 id="lookupHeading">${t('library.lookup_title')}</h2>
          </div>
          <p>${t('library.lookup_desc')}</p>
        </div>
        <form id="lookupForm" class="library-lookup-form">
          <label class="sr-only" for="lookupInput">${t('library.placeholder')}</label>
          <input id="lookupInput" type="text" maxlength="180" autocomplete="off" placeholder="${state.language==='zh'?'例如：越来越':'e.g. take responsibility'}">
          <button class="button button-secondary" type="submit">${t('library.lookup')}</button>
        </form>
        <div id="lookupResult"></div>
      </section>

      <div class="section-rule"></div>

      <section class="library-saved-section visual-section-surface" aria-labelledby="savedHeading">
        <div class="library-section-head">
          <div>
            <span class="context-label">${t('library.saved')}</span>
            <h2 id="savedHeading">${t('library.available_future')}</h2>
          </div>
          <p>${t('library.stage_note')}</p>
        </div>
        <div id="libraryRows">${libraryRows(items)}</div>
      </section>
    </section>`;

    const reveal=root.querySelector('#revealRecall');
    const answer=root.querySelector('#recallAnswer');
    reveal?.addEventListener('click',()=>{
      answer?.classList.remove('hidden');
      reveal.disabled=true;
      reveal.textContent=t('library.meaning_revealed');
    });

    root.querySelectorAll('[data-review-result]').forEach(button=>{
      button.addEventListener('click',async()=>{
        if(!due)return;
        try{
          await runBusy(button,async()=>{
            await api.reviewLibraryVocabulary(due.word,button.dataset.reviewResult);
            toast(button.dataset.reviewResult==='got_it'?t('library.recall_saved'):t('library.recall_again'));
            await renderLibrary(root);
          },{label:t('busy.saving')});
        }catch(error){
          toast(error.message||t('library.recall_failed'));
        }
      });
    });

    let lookupPayload=null;
    const form=root.querySelector('#lookupForm');
    const input=root.querySelector('#lookupInput');
    const resultSlot=root.querySelector('#lookupResult');

    form.addEventListener('submit',async event=>{
      event.preventDefault();
      const term=input.value.trim();
      if(!term)return;
      const submit=form.querySelector('button[type="submit"]');
      resultSlot.innerHTML=loadingBlock(2);

      try{
        await runBusy(submit,async()=>{
          lookupPayload=await api.dictionary(term);
          resultSlot.innerHTML=lookupCard(lookupPayload);
        },{label:t('busy.looking_up')});

        root.querySelector('#saveLookup')?.addEventListener('click',async event=>{
          const button=event.currentTarget;
          button.disabled=true;
          button.textContent=t('busy.saving');
          const first=firstDefinition(lookupPayload);
          try{
            await api.saveLibraryVocabulary({
              word:lookupPayload.word||term,
              phonetic:lookupPayload.phonetic||'',
              part_of_speech:lookupPayload.part_of_speech||first.partOfSpeech||'',
              definition:first.definition||lookupPayload.definition||'',
              translation_vi:lookupPayload.translation_vi||'',
              source_fragment:first.example||'',
              source_kind:'dictionary',
              focus_note:lookupPayload.usage_note_vi||'',
            });
            toast(t('library.saved_to_library'));
            await renderLibrary(root);
          }catch(error){
            button.disabled=false;
            button.textContent=t('library.save');
            toast(error.message||t('library.save_failed'));
          }
        });
      }catch(error){
        lookupPayload=null;
        resultSlot.innerHTML=errorBlock(error.message||t('dictionary.failed'));
      }
    });

    root.querySelectorAll('[data-delete-term]').forEach(button=>{
      button.addEventListener('click',async()=>{
        button.disabled=true;
        try{
          await api.deleteLibraryVocabulary(button.dataset.deleteTerm);
          toast(t('library.removed'));
          await renderLibrary(root);
        }catch(error){
          button.disabled=false;
          toast(error.message||t('library.remove_failed'));
        }
      });
    });
  }catch(error){
    root.innerHTML=`<section class="page">${errorBlock(error.message)}</section>`;
  }
}
