import {api} from '../api.js';
import {go} from '../router.js?v=2.17.5';
import {supportLanguage} from '../store.js';
import {esc,errorBlock,loadingBlock,toast,runBusy} from '../components/primitives.js';
import {oIcon} from '../orena/icons.js?v=2.17.5';
import {
  hasGrammarLearningModel,
  renderGrammarLearningModel,
  bindGrammarLearningInteractions,
  grammarLearningCompletion,
  localizedText,
  grammarLanguageContext,
} from '../components/grammar-learning.js?v=2.17.5';

const COPY={
  en:{
    kicker:'GRAMMAR · CURRICULUM',
    title:'BUILD STRUCTURE YOU CAN ACTUALLY USE.',
    lead:'Move through one connected curriculum. Learn the target, compare nearby forms, practice it, then carry it into real writing.',
    progress:'Curriculum progress',complete:'completed',next:'Continue curriculum',
    levelMap:'Level roadmap',modules:'Modules',lesson:'Lesson',review:'Review',checkpoint:'Progress check',
    objective:'Learning objective',moduleBoundary:'Module boundary',targetScope:'Lesson target',
    rules:'Rules',contrasts:'Contrasts',exceptions:'Restrictions & exceptions',examples:'Examples',
    mistakes:'Common mistakes',guided:'Guided practice',production:'Production',
    attempt:'Your answer',attemptPlaceholder:'Type your answer before checking…',attemptFirst:'Try the question first, then reveal the answer.',
    reveal:'Reveal answer',hide:'Hide answer',mark:'Mark activity complete',undo:'Mark incomplete',
    writeTransfer:'Use this in Writing',prev:'Previous',nextLesson:'Next',
    noMastery:'Completion records study activity only. It is not a CEFR/HSK mastery claim.',
    productionPrompt:'Write at least two original uses of the target in different contexts. Put one example on each line.',
    productionPlaceholder:'Example 1…\nExample 2…',
    productionNeeded:'Write at least two original examples, one per line, before completing the lesson.',
    lessonUnavailable:'The generated teaching layer is unavailable right now. The locked curriculum scope is still available.',
    empty:'No curriculum items are available for this language.',
    loading:'Preparing lesson…',saved:'Completion saved.',unsaved:'Marked incomplete.',
    source:'Lesson source',sourcePrepared:'Prepared learning content',sourceFallback:'Curriculum fallback',activities:'items',learningActions:'Learning actions',learningEvidence:'Use it before you mark it done',learningEvidenceNote:'Rich lessons require Apply, Recall and Transfer evidence before completion.',
  },
  vi:{
    kicker:'NGỮ PHÁP · GIÁO TRÌNH',
    title:'XÂY CẤU TRÚC ĐỂ THẬT SỰ DÙNG ĐƯỢC.',
    lead:'Học theo một curriculum liền mạch. Hiểu đúng target, phân biệt cấu trúc gần nhau, luyện tập rồi đưa nó vào Writing thật.',
    progress:'Tiến độ curriculum',complete:'đã hoàn thành',next:'Học bài tiếp theo',
    levelMap:'Lộ trình theo cấp',modules:'Các module',lesson:'Bài học',review:'Ôn tập',checkpoint:'Kiểm tra tiến độ',
    objective:'Mục tiêu học',moduleBoundary:'Phạm vi module',targetScope:'Target của bài',
    rules:'Quy tắc',contrasts:'Cấu trúc cần phân biệt',exceptions:'Giới hạn & ngoại lệ',examples:'Ví dụ',
    mistakes:'Lỗi thường gặp',guided:'Bài luyện có hướng dẫn',production:'Tự sản xuất',
    attempt:'Câu trả lời của bạn',attemptPlaceholder:'Hãy tự trả lời trước khi xem đáp án…',attemptFirst:'Hãy thử trả lời trước, sau đó mới xem đáp án.',
    reveal:'Xem đáp án',hide:'Ẩn đáp án',mark:'Hoàn thành hoạt động',undo:'Đánh dấu chưa hoàn thành',
    writeTransfer:'Dùng cấu trúc này trong Writing',prev:'Bài trước',nextLesson:'Bài tiếp',
    noMastery:'Dấu hoàn thành chỉ ghi nhận hoạt động học. Đây không phải tuyên bố đã đạt CEFR/HSK.',
    productionPrompt:'Hãy tự viết ít nhất hai câu dùng target này trong hai ngữ cảnh khác nhau. Mỗi câu viết trên một dòng.',
    productionPlaceholder:'Ví dụ 1…\nVí dụ 2…',
    productionNeeded:'Hãy viết ít nhất hai ví dụ nguyên bản, mỗi ví dụ một dòng, trước khi hoàn thành bài.',
    lessonUnavailable:'Lớp nội dung được tạo tự động hiện chưa sẵn sàng. Locked curriculum scope vẫn luôn dùng được.',
    empty:'Hiện chưa có curriculum cho ngôn ngữ này.',
    loading:'Đang chuẩn bị bài…',saved:'Đã lưu hoàn thành.',unsaved:'Đã bỏ dấu hoàn thành.',
    source:'Nguồn lesson',sourcePrepared:'Nội dung học đã chuẩn bị',sourceFallback:'Basic guide từ curriculum',activities:'mục',learningActions:'Hành động học',learningEvidence:'Dùng được rồi mới đánh dấu hoàn thành',learningEvidenceNote:'Bài học mới yêu cầu bằng chứng Áp dụng, Gợi nhớ và Chuyển giao trước khi hoàn thành.',
  },
  zh:{
    kicker:'语法 · 课程',
    title:'把语法结构学到真正能用。',
    lead:'沿着完整课程前进：理解当前目标、区分相近结构、完成练习，再把它迁移到真实写作。',
    progress:'课程进度',complete:'已完成',next:'继续下一课',
    levelMap:'级别路线',modules:'课程模块',lesson:'课程',review:'复习',checkpoint:'阶段检查',
    objective:'学习目标',moduleBoundary:'模块边界',targetScope:'本课目标',
    rules:'规则',contrasts:'需要区分',exceptions:'限制与例外',examples:'例句',
    mistakes:'常见错误',guided:'引导练习',production:'自主产出',
    attempt:'你的答案',attemptPlaceholder:'先自己作答，再查看答案…',attemptFirst:'请先尝试作答，再查看答案。',
    reveal:'查看答案',hide:'隐藏答案',mark:'完成本次学习',undo:'标记为未完成',
    writeTransfer:'在 Writing 中使用',prev:'上一课',nextLesson:'下一课',
    noMastery:'完成记录只表示学习活动，不代表 CEFR/HSK 已掌握。',
    productionPrompt:'请至少自己写两个在不同语境中使用本课目标的例子，每个例子单独一行。',
    productionPlaceholder:'例子 1…\n例子 2…',
    productionNeeded:'完成课程前，请至少写两个原创例子，每行一个。',
    lessonUnavailable:'生成式教学内容暂时不可用，但锁定的课程范围仍然可用。',
    empty:'当前语言还没有可用课程。',
    loading:'正在准备课程…',saved:'完成记录已保存。',unsaved:'已标记为未完成。',
    source:'课程来源',sourcePrepared:'已准备的学习内容',sourceFallback:'课程基础指南',activities:'项',learningActions:'学习行动',learningEvidence:'真正用过，再标记完成',learningEvidenceNote:'新版课程需要完成“应用、主动回忆、迁移”证据后才能标记完成。',
  },
};

