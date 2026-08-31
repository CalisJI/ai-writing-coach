import {api} from '../api.js';
import {state,supportLanguage} from '../store.js';
import {uiLocale} from '../domain/i18n.js';
import {activeCanonicalSegment} from '../domain/transcript-playback.js';
import {getSharedMediaSession} from '../domain/shared-media-session.js';
import {openDictionary} from './dictionary.js';
import {esc,showLoadingDialog,toast,updateDialog} from './primitives.js';

const SETTINGS_KEY='orena.interactive-transcript.v2';
const TRANSCRIPT_SELECTOR=[
  '.listening-token-line[aria-label]',
  '.shadowing-source[aria-label]',
  '.speaking-source[aria-label]',
  '[data-interactive-language-text][aria-label]',
].join(',');

const COPY={
  en:{
    explain:'Explain',
    explainTitle:'Explain this passage',
    explaining:'Reading the context…',
    explainFailed:'Could not explain this passage right now.',
    pos:'POS',
    reading:'Reading aid',
    posLegend:'POS colors',
    noun:'noun',verb:'verb',adjective:'adjective',adverb:'adverb',
    pronoun:'pronoun',particle:'particle',other:'other',
    translation:'Meaning',
    grammar:'Grammar to notice',
    vocabulary:'Vocabulary',
    usage:'Usage',
    lookup:'Open dictionary',
    annotationFailed:'Language colors are temporarily unavailable.',
  },
  vi:{
    explain:'Giải thích',
    explainTitle:'Giải thích đoạn này',
    explaining:'Đang đọc ngữ cảnh…',
    explainFailed:'Hiện chưa thể giải thích đoạn này.',
    pos:'Từ loại',
    reading:'Phiên âm',
    posLegend:'Màu từ loại',
    noun:'danh từ',verb:'động từ',adjective:'tính từ',adverb:'trạng từ',
    pronoun:'đại từ',particle:'trợ từ',other:'khác',
    translation:'Nghĩa',
    grammar:'Ngữ pháp đáng chú ý',
    vocabulary:'Từ vựng',
    usage:'Cách dùng',
    lookup:'Mở từ điển',
    annotationFailed:'Tạm thời chưa thể tô màu ngôn ngữ.',
  },
  zh:{
    explain:'解释',
    explainTitle:'解释这段内容',
    explaining:'正在结合上下文分析…',
    explainFailed:'暂时无法解释这段内容。',
    pos:'词性',
    reading:'读音',
    posLegend:'词性颜色',
    noun:'名词',verb:'动词',adjective:'形容词',adverb:'副词',
    pronoun:'代词',particle:'助词',other:'其他',
    translation:'释义',
    grammar:'值得注意的语法',
    vocabulary:'词汇',
    usage:'用法',
    lookup:'打开词典',
    annotationFailed:'暂时无法显示语言标注。',
  },
};

const annotationCache=new Map();
const annotationFailures=new Map();
const enhancedElements=new WeakSet();
let mutationObserver=null;
let intersectionObserver=null;
let lastPlayingSegmentId='';
let lastSelection=null;
let installed=false;

const copy=()=>COPY[uiLocale()]||COPY.en;

function loadSettings(){
  const fallback={pos:false,reading:false};
  try{
    const parsed=JSON.parse(localStorage.getItem(SETTINGS_KEY)||'null');
    return {
      pos:typeof parsed?.pos==='boolean'?parsed.pos:fallback.pos,
      reading:typeof parsed?.reading==='boolean'?parsed.reading:fallback.reading,
    };
  }catch{
    return fallback;
  }
}

let settings=loadSettings();

function annotationRequested(){
  const readingAllowed=state.language==='zh'&&state.profile?.pinyin!=='off';
  return settings.pos||(settings.reading&&readingAllowed);
}

function saveSettings(){
  try{localStorage.setItem(SETTINGS_KEY,JSON.stringify(settings));}catch{}
  applySettings();
  if(annotationRequested())observeTranscriptElements(document);
}

