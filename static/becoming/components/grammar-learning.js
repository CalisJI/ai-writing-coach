import {esc} from './primitives.js';

const COPY={
  en:{notice:'Notice',understand:'Understand',connect:'Connect',compare:'Compare',apply:'Apply',recall:'Recall',transfer:'Transfer',hidePinyin:'Hide Pinyin',showPinyin:'Show Pinyin',yourAnswer:'Your answer',reveal:'Reveal',hide:'Hide',evidence:'Complete the required Apply, Recall and Transfer prompts before marking this activity complete.'},
  vi:{notice:'Nhận ra',understand:'Hiểu',connect:'Liên hệ',compare:'Phân biệt',apply:'Áp dụng',recall:'Gợi nhớ',transfer:'Chuyển giao',hidePinyin:'Ẩn Pinyin',showPinyin:'Hiện Pinyin',yourAnswer:'Câu trả lời của bạn',reveal:'Xem gợi ý',hide:'Ẩn gợi ý',evidence:'Hãy hoàn thành các phần Áp dụng, Gợi nhớ và Chuyển giao được yêu cầu trước khi đánh dấu hoàn thành.'},
  zh:{notice:'发现',understand:'理解',connect:'联系语境',compare:'辨析',apply:'应用',recall:'主动回忆',transfer:'迁移',hidePinyin:'隐藏拼音',showPinyin:'显示拼音',yourAnswer:'你的回答',reveal:'查看提示',hide:'隐藏提示',evidence:'标记完成前，请先完成要求的“应用、主动回忆、迁移”学习证据。'},
};
const ROLES={
  en:{subject:'Subject',time:'Time',place:'Place',action:'Action',object:'Object',marker:'Marker',connector:'Connector',modifier:'Modifier',result:'Result',topic:'Topic',comment:'Comment'},
  vi:{subject:'Chủ ngữ',time:'Thời gian',place:'Địa điểm',action:'Hành động',object:'Tân ngữ',marker:'Dấu hiệu',connector:'Liên kết',modifier:'Bổ nghĩa',result:'Kết quả',topic:'Chủ đề',comment:'Thuyết minh'},
  zh:{subject:'主语',time:'时间',place:'地点',action:'动作',object:'宾语',marker:'标记',connector:'连接',modifier:'修饰',result:'结果',topic:'话题',comment:'说明'},
};
const SKILLS={
  en:{writing:'Writing',speaking:'Speaking',reading:'Reading',listening:'Listening'},
  vi:{writing:'Writing',speaking:'Speaking',reading:'Reading',listening:'Listening'},
  zh:{writing:'写作',speaking:'口语',reading:'阅读',listening:'听力'},
};

export function localizedText(value,locale='vi'){
  if(typeof value==='string')return value;
  if(!value||typeof value!=='object')return '';
  return value[locale]||value.vi||value.en||value.zh||value.default||'';
}
const copy=locale=>COPY[locale]||COPY.vi;
const roleLabel=(role,locale)=>(ROLES[locale]||ROLES.vi)[role]||String(role||'').replace(/[_-]+/g,' ');
const stageLabel=(stage,locale)=>copy(locale)[stage]||stage;
const safeId=value=>String(value||'block').replace(/[^a-zA-Z0-9_-]/g,'-');

