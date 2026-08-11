import {api} from '../api.js';
import {state} from '../store.js';
import {configFor} from '../language.js';
import {esc,errorBlock,loadingBlock,toast,runBusy} from '../components/primitives.js';
import {t,uiLocale} from '../domain/i18n.js';

const TOPIC_KEYS=['random','daily_life','work','science','culture','community'];

function labelTopic(value){
  const key=TOPIC_KEYS.includes(value)?value:'random';
  return t(`read.topic.${key}`);
}


function escapeRegExp(value){
  return String(value).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
}

function highlightedPassage(text,{recycled=[],evidence=[]}={}){
  const source=String(text||'');
  const ranges=[];

  function add(fragment,kind,index){
    const value=String(fragment||'').trim();
    if(!value)return;
    const lower=source.toLocaleLowerCase();
    const needle=value.toLocaleLowerCase();
    let from=0;
    while(from<source.length){
      const start=lower.indexOf(needle,from);
      if(start<0)return;
      const end=start+value.length;
      const overlap=ranges.some(range=>start<range.end&&end>range.start);
      if(!overlap){
        ranges.push({start,end,kind,index});
        return;
      }
      from=start+Math.max(1,value.length);
    }
  }

  evidence.forEach((value,index)=>add(value,'evidence',index));
  recycled.forEach((value,index)=>add(value,'recycled',index));
  ranges.sort((a,b)=>a.start-b.start);

  if(!ranges.length){
    return esc(source).replace(/\n{2,}/g,'</p><p>').replace(/\n/g,'<br>');
  }

  let cursor=0;
  let html='';
  for(const range of ranges){
    html+=esc(source.slice(cursor,range.start));
    const cls=range.kind==='evidence'?'reading-mark evidence':'reading-mark recycled';
    const attr=range.kind==='evidence'?` data-reading-evidence="${range.index}"`:'';
    html+=`<mark class="${cls}"${attr}>${esc(source.slice(range.start,range.end))}</mark>`;
    cursor=range.end;
  }
  html+=esc(source.slice(cursor));
  return html.replace(/\n{2,}/g,'</p><p>').replace(/\n/g,'<br>');
}

function passageBlock(session,result=null){
  const evidence=result?.results?.map(item=>item.evidence_fragment).filter(Boolean)||[];
  const content=highlightedPassage(session.passage,{
    recycled:session.recycled_words||[],
    evidence,
  });
  return `<article class="reading-passage reading-hero-surface visual-hero-surface">
    <div class="reading-passage-head">
      <div>
        <span class="context-label">${session.generation_mode==='generated'?t('read.generated'):t('read.builtin')}</span>
        <h2>${esc(session.title)}</h2>
      </div>
      <div class="reading-meta">
        <span>${esc(session.target_level)}</span>
        <span>${esc(labelTopic(session.topic))}</span>
      </div>
    </div>
    ${(session.recycled_words||[]).length?`<div class="reading-recycled-note">
      <span>${t('read.from_library')}</span>
      <div>${session.recycled_words.map(term=>`<strong>${esc(term)}</strong>`).join('')}</div>
    </div>`:''}
    <div class="reading-text ${state.language==='zh'?'cjk':''}">
      <p>${content}</p>
    </div>
  </article>`;
}

