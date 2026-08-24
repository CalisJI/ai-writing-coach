import {api} from '../api.js';
import {state} from '../store.js';
import {configFor} from '../language.js';
import {esc,errorBlock,loadingBlock,toast,runBusy} from '../components/primitives.js';
import {t,uiLocale} from '../domain/i18n.js';
import {oIcon} from '../orena/icons.js';

/* ORENA-READING-*: one passage, read full width, with a rail that answers
 * questions about what is under the cursor.
 *
 * The reference dresses its passage as a magazine article - a photograph, a
 * publisher, a date. This product generates or selects its passages, so the
 * header carries what is actually known about one: where it came from, the
 * level it was written for, its length, and how long that takes to read. A
 * masthead borrowed from a magazine would be the one dishonest thing on an
 * otherwise measured screen.
 */

const TOPIC_KEYS=['random','daily_life','work','science','culture','community'];
const WORDS_PER_MINUTE=200;
const FONT_STEPS=[16,18,20,23];
const FONT_KEY='becoming.reading.font-step.v1';

const COPY={
  en:{
    words:'words',readTime:'{n} min read',readTimeTip:'An estimate at about 200 words a minute.',
    generated:'Generated for you',builtin:'Built-in passage',
    fontSmaller:'Smaller text',fontLarger:'Larger text',focusMode:'Focus mode',exitFocus:'Leave focus mode',
    understanding:'Understanding',selectedText:'Selected text',meaning:'Meaning',example:'Example',
    lookUp:'Look up',addToVocabulary:'Add to vocabulary',added:'Saved to your library',
    selectPrompt:'Select any words in the passage to look them up.',
    lookingUp:'Looking it up…',lookupFailed:'That lookup did not come back. Try again.',
    keyVocabulary:'Key vocabulary',fromLibrary:'These came from your library, and the passage was written to reuse them.',
    noVocabulary:'This passage did not reuse any saved words.',
    pronounce:'Hear it',viewAll:'Open your library',
    backToLibrary:'Back to passages',nextPassage:'Next passage',position:'{n} of {total}',
    share:'Copy passage',copied:'Passage copied.',
    comprehension:'Comprehension check',checkTitle:'What the passage says',
    check:'Check answers',another:'Read another',result:'Result',
    supported:'Supported by the passage',checkEvidence:'Check the passage again',
    find:'Find it in the passage',answerFirst:'Answer question {number} first.',
    resultNote:'This checks whether the passage supports each answer. It is not a reading level.',
    newTitle:'Choose what to read',level:'Level',topic:'Topic',
    recycle:'Reuse my saved words',recycleDesc:'The passage is written to include words you have saved.',
    create:'Create a passage',createDisclaimer:'Passages are generated for practice, not published journalism.',
    recent:'Recent passages',unread:'Not checked yet',
    lineSpacing:'Line spacing',collapse:'Collapse',expand:'Expand',
    saveAll:'Save all key words',savedAll:'{n} words saved to your library',
    viewAllWords:'View all words',

  },
  vi:{
    words:'từ',readTime:'đọc {n} phút',readTimeTip:'Ước tính theo khoảng 200 từ mỗi phút.',
    generated:'Tạo riêng cho bạn',builtin:'Bài có sẵn',
    fontSmaller:'Chữ nhỏ hơn',fontLarger:'Chữ lớn hơn',focusMode:'Chế độ tập trung',exitFocus:'Thoát chế độ tập trung',
    understanding:'Tra nghĩa',selectedText:'Phần đã chọn',meaning:'Nghĩa',example:'Ví dụ',
    lookUp:'Tra',addToVocabulary:'Thêm vào từ vựng',added:'Đã lưu vào thư viện',
    selectPrompt:'Bôi đen bất kỳ chỗ nào trong bài để tra nghĩa.',
    lookingUp:'Đang tra…',lookupFailed:'Chưa tra được. Hãy thử lại.',
    keyVocabulary:'Từ trọng tâm',fromLibrary:'Đây là các từ từ thư viện của bạn, bài đọc được viết để dùng lại chúng.',
    noVocabulary:'Bài này không dùng lại từ nào bạn đã lưu.',
    pronounce:'Nghe phát âm',viewAll:'Mở thư viện',
    backToLibrary:'Về danh sách bài',nextPassage:'Bài tiếp theo',position:'Bài {n} trên {total}',
    share:'Sao chép bài',copied:'Đã sao chép bài đọc.',
    comprehension:'Kiểm tra hiểu bài',checkTitle:'Bài đọc nói gì',
    check:'Kiểm tra',another:'Đọc bài khác',result:'Kết quả',
    supported:'Có căn cứ trong bài',checkEvidence:'Xem lại bài đọc',
    find:'Tìm trong bài',answerFirst:'Hãy trả lời câu {number} trước.',
    resultNote:'Phần này chỉ kiểm tra bài đọc có nói vậy hay không. Đây không phải trình độ đọc.',
    newTitle:'Chọn bài để đọc',level:'Trình độ',topic:'Chủ đề',
    recycle:'Dùng lại từ tôi đã lưu',recycleDesc:'Bài đọc sẽ được viết sao cho có các từ bạn đã lưu.',
    create:'Tạo bài đọc',createDisclaimer:'Bài đọc được tạo để luyện tập, không phải báo chí xuất bản.',
    recent:'Bài đọc gần đây',unread:'Chưa kiểm tra',
    lineSpacing:'Giãn dòng',collapse:'Thu gọn',expand:'Mở ra',
    saveAll:'Lưu tất cả từ trọng tâm',savedAll:'Đã lưu {n} từ vào thư viện',
    viewAllWords:'Xem tất cả từ',

  },
  zh:{
    words:'词',readTime:'约 {n} 分钟',readTimeTip:'按每分钟约 200 词估算。',
    generated:'为你生成',builtin:'内置文章',
    fontSmaller:'缩小字号',fontLarger:'放大字号',focusMode:'专注模式',exitFocus:'退出专注模式',
    understanding:'理解',selectedText:'选中的内容',meaning:'释义',example:'例句',
    lookUp:'查询',addToVocabulary:'加入词汇',added:'已保存到词库',
    selectPrompt:'在文章中选中任意内容即可查询。',
    lookingUp:'查询中…',lookupFailed:'这次查询没有返回，请再试一次。',
    keyVocabulary:'重点词汇',fromLibrary:'这些词来自你的词库，文章特意复用了它们。',
    noVocabulary:'这篇文章没有复用你保存过的词。',
    pronounce:'朗读',viewAll:'打开词库',
    backToLibrary:'返回文章列表',nextPassage:'下一篇',position:'第 {n} 篇，共 {total} 篇',
    share:'复制文章',copied:'已复制文章。',
    comprehension:'理解检查',checkTitle:'文章说了什么',
    check:'检查答案',another:'再读一篇',result:'结果',
    supported:'文中有依据',checkEvidence:'再看一遍原文',
    find:'在文中定位',answerFirst:'请先回答第 {number} 题。',
    resultNote:'这里只检查文章是否支持每个答案，不是阅读水平评分。',
    newTitle:'选择要读的内容',level:'级别',topic:'主题',
    recycle:'复用我保存的词',recycleDesc:'文章会尽量用上你保存过的词。',
    create:'生成文章',createDisclaimer:'文章为练习而生成，不是已发表的新闻报道。',
    recent:'最近的文章',unread:'尚未检查',
    lineSpacing:'行距',collapse:'收起',expand:'展开',
    saveAll:'保存全部重点词',savedAll:'已将 {n} 个词保存到词库',
    viewAllWords:'查看全部词汇',

  },
};
const copy=()=>COPY[uiLocale()]||COPY.en;
const fill=(template,values)=>Object.entries(values)
  .reduce((text,[key,value])=>text.replace(`{${key}}`,String(value)),String(template||''));