const copy=()=>COPY[supportLanguage()]||COPY.vi;
const ORENA_GRAMMAR_COPY={
  en:{back:'Back to grammar',inLesson:'In this lesson'},
  vi:{back:'Quay lại ngữ pháp',inLesson:'Trong bài này'},
  zh:{back:'返回语法课程',inLesson:'本课内容'},
};
const orenaGrammarCopy=()=>ORENA_GRAMMAR_COPY[supportLanguage()]||ORENA_GRAMMAR_COPY.vi;
const grammarContext=detail=>grammarLanguageContext({
  interfaceLanguage:supportLanguage(),
  explanationLanguage:supportLanguage(),
  translationLanguage:supportLanguage(),
  targetLanguage:detail?.language||'en',
});
const legacyObjective=detail=>supportLanguage()==='vi'?String(detail?.objective_vi||''):'';

function sourceLabel(source=''){
  const c=copy();
  return source==='locked-syllabus-fallback'?c.sourceFallback:c.sourcePrepared;
}

function kindLabel(kind){
  const c=copy();
  if(kind==='review')return c.review;
  if(kind==='checkpoint')return c.checkpoint;
  return c.lesson;
}

function progressOf(items=[]){
  const total=items.length;
  const completed=items.filter(item=>item.completed===true).length;
  return {total,completed,percent:total?Math.round((completed/total)*100):0};
}

