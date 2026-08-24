import {esc} from './primitives.js';
import {oIcon} from '../orena/icons.js?v=2.17.5';

const COPY={
  en:{
    notice:'Notice',understand:'Understand',pattern:'See the pattern',context:'See it in context',
    connect:'Connect',compare:'Compare',apply:'Apply',recall:'Recall',transfer:'Transfer',
    flowLabel:'Grammar learning flow',useWhen:'Use it when',before:'Before',after:'After',incorrect:'Incorrect',
    why:'Why?',corrected:'Corrected',rule:'Rule',exception:'Exception',contextLabel:'Context',
    selectedOrder:'Your order',hideReadingAid:'Hide reading aid',showReadingAid:'Show reading aid',
    yourAnswer:'Your answer',reveal:'Reveal',hide:'Hide',
    evidence:'Complete the required Apply, Recall and Transfer prompts before marking this activity complete.'
  },
  vi:{
    notice:'Nhận ra',understand:'Hiểu',pattern:'Nhìn ra mẫu',context:'Đặt vào ngữ cảnh',
    connect:'Liên hệ',compare:'Phân biệt',apply:'Áp dụng',recall:'Gợi nhớ',transfer:'Chuyển giao',
    flowLabel:'Luồng học ngữ pháp',useWhen:'Dùng khi',before:'Trước',after:'Sau',incorrect:'Chưa đúng',
    why:'Vì sao?',corrected:'Sửa đúng',rule:'Quy tắc',exception:'Ngoại lệ',contextLabel:'Ngữ cảnh',
    selectedOrder:'Thứ tự của bạn',hideReadingAid:'Ẩn hỗ trợ đọc',showReadingAid:'Hiện hỗ trợ đọc',
    yourAnswer:'Câu trả lời của bạn',reveal:'Xem gợi ý',hide:'Ẩn gợi ý',
    evidence:'Hãy hoàn thành các phần Áp dụng, Gợi nhớ và Chuyển giao được yêu cầu trước khi đánh dấu hoàn thành.'
  },
  zh:{
    notice:'发现',understand:'理解',pattern:'看出规律',context:'放进语境',
    connect:'联系语境',compare:'辨析',apply:'应用',recall:'主动回忆',transfer:'迁移',
    flowLabel:'语法学习流程',useWhen:'适用场景',before:'变化前',after:'变化后',incorrect:'错误形式',
    why:'为什么？',corrected:'正确形式',rule:'规则',exception:'例外',contextLabel:'语境',
    selectedOrder:'你的顺序',hideReadingAid:'隐藏读音辅助',showReadingAid:'显示读音辅助',
    yourAnswer:'你的回答',reveal:'查看提示',hide:'隐藏提示',
    evidence:'标记完成前，请先完成要求的“应用、主动回忆、迁移”学习证据。'
  },
};

const ROLES={
  en:{
    subject:'Subject',verb:'Verb',object:'Object',noun:'Noun',pronoun:'Pronoun',
    adjective:'Adjective',adverb:'Adverb',modifier:'Modifier',article:'Article',
    determiner:'Determiner',auxiliary:'Auxiliary',preposition:'Preposition',
    particle:'Particle',conjunction:'Conjunction',time:'Time',location:'Location',
    complement:'Complement',classifier:'Classifier',negation:'Negation',marker:'Marker',
    changed:'Changed',error:'Error',exception:'Exception',connector:'Connector',
    topic:'Topic',comment:'Comment',result:'Result',case:'Case',gender:'Gender',
    agreement:'Agreement',stem:'Stem',ending:'Ending',honorific:'Honorific',register:'Register'
  },
  vi:{
    subject:'Chủ ngữ',verb:'Động từ',object:'Tân ngữ',noun:'Danh từ',pronoun:'Đại từ',
    adjective:'Tính từ',adverb:'Trạng từ',modifier:'Bổ nghĩa',article:'Mạo từ',
    determiner:'Từ hạn định',auxiliary:'Trợ động từ',preposition:'Giới từ',
    particle:'Trợ từ',conjunction:'Liên từ',time:'Thời gian',location:'Địa điểm',
    complement:'Bổ ngữ',classifier:'Lượng từ',negation:'Phủ định',marker:'Dấu hiệu',
    changed:'Phần thay đổi',error:'Phần sai',exception:'Ngoại lệ',connector:'Liên kết',
    topic:'Chủ đề',comment:'Thuyết minh',result:'Kết quả',case:'Cách',gender:'Giống',
    agreement:'Hòa hợp',stem:'Thân từ',ending:'Đuôi từ',honorific:'Kính ngữ',register:'Sắc thái'
  },
  zh:{
    subject:'主语',verb:'动词',object:'宾语',noun:'名词',pronoun:'代词',
    adjective:'形容词',adverb:'副词',modifier:'修饰语',article:'冠词',
    determiner:'限定词',auxiliary:'助动词',preposition:'介词',particle:'助词',
    conjunction:'连词',time:'时间',location:'地点',complement:'补语',
    classifier:'量词',negation:'否定',marker:'标记',changed:'变化部分',
    error:'错误部分',exception:'例外',connector:'连接',topic:'话题',comment:'说明',
    result:'结果',case:'格',gender:'语法性别',agreement:'一致关系',stem:'词干',
    ending:'词尾',honorific:'敬语',register:'语体'
  },
};