function labelTopic(value){
  const key=TOPIC_KEYS.includes(value)?value:'random';
  return t(`read.topic.${key}`);
}

/* Chinese has no spaces, so words are characters there. Both counts are of the
   passage in front of the learner, not an estimate of anything else. */
function wordCount(passage){
  const text=String(passage||'').trim();
  if(!text)return 0;
  return state.language==='zh'
    ? [...text.replace(/\s+/g,'')].length
    : text.split(/\s+/).filter(Boolean).length;
}

/* The reference puts a photograph beside the title. These passages are
   generated, so a photograph would be a picture of something that does not
   exist. The tile is a deterministic gradient built from the title and the
   topic's own icon: decoration that claims nothing, in the place the reference
   reserves for it. */
const TOPIC_ICONS={
  random:'flag',daily_life:'home',work:'document',
  science:'grammar',culture:'library',community:'journey',
};
function coverTile(session){
  const seed=[...String(session.title||'')].reduce((total,ch)=>(total*31+ch.charCodeAt(0))%360,7);
  const icon=TOPIC_ICONS[session.topic]||'read';
  return `<span class="o-article-cover" style="--o-cover-hue:${seed}" aria-hidden="true">${oIcon(icon)}</span>`;
}

function infoTip(text){
  return `<span class="o-info-dot" role="img" title="${esc(text)}" aria-label="${esc(text)}">${oIcon('info')}</span>`;
}