function nextIncomplete(items=[]){
  return items.find(item=>item.completed!==true)||null;
}

function groupByLevel(items=[],levels=[]){
  return levels.map(level=>({
    level,
    items:items.filter(item=>item.level===level),
  })).filter(group=>group.items.length);
}

function groupByModule(items=[]){
  const map=new Map();
  for(const item of items){
    const key=item.module||item.category||'Grammar';
    if(!map.has(key))map.set(key,[]);
    map.get(key).push(item);
  }
  return [...map.entries()].map(([module,moduleItems])=>({module,items:moduleItems}));
}

function overviewMarkup(payload){
  const c=copy();
  const items=Array.isArray(payload.lessons)?payload.lessons:[];
  const progress=progressOf(items);
  const next=nextIncomplete(items);
  const groups=groupByLevel(items,payload.levels||[]);
  if(!items.length)return `<section class="page grammar-page">${errorBlock(c.empty)}</section>`;

  return `<section class="page grammar-page" data-grammar-ui>
    <section class="grammar-hero visual-hero-surface">
      <div class="grammar-progress-visual" aria-label="${esc(c.progress)}">
        <div class="grammar-progress-number"><strong>${progress.percent}</strong><span>%</span></div>
        <div class="grammar-progress-copy">
          <span class="context-label">${esc(c.progress)}</span>
          <h2>${progress.completed} / ${progress.total} ${esc(c.complete)}</h2>
          <div class="grammar-progress-track" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${progress.percent}">
            <span style="width:${progress.percent}%"></span>
          </div>
          <p>${esc(c.noMastery)}</p>
        </div>
      </div>

      <div class="grammar-next-card">
        ${next?`
          <span class="context-label">${esc(next.level)} · ${esc(kindLabel(next.kind))}</span>
          <h2>${esc(next.title)}</h2>
          <p>${esc(supportLanguage()==='vi'?(next.objective_vi||''):'')}</p>
          <button class="button button-primary" type="button" data-grammar-open="${esc(next.id)}">${esc(c.next)}</button>
        `:`
          <span class="context-label">${esc(c.progress)}</span>
          <h2>${progress.total} / ${progress.total}</h2>
          <p>${esc(c.noMastery)}</p>
          <button class="button button-secondary" type="button" data-grammar-writing>${esc(c.writeTransfer)}</button>
        `}
      </div>
    </section>

    <section class="grammar-roadmap visual-section-surface">
      <div class="grammar-section-head">
        <div>
          <span class="context-label">${esc(c.levelMap)}</span>
          <h2>${esc(c.levelMap)}</h2>
        </div>
      </div>
      <div class="grammar-level-rail">
        ${groups.map(group=>{
          const p=progressOf(group.items);
          return `<button class="grammar-level-pill" type="button" data-grammar-level="${esc(group.level)}">
            <strong>${esc(group.level)}</strong>
            <span>${p.completed}/${p.total}</span>
            <i><b style="width:${p.percent}%"></b></i>
          </button>`;
        }).join('')}
      </div>
    </section>

    <div id="grammarLessonSlot" class="grammar-lesson-slot" aria-live="polite"></div>

    <section class="grammar-curriculum-map">
      ${groups.map((group,index)=>{
        const modules=groupByModule(group.items);
        const p=progressOf(group.items);
        return `<details class="grammar-level-group" data-grammar-level-group="${esc(group.level)}" ${index===0?'open':''}>
          <summary>
            <span><strong>${esc(group.level)}</strong><small>${p.completed}/${p.total}</small></span>
            <span>${modules.length} ${esc(c.modules)}</span>
          </summary>
          <div class="grammar-module-stack">
            ${modules.map(module=>{
              const mp=progressOf(module.items);
              return `<section class="grammar-module">
                <header>
                  <div>
                    <span class="context-label">${esc(group.level)}</span>
                    <h3>${esc(module.module)}</h3>
                  </div>
                  <span>${mp.completed}/${mp.total}</span>
                </header>
                <div class="grammar-item-list">
                  ${module.items.map(item=>`
                    <button type="button" class="grammar-item-row ${item.completed?'is-complete':''}" data-grammar-open="${esc(item.id)}">
                      <span class="grammar-item-kind">${esc(kindLabel(item.kind))}</span>
                      <span class="grammar-item-title">${esc(item.title)}</span>
                      <span class="grammar-item-state">${item.completed?'✓':'→'}</span>
                    </button>
                  `).join('')}
                </div>
              </section>`;
            }).join('')}
          </div>
        </details>`;
      }).join('')}
    </section>
  </section>`;
}