function applySettings(){
  document.documentElement.dataset.transcriptPos=settings.pos?'on':'off';
  const profileAllowsReading=state.language!=='zh'||state.profile?.pinyin!=='off';
  document.documentElement.dataset.transcriptReading=settings.reading&&profileAllowsReading?'on':'off';
  document.querySelectorAll('[data-it-toggle="pos"]').forEach(button=>{
    button.setAttribute('aria-pressed',String(settings.pos));
    button.classList.toggle('active',settings.pos);
  });
  document.querySelectorAll('[data-it-toggle="reading"]').forEach(button=>{
    const enabled=settings.reading&&profileAllowsReading;
    button.setAttribute('aria-pressed',String(enabled));
    button.classList.toggle('active',enabled);
    button.disabled=!profileAllowsReading;
  });
}

function sourceTextFor(element){
  return String(element.getAttribute('aria-label')||element.textContent||'').trim();
}

function sharedSession(){
  return getSharedMediaSession(state.language);
}

function segmentIdFor(element,shared){
  const container=element.closest('[data-segment-id]');
  if(container?.dataset?.segmentId)return container.dataset.segmentId;
  return shared?.selected_segment_id||'';
}

function segmentFor(element){
  const shared=sharedSession();
  const id=segmentIdFor(element,shared);
  const segments=shared?.payload?.transcript?.segments||[];
  return {
    shared,
    segment:segments.find(item=>item.segment_id===id)||null,
    id,
  };
}

function annotationKey(language,text){
  return `${String(language||'').toLowerCase()}\0${text}`;
}

async function annotationFor(language,text){
  const key=annotationKey(language,text);
  if(annotationCache.has(key))return annotationCache.get(key);
  const failedAt=annotationFailures.get(key)||0;
  if(Date.now()-failedAt<30000)return null;

  const promise=api.annotateMediaText({
    text,
    source_language:language,
  }).then(payload=>{
    annotationCache.set(key,Promise.resolve(payload));
    annotationFailures.delete(key);
    return payload;
  }).catch(error=>{
    annotationCache.delete(key);
    annotationFailures.set(key,Date.now());
    throw error;
  });
  annotationCache.set(key,promise);
  return promise;
}

function timingCandidates(segment){
  const raw=Array.isArray(segment?.tokens)?segment.tokens
    :Array.isArray(segment?.words)?segment.words:[];
  return raw.filter(item=>
    item&&typeof item==='object'
    &&typeof item.text==='string'
    &&Number.isFinite(Number(item.start_ms))
    &&Number.isFinite(Number(item.end_ms))
    &&Number(item.end_ms)>Number(item.start_ms)
  );
}

function timingMap(segment,annotations){
  const candidates=timingCandidates(segment);
  if(!candidates.length)return new Map();

  const mapped=new Map();
  let cursor=0;
  for(const annotation of annotations){
    const fragment=String(annotation.fragment||'').trim();
    if(!fragment)continue;
    for(let index=cursor;index<candidates.length;index+=1){
      const item=candidates[index];
      if(String(item.text||'').trim()!==fragment)continue;
      mapped.set(annotation.start,{
        startMs:Number(item.start_ms),
        endMs:Number(item.end_ms),
      });
      cursor=index+1;
      break;
    }
  }
  return mapped;
}

function tokenMarkup(annotation,timing,language){
  const pos=String(annotation.pos||'other').replace(/[^a-z_]/g,'')||'other';
  const pronunciation=String(annotation.pronunciation||'').trim();
  const term=String(annotation.fragment||'');
  const attrs=[
    `class="it-token pos-${esc(pos)}"`,
    `data-it-term="${esc(term)}"`,
    `data-pos="${esc(pos)}"`,
    `title="${esc(copy().lookup)}"`,
    'tabindex="0"',
    'role="button"',
  ];
  if(timing){
    attrs.push(`data-start-ms="${timing.startMs}"`);
    attrs.push(`data-end-ms="${timing.endMs}"`);
  }
  return `<span ${attrs.join(' ')}>`
    +`${language==='zh'&&pronunciation?`<span class="it-reading">${esc(pronunciation)}</span>`:''}`
    +`<span class="it-surface">${esc(term)}</span>`
    +`</span>`;
}