function readFontStep(){
  const stored=Number(globalThis.localStorage?.getItem(FONT_KEY));
  return Number.isFinite(stored)&&stored>=0&&stored<FONT_STEPS.length?stored:1;
}

function pronounce(word,language){
  const synth=globalThis.speechSynthesis;
  if(!synth||!word)return false;
  try{
    synth.cancel();
    const utterance=new globalThis.SpeechSynthesisUtterance(word);
    utterance.lang=language==='zh'?'zh-CN':'en-US';
    synth.speak(utterance);
    return true;
  }catch{
    return false;
  }
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

  const paragraphs=chunk=>esc(chunk).replace(/\n{2,}/g,'</p><p>').replace(/\n/g,'<br>');

  if(!ranges.length)return paragraphs(source);

  let cursor=0;
  let html='';
  for(const range of ranges){
    html+=paragraphs(source.slice(cursor,range.start));
    /* Each saved word keeps one colour, in the passage and in the rail, so the
       two can be read against each other at a glance. */
    const cls=range.kind==='evidence'
      ?'o-mark o-mark--evidence'
      :`o-mark o-mark--word o-mark--w${range.index%4}`;
    const attr=range.kind==='evidence'
      ?` data-reading-evidence="${range.index}"`
      :` data-reading-word="${esc(source.slice(range.start,range.end))}"`;
    html+=`<mark class="${cls}"${attr}>${esc(source.slice(range.start,range.end))}</mark>`;
    cursor=range.end;
  }
  html+=paragraphs(source.slice(cursor));
  return html;
}

function articleHeader(session,position){
  const c=copy();
  const words=wordCount(session.passage);
  const minutes=Math.max(1,Math.round(words/WORDS_PER_MINUTE));
  return `<section class="o-card o-article-head">
    ${coverTile(session)}
    <div class="o-article-text">
    <div class="o-article-crumbs">
      <span>${esc(t('skill.read.name'))}</span>${oIcon('chevronRight')}<span>${esc(labelTopic(session.topic))}</span>
    </div>
    <h1 class="o-article-title">${esc(session.title)}</h1>
    <p class="o-article-source">${esc(session.generation_mode==='generated'?c.generated:c.builtin)}${
      position?` &middot; ${esc(fill(c.position,position))}`:''}</p>
    <div class="o-article-meta">
      <span class="o-band-chip">${esc(session.target_level)}</span>
      <span class="o-meta-item">${oIcon('document')}<span>${words} ${esc(c.words)}</span></span>
      <span class="o-meta-item">${oIcon('clock')}<span>${esc(fill(c.readTime,{n:minutes}))}</span>${infoTip(c.readTimeTip)}</span>
    </div>
    </div>
  </section>`;
}