function listBlock(label,items=[]){
  if(!Array.isArray(items)||!items.length)return '';
  return `<section class="grammar-teach-block">
    <span class="context-label">${esc(label)}</span>
    <ul>${items.map(item=>`<li>${esc(item)}</li>`).join('')}</ul>
  </section>`;
}

function examplesBlock(items=[]){
  const c=copy();
  if(!Array.isArray(items)||!items.length)return '';
  return `<section class="grammar-teach-block">
    <span class="context-label">${esc(c.examples)}</span>
    <div class="grammar-example-stack">
      ${items.map(item=>`<article class="grammar-example">
        <strong>${esc(item.target||item.en||'')}</strong>
        ${item.pinyin?`<span>${esc(item.pinyin)}</span>`:''}
        ${item.vi?`<small>${esc(item.vi)}</small>`:''}
        ${item.note_vi?`<p>${esc(item.note_vi)}</p>`:''}
      </article>`).join('')}
    </div>
  </section>`;
}

function practiceBlock(items=[]){
  const c=copy();
  if(!Array.isArray(items)||!items.length)return '';
  return `<section class="grammar-guided-practice">
    <div class="grammar-section-head compact">
      <div><span class="context-label">${esc(c.guided)}</span><h3>${esc(c.guided)}</h3></div>
      <span>${items.length} ${esc(c.activities)}</span>
    </div>
    <div class="grammar-practice-list">
      ${items.map((item,index)=>`
        <article class="grammar-practice-card">
          <span class="grammar-practice-index">${String(index+1).padStart(2,'0')} · ${esc(item.kind||'practice')}</span>
          <p>${esc(item.prompt||'')}</p>
          <label class="grammar-practice-attempt">
            <span>${esc(c.attempt)}</span>
            <textarea rows="3" maxlength="700" data-grammar-practice-input placeholder="${esc(c.attemptPlaceholder)}"></textarea>
          </label>
          ${(item.answer||item.why_vi)?`
            <button type="button" class="button button-secondary grammar-reveal" data-grammar-reveal>${esc(c.reveal)}</button>
            <div class="grammar-answer hidden" data-grammar-answer>
              ${item.answer?`<strong>${esc(item.answer)}</strong>`:''}
              ${item.why_vi?`<p>${esc(item.why_vi)}</p>`:''}
            </div>
          `:''}
        </article>
      `).join('')}
    </div>
  </section>`;
}


function legacyLessonBody(detail,c){
  return `<section class="grammar-teach-block">
      <span class="context-label">${esc(c.objective)}</span>
      <p class="grammar-explanation">${esc(detail.explanation_vi||detail.objective_vi||'')}</p>
    </section>

    ${listBlock(c.rules,detail.source==='locked-syllabus-fallback'?[]:detail.rules)}
    ${listBlock(c.contrasts,detail.contrasts)}
    ${listBlock(c.exceptions,detail.source==='locked-syllabus-fallback'?[]:detail.exceptions)}
    ${examplesBlock(detail.examples)}
    ${listBlock(c.mistakes,detail.mistakes||detail.common_traps)}
    ${practiceBlock(detail.guided_practice)}

    <section class="grammar-production">
      <span class="context-label">${esc(c.production)}</span>
      <h3>${esc(detail.production_task_vi||c.production)}</h3>
      <p>${esc(c.productionPrompt)}</p>
      <textarea rows="6" maxlength="1600" data-grammar-production placeholder="${esc(c.productionPlaceholder)}"></textarea>
      ${detail.writing_tip_vi?`<p class="grammar-writing-tip">${esc(detail.writing_tip_vi)}</p>`:''}
    </section>`;
}