function annotatedMarkup(text,payload,segment){
  const annotations=Array.isArray(payload?.annotations)?payload.annotations:[];
  if(!annotations.length)return null;
  const timing=timingMap(segment,annotations);
  const language=String(payload.source_language||state.language).split('-',1)[0].toLowerCase();
  let cursor=0;
  let html='';
  for(const annotation of annotations){
    const start=Number(annotation.start);
    const end=Number(annotation.end);
    if(!Number.isInteger(start)||!Number.isInteger(end)||start<cursor||end<=start||end>text.length)continue;
    if(text.slice(start,end)!==annotation.fragment)continue;
    html+=esc(text.slice(cursor,start));
    html+=tokenMarkup(annotation,timing.get(start)||null,language);
    cursor=end;
  }
  html+=esc(text.slice(cursor));
  return html;
}

async function enhanceElement(element){
  if(!(element instanceof HTMLElement)||!annotationRequested())return;
  const text=sourceTextFor(element);
  if(!text||text.length>1200)return;
  const {shared,segment}=segmentFor(element);
  const language=String(shared?.payload?.asset?.source_language||state.language||'').trim();
  if(!language)return;

  const currentKey=annotationKey(language,text);
  if(element.dataset.itAnnotationKey===currentKey&&enhancedElements.has(element))return;
  element.dataset.itAnnotationState='loading';

  try{
    const payload=await annotationFor(language,text);
    if(!payload)return;
    if(sourceTextFor(element)!==text)return;
    const html=annotatedMarkup(text,payload,segment);
    if(!html)return;
    element.innerHTML=html;
    element.dataset.itAnnotationKey=currentKey;
    element.dataset.itAnnotationState='ready';
    enhancedElements.add(element);
  }catch{
    element.dataset.itAnnotationState='error';
  }
}

function observeTranscriptElements(root=document){
  if(!annotationRequested())return;
  root.querySelectorAll?.(TRANSCRIPT_SELECTOR).forEach(element=>{
    if(intersectionObserver)intersectionObserver.observe(element);
    else enhanceElement(element);
  });
}

function installIntersectionObserver(){
  if(!('IntersectionObserver' in window))return;
  intersectionObserver=new IntersectionObserver(entries=>{
    for(const entry of entries){
      if(!entry.isIntersecting)continue;
      intersectionObserver.unobserve(entry.target);
      enhanceElement(entry.target);
    }
  },{rootMargin:'160px 0px'});
}

function selectedContext(){
  const shared=sharedSession();
  const segments=shared?.payload?.transcript?.segments||[];
  const selectedId=shared?.selected_segment_id;
  const index=segments.findIndex(item=>item.segment_id===selectedId);
  const segment=segments[index]||null;
  if(!segment)return null;
  const nearby=segments.slice(Math.max(0,index-1),Math.min(segments.length,index+2));
  return {
    segment,
    text:segment.original_text,
    context:nearby.map(item=>item.original_text).join('\n'),
  };
}

function selectionInsideTranscript(){
  const selection=window.getSelection?.();
  if(!selection||selection.rangeCount===0||selection.isCollapsed)return null;
  const text=String(selection.toString()||'').trim().slice(0,1600);
  if(!text)return null;
  const range=selection.getRangeAt(0);
  const container=range.commonAncestorContainer.nodeType===Node.ELEMENT_NODE
    ?range.commonAncestorContainer:range.commonAncestorContainer.parentElement;
  if(!(container instanceof Element)||!container.closest(TRANSCRIPT_SELECTOR))return null;
  const context=selectedContext();
  return {
    text,
    context:context?.context||sourceTextFor(container.closest(TRANSCRIPT_SELECTOR)),
  };
}

function rememberSelection(){
  const selected=selectionInsideTranscript();
  if(selected)lastSelection=selected;
}