function passageBlock(session,result){
  const c=copy();
  const evidence=result?.results?.map(item=>item.evidence_fragment).filter(Boolean)||[];
  const content=highlightedPassage(session.passage,{
    recycled:session.recycled_words||[],
    evidence,
  });
  return `<section class="o-card o-reader" data-font-step="${readFontStep()}">
    <div class="o-reader-bar">
      <!-- The reference's undo and redo belong to an editor. A reader gets the
           three controls that change how it reads. -->
      <div class="o-reader-tools">
        <button type="button" class="o-icon-button" data-font="-1" aria-label="${esc(c.fontSmaller)}" title="${esc(c.fontSmaller)}"><span class="o-font-a">A</span></button>
        <button type="button" class="o-icon-button" data-font="1" aria-label="${esc(c.fontLarger)}" title="${esc(c.fontLarger)}"><span class="o-font-a o-font-a--big">A</span></button>
        <span class="o-reader-divider"></span>
        <button type="button" class="o-icon-button" data-line-spacing aria-label="${esc(c.lineSpacing)}" title="${esc(c.lineSpacing)}">${oIcon('bulletList')}</button>
      </div>
      <button type="button" class="o-icon-button" data-reading-focus aria-label="${esc(c.focusMode)}" title="${esc(c.focusMode)}">${oIcon('chevronUp')}</button>
    </div>
    <div class="o-reader-text ${state.language==='zh'?'cjk':''}" data-reading-passage>
      <p>${content}</p>
    </div>
    <div class="o-reader-foot">
      <button type="button" class="o-btn o-btn--ghost o-btn--compact" data-reading-copy>${oIcon('document')}<span>${esc(c.share)}</span></button>
      ${(session.recycled_words||[]).length?`<button type="button" class="o-btn o-btn--ghost o-btn--compact" data-reading-save-all>${oIcon('library')}<span>${esc(c.saveAll)}</span></button>`:''}
    </div>
  </section>`;
}

function questionsBlock(session,result){
  const c=copy();
  const resultById=new Map((result?.results||[]).map(item=>[Number(item.id),item]));

  return `<section class="o-card o-comprehension">
    <div class="o-comprehension-head">
      <span class="o-label">${esc(c.comprehension)}</span>
      <h2>${esc(c.checkTitle)}</h2>
    </div>
    <form id="readingAnswerForm">
      ${(session.questions||[]).map((question,index)=>{
        const checked=resultById.get(Number(question.id));
        const tone=checked?(checked.correct?'is-correct':'is-incorrect'):'';
        return `<fieldset class="o-question ${tone}">
          <legend><b>${index+1}</b><span>${esc(question.question)}</span></legend>
          <div class="o-options">
            ${(question.options||[]).map((option,optIndex)=>{
              const selected=checked?.selected_index===optIndex;
              const correct=checked?.correct_index===optIndex;
              const classes=[
                selected?'is-selected':'',
                result&&correct?'is-right':'',
                result&&selected&&!checked.correct?'is-wrong':'',
              ].filter(Boolean).join(' ');
              return `<label class="o-option ${classes}">
                <input type="radio" name="q${index}" value="${optIndex}" ${selected?'checked':''} ${result?'disabled':''}>
                <span>${esc(option)}</span>
              </label>`;
            }).join('')}
          </div>
          ${checked?`<div class="o-question-evidence">
            <span class="o-chip o-chip--${checked.correct?'strong':'retry'}">${esc(checked.correct?c.supported:c.checkEvidence)}</span>
            <!-- The stored explanation is written in Vietnamese, so it only
                 goes to a Vietnamese interface; every other locale gets the
                 shared line rather than a half-translated panel. -->
            <p>${esc(uiLocale()==='vi'?(checked.explanation_vi||t('read.explanation_generic')):t('read.explanation_generic'))}</p>
            <blockquote>&ldquo;${esc(checked.evidence_fragment||'')}&rdquo;</blockquote>
            <button class="o-text-link" type="button" data-find-evidence="${index}">${esc(c.find)}</button>
          </div>`:''}
        </fieldset>`;
      }).join('')}
      ${result
        ?`<div class="o-reading-result">
          <div>
            <span class="o-label">${esc(c.result)}</span>
            <strong>${esc(result.correct_count)} / ${esc(result.total)}</strong>
          </div>
          <p>${esc(c.resultNote)}</p>
        </div>`
        :`<button id="submitReading" class="o-btn o-btn--primary" type="submit">${oIcon('check')}<span>${esc(c.check)}</span></button>`}
    </form>
  </section>`;
}