function lessonMarkup(detail,payload){
  const c=copy();
  const ui=orenaGrammarCopy();
  const items=Array.isArray(payload.lessons)?payload.lessons:[];
  const curriculumProgress=progressOf(items);
  const index=items.findIndex(item=>item.id===detail.id);
  const prev=index>0?items[index-1]:null;
  const next=index>=0&&index<items.length-1?items[index+1]:null;
  const richLearning=hasGrammarLearningModel(detail.learning_model);
  const languageContext=grammarContext(detail);
  const objective=richLearning
    ?localizedText(detail.learning_model?.meaning?.summary,languageContext.explanationLanguage)
    :legacyObjective(detail);
  const lessonContext=richLearning
    ?[
        localizedText(detail.learning_model?.hook?.prompt,languageContext.explanationLanguage),
        localizedText(detail.learning_model?.meaning?.mental_model,languageContext.explanationLanguage),
      ].filter((value,index,values)=>value&&value!==objective&&values.indexOf(value)===index).slice(0,2)
    :[];

  return `<article class="grammar-lesson visual-raised-surface" data-grammar-lesson="${esc(detail.id)}">
    <header class="grammar-lesson-head">
      <div>
        <span class="editorial-kicker">${esc(detail.level)} · ${esc(kindLabel(detail.kind))}</span>
        <h2>${esc(detail.title)}</h2>
        <p>${esc(objective)}</p>
        ${lessonContext.map(value=>`<p class="grammar-lesson-context">${esc(value)}</p>`).join('')}
      </div>
      <span class="grammar-completion-chip ${detail.completed?'is-complete':''}">
        ${detail.completed?'✓ '+esc(c.complete):esc(detail.category||detail.module||'Grammar')}
      </span>
    </header>

    <div class="grammar-lesson-layout">
      <main class="grammar-teach-column">
        ${richLearning
          ?renderGrammarLearningModel(detail.learning_model,languageContext)
          :legacyLessonBody(detail,c)}
      </main>

      <aside class="grammar-lesson-actions">
        <section class="grammar-lesson-rail-card grammar-lesson-progress-card">
          <div><span>${esc(c.progress)}</span><strong>${curriculumProgress.percent}%</strong></div>
          <div class="grammar-lesson-progress-track" role="progressbar" aria-label="${esc(c.progress)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${curriculumProgress.percent}">
            <span style="width:${curriculumProgress.percent}%"></span>
          </div>
        </section>

        ${richLearning?`<nav class="grammar-lesson-rail-card grammar-lesson-outline" data-grammar-lesson-outline aria-label="${esc(ui.inLesson)}"></nav>`:''}

        <section class="grammar-lesson-rail-card grammar-lesson-evidence-card">
          ${richLearning?`
            <span class="context-label">${esc(c.learningActions)}</span>
            <strong>${esc(c.learningEvidence)}</strong>
            <p>${esc(c.learningEvidenceNote)}</p>
          `:`
            <span class="context-label">${esc(c.source)}</span>
            <strong>${esc(sourceLabel(detail.source))}</strong>
            <p>${esc(c.noMastery)}</p>
            ${detail.source==='locked-syllabus-fallback'?`<p class="grammar-fallback-note">${esc(c.lessonUnavailable)}</p>`:''}
          `}
          ${detail.completed
            ?`<button type="button" class="button button-secondary" data-grammar-uncomplete>${esc(c.undo)}</button>`
            :`<button type="button" class="button button-primary" data-grammar-complete>${esc(c.mark)}</button>`}
          <button type="button" class="button button-tertiary" data-grammar-writing>${esc(c.writeTransfer)}</button>
        </section>
      </aside>
    </div>

    <footer class="grammar-lesson-nav">
      <button type="button" class="button button-secondary" data-grammar-neighbor="${esc(prev?.id||'')}" ${prev?'':'disabled'}>${esc(c.prev)}</button>
      <button type="button" class="button button-secondary" data-grammar-neighbor="${esc(next?.id||'')}" ${next?'':'disabled'}>${esc(c.nextLesson)}</button>
    </footer>
  </article>`;
}

