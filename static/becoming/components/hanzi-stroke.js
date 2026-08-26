/* Stroke order for the Chinese learner dictionary.
 *
 * Two surfaces over one payload from `/api/chinese/stroke-order`:
 *
 *   - a numbered step diagram, the way a Hanyu-style entry prints it: step k
 *     shows strokes 1..k with the k-th one picked out;
 *   - a writing box, where the learner traces the character stroke by stroke
 *     and is told when a stroke went in the wrong place or the wrong order.
 *
 * The steps are plain SVG built from the payload, so they render even when the
 * vendored renderer fails to load. Only the animation and the tracing quiz need
 * hanzi-writer, and that module is imported lazily the first time one of them
 * is asked for -- an English learner never downloads it.
 *
 * Nothing here invents a stroke. A character the server does not carry is named
 * as unavailable (UPGRADE_REGRESSION_RULES.md §33).
 */

import {api} from '../api.js';
import {esc,attr,spinner} from './primitives.js';
import {t} from '../domain/i18n.js';

const GLYPH=1024;

/* The upstream glyph box has its origin bottom-left, so every path is drawn
   through one flip. Keeping it here means no caller has to know that. */
const GLYPH_TRANSFORM=`translate(0,${GLYPH}) scale(1,-1)`;

const HAN=/[\u3400-\u4DBF\u4E00-\u9FFF]/u;

function hanCharacters(value=''){
  return [...String(value||'')].filter(char=>HAN.test(char));
}

/* The section is emitted as part of a plain HTML string, so it can only be a
   placeholder; `mountHanziStroke` fills it once the markup is in the document. */
export function hanziStrokeMarkup(word=''){
  if(!hanCharacters(word).length)return '';

  return `<section class="hanzi-stroke" data-hanzi-word="${attr(word)}" aria-label="${attr(t('dictionary.writing'))}">
    <div class="dictionary-subhead">
      <span>${esc(t('dictionary.writing'))}</span>
      <small>${esc(t('dictionary.writing_hint'))}</small>
    </div>
    <div class="hanzi-stroke-body" data-hanzi-body>
      <div class="hanzi-stroke-loading">${spinner(t('hanzi.loading'))}</div>
    </div>
  </section>`;
}

/* The static grid this component replaces. It stays as the honest answer when
   there is no verified stroke data: a box to copy the shape into, and no claim
   about the order the strokes go in. */
function shapeGridMarkup(characters){
  if(!characters.length)return '';
  const cells=characters.slice(0,8);
  return `<div class="hanzi-grid-row">
      ${cells.map(char=>`<div class="hanzi-cell reference" aria-label="${attr(char)}"><span>${esc(char)}</span></div>`).join('')}
    </div>
    <div class="hanzi-grid-row practice" aria-hidden="true">
      ${cells.map(char=>`<div class="hanzi-cell"><span>${esc(char)}</span></div>`).join('')}
    </div>`;
}

function stepMarkup(entry){
  return `<ol class="hanzi-steps">
    ${entry.stroke_paths.map((_,index)=>{
      const label=t('hanzi.replay_stroke',{n:index+1});
      const drawn=entry.stroke_paths.slice(0,index+1).map((path,position)=>
        `<path class="${position===index?'hanzi-step-current':'hanzi-step-past'}" d="${attr(path)}"/>`).join('');
      return `<li>
        <button type="button" class="hanzi-step" data-hanzi-stroke="${index}"
                title="${attr(label)}" aria-label="${attr(label)}">
          <svg viewBox="0 0 ${GLYPH} ${GLYPH}" aria-hidden="true"><g transform="${GLYPH_TRANSFORM}">${drawn}</g></svg>
          <span class="hanzi-step-index">${index+1}</span>
        </button>
      </li>`;
    }).join('')}
  </ol>`;
}

/* The finished character, drawn from the same paths. It stands in the writing
   box until the renderer is needed, so the box shows the character to copy
   rather than an empty square that reads as a failed load. */
function previewMarkup(entry){
  return `<svg class="hanzi-preview" viewBox="0 0 ${GLYPH} ${GLYPH}" aria-hidden="true">
    <g transform="${GLYPH_TRANSFORM}">
      ${entry.stroke_paths.map(path=>`<path d="${attr(path)}"/>`).join('')}
    </g>
  </svg>`;
}