/* The rail answers two questions: what does this bit mean, and which of my own
   words did this passage bring back. Both are real lookups - the first through
   the dictionary the product already runs, the second from the words the
   generator was told to reuse. */
/* The saved words already carry their own meaning in the library, so the rail
   shows it rather than the bare term - the reference puts a gloss under every
   entry, and here it is the learner's own. */
function savedMeaning(word){
  const items=state.libraryVocabulary?.items||[];
  const hit=items.find(item=>String(item.word||'').toLocaleLowerCase()===String(word).toLocaleLowerCase());
  if(!hit)return '';
  return (uiLocale()==='vi'?hit.translation_vi:'')||hit.definition||'';
}

function readerRail(session){
  const c=copy();
  const words=session.recycled_words||[];
  return `<aside class="o-reader-rail">
    <section class="o-card o-panel o-understanding">
      <button type="button" class="o-panel-toggle" data-panel-toggle aria-expanded="true">
        <span class="o-label">${esc(c.understanding)}</span>
        ${oIcon('chevronUp')}
      </button>
      <div data-understanding-slot data-panel-body>
        <p class="o-panel-copy">${esc(c.selectPrompt)}</p>
      </div>
    </section>

    <section class="o-card o-panel o-keywords">
      <button type="button" class="o-panel-toggle" data-panel-toggle aria-expanded="true">
        <span class="o-label">${esc(c.keyVocabulary)}<span class="o-count">${words.length}</span></span>
        ${oIcon('chevronUp')}
      </button>
      <div data-panel-body>
        ${words.length
          ? `<ul class="o-keyword-list">
              ${words.map((word,index)=>{
                const meaning=savedMeaning(word);
                return `<li>
                  <div>
                    <button type="button" class="o-keyword o-keyword--w${index%4}" data-reading-word-jump="${esc(word)}">${esc(word)}</button>
                    ${meaning?`<p>${esc(meaning)}</p>`:''}
                  </div>
                  <button type="button" class="o-icon-button" data-reading-say="${esc(word)}" aria-label="${esc(c.pronounce)}" title="${esc(c.pronounce)}">${oIcon('volume')}</button>
                </li>`;
              }).join('')}
            </ul>
            <p class="o-panel-copy">${esc(c.fromLibrary)}</p>`
          : `<p class="o-panel-copy">${esc(c.noVocabulary)}</p>`}
      </div>
      <button type="button" class="o-row-button" data-reading-library>
        <span>${esc(c.viewAllWords)}</span>${oIcon('chevronRight')}
      </button>
    </section>
  </aside>`;
}

function understandingMarkup(view){
  const c=copy();
  if(!view.selection){
    return `<p class="o-panel-copy">${esc(c.selectPrompt)}</p>`;
  }
  const payload=view.lookup;
  const definitions=Array.isArray(payload?.definitions)?payload.definitions:[];
  const first=definitions.find(entry=>entry&&typeof entry==='object')||{};
  return `<div class="o-understanding-body">
    <span class="o-panel-label">${esc(c.selectedText)}</span>
    <blockquote class="o-selected-text">${esc(view.selection)}</blockquote>

    ${view.status==='loading'?`<p class="o-panel-copy">${esc(c.lookingUp)}</p>`:''}
    ${view.status==='error'?`<p class="o-panel-copy o-panel-copy--warn">${esc(c.lookupFailed)}</p>`:''}

    ${payload?`
      <span class="o-panel-label">${esc(c.meaning)}</span>
      <p class="o-panel-copy">${esc(first.definition||payload.definition||payload.translation_vi||'')}</p>
      ${first.example?`
        <span class="o-panel-label">${esc(c.example)}</span>
        <p class="o-panel-copy o-panel-copy--example">${esc(first.example)}</p>`:''}
      <button type="button" class="o-btn o-btn--outline o-btn--compact" data-reading-save>${oIcon('check')}<span>${esc(c.addToVocabulary)}</span></button>
    `:view.status==='loading'?'':`
      <button type="button" class="o-btn o-btn--outline o-btn--compact" data-reading-lookup>${oIcon('library')}<span>${esc(c.lookUp)}</span></button>
    `}
  </div>`;
}