function lessonBackMarkup(){
  return `<button type="button" class="button button-secondary grammar-back-button" data-grammar-back>${oIcon('arrowLeft')}<span>${esc(orenaGrammarCopy().back)}</span></button>`;
}

function bindOrenaLessonChrome(slot){
  const outline=slot.querySelector('[data-grammar-lesson-outline]');
  if(outline){
    const sectionLabel=target=>target.querySelector(':scope > .grammar-learning-block-head h3')?.textContent?.trim()
      ||target.querySelector(':scope > span')?.textContent?.trim()
      ||orenaGrammarCopy().inLesson;
    const stageTargets=[
      '.grammar-learning-primary-pattern .grammar-learning-block',
      '.grammar-learning-use-when',
      '.grammar-learning-scene',
      '.grammar-learning-contrast',
      '.grammar-learning-common_mistake',
      '.grammar-learning-micro_practice',
    ].map(selector=>slot.querySelector(selector)).filter(Boolean).map(target=>({target,label:sectionLabel(target)}));
    outline.innerHTML=`<strong>${esc(orenaGrammarCopy().inLesson)}</strong><ol>${stageTargets.map((item,index)=>`<li><button type="button" class="${index===0?'is-active':''}" data-grammar-outline-index="${index}"><span aria-hidden="true"></span>${esc(item.label)}</button></li>`).join('')}</ol>`;
    outline.querySelectorAll('[data-grammar-outline-index]').forEach(button=>{
      button.addEventListener('click',()=>{
        const item=stageTargets[Number(button.dataset.grammarOutlineIndex)];
        if(!item)return;
        outline.querySelectorAll('button').forEach(candidate=>candidate.classList.toggle('is-active',candidate===button));
        item.target.scrollIntoView({behavior:'smooth',block:'start'});
      });
    });
  }

  const collapsibleSelector=[
    '.grammar-learning-use-when',
    '.grammar-learning-scene',
    '.grammar-learning-contrast',
    '.grammar-learning-common_mistake',
    '.grammar-learning-exception',
  ].join(',');
  slot.querySelectorAll(collapsibleSelector).forEach((section,index)=>{
    const label=section.querySelector(':scope > .grammar-learning-block-head h3')?.textContent?.trim()
      ||section.querySelector(':scope > span')?.textContent?.trim()
      ||orenaGrammarCopy().inLesson;
    const button=document.createElement('button');
    button.type='button';
    button.className='grammar-mobile-section-toggle';
    button.setAttribute('aria-expanded','false');
    button.innerHTML=`<span>${esc(label)}</span>${oIcon('chevronDown')}`;
    section.classList.add('is-mobile-collapsible','is-collapsed');
    section.dataset.grammarMobileSection=String(index);
    section.prepend(button);
    button.addEventListener('click',()=>{
      const expanded=section.classList.toggle('is-collapsed')===false;
      button.setAttribute('aria-expanded',String(expanded));
    });
  });
}

