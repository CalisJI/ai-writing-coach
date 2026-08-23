import {api} from '../api.js';
import {state,saveDraft} from '../store.js';
import {go} from '../router.js';
import {configFor,countUnits} from '../language.js';
import {guidanceMode,guidanceLabel,writingScaffold} from '../domain/adaptive.js';
import {esc,toast,helpTip,runBusy} from '../components/primitives.js';
import {t,practiceModeLabel,topicLabel,unitLabel} from '../domain/i18n.js';
import {supportCopy,supportNote} from '../domain/support.js';
import {openDictionary} from '../components/dictionary.js';

function option(value,label,current){
  return `<option value="${esc(value)}" ${String(value)===String(current)?'selected':''}>${esc(label)}</option>`;
}

function renderContext(config){
  const d=state.draft;
  const mode=practiceModeLabel(d.mode);
  if(d.mode==='free'){
    return `<div class="generated-task">
      <span class="context-label">${t('write.current_context')}</span>
      <h3>${esc(mode)}</h3>
      <p>${esc(t('write.free_context'))}</p>
    </div>`;
  }
  if(d.mode==='custom'){
    return `<div class="field">
      <label for="customPrompt">${t('write.custom_prompt')}</label>
      <textarea id="customPrompt" placeholder="${esc(t('write.custom_placeholder'))}">${esc(d.prompt||'')}</textarea>
    </div>`;
  }
  if(d.generatedTask){
    const task=d.generatedTask;
    const personalization=task.personalization||null;
    return `<div class="generated-task ${personalization?'memory-guided-task':''}">
      ${personalization?`<div class="memory-guided-head">
        <span class="context-label">${t('write.memory_guided')}</span>
        <strong>${esc(personalization.focus_label||t('common.current_focus'))}</strong>
        <p>${esc(personalization.reason||'')}</p>
        ${personalization.evidence?`<blockquote>“${esc(personalization.evidence)}”</blockquote>`:''}
      </div>`:''}
      <span class="context-label">${t('write.brief')}</span>
      <h3>${esc(task.title||t('write.practice_task'))}</h3>
      <p>${esc(task.instruction||'')}</p>
      ${(task.checklist||[]).length?`<ul>${task.checklist.map(item=>`<li>${esc(item)}</li>`).join('')}</ul>`:''}
    </div>`;
  }
  return `<div class="generated-task">
    <span class="context-label">${t('write.brief')}</span>
    <h3>${t('write.create_when_needed')}</h3>
    <p>${t('write.brief_body')}</p>
  </div>`;
}