function explanationMarkup(payload){
  const c=copy();
  const vocabulary=Array.isArray(payload?.vocabulary)?payload.vocabulary:[];
  const grammar=Array.isArray(payload?.grammar_notes)?payload.grammar_notes:[];
  return `<div class="it-explanation">
    ${payload?.summary?`<p class="it-explanation-summary">${esc(payload.summary)}</p>`:''}
    ${payload?.natural_translation?`<section><span class="context-label">${esc(c.translation)}</span><p>${esc(payload.natural_translation)}</p></section>`:''}
    ${grammar.length?`<section><span class="context-label">${esc(c.grammar)}</span><ul>${grammar.map(item=>`<li>${esc(item)}</li>`).join('')}</ul></section>`:''}
    ${vocabulary.length?`<section><span class="context-label">${esc(c.vocabulary)}</span><div class="it-vocabulary-list">${vocabulary.map(item=>`<button type="button" class="it-vocab-card" data-it-dictionary="${esc(item.fragment||'')}">
      <strong>${esc(item.fragment||'')}</strong>
      ${item.pronunciation?`<small>${esc(item.pronunciation)}</small>`:''}
      ${item.pos?`<span>${esc(item.pos)}</span>`:''}
      <p>${esc(item.meaning||'')}</p>
    </button>`).join('')}</div></section>`:''}
    ${payload?.usage_note?`<section><span class="context-label">${esc(c.usage)}</span><p>${esc(payload.usage_note)}</p></section>`:''}
  </div>`;
}

async function explainCurrent(){
  const selected=lastSelection||selectionInsideTranscript()||selectedContext();
  lastSelection=null;
  if(!selected?.text)return;
  const c=copy();
  showLoadingDialog(c.explainTitle,c.explaining);
  try{
    const payload=await api.explainMediaText({
      text:selected.text,
      context:selected.context||selected.text,
      source_language:state.language,
      target_language:supportLanguage(),
    });
    updateDialog(explanationMarkup(payload),{title:c.explainTitle});
  }catch(error){
    updateDialog(`<div class="error-state" role="alert">${esc(error?.message||c.explainFailed)}</div>`,{title:c.explainTitle});
  }
}

function ensureControls(){
  const c=copy();
  document.querySelectorAll('.listening-toolbar').forEach(toolbar=>{
    if(toolbar.querySelector('[data-it-controls]'))return;
    const controls=document.createElement('div');
    controls.className='it-controls';
    controls.dataset.itControls='true';
    controls.innerHTML=`<button type="button" class="it-control" data-it-toggle="pos" aria-pressed="${settings.pos}">${esc(c.pos)}</button>
      <button type="button" class="it-control" data-it-toggle="reading" aria-pressed="${settings.reading}">${esc(c.reading)}</button>
      <details class="it-pos-legend">
        <summary>${esc(c.posLegend)}</summary>
        <span class="pos-noun">${esc(c.noun)}</span>
        <span class="pos-verb">${esc(c.verb)}</span>
        <span class="pos-adjective">${esc(c.adjective)}</span>
        <span class="pos-adverb">${esc(c.adverb)}</span>
        <span class="pos-pronoun">${esc(c.pronoun)}</span>
        <span class="pos-particle">${esc(c.particle)}</span>
        <span class="pos-other">${esc(c.other)}</span>
      </details>`;
    toolbar.appendChild(controls);
  });

  const actionHosts=[
    ...document.querySelectorAll('.listening-segment.selected .listening-segment-actions'),
    ...document.querySelectorAll('.shadowing-round-actions'),
    ...document.querySelectorAll('.speaking-playback-controls'),
  ];
  for(const host of actionHosts){
    if(host.querySelector('[data-it-explain]'))continue;
    const button=document.createElement('button');
    button.type='button';
    button.className='button button-secondary it-explain-button';
    button.dataset.itExplain='true';
    button.textContent=c.explain;
    host.appendChild(button);
  }
  applySettings();
}

export function applyPlayingSegment(root,segmentId){
  root.querySelectorAll('.it-playing-segment').forEach(node=>node.classList.remove('it-playing-segment'));
  if(!segmentId)return;

  root.querySelectorAll('[data-segment-id]').forEach(node=>{
    const aliases=String(node.dataset.canonicalSegmentIds||'').split(/\s+/).filter(Boolean);
    if(node.dataset.segmentId===segmentId||aliases.includes(segmentId)){
      node.classList.add('it-playing-segment');
    }
  });
}