const SKILLS={
  en:{writing:'Writing',speaking:'Speaking',reading:'Reading',listening:'Listening'},
  vi:{writing:'Writing',speaking:'Speaking',reading:'Reading',listening:'Listening'},
  zh:{writing:'写作',speaking:'口语',reading:'阅读',listening:'听力'},
};
const SKILL_ICONS={writing:'write',speaking:'speak',reading:'read',listening:'listen'};

const localeKey=value=>String(value||'').trim().replace(/_/g,'-');
const baseLocale=value=>localeKey(value).split('-')[0];

export function localizedText(value,locale='en'){
  if(typeof value==='string')return value;
  if(!value||typeof value!=='object')return '';
  const exact=localeKey(locale);
  const base=baseLocale(locale);
  return value[exact]||value[base]||value.default||'';
}

export function grammarLanguageContext(options={}){
  if(typeof options==='string'){
    return {
      interfaceLanguage:options,
      explanationLanguage:options,
      translationLanguage:options,
      targetLanguage:'en',
    };
  }
  const legacy=options.locale||'en';
  return {
    interfaceLanguage:options.interfaceLanguage||legacy,
    explanationLanguage:options.explanationLanguage||legacy,
    translationLanguage:options.translationLanguage||options.explanationLanguage||legacy,
    targetLanguage:options.targetLanguage||'en',
  };
}

const copy=context=>{
  const locale=baseLocale(grammarLanguageContext(context).interfaceLanguage);
  return COPY[locale]||COPY.en;
};
const roleLabel=(role,context)=>{
  const locale=baseLocale(grammarLanguageContext(context).interfaceLanguage);
  const table=ROLES[locale]||ROLES.en;
  return table[role]||String(role||'').replace(/[_-]+/g,' ');
};
const stageLabel=(stage,context)=>copy(context)[stage]||String(stage||'').replace(/[_-]+/g,' ');
const skillLabel=(skill,context)=>{
  const locale=baseLocale(grammarLanguageContext(context).interfaceLanguage);
  return (SKILLS[locale]||SKILLS.en)[skill]||skill;
};
const safeId=value=>String(value||'block').replace(/[^a-zA-Z0-9_-]/g,'-');
const explanationText=(value,context)=>localizedText(value,grammarLanguageContext(context).explanationLanguage);
const translationText=(value,context)=>localizedText(value,grammarLanguageContext(context).translationLanguage);
const targetText=(value,context)=>localizedText(value,grammarLanguageContext(context).targetLanguage);
const interfaceText=(value,context)=>localizedText(value,grammarLanguageContext(context).interfaceLanguage);

function readingAidValue(item,context){
  const raw=item?.reading_aid ?? item?.transliteration ?? item?.pronunciation_guide ?? item?.pinyin;
  if(raw&&typeof raw==='object'&&!Array.isArray(raw)&&Object.prototype.hasOwnProperty.call(raw,'text')){
    return targetText(raw.text,context)||explanationText(raw.text,context);
  }
  return targetText(raw,context)||explanationText(raw,context);
}