function questionsBlock(session,result=null){
  const resultById=new Map((result?.results||[]).map(item=>[Number(item.id),item]));

  return `<section class="reading-questions visual-section-surface">
    <div class="reading-section-head">
      <div>
        <span class="context-label">${t('read.comprehension')}</span>
        <h2>${t('read.answer_title')}</h2>
      </div>
      <p>${result?t('read.answer_title'):t('read.answer_hidden')}</p>
    </div>
    <form id="readingAnswerForm">
      ${(session.questions||[]).map((question,index)=>{
        const checked=resultById.get(Number(question.id));
        return `<fieldset class="reading-question ${checked?(checked.correct?'is-correct':'is-incorrect'):''}">
          <legend><span>${index+1}</span>${esc(question.question)}</legend>
          <div class="reading-options">
            ${(question.options||[]).map((option,optIndex)=>{
              const selected=checked?.selected_index===optIndex;
              const correct=checked?.correct_index===optIndex;
              const classes=[
                selected?'selected':'',
                result&&correct?'correct':'',
                result&&selected&&!checked.correct?'incorrect':'',
              ].filter(Boolean).join(' ');
              return `<label class="reading-option ${classes}">
                <input type="radio" name="q${index}" value="${optIndex}" ${selected?'checked':''} ${result?'disabled':''}>
                <span>${esc(option)}</span>
              </label>`;
            }).join('')}
          </div>
          ${checked?`<div class="reading-answer-evidence">
            <span>${checked.correct?t('read.supported'):t('read.check_evidence')}</span>
            <p>${esc(uiLocale()==='vi'?(checked.explanation_vi||t('read.explanation_generic')):t('read.explanation_generic'))}</p>
            <blockquote>“${esc(checked.evidence_fragment||'')}”</blockquote>
            <button class="text-link" type="button" data-find-evidence="${index}">${t('read.find')}</button>
          </div>`:''}
        </fieldset>`;
      }).join('')}
      ${result
        ?`<div class="reading-result-summary">
          <span class="context-label">${t('read.result')}</span>
          <strong>${esc(result.correct_count)} / ${esc(result.total)}</strong>
          <p>${t('read.result_note')}</p>
          <button id="readingAnother" class="button button-primary" type="button">${t('read.another')}</button>
        </div>`
        :`<button id="submitReading" class="button button-primary" type="submit">${t('read.check')}</button>`}
    </form>
  </section>`;
}

function recentSessions(items=[]){
  if(!items.length)return '';
  return `<section class="reading-history visual-section-surface">
    <div class="reading-section-head">
      <div>
        <span class="context-label">${t('read.recent')}</span>
        <h2>${t('read.recent_title')}</h2>
      </div>
      <p>${t('read.recent_desc')}</p>
    </div>
    <div class="reading-history-list">
      ${items.slice(0,6).map(item=>`<button type="button" class="reading-history-row" data-reading-open="${item.id}">
        <div>
          <strong>${esc(item.title)}</strong>
          <span>${esc(item.target_level)} · ${esc(labelTopic(item.topic))}</span>
        </div>
        <span>${item.latest_attempt?`${esc(item.latest_attempt.correct_count)}/${esc(item.latest_attempt.total)}` :t('read.unread')}</span>
      </button>`).join('')}
    </div>
  </section>`;
}

function setupForm(root,session,result){
  root.querySelector('#readingAnswerForm')?.addEventListener('submit',async event=>{
    event.preventDefault();
    if(result)return;

    const answers=[];
    for(let index=0;index<(session.questions||[]).length;index++){
      const selected=root.querySelector(`input[name="q${index}"]:checked`);
      if(!selected){
        toast(t('read.answer_first',{number:index+1}));
        return;
      }
      answers.push(Number(selected.value));
    }

    const button=root.querySelector('#submitReading');
    try{
      await runBusy(button,async()=>{
        const checked=await api.submitReadingAnswers(session.id,answers);
        if(!checked.valid){
          throw new Error(checked.message||t('read.check_failed'));
        }
        state.readingResult=checked;
        await renderReading(root,{preserveControls:true});
      },{label:t('busy.checking')});
    }catch(error){
      toast(error.message||t('read.check_failed'));
    }
  });

  root.querySelector('#readingAnother')?.addEventListener('click',()=>{
    state.readingSession=null;
    state.readingResult=null;
    renderReading(root);
  });

  root.querySelectorAll('[data-find-evidence]').forEach(button=>{
    button.addEventListener('click',()=>{
      const index=button.dataset.findEvidence;
      const mark=root.querySelector(`[data-reading-evidence="${CSS.escape(index)}"]`);
      mark?.scrollIntoView({behavior:'smooth',block:'center'});
      if(mark){
        mark.classList.add('reading-evidence-active');
        setTimeout(()=>mark.classList.remove('reading-evidence-active'),1400);
      }
    });
  });
}

