import {api} from '../api.js';
import {state} from '../store.js';
import {esc,attr,showDialog,showLoadingDialog,updateDialog,toast} from './primitives.js';
import {hanziStrokeMarkup,mountHanziStroke} from './hanzi-stroke.js';
import {t,uiHtmlLang,uiLocale} from '../domain/i18n.js';

const HAN=/[\u3400-\u4DBF\u4E00-\u9FFF]/u;

/* Chinese is segmented into words before the learner ever sees it, so a tap on
   a subtitle opens the whole word - useful, but it buries the single character
   a learner may actually be asking about. The backend already returns a
   per-character breakdown on every Chinese entry and nothing rendered it; these
   chips are that data, and each one opens the character's own full entry.
   No extra provider call is made to build them. */
function characterChips(payload,{showPhonetic=true}={}){
  const word=String(payload.word||'');
  const characters=Array.isArray(payload.characters)?payload.characters:[];
  /* A single-character entry is already the thing itself. */
  if([...word].filter(char=>HAN.test(char)).length<2||!characters.length)return '';

  const chips=characters
    .filter(item=>item&&HAN.test(String(item.hanzi||'')))
    .map(item=>{
      const hanzi=String(item.hanzi);
      const pinyin=String(item.pinyin||'');
      const meaning=String(item.meaning_vi||'');
      return `<button type="button" class="dictionary-char" data-dict-char="${attr(hanzi)}"
        aria-label="${attr(t('dictionary.character_lookup',{char:hanzi}))}">
        <span class="dictionary-char-hanzi cjk">${esc(hanzi)}</span>
        ${showPhonetic&&pinyin?`<span class="dictionary-char-pinyin">${esc(pinyin)}</span>`:''}
        ${uiLocale()==='vi'&&meaning?`<span class="dictionary-char-meaning">${esc(meaning)}</span>`:''}
      </button>`;
    }).join('');

  if(!chips)return '';

  return `<section class="dictionary-characters" aria-label="${attr(t('dictionary.characters'))}">
    <div class="dictionary-subhead">
      <span>${esc(t('dictionary.characters'))}</span>
      <small>${esc(t('dictionary.characters_hint'))}</small>
    </div>
    <div class="dictionary-char-row">${chips}</div>
  </section>`;
}

function firstDefinition(payload={}){
  const definitions=Array.isArray(payload.definitions)?payload.definitions:[];
  const first=definitions.find(item=>item&&typeof item==='object')||null;
  return {
    definition:String(first?.definition||payload.definition||''),
    partOfSpeech:String(first?.part_of_speech||payload.part_of_speech||''),
    example:String(first?.example||''),
  };
}

export function dictionaryResultMarkup(payload={},{
  language=state.language,
  pinyinMode=state.profile?.pinyin||'auto',
  includeWriting=true,
}={}){
  const first=firstDefinition(payload);
  const showPhonetic=language!=='zh'||pinyinMode!=='off';
  const title=String(payload.word||'').trim();
  const pos=payload.part_of_speech||first.partOfSpeech||'';

  return `<div class="dictionary-result-card">
    <div class="dictionary-result-head">
      <div>
        <span class="context-label">${esc(t('dictionary.kicker'))}</span>
        <h2 class="${language==='zh'?'cjk':''}">${esc(title)}</h2>
        ${showPhonetic&&payload.phonetic?`<p class="dictionary-phonetic">${esc(payload.phonetic)}</p>`:''}
      </div>
      ${pos?`<span class="library-pos">${esc(pos)}</span>`:''}
    </div>

    ${first.definition?`<p class="dictionary-definition">${esc(first.definition)}</p>`:''}
    ${uiLocale()==='vi'&&payload.translation_vi?`<p class="dictionary-translation">${esc(payload.translation_vi)}</p>`:''}
    ${uiLocale()==='vi'&&payload.usage_note_vi?`<div class="library-note">${esc(payload.usage_note_vi)}</div>`:''}
    ${first.example?`<blockquote>“${esc(first.example)}”</blockquote>`:''}

    ${language==='zh'?characterChips(payload,{showPhonetic}):''}

    ${/* Stroke order and the tracing box. A placeholder here, because this
         function returns a string; callers finish it with mountHanziStroke. */
      language==='zh'&&includeWriting?hanziStrokeMarkup(title):''}

    <p class="dictionary-helper" lang="${esc(uiHtmlLang())}">
      ${esc(t('dictionary.lookup_tip'))}
    </p>
  </div>`;
}

let charListenerInstalled=false;

/* The one place a rendered dictionary card is finished off. The chips travel
   inside a markup string that four screens render, so the click is delegated
   rather than wired per card - but from here, not at import time: these modules
   are also loaded under Node by the contract tests, where there is no document. */
export function mountDictionaryResult(root=document){
  mountHanziStroke(root);

  if(charListenerInstalled)return;
  charListenerInstalled=true;
  document.addEventListener('click',event=>{
    const chip=event.target instanceof Element?event.target.closest('[data-dict-char]'):null;
    if(!chip)return;
    event.preventDefault();
    openDictionary(chip.dataset.dictChar,{language:'zh'});
  });
}

export async function openDictionary(term,{
  title='Dictionary',
  language=state.language,
}={}){
  const value=String(term||'').trim().slice(0,180);
  if(!value){
    toast(t('dictionary.select_first'));
    return null;
  }

  showLoadingDialog(title||t('dictionary.title'),t('busy.looking_up'));

  try{
    const payload=await api.dictionary(value);
    updateDialog(dictionaryResultMarkup(payload,{
      language,
      pinyinMode:state.profile?.pinyin||'auto',
      includeWriting:true,
    }),{title:title||t('dictionary.title')});
    mountDictionaryResult(document.getElementById('dialogBody'));
    return payload;
  }catch(error){
    updateDialog(`<div class="error-state" role="alert">${esc(error.message||t('dictionary.failed'))}</div>`,{
      title:title||t('dictionary.title'),
    });
    return null;
  }
}