function frame(block,context,body,{surface=false}={}){
  const id=`grammar-learning-${safeId(block.id)}`;
  const instruction=explanationText(block.instruction,context);
  return `<section class="grammar-learning-block grammar-learning-${esc(block.type)} ${surface?'is-visual-surface':''}" data-grammar-block-type="${esc(block.type)}" data-learning-stage="${esc(block.stage)}" aria-labelledby="${id}">
    <header class="grammar-learning-block-head">
      <span class="grammar-learning-stage">${esc(stageLabel(block.stage,context))}</span>
      <h3 id="${id}">${esc(explanationText(block.title,context))}<span class="grammar-block-info" aria-hidden="true">${oIcon('info')}</span></h3>
      ${instruction?`<p>${esc(instruction)}</p>`:''}
    </header>${body}</section>`;
}

function segments(payload,context,{insertion=false}={}){
  const items=Array.isArray(payload?.segments)?payload.segments:[];
  return `<div class="grammar-sentence-flow" role="list" data-segment-count="${items.length}">${items.map((item,index)=>{
    const role=String(item.role||'segment');
    const aid=readingAidValue(item,context);
    const meaning=translationText(item.meaning,context);
    return `${index?`<i class="grammar-segment-connector" aria-hidden="true">${oIcon('arrowRight')}</i>`:''}<span class="grammar-sentence-segment role-${esc(safeId(role))} ${item.inserted?'is-inserted':''}" role="listitem" data-grammar-role="${esc(role)}">
      ${item.inserted||insertion?'<i class="grammar-insertion-pin" aria-hidden="true"></i>':''}
      <b>${esc(targetText(item.text,context))}</b>
      ${aid?`<span class="grammar-reading-aid" data-grammar-reading-aid>${esc(aid)}</span>`:''}
      <small>${esc(interfaceText(item.label,context)||roleLabel(role,context))}</small>
      ${meaning?`<em>${esc(meaning)}</em>`:''}
    </span>`;
  }).join('')}</div>`;
}

export function GrammarFormula(block,context='en'){
  const parts=Array.isArray(block.payload?.parts)?block.payload.parts:[];
  return frame(block,context,`<div class="grammar-visual-canvas grammar-formula"><div class="grammar-formula-line" data-part-count="${parts.length}">${parts.map((part,index)=>{
    const role=String(part.role||'part');
    const aid=readingAidValue(part,context);
    return `${index?'<span class="grammar-formula-join" aria-hidden="true">+</span>':''}<span class="grammar-formula-part role-${esc(safeId(role))}"><b>${esc(targetText(part.text,context))}</b>${aid?`<span class="grammar-reading-aid" data-grammar-reading-aid>${esc(aid)}</span>`:''}<small>${esc(interfaceText(part.label,context)||roleLabel(role,context))}</small></span>`;
  }).join('')}</div></div>`,{surface:true});
}

export function SemanticSentence(block,context='en'){
  return frame(block,context,`<div class="grammar-visual-canvas grammar-semantic-sentence">${segments(block.payload,context)}</div>`,{surface:true});
}
export function WordOrderFlow(block,context='en'){
  return frame(block,context,`<div class="grammar-visual-canvas grammar-word-order">${segments(block.payload,context)}</div>`,{surface:true});
}
export function ParticleInsertion(block,context='en'){
  return frame(block,context,`<div class="grammar-visual-canvas grammar-particle-insertion">${segments(block.payload,context,{insertion:true})}</div>`,{surface:true});
}
export function AgreementMap(block,context='en'){
  return frame(block,context,`<div class="grammar-visual-canvas grammar-agreement-map">${segments(block.payload,context)}</div>`,{surface:true});
}

export function TransformationFlow(block,context='en'){
  const p=block.payload||{};
  return frame(block,context,`<div class="grammar-visual-canvas grammar-transformation"><div class="grammar-transform-state is-before"><small>${esc(copy(context).before)}</small><strong>${esc(targetText(p.from,context))}</strong></div><span class="grammar-transform-arrow" aria-hidden="true">${oIcon('arrowRight')}</span><div class="grammar-transform-state is-after"><small>${esc(copy(context).after)}</small><strong>${esc(targetText(p.to,context))}</strong></div>${Array.isArray(p.steps)&&p.steps.length?`<ol class="grammar-transform-steps">${p.steps.map(step=>`<li>${esc(explanationText(step,context))}</li>`).join('')}</ol>`:''}</div>`,{surface:true});
}