export async function renderGrammar(root){
  const c=copy();
  root.innerHTML=`<section class="page grammar-page">${loadingBlock(6)}</section>`;

  let payload;
  try{
    payload=await api.grammarLibrary();
  }catch(error){
    root.innerHTML=`<section class="page grammar-page">${errorBlock(error.message||String(error))}</section>`;
    return;
  }

  root.innerHTML=overviewMarkup(payload);
  const slot=root.querySelector('#grammarLessonSlot');
  const page=root.querySelector('.grammar-page');
  let activeLessonId='';

  const closeLesson=()=>{
    const lessonId=activeLessonId;
    activeLessonId='';
    slot.innerHTML='';
    page?.classList.remove('has-open-lesson');
    page?.scrollIntoView({behavior:'smooth',block:'start'});
    requestAnimationFrame(()=>root.querySelector(`[data-grammar-open="${CSS.escape(lessonId)}"]`)?.focus());
  };

  const bindBack=()=>slot.querySelector('[data-grammar-back]')?.addEventListener('click',closeLesson);

  const bindOverview=()=>{
    root.querySelectorAll('[data-grammar-open]').forEach(button=>{
      button.addEventListener('click',()=>openLesson(button.dataset.grammarOpen));
    });
    root.querySelectorAll('[data-grammar-level]').forEach(button=>{
      button.addEventListener('click',()=>{
        const group=root.querySelector(`[data-grammar-level-group="${CSS.escape(button.dataset.grammarLevel)}"]`);
        if(!group)return;
        group.open=true;
        group.scrollIntoView({behavior:'smooth',block:'start'});
      });
    });
    root.querySelectorAll('[data-grammar-writing]').forEach(button=>{
      button.addEventListener('click',()=>go('write'));
    });
  };

  const openLesson=async lessonId=>{
    if(!lessonId)return;
    activeLessonId=lessonId;
    page?.classList.add('has-open-lesson');
    slot.innerHTML=`${lessonBackMarkup()}<section class="grammar-lesson visual-raised-surface">${loadingBlock(5)}<p>${esc(c.loading)}</p></section>`;
    bindBack();
    slot.scrollIntoView({behavior:'smooth',block:'start'});

    let detail;
    try{
      detail=await api.grammarLesson(lessonId);
    }catch(error){
      slot.innerHTML=`${lessonBackMarkup()}${errorBlock(error.message||String(error))}`;
      bindBack();
      return;
    }

    const languageContext=grammarContext(detail);

    slot.innerHTML=`${lessonBackMarkup()}${lessonMarkup(detail,payload)}`;
    bindBack();
    if(hasGrammarLearningModel(detail.learning_model)){
      bindGrammarLearningInteractions(slot,languageContext);
    }
    bindOrenaLessonChrome(slot);

    slot.querySelectorAll('[data-grammar-reveal]').forEach(button=>{
      button.addEventListener('click',()=>{
        const card=button.closest('.grammar-practice-card');
        const input=card?.querySelector('[data-grammar-practice-input]');
        const attempt=String(input?.value||'').trim();
        if(!attempt){
          toast(c.attemptFirst);
          input?.focus();
          return;
        }
        const answer=card?.querySelector('[data-grammar-answer]');
        if(!answer)return;
        const nowHidden=answer.classList.toggle('hidden');
        button.textContent=nowHidden?c.reveal:c.hide;
      });
    });

    slot.querySelectorAll('[data-grammar-neighbor]').forEach(button=>{
      button.addEventListener('click',()=>openLesson(button.dataset.grammarNeighbor));
    });
    slot.querySelectorAll('[data-grammar-writing]').forEach(button=>{
      button.addEventListener('click',()=>go('write'));
    });

    slot.querySelector('[data-grammar-complete]')?.addEventListener('click',async event=>{
      const learningCheck=grammarLearningCompletion(slot,detail.learning_model,languageContext);
      if(learningCheck){
        if(!learningCheck.ready){
          toast(learningCheck.message);
          learningCheck.focus?.focus();
          return;
        }
      }else{
        const production=String(slot.querySelector('[data-grammar-production]')?.value||'').trim();
        const productionEntries=production.split(/\n+/).map(value=>value.trim()).filter(Boolean);
        if(productionEntries.length<2){
          toast(c.productionNeeded);
          slot.querySelector('[data-grammar-production]')?.focus();
          return;
        }
      }
      try{
        await runBusy(event.currentTarget,()=>api.completeGrammar(lessonId),{label:c.loading});
        toast(c.saved);
        await renderGrammar(root);
      }catch(error){
        toast(error.message||String(error));
      }
    });

    slot.querySelector('[data-grammar-uncomplete]')?.addEventListener('click',async event=>{
      try{
        await runBusy(event.currentTarget,()=>api.uncompleteGrammar(lessonId),{label:c.loading});
        toast(c.unsaved);
        await renderGrammar(root);
      }catch(error){
        toast(error.message||String(error));
      }
    });
  };

  bindOverview();
}