function frame(block,locale,body,{surface=false}={}){
  const id=`grammar-learning-${safeId(block.id)}`;
  const instruction=localizedText(block.instruction,locale);
  return `<section class="grammar-learning-block grammar-learning-${esc(block.type)} ${surface?'is-visual-surface':''}" data-learning-stage="${esc(block.stage)}" aria-labelledby="${id}">
    <header class="grammar-learning-block-head">
      <span class="grammar-learning-stage">${esc(stageLabel(block.stage,locale))}</span>
      <h3 id="${id}">${esc(localizedText(block.title,locale))}</h3>
      ${instruction?`<p>${esc(instruction)}</p>`:''}
    </header>${body}</section>`;
}
function segments(payload,locale,{insertion=false}={}){
  const items=Array.isArray(payload?.segments)?payload.segments:[];
  return `<div class="grammar-sentence-flow" role="list">${items.map(item=>{
    const role=String(item.role||'segment');
    const pinyin=localizedText(item.pinyin,locale);
    const meaning=localizedText(item.meaning,locale);
    return `<span class="grammar-sentence-segment role-${esc(role)} ${item.inserted?'is-inserted':''}" role="listitem" data-grammar-role="${esc(role)}">
      ${item.inserted||insertion?'<i class="grammar-insertion-pin" aria-hidden="true"></i>':''}
      <b>${esc(localizedText(item.text,locale))}</b>
      ${pinyin?`<span class="grammar-pinyin" data-grammar-pinyin>${esc(pinyin)}</span>`:''}
      <small>${esc(localizedText(item.label,locale)||roleLabel(role,locale))}</small>
      ${meaning?`<em>${esc(meaning)}</em>`:''}
    </span>`;
  }).join('')}</div>`;
}
export function GrammarFormula(block,locale='vi'){
  const parts=Array.isArray(block.payload?.parts)?block.payload.parts:[];
  return frame(block,locale,`<div class="grammar-visual-canvas grammar-formula"><div class="grammar-formula-line">${parts.map((part,index)=>{
    const role=String(part.role||'part');
    return `${index?'<span class="grammar-formula-join" aria-hidden="true">+</span>':''}<span class="grammar-formula-part role-${esc(role)}"><b>${esc(localizedText(part.text,locale))}</b><small>${esc(localizedText(part.label,locale)||roleLabel(role,locale))}</small></span>`;
  }).join('')}</div></div>`,{surface:true});
}
export function SemanticSentence(block,locale='vi'){return frame(block,locale,`<div class="grammar-visual-canvas grammar-semantic-sentence">${segments(block.payload,locale)}</div>`,{surface:true});}
export function WordOrderFlow(block,locale='vi'){return frame(block,locale,`<div class="grammar-visual-canvas grammar-word-order">${segments(block.payload,locale)}<div class="grammar-flow-arrow" aria-hidden="true">→</div></div>`,{surface:true});}
export function ParticleInsertion(block,locale='vi'){return frame(block,locale,`<div class="grammar-visual-canvas grammar-particle-insertion">${segments(block.payload,locale,{insertion:true})}</div>`,{surface:true});}
export function TransformationFlow(block,locale='vi'){
  const p=block.payload||{};
  return frame(block,locale,`<div class="grammar-visual-canvas grammar-transformation"><div class="grammar-transform-state is-before"><small>BEFORE</small><strong>${esc(localizedText(p.from,locale))}</strong></div><span class="grammar-transform-arrow" aria-hidden="true">→</span><div class="grammar-transform-state is-after"><small>AFTER</small><strong>${esc(localizedText(p.to,locale))}</strong></div>${Array.isArray(p.steps)&&p.steps.length?`<ol class="grammar-transform-steps">${p.steps.map(step=>`<li>${esc(localizedText(step,locale))}</li>`).join('')}</ol>`:''}</div>`,{surface:true});
}
export function TimelineVisual(block,locale='vi'){
  const events=Array.isArray(block.payload?.events)?block.payload.events:[];
  return frame(block,locale,`<div class="grammar-visual-canvas grammar-timeline"><div class="grammar-timeline-track" aria-hidden="true"><i></i></div><ol>${events.map(event=>`<li data-position="${esc(event.position||'context')}"><i class="grammar-timeline-dot" aria-hidden="true"></i><strong>${esc(localizedText(event.label,locale))}</strong>${event.note?`<small>${esc(localizedText(event.note,locale))}</small>`:''}</li>`).join('')}</ol></div>`,{surface:true});
}
export function ContrastCard(block,locale='vi'){
  const items=Array.isArray(block.payload?.items)?block.payload.items:[];
  return frame(block,locale,`<div class="grammar-contrast-grid">${items.map((item,index)=>`<article class="grammar-contrast-item" data-contrast-index="${index}"><span>${esc(localizedText(item.label,locale))}</span><strong>${esc(localizedText(item.text,locale))}</strong>${item.pinyin?`<small class="grammar-pinyin" data-grammar-pinyin>${esc(localizedText(item.pinyin,locale))}</small>`:''}${item.meaning?`<small>${esc(localizedText(item.meaning,locale))}</small>`:''}${item.note?`<p>${esc(localizedText(item.note,locale))}</p>`:''}</article>`).join('')}</div>`);
}
export function RealLifeScene(block,locale='vi'){
  const p=block.payload||{};
  const lines=Array.isArray(p.lines)?p.lines:[];
  return frame(block,locale,`<div class="grammar-scene">${p.setup?`<p class="grammar-scene-setup">${esc(localizedText(p.setup,locale))}</p>`:''}<div class="grammar-scene-dialogue">${lines.map(line=>`<div class="grammar-scene-line">${line.speaker?`<span>${esc(localizedText(line.speaker,locale))}</span>`:''}<strong>${esc(localizedText(line.text,locale))}</strong>${line.pinyin?`<small class="grammar-pinyin" data-grammar-pinyin>${esc(localizedText(line.pinyin,locale))}</small>`:''}${line.meaning?`<em>${esc(localizedText(line.meaning,locale))}</em>`:''}</div>`).join('')}</div></div>`,{surface:true});
}
export function SentenceBuilder(block,locale='vi'){
  const slots=Array.isArray(block.payload?.slots)?block.payload.slots:[];
  return frame(block,locale,`<div class="grammar-sentence-builder">${slots.map((slot,i)=>`<fieldset data-builder-slot="${i}"><legend>${esc(localizedText(slot.label,locale))}</legend><div class="grammar-builder-options">${(slot.options||[]).map(option=>`<button type="button" aria-pressed="false" data-grammar-builder-choice>${esc(localizedText(option,locale))}</button>`).join('')}</div></fieldset>`).join('')}</div>`,{surface:true});
}
function promptBlock(block,locale,{recall=false,personal=false}={}){
  const p=block.payload||{};
  const answer=localizedText(p.answer,locale);
  const explanation=localizedText(p.explanation,locale);
  const id=`grammar-input-${safeId(block.id)}`;
  return frame(block,locale,`<div class="grammar-learning-prompt ${recall?'is-recall':''} ${personal?'is-personal':''}"><p>${esc(localizedText(p.prompt,locale))}</p><label for="${id}">${esc(copy(locale).yourAnswer)}</label><textarea id="${id}" rows="${recall?3:4}" maxlength="1200" data-learning-evidence-stage="${esc(block.stage)}" placeholder="${esc(localizedText(p.placeholder,locale))}"></textarea>${(answer||explanation)?`<button type="button" class="button button-secondary" data-learning-reveal>${esc(copy(locale).reveal)}</button><div class="grammar-learning-reveal hidden" data-learning-answer>${answer?`<strong>${esc(answer)}</strong>`:''}${explanation?`<p>${esc(explanation)}</p>`:''}</div>`:''}</div>`,{surface:recall||personal});
}
export function PracticePrompt(block,locale='vi'){return promptBlock(block,locale);}
export function PersonalPractice(block,locale='vi'){return promptBlock(block,locale,{personal:true});}
export function RecallPrompt(block,locale='vi'){return promptBlock(block,locale,{recall:true});}
export function MemoryHook(block,locale='vi'){
  const p=block.payload||{};
  return frame(block,locale,`<aside class="grammar-memory-hook"><span aria-hidden="true">↻</span><div><strong>${esc(localizedText(p.cue,locale))}</strong><p>${esc(localizedText(p.remember,locale))}</p></div></aside>`);
}
export function SkillTransfer(block,locale='vi'){
  const map=block.payload?.skills||{};
  return frame(block,locale,`<div class="grammar-skill-transfer">${Object.entries(map).map(([skill,prompt])=>{
    const id=`grammar-transfer-${safeId(block.id)}-${safeId(skill)}`;
    return `<article><span>${esc((SKILLS[locale]||SKILLS.vi)[skill]||skill)}</span><p>${esc(localizedText(prompt,locale))}</p><label class="sr-only" for="${id}">${esc(copy(locale).yourAnswer)}</label><textarea id="${id}" rows="3" maxlength="1000" data-learning-evidence-stage="${esc(block.stage)}"></textarea></article>`;
  }).join('')}</div>`);
}
function renderBlock(block,locale){
  switch(block.type){
    case 'formula':return GrammarFormula(block,locale);
    case 'semantic_sentence':return SemanticSentence(block,locale);
    case 'transformation':return TransformationFlow(block,locale);
    case 'position':return WordOrderFlow(block,locale);
    case 'insertion':return ParticleInsertion(block,locale);
    case 'timeline':return TimelineVisual(block,locale);
    case 'contrast':return ContrastCard(block,locale);
    case 'scene':return RealLifeScene(block,locale);
    case 'sentence_builder':return SentenceBuilder(block,locale);
    case 'micro_practice':return PracticePrompt(block,locale);
    case 'personal_practice':return PersonalPractice(block,locale);
    case 'recall':return RecallPrompt(block,locale);
    case 'memory_hook':return MemoryHook(block,locale);
    case 'skill_transfer':return SkillTransfer(block,locale);
    default:return '';
  }
}
export function hasGrammarLearningModel(model){
  return Boolean(model&&Number(model.schema_version)===1&&Array.isArray(model.blocks)&&model.blocks.length);
}
const hasPinyin=model=>JSON.stringify(model||{}).includes('"pinyin"');
export function renderGrammarLearningModel(model,{locale='vi',targetLanguage='en'}={}){
  if(!hasGrammarLearningModel(model))return '';
  const hook=model.hook||{};
  const meaning=model.meaning||{};
  const useWhen=Array.isArray(meaning.use_when)?meaning.use_when:[];
  return `<div class="grammar-learning-shell" data-grammar-learning-model="1" data-target-language="${esc(targetLanguage)}">
    <nav class="grammar-learning-flow" aria-label="Grammar learning flow">${(model.flow||[]).map((stage,index)=>`<span data-flow-stage="${esc(stage)}"><i>${index+1}</i><b>${esc(stageLabel(stage,locale))}</b></span>`).join('')}</nav>
    <section class="grammar-learning-hook"><span>${esc(localizedText(hook.eyebrow,locale)||stageLabel('notice',locale))}</span><h3>${esc(localizedText(hook.prompt,locale))}</h3>${targetLanguage==='zh'&&hasPinyin(model)?`<button type="button" class="button button-tertiary grammar-pinyin-toggle" data-pinyin-toggle aria-pressed="true">${esc(copy(locale).hidePinyin)}</button>`:''}</section>
    <section class="grammar-learning-meaning"><span class="grammar-learning-stage">${esc(stageLabel('understand',locale))}</span><h3>${esc(localizedText(meaning.summary,locale))}</h3><p>${esc(localizedText(meaning.mental_model,locale))}</p>${useWhen.length?`<ul>${useWhen.map(item=>`<li>${esc(localizedText(item,locale))}</li>`).join('')}</ul>`:''}</section>
    <div class="grammar-learning-blocks">${(model.blocks||[]).map(block=>renderBlock(block,locale)).join('')}</div>
  </div>`;
}
export function bindGrammarLearningInteractions(root,{locale='vi'}={}){
  if(!root)return;
  root.querySelector('[data-pinyin-toggle]')?.addEventListener('click',event=>{
    const shell=event.currentTarget.closest('[data-grammar-learning-model]');
    if(!shell)return;
    const hidden=shell.classList.toggle('is-pinyin-hidden');
    event.currentTarget.setAttribute('aria-pressed',String(!hidden));
    event.currentTarget.textContent=hidden?copy(locale).showPinyin:copy(locale).hidePinyin;
  });
  root.querySelectorAll('[data-learning-reveal]').forEach(button=>{
    button.addEventListener('click',()=>{
      const block=button.closest('.grammar-learning-block');
      const input=block?.querySelector('[data-learning-evidence-stage]');
      if(!String(input?.value||'').trim()){input?.focus();return;}
      const answer=block?.querySelector('[data-learning-answer]');
      if(!answer)return;
      const hidden=answer.classList.toggle('hidden');
      button.textContent=hidden?copy(locale).reveal:copy(locale).hide;
    });
  });
  root.querySelectorAll('[data-grammar-builder-choice]').forEach(button=>{
    button.addEventListener('click',()=>{
      const fieldset=button.closest('fieldset');
      fieldset?.querySelectorAll('[data-grammar-builder-choice]').forEach(choice=>{
        const active=choice===button;
        choice.setAttribute('aria-pressed',String(active));
        choice.classList.toggle('is-selected',active);
      });
    });
  });
}
export function grammarLearningCompletion(root,model,{locale='vi'}={}){
  if(!hasGrammarLearningModel(model))return null;
  const required=Array.isArray(model.completion?.required_stages)?model.completion.required_stages:[];
  for(const stage of required){
    const inputs=[...root.querySelectorAll(`[data-learning-evidence-stage="${CSS.escape(stage)}"]`)];
    if(!inputs.some(input=>String(input.value||'').trim())){
      return {ready:false,stage,focus:inputs[0]||null,message:copy(locale).evidence};
    }
  }
  return {ready:true,stage:null,focus:null,message:''};
}