function bodyMarkup(payload){
  const entries=payload.characters;
  /* Toggle buttons rather than a tablist: there is no single panel each one
     owns -- picking a character redraws both the writing box and the steps. */
  const tabs=entries.length>1
    ? `<div class="hanzi-stroke-tabs" role="group" aria-label="${attr(t('hanzi.characters'))}">
        ${entries.map((entry,index)=>`<button type="button" class="hanzi-char-tab${index===0?' is-active':''}"
          aria-pressed="${index===0?'true':'false'}" data-hanzi-index="${index}">${esc(entry.character)}</button>`).join('')}
      </div>`
    : '';

  const missing=payload.unavailable.length
    ? `<p class="hanzi-stroke-missing">${esc(t('hanzi.unavailable',{chars:payload.unavailable.join(' ')}))}</p>`
    : '';

  return `${tabs}
    <div class="hanzi-stroke-stage">
      <div class="hanzi-stroke-writer" data-hanzi-target></div>
      <div class="hanzi-stroke-controls">
        <p class="hanzi-stroke-count" data-hanzi-count></p>
        <div class="hanzi-stroke-buttons">
          <button type="button" class="button button-secondary" data-hanzi-action="animate">${esc(t('hanzi.animate'))}</button>
          <button type="button" class="button button-primary" data-hanzi-action="practice">${esc(t('hanzi.practice'))}</button>
        </div>
        <p class="hanzi-stroke-status" data-hanzi-status role="status" aria-live="polite">${esc(t('hanzi.idle'))}</p>
      </div>
    </div>
    <div class="hanzi-steps-block">
      <span class="hanzi-steps-label">${esc(t('hanzi.steps'))}</span>
      <div data-hanzi-steps></div>
    </div>
    ${missing}
    <p class="dictionary-writing-note">${esc(t('dictionary.writing_note'))}</p>`;
}

/* hanzi-writer parses colours into numeric channels so it can interpolate them,
   which means it cannot take `var(--token)`. Resolve the tokens against the
   live document instead: one source of colour truth, and a theme flip stays
   correctable through `updateColor`. */
function themeColors(element){
  const styles=getComputedStyle(element);
  const token=(name,fallback)=>styles.getPropertyValue(name).trim()||fallback;
  return {
    strokeColor:token('--color-ink-strong','#111214'),
    radicalColor:token('--color-informational','#3F70C8'),
    outlineColor:token('--color-border-strong','#D2D4D0'),
    highlightColor:token('--color-accent-600','#FF6A1A'),
    drawingColor:token('--color-accent-600','#FF6A1A'),
  };
}

let writerModule=null;

function loadWriter(){
  if(!writerModule)writerModule=import('../vendor/hanzi-writer/index.js').then(module=>module.default);
  return writerModule;
}

/* The dictionary lives in a dialog on Writing and Review but inline on Library,
   where the theme toggle stays reachable. The listener drops itself once the
   section leaves the document, which is the only teardown signal these callers
   agree on: `updateDialog` replaces innerHTML without telling anyone. */
function watchTheme(section,getWriter){
  const apply=()=>{
    if(!section.isConnected){
      window.removeEventListener('becoming:theme-changed',apply);
      window.removeEventListener('becoming:palette-changed',apply);
      return;
    }
    const writer=getWriter();
    if(!writer)return;
    Object.entries(themeColors(section)).forEach(([name,value])=>writer.updateColor(name,value,{duration:0}));
  };
  window.addEventListener('becoming:theme-changed',apply);
  window.addEventListener('becoming:palette-changed',apply);
}