export function TimelineVisual(block,context='en'){
  const events=Array.isArray(block.payload?.events)?block.payload.events:[];
  return frame(block,context,`<div class="grammar-visual-canvas grammar-timeline"><div class="grammar-timeline-track" aria-hidden="true"><i></i></div><ol>${events.map(event=>`<li data-position="${esc(event.position||'context')}"><i class="grammar-timeline-dot" aria-hidden="true"></i><strong>${esc(explanationText(event.label,context))}</strong>${event.note?`<small>${esc(explanationText(event.note,context))}</small>`:''}</li>`).join('')}</ol></div>`,{surface:true});
}

export function ContrastCard(block,context='en'){
  const items=Array.isArray(block.payload?.items)?block.payload.items:[];
  return frame(block,context,`<div class="grammar-contrast-grid" data-contrast-count="${items.length}">${items.map((item,index)=>{
    const aid=readingAidValue(item,context);
    return `<article class="grammar-contrast-item" data-contrast-index="${index}"><span>${esc(interfaceText(item.label,context)||explanationText(item.label,context))}</span><strong>${esc(targetText(item.text,context))}</strong>${aid?`<small class="grammar-reading-aid" data-grammar-reading-aid>${esc(aid)}</small>`:''}${item.meaning?`<small>${esc(translationText(item.meaning,context))}</small>`:''}${item.note?`<p>${esc(explanationText(item.note,context))}</p>`:''}</article>`;
  }).join('')}${items.length===2?'<span class="grammar-contrast-vs" aria-hidden="true">vs.</span>':''}</div>`);
}

export function RealLifeScene(block,context='en'){
  const p=block.payload||{};
  const lines=Array.isArray(p.lines)?p.lines:[];
  return frame(block,context,`<div class="grammar-scene">${p.setup?`<p class="grammar-scene-setup">${esc(explanationText(p.setup,context))}</p>`:''}<div class="grammar-scene-dialogue">${lines.map(line=>{
    const aid=readingAidValue(line,context);
    return `<div class="grammar-scene-line"><span class="grammar-example-mark" aria-hidden="true">${oIcon('check')}</span><div class="grammar-example-copy">${line.speaker?`<span>${esc(targetText(line.speaker,context)||explanationText(line.speaker,context))}</span>`:''}<strong>${esc(targetText(line.text,context))}</strong>${aid?`<small class="grammar-reading-aid" data-grammar-reading-aid>${esc(aid)}</small>`:''}${line.meaning?`<em>${esc(translationText(line.meaning,context))}</em>`:''}</div></div>`;
  }).join('')}</div></div>`,{surface:true});
}

export function SentenceBuilder(block,context='en'){
  const slots=Array.isArray(block.payload?.slots)?block.payload.slots:[];
  return frame(block,context,`<div class="grammar-sentence-builder">${slots.map((slot,i)=>`<fieldset data-builder-slot="${i}"><legend>${esc(interfaceText(slot.label,context)||explanationText(slot.label,context))}</legend><div class="grammar-builder-options">${(slot.options||[]).map(option=>`<button type="button" aria-pressed="false" data-grammar-builder-choice>${esc(targetText(option,context))}</button>`).join('')}</div></fieldset>`).join('')}</div>`,{surface:true});
}

export function InflectionTable(block,context='en'){
  const p=block.payload||{}, headers=Array.isArray(p.headers)?p.headers:[], rows=Array.isArray(p.rows)?p.rows:[];
  return frame(block,context,`<div class="grammar-inflection-table">${rows.map(row=>`<article><strong>${esc(explanationText(row.label,context)||targetText(row.label,context))}</strong><div>${(row.cells||[]).map((cell,index)=>`<span>${headers[index]?`<small>${esc(explanationText(headers[index],context))}</small>`:''}<b>${esc(targetText(cell,context))}</b></span>`).join('')}</div></article>`).join('')}</div>`,{surface:true});
}