export async function renderWrite(root){
  const config=configFor(state.language);
  if(!config.levels.includes(state.draft.level)){
    saveDraft({level:config.defaultLevel,length:config.defaultLength,mode:'free',prompt:'',generatedTask:null,practiceContext:null});
  }

  const adaptiveMode=guidanceMode(state.profile||{},state.language,state.draft.level);
  const scaffold=writingScaffold(adaptiveMode,state.language);

  root.innerHTML=`<section class="page guidance-${esc(adaptiveMode)}">
    ${state.draft.parentEssayId?`<div class="action-row"><button id="newDraftButton" class="button button-tertiary">${t('write.start_fresh')}</button></div>`:''}
    <div class="write-layout">
      <section class="editor-workspace writing-hero-surface visual-hero-surface" aria-labelledby="editorLabel">
        <div class="editor-context">
          <span id="editorLabel">${state.draft.parentEssayId?t('write.revision'):t('write.your_writing')}</span>
          <span id="editorCount">${countUnits(state.draft.text,state.language)} ${esc(unitLabel(state.language))}</span>
        </div>
        <div class="guidance-row">
          <span class="guidance-badge">${esc(guidanceLabel(adaptiveMode))}</span>
          ${state.draft.practiceContext||state.draft.generatedTask?.personalization?`<span class="guidance-badge memory-guided-badge">${t('write.memory_guided')}</span>`:''}
          ${helpTip(supportCopy('setup_tip',state.profile||{}),t('help.setup'))}
        </div>
        ${supportNote('write_intro',state.profile||{})}

        <textarea id="writingEditor" class="writing-editor ${state.language==='zh'?'cjk':''}" spellcheck="${state.language==='en'?'true':'false'}" placeholder="${esc(t('write.editor_placeholder'))}">${esc(state.draft.text||'')}</textarea>

        <div class="editor-bottom">
          <div class="editor-assistance">
            <span class="editor-count">${t('write.draft_note')}</span>
            <button id="selectionLookupButton" class="text-link selection-lookup" type="button" disabled>${state.language==='zh'?`Pinyin · ${t('write.lookup_selection')}`:t('write.lookup_selection')}</button>
          </div>
          <button id="evaluateButton" class="button button-primary">${t('write.review')}</button>
        </div>
      </section>

      <aside class="practice-context visual-section-surface" aria-label="${esc(t('write.context'))}">
        <div class="section-title-row">
          <span class="context-label">${t('write.setup')}</span>
          ${helpTip(supportCopy('setup_tip',state.profile||{}),t('help.setup'))}
        </div>
        <h2>${t('write.setup_title')}</h2>
        <p>${t('write.setup_body')}</p>
        ${supportNote('setup_tip',state.profile||{})}

        <div class="field">
          <label for="practiceMode">${t('write.mode')}</label>
          <select id="practiceMode">
            ${config.modes.map(([value])=>option(value,practiceModeLabel(value),state.draft.mode)).join('')}
          </select>
        </div>

        <div class="field" id="topicField">
          <label for="practiceTopic">${t('write.topic')}</label>
          <select id="practiceTopic">
            ${config.topics.map(value=>option(value,topicLabel(value),state.draft.topic)).join('')}
          </select>
        </div>

        <div class="field">
          <div class="field-label-row"><label for="practiceLevel">${t('write.level')}</label>${helpTip(supportCopy("score_tip",state.profile||{}),t('help.target_band'))}</div>
          <select id="practiceLevel">
            ${config.levels.map(value=>option(value,value,state.draft.level)).join('')}
          </select>
        </div>

        <div class="field" id="lengthField">
          <label for="practiceLength">${t('write.length')}</label>
          <select id="practiceLength">
            ${config.lengths.map(value=>option(value,`~${value} ${unitLabel(state.language)}`,state.draft.length)).join('')}
          </select>
        </div>

        <div class="guidance-note">
          <span class="context-label">${t('write.guidance')}</span>
          <h3>${esc(scaffold.title)}</h3>
          <ol>${scaffold.items.map(item=>`<li>${esc(item)}</li>`).join('')}</ol>
        </div>

        ${state.language==='zh'&&state.profile?.pinyin!=='off'?`<div class="pinyin-assistance-note">
          <div class="section-title-row"><span class="context-label">${t('write.pinyin')} · ${esc(state.profile?.pinyin||'auto')}</span>${helpTip(supportCopy('pinyin_tip',state.profile||{}),t('help.pinyin'))}</div>
          <p>${t('write.pinyin_body')}</p>
        </div>`:''}

        <div id="practiceDynamic">${renderContext(config)}</div>

        <button id="generateBriefButton" class="button button-secondary" style="margin-top:20px;width:100%">${t('write.create_brief')}</button>
      </aside>
    </div>
  </section>`;

  const editor=root.querySelector('#writingEditor');
  const count=root.querySelector('#editorCount');
  const mode=root.querySelector('#practiceMode');
  const topic=root.querySelector('#practiceTopic');
  const level=root.querySelector('#practiceLevel');
  const length=root.querySelector('#practiceLength');
  const dynamic=root.querySelector('#practiceDynamic');
  const generate=root.querySelector('#generateBriefButton');
  const selectionLookup=root.querySelector('#selectionLookupButton');

  function selectedEditorText(){
    const start=Number(editor.selectionStart||0);
    const end=Number(editor.selectionEnd||0);
    if(end<=start)return '';
    return editor.value.slice(start,end).trim().slice(0,180);
  }

  function syncSelectionLookup(){
    const selected=selectedEditorText();
    selectionLookup.disabled=!selected;
    selectionLookup.dataset.term=selected;
  }

  function syncSetup(){
    const current=mode.value;
    const free=current==='free';
    const custom=current==='custom';
    root.querySelector('#topicField').classList.toggle('hidden',free||custom);
    root.querySelector('#lengthField').classList.toggle('hidden',free||custom);
    generate.classList.toggle('hidden',free||custom);
    dynamic.innerHTML=renderContext(config);

    const customPrompt=root.querySelector('#customPrompt');
    if(customPrompt){
      customPrompt.addEventListener('input',()=>saveDraft({prompt:customPrompt.value}));
    }
  }

  ['select','keyup','mouseup'].forEach(eventName=>{
    editor.addEventListener(eventName,syncSelectionLookup);
  });

  selectionLookup.addEventListener('click',async()=>{
    const term=selectedEditorText()||selectionLookup.dataset.term||'';
    await openDictionary(term,{
      title:state.language==='zh'?`Pinyin · ${t('dictionary.title')}`:t('dictionary.title'),
      language:state.language,
    });
  });

  editor.addEventListener('input',()=>{
    saveDraft({text:editor.value});
    syncSelectionLookup();
    count.textContent=`${countUnits(editor.value,state.language)} ${unitLabel(state.language)}`;
  });

  mode.addEventListener('change',()=>{
    saveDraft({
      mode:mode.value,
      prompt:'',
      generatedTask:null,
      practiceContext:null,
    });
    syncSetup();
  });

  topic.addEventListener('change',()=>saveDraft({topic:topic.value,generatedTask:null,practiceContext:null,prompt:''}));
  level.addEventListener('change',()=>{
    saveDraft({level:level.value});
    renderWrite(root);
  });
  length.addEventListener('change',()=>saveDraft({length:Number(length.value),generatedTask:null,practiceContext:null,prompt:''}));

  generate.addEventListener('click',async()=>{
    try{
      await runBusy(generate,async()=>{
        const task=await api.generateTask({
          task_type:state.draft.mode,
          topic:state.draft.topic,
          target_cefr:state.draft.level,
          word_target:Number(state.draft.length),
        });
        saveDraft({generatedTask:task,practiceContext:null,prompt:task.prompt||''});
        dynamic.innerHTML=renderContext(config);
        toast(task.source==='built-in'?t('write.builtin_ready'):t('write.brief_ready'));
      },{label:t('busy.creating')});
    }catch(error){
      toast(error.message||t('write.brief_failed'));
    }
  });

  root.querySelector('#evaluateButton').addEventListener('click',async()=>{
    const text=editor.value.trim();
    if(text.length<10){
      toast(t('write.short_first'));
      editor.focus();
      return;
    }

    const button=root.querySelector('#evaluateButton');
    try{
      await runBusy(button,async()=>{
        const result=await api.evaluate({
          prompt:state.draft.prompt||'',
          text,
          target_cefr:state.draft.level,
          parent_essay_id:state.draft.parentEssayId||null,
          practice_context:state.draft.practiceContext||state.draft.generatedTask?.personalization||null,
        });

        if(result.id && (state.draft.practiceContext||state.draft.generatedTask?.personalization)){
          try{
            const outcomePayload=await api.practiceOutcome(result.id);
            result.practice_outcome=outcomePayload?.outcome||null;
          }catch{
            result.practice_outcome=null;
          }
        }

        state.lastEvaluation=result;
        saveDraft({
          text,
          parentEssayId:result.id,
        });
        go('review');
      },{label:t('busy.preparing_review')});
    }catch(error){
      toast(error.message||t('write.review_failed'));
    }
  });

  root.querySelector('#newDraftButton')?.addEventListener('click',()=>{
    saveDraft({
      text:'',
      prompt:'',
      generatedTask:null,
      practiceContext:null,
      parentEssayId:null,
      mode:'free',
    });
    renderWrite(root);
  });

  syncSetup();
  editor.focus();
}