function recentSessions(items=[]){
  const c=copy();
  if(!items.length)return '';
  return `<section class="o-card o-passage-history">
    <span class="o-label">${esc(c.recent)}</span>
    <ul class="o-passage-list">
      ${items.slice(0,6).map(item=>`<li>
        <button type="button" class="o-passage-row" data-reading-open="${item.id}">
          <div>
            <strong>${esc(item.title)}</strong>
            <span>${esc(item.target_level)} &middot; ${esc(labelTopic(item.topic))}</span>
          </div>
          <span class="o-passage-score">${item.latest_attempt
            ?`${esc(item.latest_attempt.correct_count)}/${esc(item.latest_attempt.total)}`
            :esc(c.unread)}</span>
          ${oIcon('arrowRight')}
        </button>
      </li>`).join('')}
    </ul>
  </section>`;
}

export async function renderReading(root){
  const c=copy();
  const config=configFor(state.language);
  const rememberedLevel=state.readingSession?.target_level||state.draft.level||config.defaultLevel;

  root.innerHTML=`<section class="o-page">${loadingBlock(5)}</section>`;

  let history;
  try{
    history=await api.readingSessions(8);
  }catch(error){
    root.innerHTML=`<section class="o-page">${errorBlock(error.message||t('read.page_failed'))}</section>`;
    return;
  }
  state.readingSessions=history.items||[];

  /* The rail glosses each key word with the learner's own saved definition, so
     the library has to be in hand before the rail is drawn. Its absence costs
     the glosses and nothing else. */
  if(!state.libraryVocabulary){
    try{state.libraryVocabulary=await api.libraryVocabulary();}catch{}
  }

  const session=state.readingSession;
  const result=state.readingResult;
  const view={selection:'',lookup:null,status:'idle'};

  if(!session){
    root.innerHTML=`<section class="o-page reading-page">
      <section class="o-card o-reading-create">
        <span class="o-label">${esc(c.newTitle)}</span>
        <p class="o-panel-copy">${esc(c.createDisclaimer)}</p>
        <form id="readingCreateForm" class="o-reading-form">
          <label class="o-field">
            <span>${esc(c.level)}</span>
            <select id="readingLevel" class="o-control">
              ${config.levels.map(level=>`<option value="${esc(level)}" ${level===rememberedLevel?'selected':''}>${esc(level)}</option>`).join('')}
            </select>
          </label>
          <label class="o-field">
            <span>${esc(c.topic)}</span>
            <select id="readingTopic" class="o-control">
              ${TOPIC_KEYS.map(value=>`<option value="${value}">${esc(labelTopic(value))}</option>`).join('')}
            </select>
          </label>
          <label class="o-setting-row o-reading-recycle">
            <span><strong>${esc(c.recycle)}</strong><small>${esc(c.recycleDesc)}</small></span>
            <span class="o-switch"><input id="readingRecycle" type="checkbox" checked><span></span></span>
          </label>
          <button class="o-btn o-btn--primary" type="submit">${oIcon('read')}<span>${esc(c.create)}</span></button>
        </form>
      </section>
      ${recentSessions(state.readingSessions)}
    </section>`;
    bindCreate();
    bindHistory();
    return;
  }

  const index=state.readingSessions.findIndex(item=>String(item.id)===String(session.id));
  const position=state.readingSessions.length
    ?{n:index>=0?index+1:1,total:state.readingSessions.length}
    :null;

  root.innerHTML=`<section class="o-page reading-page">
    <div class="o-reading-grid">
      <div class="o-reading-main">
        ${articleHeader(session,position)}
        ${passageBlock(session,result)}
        ${questionsBlock(session,result)}
      </div>
      ${readerRail(session)}
    </div>

    <div class="o-reading-bottom">
      <button type="button" class="o-btn o-btn--outline" data-reading-back>${oIcon('arrowLeft')}<span>${esc(c.backToLibrary)}</span></button>
      ${position?`<div class="o-reading-progress">
        <span>${esc(fill(c.position,position))}</span>
        <div class="o-meter"><span style="width:${Math.round((position.n/position.total)*100)}%"></span></div>
      </div>`:''}
      <button type="button" class="o-btn o-btn--primary" data-reading-next>
        <span>${esc(result?c.another:c.nextPassage)}</span>${oIcon('arrowRight')}
      </button>
    </div>
  </section>`;

  bindReader();
  bindHistory();

  function paintUnderstanding(){
    const slot=root.querySelector('[data-understanding-slot]');
    if(!slot)return;
    slot.innerHTML=understandingMarkup(view);
    slot.querySelector('[data-reading-lookup]')?.addEventListener('click',lookUp);
    slot.querySelector('[data-reading-save]')?.addEventListener('click',saveSelection);
  }

  async function lookUp(){
    if(!view.selection)return;
    view.status='loading';
    view.lookup=null;
    paintUnderstanding();
    try{
      view.lookup=await api.dictionary(view.selection);
      view.status='ready';
    }catch{
      view.status='error';
    }
    paintUnderstanding();
  }

  async function saveSelection(){
    const payload=view.lookup;
    if(!payload)return;
    const definitions=Array.isArray(payload.definitions)?payload.definitions:[];
    const first=definitions.find(entry=>entry&&typeof entry==='object')||{};
    try{
      await api.saveLibraryVocabulary({
        word:payload.word||view.selection,
        phonetic:payload.phonetic||'',
        part_of_speech:payload.part_of_speech||first.part_of_speech||'',
        definition:first.definition||payload.definition||'',
        translation_vi:payload.translation_vi||'',
        source_fragment:first.example||'',
        source_kind:'dictionary',
        focus_note:payload.usage_note_vi||'',
      });
      toast(c.added);
    }catch(error){
      toast(error.message||t('library.save_failed'));
    }
  }

  function bindReader(){
    const passage=root.querySelector('[data-reading-passage]');
    const reader=root.querySelector('.o-reader');

    /* A selection inside the passage is the only trigger. Looking a phrase up
       costs a model call, so the panel shows the selection immediately and the
       lookup waits for the learner to ask. */
    passage?.addEventListener('mouseup',()=>{
      const text=String(globalThis.getSelection?.()?.toString()||'').trim();
      if(!text||text.length>120)return;
      view.selection=text;
      view.lookup=null;
      view.status='idle';
      paintUnderstanding();
    });

    root.querySelectorAll('[data-panel-toggle]').forEach(button=>button.addEventListener('click',()=>{
      const open=button.getAttribute('aria-expanded')!=='true';
      button.setAttribute('aria-expanded',open?'true':'false');
      button.parentElement.querySelector('[data-panel-body]')?.classList.toggle('hidden',!open);
    }));

    root.querySelector('[data-line-spacing]')?.addEventListener('click',()=>{
      const next=(Number(reader.dataset.leading||0)+1)%3;
      reader.dataset.leading=String(next);
    });

    root.querySelector('[data-reading-save-all]')?.addEventListener('click',async event=>{
      const button=event.currentTarget;
      const words=session.recycled_words||[];
      try{
        await runBusy(button,async()=>{
          for(const word of words){
            await api.saveLibraryVocabulary({
              word,
              definition:savedMeaning(word),
              source_fragment:session.title||'',
              source_kind:'dictionary',
            });
          }
          toast(fill(c.savedAll,{n:words.length}));
        },{label:t('busy.saving')});
      }catch(error){
        toast(error.message||t('library.save_failed'));
      }
    });

    root.querySelectorAll('[data-font]').forEach(button=>button.addEventListener('click',()=>{
      const step=Math.max(0,Math.min(FONT_STEPS.length-1,
        Number(reader.dataset.fontStep||1)+Number(button.dataset.font)));
      reader.dataset.fontStep=String(step);
      try{globalThis.localStorage?.setItem(FONT_KEY,String(step));}catch{}
    }));

    root.querySelector('[data-reading-focus]')?.addEventListener('click',event=>{
      const on=root.querySelector('.reading-page').classList.toggle('is-focus');
      const button=event.currentTarget;
      button.setAttribute('aria-label',on?c.exitFocus:c.focusMode);
      button.title=on?c.exitFocus:c.focusMode;
    });

    root.querySelector('[data-reading-copy]')?.addEventListener('click',async()=>{
      try{
        await globalThis.navigator?.clipboard?.writeText(`${session.title}\n\n${session.passage}`);
        toast(c.copied);
      }catch{
        toast(t('read.page_failed'));
      }
    });

    root.querySelectorAll('[data-reading-say]').forEach(button=>button.addEventListener('click',()=>{
      pronounce(button.dataset.readingSay,state.language);
    }));

    root.querySelectorAll('[data-reading-word-jump]').forEach(button=>button.addEventListener('click',()=>{
      const word=button.dataset.readingWordJump;
      const mark=root.querySelector(`[data-reading-word="${CSS.escape(word)}"]`);
      mark?.scrollIntoView({behavior:'smooth',block:'center'});
      mark?.classList.add('is-active');
      setTimeout(()=>mark?.classList.remove('is-active'),1400);
      view.selection=word;
      view.lookup=null;
      view.status='idle';
      paintUnderstanding();
    }));

    root.querySelector('[data-reading-library]')?.addEventListener('click',async()=>{
      const {go}=await import('../router.js');
      go('library');
    });

    root.querySelector('[data-reading-back]')?.addEventListener('click',()=>{
      state.readingSession=null;
      state.readingResult=null;
      renderReading(root);
    });

    root.querySelector('[data-reading-next]')?.addEventListener('click',()=>{
      state.readingSession=null;
      state.readingResult=null;
      renderReading(root);
    });

    root.querySelectorAll('[data-find-evidence]').forEach(button=>{
      button.addEventListener('click',()=>{
        const mark=root.querySelector(`[data-reading-evidence="${CSS.escape(button.dataset.findEvidence)}"]`);
        mark?.scrollIntoView({behavior:'smooth',block:'center'});
        if(mark){
          mark.classList.add('is-active');
          setTimeout(()=>mark.classList.remove('is-active'),1400);
        }
      });
    });

    root.querySelector('#readingAnswerForm')?.addEventListener('submit',async event=>{
      event.preventDefault();
      if(result)return;

      const answers=[];
      for(let i=0;i<(session.questions||[]).length;i++){
        const selected=root.querySelector(`input[name="q${i}"]:checked`);
        if(!selected){
          toast(fill(c.answerFirst,{number:i+1}));
          return;
        }
        answers.push(Number(selected.value));
      }

      const button=root.querySelector('#submitReading');
      try{
        await runBusy(button,async()=>{
          const checked=await api.submitReadingAnswers(session.id,answers);
          if(!checked.valid)throw new Error(checked.message||t('read.check_failed'));
          state.readingResult=checked;
          await renderReading(root);
        },{label:t('busy.checking')});
      }catch(error){
        toast(error.message||t('read.check_failed'));
      }
    });
  }

  function bindCreate(){
    const form=root.querySelector('#readingCreateForm');
    form?.addEventListener('submit',async event=>{
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
          await renderReading(root);
        },{label:t('busy.creating')});
      }catch(error){
        toast(error.message||t('read.create_failed'));
      }
    });
  }

  function bindHistory(){
    root.querySelectorAll('[data-reading-open]').forEach(button=>{
      button.addEventListener('click',async()=>{
        button.disabled=true;
        try{
          const payload=await api.readingSession(button.dataset.readingOpen);
          if(!payload.found)throw new Error(t('read.open_failed'));
          state.readingSession=payload.session;
          state.readingResult=null;
          await renderReading(root);
        }catch(error){
          button.disabled=false;
          toast(error.message||t('read.open_failed'));
        }
      });
    });
  }
}