export function CommonMistake(block,context='en'){
  const p=block.payload||{};
  return frame(block,context,`<div class="grammar-common-mistake">
    ${p.context?`<p class="grammar-mistake-context"><strong>${esc(copy(context).contextLabel)}:</strong> ${esc(explanationText(p.context,context))}</p>`:''}
    <div class="grammar-mistake-row is-incorrect"><span aria-hidden="true">${oIcon('close')}</span><div><small>${esc(copy(context).incorrect)}</small><strong>${esc(targetText(p.incorrect,context))}</strong></div></div>
    <div class="grammar-mistake-why"><strong>${esc(copy(context).why)}</strong><p>${esc(explanationText(p.why,context))}</p></div>
    <div class="grammar-mistake-row is-correct"><span aria-hidden="true">${oIcon('check')}</span><div><small>${esc(copy(context).corrected)}</small><strong>${esc(targetText(p.correct,context))}</strong></div></div>
  </div>`,{surface:true});
}

export function GrammarException(block,context='en'){
  const p=block.payload||{};
  return frame(block,context,`<div class="grammar-exception">
    <div><small>${esc(copy(context).rule)}</small><strong>${esc(explanationText(p.rule,context))}</strong></div>
    <span class="grammar-exception-arrow" aria-hidden="true">${oIcon('arrowRight')}</span>
    <div class="is-exception"><small>${esc(copy(context).exception)}</small><strong>${esc(explanationText(p.exception,context))}</strong></div>
    <p><b>${esc(copy(context).why)}</b> ${esc(explanationText(p.why,context))}</p>
    ${p.context?`<p><b>${esc(copy(context).contextLabel)}</b> ${esc(explanationText(p.context,context))}</p>`:''}
  </div>`,{surface:true});
}

function revealMarkup(p,context){
  const answer=targetText(p.answer,context);
  const explanation=explanationText(p.explanation,context);
  if(!answer&&!explanation)return '';
  return `<button type="button" class="button button-secondary" data-learning-reveal>${esc(copy(context).reveal)}</button><div class="grammar-learning-reveal hidden" data-learning-answer>${answer?`<strong>${esc(answer)}</strong>`:''}${explanation?`<p>${esc(explanation)}</p>`:''}</div>`;
}

export function MicroPractice(block,context='en'){
  const p=block.payload||{}, type=p.interaction;
  let body='';
  if(['choose','compare','classify','identify'].includes(type)){
    body=`<div class="grammar-micro-practice" data-learning-interaction data-interaction-type="${esc(type)}" data-learning-evidence-stage="${esc(block.stage)}" data-learning-evidence-complete="false"><p>${esc(explanationText(p.prompt,context))}</p><div class="grammar-micro-options">${(p.options||[]).map((option,index)=>`<button type="button" aria-pressed="false" data-micro-choice><span aria-hidden="true">${String.fromCharCode(65+index)}</span><b>${esc(targetText(option,context))}</b></button>`).join('')}</div>${revealMarkup(p,context)}</div>`;
  }else if(['reorder','build'].includes(type)){
    body=`<div class="grammar-micro-practice" data-learning-interaction data-interaction-type="${esc(type)}" data-learning-evidence-stage="${esc(block.stage)}" data-learning-evidence-complete="false"><p>${esc(explanationText(p.prompt,context))}</p><div class="grammar-reorder-tokens">${(p.tokens||[]).map((token,index)=>`<button type="button" aria-pressed="false" data-reorder-token="${index}">${esc(targetText(token,context))}</button>`).join('')}</div><div class="grammar-reorder-result"><small>${esc(copy(context).selectedOrder)}</small><strong data-reorder-result></strong></div>${revealMarkup(p,context)}</div>`;
  }else if(type==='match'){
    const pairs=Array.isArray(p.pairs)?p.pairs:[], right=pairs.map(pair=>pair.right);
    body=`<div class="grammar-micro-practice" data-learning-interaction data-interaction-type="match" data-learning-evidence-stage="${esc(block.stage)}" data-learning-evidence-complete="false"><p>${esc(explanationText(p.prompt,context))}</p><div class="grammar-match-grid">${pairs.map((pair,index)=>`<label class="grammar-match-row"><span>${esc(targetText(pair.left,context))}</span><select data-match-select="${index}"><option value="">—</option>${right.map(option=>`<option value="${esc(targetText(option,context))}">${esc(targetText(option,context))}</option>`).join('')}</select></label>`).join('')}</div>${revealMarkup(p,context)}</div>`;
  }else{
    const id=`grammar-micro-${safeId(block.id)}`;
    body=`<div class="grammar-micro-practice" data-learning-interaction data-interaction-type="${esc(type)}"><p>${esc(explanationText(p.prompt,context))}</p><label for="${id}">${esc(copy(context).yourAnswer)}</label><textarea id="${id}" rows="${type==='fill'?2:4}" maxlength="1200" data-learning-evidence-stage="${esc(block.stage)}" placeholder="${esc(targetText(p.placeholder,context)||interfaceText(p.placeholder,context))}"></textarea>${revealMarkup(p,context)}</div>`;
  }
  return frame(block,context,body,{surface:true});
}