function activate(section,body,payload){
  const entries=payload.characters;
  const target=body.querySelector('[data-hanzi-target]');
  const steps=body.querySelector('[data-hanzi-steps]');
  const status=body.querySelector('[data-hanzi-status]');
  const count=body.querySelector('[data-hanzi-count]');
  const practiceButton=body.querySelector('[data-hanzi-action="practice"]');

  let index=0;
  let writer=null;
  let quizzing=false;

  /* An animation finishes on its own clock, so its callback can arrive after
     the learner has already moved on -- and then it reports the state of
     something that is no longer happening. Each action takes a turn number;
     a callback only speaks while its turn is still the current one. */
  let turn=0;
  const beginTurn=()=>++turn;

  const setStatus=(key,vars)=>{status.textContent=t(key,vars);};

  const stopQuiz=(instance)=>{
    quizzing=false;
    practiceButton.textContent=t('hanzi.practice');
    if(instance)instance.cancelQuiz();
  };

  const showCharacter=(next)=>{
    beginTurn();
    index=next;
    const entry=entries[index];
    steps.innerHTML=stepMarkup(entry);
    count.textContent=t('hanzi.stroke_count',{n:entry.stroke_count});
    body.querySelectorAll('.hanzi-char-tab').forEach((tab,position)=>{
      tab.classList.toggle('is-active',position===index);
      tab.setAttribute('aria-pressed',position===index?'true':'false');
    });
    stopQuiz(writer);
    setStatus('hanzi.idle');
    if(writer){
      writer.setCharacter(entry.character);
      writer.showCharacter();
    }else{
      target.innerHTML=previewMarkup(entry);
    }
  };

  /* One writer for the whole section: `setCharacter` swaps the glyph, so a word
     of four characters still builds a single renderer and a single set of
     pointer listeners. */
  const ensureWriter=async()=>{
    if(writer)return writer;
    const HanziWriter=await loadWriter();
    if(!section.isConnected)return null;
    const size=target.clientWidth||200;
    /* The renderer appends its own SVG, so the standing preview has to go
       first or the box would carry two characters. */
    target.replaceChildren();
    writer=HanziWriter.create(target,entries[index].character,{
      width:size,
      height:size,
      padding:6,
      showCharacter:true,
      showOutline:true,
      /* At the library's default speed an eight-stroke character takes ten
         seconds to demonstrate, which is long enough that a learner stops
         watching. Faster, with a beat between strokes so each one still reads
         as a separate move. */
      strokeAnimationSpeed:1.5,
      delayBetweenStrokes:220,
      ...themeColors(section),
      charDataLoader:(character,onComplete,onError)=>{
        const entry=entries.find(item=>item.character===character);
        if(!entry){
          onError(new Error(t('hanzi.failed')));
          return;
        }
        onComplete({
          strokes:entry.stroke_paths,
          medians:entry.medians,
          radStrokes:entry.radical_strokes,
        });
      },
    });
    watchTheme(section,()=>writer);
    return writer;
  };

  body.addEventListener('click',async event=>{
    const tab=event.target.closest('.hanzi-char-tab');
    if(tab){
      showCharacter(Number(tab.dataset.hanziIndex)||0);
      return;
    }

    const step=event.target.closest('[data-hanzi-stroke]');
    if(step){
      const instance=await ensureWriter();
      if(!instance)return;
      const stroke=Number(step.dataset.hanziStroke)||0;
      const mine=beginTurn();
      stopQuiz(instance);
      instance.animateStroke(stroke,{onComplete:()=>{if(mine===turn)setStatus('hanzi.idle');}});
      setStatus('hanzi.replaying',{n:stroke+1});
      return;
    }

    const action=event.target.closest('[data-hanzi-action]')?.dataset.hanziAction;
    if(action==='animate'){
      const instance=await ensureWriter();
      if(!instance)return;
      const mine=beginTurn();
      stopQuiz(instance);
      setStatus('hanzi.animating');
      instance.animateCharacter({onComplete:()=>{if(mine===turn)setStatus('hanzi.idle');}});
      return;
    }

    if(action!=='practice')return;

    const instance=await ensureWriter();
    if(!instance)return;
    if(quizzing){
      beginTurn();
      stopQuiz(instance);
      instance.showCharacter();
      setStatus('hanzi.idle');
      return;
    }

    const mine=beginTurn();
    quizzing=true;
    practiceButton.textContent=t('hanzi.stop_practice');
    setStatus('hanzi.practice_start');
    instance.quiz({
      leniency:1,
      showHintAfterMisses:3,
      onCorrectStroke:({strokesRemaining})=>{
        /* Nothing to say about the final stroke: onComplete arrives with it and
           reports the whole attempt. */
        if(mine!==turn||!strokesRemaining)return;
        setStatus(strokesRemaining===1?'hanzi.last_stroke':'hanzi.stroke_ok',{n:strokesRemaining});
      },
      onMistake:({strokeNum})=>{
        if(mine===turn)setStatus('hanzi.stroke_wrong',{n:strokeNum+1});
      },
      onComplete:({totalMistakes})=>{
        if(mine!==turn)return;
        quizzing=false;
        practiceButton.textContent=t('hanzi.practice');
        setStatus(totalMistakes?'hanzi.done_with_misses':'hanzi.done_clean',{n:totalMistakes});
      },
    });
  });

  showCharacter(0);
}

function mountSection(section){
  const body=section.querySelector('[data-hanzi-body]');
  const word=section.dataset.hanziWord||'';

  const fallback=(message)=>{
    body.innerHTML=`${shapeGridMarkup(hanCharacters(word))}
      <p class="hanzi-stroke-missing">${esc(message)}</p>
      <p class="dictionary-writing-note">${esc(t('dictionary.writing_fallback'))}</p>`;
  };

  api.chineseStrokeOrder(word).then(payload=>{
    if(!section.isConnected)return;
    if(!payload?.characters?.length){
      fallback(t('hanzi.unavailable',{chars:hanCharacters(word).join(' ')}));
      return;
    }
    body.innerHTML=bodyMarkup(payload);
    activate(section,body,payload);
  }).catch(error=>{
    if(!section.isConnected)return;
    fallback(error?.message||t('hanzi.failed'));
  });
}

/* Call after inserting markup that may contain `hanziStrokeMarkup`. Safe to
   call again on the same root: a mounted section is skipped. */
export function mountHanziStroke(root=document){
  if(!root)return;
  root.querySelectorAll('[data-hanzi-word]:not([data-hanzi-mounted])').forEach(section=>{
    section.dataset.hanziMounted='true';
    mountSection(section);
  });
}
