import {api} from '../api.js';
import {state} from '../store.js';
import {esc,showDialog,showLoadingDialog,updateDialog,toast} from './primitives.js';
import {t,uiHtmlLang,uiLocale} from '../domain/i18n.js';

function firstDefinition(payload={}){
  const definitions=Array.isArray(payload.definitions)?payload.definitions:[];
  const first=definitions.find(item=>item&&typeof item==='object')||null;
  return {
    definition:String(first?.definition||payload.definition||''),
    partOfSpeech:String(first?.part_of_speech||payload.part_of_speech||''),
    example:String(first?.example||''),
  };
}

function hanCharacters(value=''){
  return [...String(value||'')].filter(char=>/[\u3400-\u4DBF\u4E00-\u9FFF]/u.test(char));
}

function writingGrid(word=''){
  const chars=hanCharacters(word).slice(0,8);
  if(!chars.length)return '';

  return `<section class="dictionary-writing" aria-label="${esc(t('dictionary.writing'))}">
    <div class="dictionary-subhead">
      <span>${esc(t('dictionary.writing'))}</span>
      <small>${esc(t('dictionary.writing_hint'))}</small>
    </div>
    <div class="hanzi-grid-row">
      ${chars.map(char=>`<div class="hanzi-cell reference" aria-label="${esc(char)}"><span>${esc(char)}</span></div>`).join('')}
    </div>
    <div class="hanzi-grid-row practice" aria-hidden="true">
      ${chars.map(char=>`<div class="hanzi-cell"><span>${esc(char)}</span></div>`).join('')}
    </div>
    <p class="dictionary-writing-note">${esc(t('dictionary.writing_note'))}</p>
  </section>`;
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

    ${language==='zh'&&includeWriting?writingGrid(title):''}

    <p class="dictionary-helper" lang="${esc(uiHtmlLang())}">
      ${esc(t('dictionary.lookup_tip'))}
    </p>
  </div>`;
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
    return payload;
  }catch(error){
    updateDialog(`<div class="error-state" role="alert">${esc(error.message||t('dictionary.failed'))}</div>`,{
      title:title||t('dictionary.title'),
    });
    return null;
  }
}