function promptBlock(block,context,{recall=false,personal=false}={}){
  const p=block.payload||{};
  const answer=targetText(p.answer,context)||explanationText(p.answer,context);
  const explanation=explanationText(p.explanation,context);
  const id=`grammar-input-${safeId(block.id)}`;
  return frame(block,context,`<div class="grammar-learning-prompt ${recall?'is-recall':''} ${personal?'is-personal':''}"><p>${esc(explanationText(p.prompt,context))}</p><label for="${id}">${esc(copy(context).yourAnswer)}</label><textarea id="${id}" rows="${recall?3:4}" maxlength="1200" data-learning-evidence-stage="${esc(block.stage)}" placeholder="${esc(targetText(p.placeholder,context)||interfaceText(p.placeholder,context))}"></textarea>${(answer||explanation)?`<button type="button" class="button button-secondary" data-learning-reveal>${esc(copy(context).reveal)}</button><div class="grammar-learning-reveal hidden" data-learning-answer>${answer?`<strong>${esc(answer)}</strong>`:''}${explanation?`<p>${esc(explanation)}</p>`:''}</div>`:''}</div>`,{surface:recall||personal});
}
export function PracticePrompt(block,context='en'){return promptBlock(block,context);}
export function PersonalPractice(block,context='en'){return promptBlock(block,context,{personal:true});}
export function RecallPrompt(block,context='en'){return promptBlock(block,context,{recall:true});}

export function MemoryHook(block,context='en'){
  const p=block.payload||{};
  return frame(block,context,`<aside class="grammar-memory-hook"><span aria-hidden="true">${oIcon('info')}</span><div><strong>${esc(explanationText(p.cue,context))}</strong><p>${esc(explanationText(p.remember,context))}</p></div></aside>`);
}

export function SkillTransfer(block,context='en'){
  const map=block.payload?.skills||{};
  return frame(block,context,`<div class="grammar-skill-transfer">${Object.entries(map).map(([skill,prompt])=>{
    const id=`grammar-transfer-${safeId(block.id)}-${safeId(skill)}`;
    return `<article><span class="grammar-skill-name">${oIcon(SKILL_ICONS[skill])}<b>${esc(skillLabel(skill,context))}</b></span><p>${esc(explanationText(prompt,context))}</p><label class="sr-only" for="${id}">${esc(copy(context).yourAnswer)}</label><textarea id="${id}" rows="3" maxlength="1000" data-learning-evidence-stage="${esc(block.stage)}"></textarea></article>`;
  }).join('')}</div>`);
}

function renderBlock(block,context){
  switch(block.type){
    case 'formula':return GrammarFormula(block,context);
    case 'semantic_sentence':return SemanticSentence(block,context);
    case 'transformation':return TransformationFlow(block,context);
    case 'position':
    case 'word_order':return WordOrderFlow(block,context);
    case 'insertion':
    case 'particle_position':return ParticleInsertion(block,context);
    case 'agreement_map':return AgreementMap(block,context);
    case 'inflection_table':return InflectionTable(block,context);
    case 'timeline':return TimelineVisual(block,context);
    case 'contrast':return ContrastCard(block,context);
    case 'scene':return RealLifeScene(block,context);
    case 'sentence_builder':return SentenceBuilder(block,context);
    case 'common_mistake':return CommonMistake(block,context);
    case 'exception':return GrammarException(block,context);
    case 'micro_practice':return MicroPractice(block,context);
    case 'personal_practice':return PersonalPractice(block,context);
    case 'recall':return RecallPrompt(block,context);
    case 'memory_hook':return MemoryHook(block,context);
    case 'skill_transfer':return SkillTransfer(block,context);
    default:return '';
  }
}