export async function renderReading(root,{preserveControls=false}={}){
  const config=configFor(state.language);
  const rememberedLevel=state.readingSession?.target_level||state.draft.level||config.defaultLevel;

  root.innerHTML=`<section class="page">${loadingBlock(5)}</section>`;

  try{
    const history=await api.readingSessions(8);
    state.readingSessions=history.items||[];

    const session=state.readingSession;
    const result=state.readingResult;

    root.innerHTML=`<section class="page reading-page">
      <header class="reading-header">
        <span class="editorial-kicker">${t('read.kicker')}</span>
        <h1 class="editorial-title">${t('read.title')}</h1>
        <p class="editorial-lead">${t('read.lead')}</p>
      </header>

      ${session
        ?`<div class="reading-workspace">
          ${passageBlock(session,result)}
          ${questionsBlock(session,result)}
        </div>`
        :`<section class="reading-create reading-create-hero visual-hero-surface">
          <div class="reading-section-head">
            <div>
              <span class="context-label">${t('read.new')}</span>
              <h2>${t('read.create_title')}</h2>
            </div>
            <p>${t('read.create_disclaimer')}</p>
          </div>
          <form id="readingCreateForm" class="reading-create-form">
            <label>
              <span>${t('read.level')}</span>
              <select id="readingLevel">
                ${config.levels.map(level=>`<option value="${esc(level)}" ${level===rememberedLevel?'selected':''}>${esc(level)}</option>`).join('')}
              </select>
            </label>
            <label>
              <span>${t('read.topic')}</span>
              <select id="readingTopic">
                ${TOPIC_KEYS.map(value=>`<option value="${value}">${esc(labelTopic(value))}</option>`).join('')}
              </select>
            </label>
            <label class="reading-toggle">
              <input id="readingRecycle" type="checkbox" checked>
              <span>
                <strong>${t('read.recycle')}</strong>
                <small>${t('read.recycle_desc')}</small>
              </span>
            </label>
            <button class="button button-primary" type="submit">${t('read.create')}</button>
          </form>
        </section>`}

      <div class="section-rule"></div>
      ${recentSessions(state.readingSessions)}
    </section>`;

    if(session){
      setupForm(root,session,result);
    }else{
      const form=root.querySelector('#readingCreateForm');
      form.addEventListener('submit',async event=>{
        event.preventDefault();
        const button=form.querySelector('button[type="submit"]');
        try{
          await runBusy(button,async()=>{
            const created=await api.createReadingSession({
              target_level:root.querySelector('#readingLevel').value,
              topic:root.querySelector('#readingTopic').value,
              recycle_library:root.querySelector('#readingRecycle').checked,
            });
            state.readingSession=created;
            state.readingResult=null;
            await renderReading(root,{preserveControls:true});
          },{label:t('busy.creating')});
        }catch(error){
          toast(error.message||t('read.create_failed'));
        }
      });
    }

    root.querySelectorAll('[data-reading-open]').forEach(button=>{
      button.addEventListener('click',async()=>{
        button.disabled=true;
        try{
          const payload=await api.readingSession(button.dataset.readingOpen);
          if(!payload.found)throw new Error(t('read.open_failed'));
          state.readingSession=payload.session;
          state.readingResult=null;
          await renderReading(root,{preserveControls:true});
        }catch(error){
          button.disabled=false;
          toast(error.message||t('read.open_failed'));
        }
      });
    });
  }catch(error){
    root.innerHTML=`<section class="page">${errorBlock(error.message||t('read.page_failed'))}</section>`;
  }
}