function tokenContext(element){
  const shared=sharedSession();
  const segments=Array.isArray(shared?.payload?.transcript?.segments)
    ?shared.payload.transcript.segments:[];
  const id=element?.closest?.('[data-segment-id]')?.dataset?.segmentId||shared?.selected_segment_id||'';
  const index=segments.findIndex(item=>String(item?.segment_id||'')===String(id));
  const segment=index>=0?segments[index]:null;
  const selected=String(element?.dataset?.itTerm||sourceTextFor(element)).trim();
  if(!segment||typeof segment.original_text!=='string'||!selected)return null;
  const context=segments.slice(Math.max(0,index-1),Math.min(segments.length,index+2))
    .map(item=>typeof item?.original_text==='string'?item.original_text.trim():'')
    .filter(Boolean).join('\n');
  return context&&context.toLocaleLowerCase().includes(selected.toLocaleLowerCase())
    ?{context,segment}:null;
}

function setPlayingSegment(segmentId){
  lastPlayingSegmentId=segmentId;
  applyPlayingSegment(document,segmentId);

  const shared=sharedSession();
  if(shared?.selected_segment_id===segmentId){
    document.querySelector('.speaking-focus')?.classList.add('it-playing-segment');
    document.querySelector('.shadowing-focus')?.classList.add('it-playing-segment');
  }
}

function updatePlaybackTime(timeMs){
  const shared=sharedSession();
  const segments=shared?.payload?.transcript?.segments||[];
  if(!segments.length)return;
  const segment=activeCanonicalSegment(segments,timeMs);
  setPlayingSegment(segment?.segment_id||'');
}

function handleMediaTime(event){
  const timeMs=Number(event?.detail?.time_ms);
  if(Number.isFinite(timeMs))updatePlaybackTime(timeMs);
}

function handleClick(event){
  const target=event.target instanceof Element?event.target:null;
  if(!target)return;

  const toggle=target.closest('[data-it-toggle]');
  if(toggle){
    const key=toggle.dataset.itToggle;
    if(key==='pos')settings={...settings,pos:!settings.pos};
    if(key==='reading'&&!toggle.disabled)settings={...settings,reading:!settings.reading};
    saveSettings();
    return;
  }

  const explain=target.closest('[data-it-explain]');
  if(explain){
    event.preventDefault();
    explainCurrent();
    return;
  }

  const vocab=target.closest('[data-it-dictionary]');
  if(vocab){
    event.preventDefault();
    openDictionary(vocab.dataset.itDictionary,{language:state.language});
    return;
  }

  const token=target.closest('.it-token[data-it-term],.transcript-token[data-it-term]');
  if(token){
    event.preventDefault();
    event.stopPropagation();
    const grounded=tokenContext(token);
    openDictionary(token.dataset.itTerm,{language:state.language,context:grounded?.context||''});
  }
}

function handleKeydown(event){
  const target=event.target instanceof Element?event.target.closest('.it-token[data-it-term],.transcript-token[data-it-term]'):null;
  if(!target||!['Enter',' '].includes(event.key))return;
  event.preventDefault();
  const grounded=tokenContext(target);
  openDictionary(target.dataset.itTerm,{language:state.language,context:grounded?.context||''});
}

function refresh(root=document){
  observeTranscriptElements(root);
  ensureControls();
  if(lastPlayingSegmentId)applyPlayingSegment(root,lastPlayingSegmentId);
}

export function installInteractiveTranscriptLayer(){
  if(installed)return;
  installed=true;
  installIntersectionObserver();
  applySettings();
  refresh(document);

  mutationObserver=new MutationObserver(records=>{
    for(const record of records){
      for(const node of record.addedNodes){
        if(node instanceof Element)refresh(node);
      }
    }
    ensureControls();
    });
  mutationObserver.observe(document.getElementById('mainContent')||document.body,{
    childList:true,
    subtree:true,
  });

  document.addEventListener('click',handleClick);
  document.addEventListener('keydown',handleKeydown);
  document.addEventListener('selectionchange',rememberSelection);
  document.addEventListener('orena:media-time',handleMediaTime);
}

export function uninstallInteractiveTranscriptLayer(){
  mutationObserver?.disconnect();
  intersectionObserver?.disconnect();
  document.removeEventListener('click',handleClick);
  document.removeEventListener('keydown',handleKeydown);
  document.removeEventListener('selectionchange',rememberSelection);
  document.removeEventListener('orena:media-time',handleMediaTime);
  installed=false;
}