export function hasGrammarLearningModel(model){
  return Boolean(
    model
    && [1,2].includes(Number(model.schema_version))
    && Array.isArray(model.blocks)
    && model.blocks.length
  );
}

const hasReadingAid=model=>/"(?:reading_aid|transliteration|pronunciation_guide|pinyin)"\s*:/.test(JSON.stringify(model||{}));

export function renderGrammarLearningModel(model,options={}){
  if(!hasGrammarLearningModel(model))return '';
  const context=grammarLanguageContext(options);
  const hook=model.hook||{}, meaning=model.meaning||{};
  const repeatedMeaning=new Set([
    explanationText(meaning.summary,context),
    explanationText(meaning.mental_model,context),
  ].filter(Boolean));
  const useWhen=(Array.isArray(meaning.use_when)?meaning.use_when:[]).filter((item,index,items)=>{
    const text=explanationText(item,context);
    return Boolean(text)
      &&!repeatedMeaning.has(text)
      &&items.findIndex(candidate=>explanationText(candidate,context)===text)===index;
  });
  const blocks=Array.isArray(model.blocks)?model.blocks:[];
  const modern=Number(model.schema_version)>=2;
  const primaryIndex=modern?blocks.findIndex(block=>block?.stage==='pattern'):-1;
  const primaryBlock=primaryIndex>=0?blocks[primaryIndex]:null;
  const remainingBlocks=primaryIndex>=0
    ?blocks.filter((_,index)=>index!==primaryIndex)
    :blocks;
  return `<div class="grammar-learning-shell" data-grammar-learning-model="1" data-grammar-visual-system="orena-grammar-v2" data-grammar-schema="${esc(model.schema_version)}" data-target-language="${esc(context.targetLanguage)}" data-interface-language="${esc(context.interfaceLanguage)}" data-explanation-language="${esc(context.explanationLanguage)}" data-translation-language="${esc(context.translationLanguage)}">
    <nav class="grammar-learning-flow" aria-label="${esc(copy(context).flowLabel)}">${(model.flow||[]).map((stage,index)=>`<span data-flow-stage="${esc(stage)}"><i>${index+1}</i><b>${esc(stageLabel(stage,context))}</b></span>`).join('')}</nav>
    <section class="grammar-learning-hook"><span>${esc(explanationText(hook.eyebrow,context)||stageLabel('notice',context))}</span><h3>${esc(explanationText(hook.prompt,context))}</h3>${hasReadingAid(model)?`<button type="button" class="button button-tertiary grammar-reading-aid-toggle" data-reading-aid-toggle aria-pressed="true">${esc(copy(context).hideReadingAid)}</button>`:''}</section>
    <section class="grammar-learning-meaning"><span class="grammar-learning-stage">${esc(stageLabel('understand',context))}</span><h3>${esc(explanationText(meaning.summary,context))}</h3><p>${esc(explanationText(meaning.mental_model,context))}</p>${!modern&&useWhen.length?`<ul>${useWhen.map(item=>`<li>${esc(explanationText(item,context))}</li>`).join('')}</ul>`:''}</section>
    ${primaryBlock?`<div class="grammar-learning-primary-pattern">${renderBlock(primaryBlock,context)}</div>`:''}
    ${modern&&useWhen.length?`<section class="grammar-learning-use-when" data-grammar-block-type="use_when"><header class="grammar-compact-heading"><h3>${esc(copy(context).useWhen)}<span class="grammar-block-info" aria-hidden="true">${oIcon('info')}</span></h3></header><ul>${useWhen.map(item=>`<li><span class="grammar-use-check" aria-hidden="true">${oIcon('check')}</span><span>${esc(explanationText(item,context))}</span></li>`).join('')}</ul></section>`:''}
    <div class="grammar-learning-blocks">${remainingBlocks.map(block=>renderBlock(block,context)).join('')}</div>
  </div>`;
}

function evidenceReady(node){
  if(!node)return false;
  if(node.matches?.('textarea,input,select'))return Boolean(String(node.value||'').trim());
  return node.dataset.learningEvidenceComplete==='true';
}
function focusEvidence(node){
  if(!node)return;
  if(node.matches?.('textarea,input,select,button')){node.focus();return;}
  node.querySelector('textarea,input,select,button')?.focus();
}
function bindMicroInteractions(root){
  root.querySelectorAll('[data-learning-interaction]').forEach(container=>{
    const type=container.dataset.interactionType;
    if(['choose','compare','classify','identify'].includes(type)){
      container.querySelectorAll('[data-micro-choice]').forEach(button=>button.addEventListener('click',()=>{
        container.querySelectorAll('[data-micro-choice]').forEach(choice=>{
          const active=choice===button;
          choice.setAttribute('aria-pressed',String(active));
          choice.classList.toggle('is-selected',active);
        });
        container.dataset.learningEvidenceComplete='true';
      }));
    }else if(['reorder','build'].includes(type)){
      const order=[], output=container.querySelector('[data-reorder-result]');
      container.querySelectorAll('[data-reorder-token]').forEach(button=>button.addEventListener('click',()=>{
        const key=button.dataset.reorderToken, found=order.indexOf(key);
        if(found>=0){
          order.splice(found,1);
          button.setAttribute('aria-pressed','false');
          button.classList.remove('is-selected');
        }else{
          order.push(key);
          button.setAttribute('aria-pressed','true');
          button.classList.add('is-selected');
        }
        if(output)output.textContent=order.map(index=>container.querySelector(`[data-reorder-token="${CSS.escape(index)}"]`)?.textContent?.trim()||'').filter(Boolean).join(' · ');
        const total=container.querySelectorAll('[data-reorder-token]').length;
        container.dataset.learningEvidenceComplete=String(total>0&&order.length===total);
      }));
    }else if(type==='match'){
      const refresh=()=>{
        const selects=[...container.querySelectorAll('[data-match-select]')];
        container.dataset.learningEvidenceComplete=String(
          selects.length>0&&selects.every(select=>Boolean(select.value))
        );
      };
      container.querySelectorAll('[data-match-select]').forEach(select=>select.addEventListener('change',refresh));
    }
  });
}

export function bindGrammarLearningInteractions(root,options={}){
  if(!root)return;
  const context=grammarLanguageContext(options);
  root.querySelector('[data-reading-aid-toggle]')?.addEventListener('click',event=>{
    const shell=event.currentTarget.closest('[data-grammar-learning-model]');
    if(!shell)return;
    const hidden=shell.classList.toggle('is-reading-aid-hidden');
    event.currentTarget.setAttribute('aria-pressed',String(!hidden));
    event.currentTarget.textContent=hidden?copy(context).showReadingAid:copy(context).hideReadingAid;
  });
  bindMicroInteractions(root);

  root.querySelectorAll('[data-learning-reveal]').forEach(button=>{
    button.addEventListener('click',()=>{
      const block=button.closest('.grammar-learning-block');
      const input=block?.querySelector('[data-learning-evidence-stage]');
      if(!evidenceReady(input)){focusEvidence(input);return;}
      const answer=block?.querySelector('[data-learning-answer]');
      if(!answer)return;
      const hidden=answer.classList.toggle('hidden');
      button.textContent=hidden?copy(context).reveal:copy(context).hide;
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

export function grammarLearningCompletion(root,model,options={}){
  if(!hasGrammarLearningModel(model))return null;
  const context=grammarLanguageContext(options);
  const required=Array.isArray(model.completion?.required_stages)?model.completion.required_stages:[];
  for(const stage of required){
    const inputs=[...root.querySelectorAll(`[data-learning-evidence-stage="${CSS.escape(stage)}"]`)];
    if(!inputs.some(evidenceReady)){
      return {ready:false,stage,focus:inputs[0]||null,message:copy(context).evidence};
    }
  }
  return {ready:true,stage:null,focus:null,message:''};
}
