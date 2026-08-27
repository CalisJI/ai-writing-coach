import {api} from '../api.js';
import {state,saveDraft} from '../store.js';
import {go} from '../router.js';
import {esc,attr,errorBlock,loadingBlock,runBusy} from '../components/primitives.js';
import {t,uiLocale,categoryLabel,masteryLabel,statusLabel} from '../domain/i18n.js';
import {oIcon} from '../orena/icons.js';

/* ORENA-JOURNEY-*: the story the learning memory already tells - what is being
 * worked on, what moved, what keeps coming back, and what is next.
 *
 * Every card here is one record from `api.learningMemory()`. A pattern carries
 * `older` and `newer` counts, which is a real before/now pair, so the reference's
 * trend line is drawn from two measured points rather than a five-point curve
 * nobody recorded. Where a card has no record behind it, the card is absent
 * rather than filled with an encouraging sentence.
 */

const COPY={
  en:{
    title:'Your learning journey',lead:'A story of progress, focus, and what is next.',
    currentFocus:'Current focus',focusProgress:'Focus progress',
    recentImprovement:'Recent improvement',recurringIssue:'Recurring issue',
    completed:'Completed',timeline:'Journey timeline',
    before:'Before',now:'Now',occurrence:'Times seen',pieces:'pieces',
    nextTarget:'Next recommended target',whyThis:'Why this?',targetPreview:'Target preview',
    howWeHelp:'How this works',startTarget:'Start this target',viewAll:'See every pattern',
    helpEvidence:'Every claim links back to a sentence you wrote',
    helpPractice:'A practice brief built from this pattern',
    helpFeedback:'Feedback on the piece you write next',
    piecesLabel:'Pieces',revisionsLabel:'Revisions',
    habitsTitle:'You kept coming back',habitsBody:'{streak} days in a row.',
    habitsNoStreak:'What you have written so far.',
    started:'Started',firstWin:'First win',momentum:'Built momentum',upcoming:'Upcoming',
    firstWinDesc:'A revision scored higher than its first draft',
    momentumDesc:'{n} pieces written',
    notYet:'Not reached yet',
    focusProgressTip:'How far this pattern has fallen since it first appeared: the drop from its earlier count to its recent one. It stays at 0% until the count actually falls.',
    trendTip:'Two measured points - how often this appeared in your earlier pieces, and in your recent ones. Nothing between them is recorded, so nothing is drawn between them.',
    emptyTitle:'Your journey starts with one piece.',
    emptyBody:'Once you have written something, this page follows what improves, what keeps coming back, and what to work on next.',
    start:'Start writing',
    beforeNow:'Before and now',revisionGain:'{before} → {after} across {count} drafts ({gain})',evidenceChange:'Issue count change: {delta}',
    revisionSingle:'One draft, no revision yet.',openLatest:'Open the latest draft',
    whereYouAre:'Where you are',estimated:'estimated',reliable:'Reliable strengths',
    movement:'Score movement',movementNote:'Across your last five pieces.',
    reliableNote:'Patterns with repeated evidence at Stable or Mastered.',

    seenIn:'Seen in {total} places across {series} pieces',
    stageIn:'{stage} · {evidence} pieces of evidence',
    practiceHistory:'Recent practice outcomes',
    practiceHistoryBody:'These checks stay attached to the pieces where you practised the target.',
    openLesson:'Open Grammar lesson',practiceLesson:'Practice this grammar',
  },
  vi:{
    title:'Hành trình học của bạn',lead:'Câu chuyện về tiến bộ, trọng tâm và bước kế tiếp.',
    currentFocus:'Trọng tâm hiện tại',focusProgress:'Tiến độ trọng tâm',
    recentImprovement:'Tiến bộ gần đây',recurringIssue:'Lỗi lặp lại',
    completed:'Đã làm được',timeline:'Dòng thời gian',
    before:'Trước',now:'Hiện tại',occurrence:'Số lần gặp',pieces:'bài',
    nextTarget:'Mục tiêu đề xuất tiếp theo',whyThis:'Vì sao là mục này?',targetPreview:'Xem trước mục tiêu',
    howWeHelp:'Cách hoạt động',startTarget:'Bắt đầu mục tiêu này',viewAll:'Xem mọi mẫu lỗi',
    helpEvidence:'Mỗi nhận định đều dẫn về một câu bạn đã viết',
    helpPractice:'Một đề luyện dựng từ chính mẫu này',
    helpFeedback:'Nhận xét cho bài bạn viết tiếp theo',
    piecesLabel:'Bài viết',revisionsLabel:'Lượt sửa',
    habitsTitle:'Bạn vẫn quay lại đều',habitsBody:'{streak} ngày liên tiếp.',
    habitsNoStreak:'Những gì bạn đã viết đến giờ.',
    started:'Bắt đầu',firstWin:'Lần cải thiện đầu',momentum:'Tạo được đà',upcoming:'Sắp tới',
    firstWinDesc:'Một bản sửa đạt điểm cao hơn bản đầu',
    momentumDesc:'Đã viết {n} bài',
    notYet:'Chưa tới',
    focusProgressTip:'Mẫu này đã giảm được bao nhiêu so với lúc mới xuất hiện: mức giảm từ số lần cũ xuống số lần gần đây. Chưa giảm thì vẫn là 0%.',
    trendTip:'Hai điểm đo thật — số lần gặp ở các bài trước và ở các bài gần đây. Giữa hai điểm không có dữ liệu nào được ghi nên cũng không vẽ gì.',
    emptyTitle:'Hành trình bắt đầu từ một bài viết.',
    emptyBody:'Khi bạn đã viết, trang này theo dõi cái gì đang tiến bộ, cái gì lặp lại và nên làm gì tiếp.',
    start:'Bắt đầu viết',
    beforeNow:'Trước và nay',revisionGain:'{before} → {after} qua {count} bản ({gain})',evidenceChange:'Thay đổi số lượng lỗi: {delta}',
    revisionSingle:'Mới một bản, chưa sửa lại.',openLatest:'Mở bản mới nhất',
    whereYouAre:'Bạn đang ở đâu',estimated:'ước lượng',reliable:'Điểm mạnh ổn định',
    movement:'Biến động điểm',movementNote:'Tính trên năm bài gần nhất.',
    reliableNote:'Các mẫu có bằng chứng lặp ở mức ổn định hoặc thành thục.',

    seenIn:'Gặp {total} lần trong {series} bài',
    stageIn:'{stage} · {evidence} lần có bằng chứng',
    practiceHistory:'Các kết quả luyện tập gần đây',
    practiceHistoryBody:'Các lần kiểm tra này vẫn gắn với những bài bạn đã luyện đúng trọng tâm.',
    openLesson:'Mở bài học Ngữ pháp',practiceLesson:'Luyện ngữ pháp này',
  },
  zh:{
    title:'你的学习历程',lead:'关于进步、重点和下一步的记录。',
    currentFocus:'当前重点',focusProgress:'重点进度',
    recentImprovement:'最近的进步',recurringIssue:'反复出现的问题',
    completed:'已完成',timeline:'历程时间线',
    before:'之前',now:'现在',occurrence:'出现次数',pieces:'篇',
    nextTarget:'下一个推荐目标',whyThis:'为什么是这个？',targetPreview:'目标预览',
    howWeHelp:'具体怎么做',startTarget:'开始这个目标',viewAll:'查看全部模式',
    helpEvidence:'每一条结论都能回到你写过的句子',
    helpPractice:'依据这个模式生成的练习题',
    helpFeedback:'对你下一篇写作的反馈',
    piecesLabel:'篇数',revisionsLabel:'修改次数',
    habitsTitle:'你一直在坚持',habitsBody:'连续 {streak} 天。',
    habitsNoStreak:'目前为止你写过的内容。',
    started:'开始',firstWin:'第一次提升',momentum:'形成节奏',upcoming:'即将开始',
    firstWinDesc:'一次修改的分数高于初稿',
    momentumDesc:'已写 {n} 篇',
    notYet:'尚未到达',
    focusProgressTip:'这个模式比刚出现时下降了多少：从早期次数到近期次数的降幅。没有下降就一直是 0%。',
    trendTip:'两个实测点——早期作品中的出现次数，和近期作品中的出现次数。两点之间没有记录，所以也不画任何东西。',
    emptyTitle:'历程从第一篇开始。',
    emptyBody:'写过之后，这个页面会跟踪什么在进步、什么反复出现、下一步该练什么。',
    start:'开始写作',
    beforeNow:'之前与现在',revisionGain:'{before} → {after}，共 {count} 稿（{gain}）',evidenceChange:'问题数量变化：{delta}',
    revisionSingle:'只有一稿，还没有修改。',openLatest:'打开最新一稿',
    whereYouAre:'你目前的位置',estimated:'估算',reliable:'稳定的优势',
    movement:'分数变化',movementNote:'基于最近五篇。',
    reliableNote:'有重复证据且达到稳定或熟练的模式。',

    seenIn:'在 {series} 篇中共出现 {total} 次',
    stageIn:'{stage} · {evidence} 处证据',
    practiceHistory:'最近的练习结果',
    practiceHistoryBody:'这些检查会保留在你练习该重点的对应作品旁。',
    openLesson:'打开语法课程',practiceLesson:'练习这个语法',
  },
};
const copy=()=>COPY[uiLocale()]||COPY.en;

const fill=(template,values)=>Object.entries(values)
  .reduce((text,[key,value])=>text.replace(`{${key}}`,String(value)),String(template||''));

function shortDate(value){
  const parsed=Date.parse(String(value||'').replace(' ','T'));
  if(!Number.isFinite(parsed))return '';
  return new Date(parsed).toLocaleDateString(
    uiLocale()==='vi'?'vi-VN':uiLocale()==='zh'?'zh-CN':'en-GB',
    {month:'short',day:'numeric'});
}

function infoTip(text){
  return `<span class="o-info-dot" role="img" title="${esc(text)}" aria-label="${esc(text)}">${oIcon('info')}</span>`;
}

/* A pattern stores how often it appeared in the earlier pieces and in the
   recent ones. That is two points, so two points are drawn - a five-point curve
   would be inventing four measurements. */
function trendLine(older,newer,tone){
  const from=Number(older)||0;
  const to=Number(newer)||0;
  const top=Math.max(from,to,1);
  const y=value=>34-((value/top)*26);
  return `<svg class="o-trend o-trend--${tone}" viewBox="0 0 120 40" aria-hidden="true" preserveAspectRatio="none">
    <line x1="8" y1="${y(from).toFixed(1)}" x2="112" y2="${y(to).toFixed(1)}"/>
    <circle cx="8" cy="${y(from).toFixed(1)}" r="3.4"/>
    <circle cx="112" cy="${y(to).toFixed(1)}" r="3.4"/>
  </svg>`;
}

function trendBlock(label,older,newer,tone,tip){
  const c=copy();
  return `<div class="o-journey-trend">
    <span class="o-trend-label">${esc(label)}${infoTip(tip)}</span>
    <div class="o-trend-plot">
      <b>${Number(older)||0}</b>
      ${trendLine(older,newer,tone)}
      <b>${Number(newer)||0}</b>
    </div>
    <span class="o-trend-ends"><i>${esc(c.before)}</i><i>${esc(c.now)}</i></span>
  </div>`;
}

/* The gauge in the reference. Focus progress is the fall from a pattern's
   earlier count to its recent one - the only progress figure this product
   actually measures for a focus. */
function focusProgress(pattern){
  const older=Number(pattern?.older)||0;
  const newer=Number(pattern?.newer)||0;
  if(!older)return null;
  return Math.max(0,Math.min(100,Math.round(((older-newer)/older)*100)));
}

function gauge(percent){
  const R=42,C=Math.PI*R;
  const value=Math.max(0,Math.min(100,Number(percent)||0));
  return `<svg class="o-gauge" viewBox="0 0 100 56" aria-hidden="true">
    <path class="o-gauge-track" d="M6 50a44 44 0 0 1 88 0"/>
    <path class="o-gauge-arc" d="M6 50a44 44 0 0 1 88 0"
      stroke-dasharray="${((value/100)*C).toFixed(1)} ${C.toFixed(1)}"/>
  </svg>`;
}

function focusCard(pattern){
  const c=copy();
  if(!pattern)return '';
  const percent=focusProgress(pattern);
  return `<section class="o-card o-journey-focus">
    <span class="o-journey-icon o-journey-icon--focus">${oIcon('flag')}</span>
    <div class="o-journey-body">
      <span class="o-label">${esc(c.currentFocus)}</span>
      <h2>${esc(categoryLabel(pattern.category))}</h2>
      <p>${esc(pattern.suggestion||fill(c.seenIn,{total:pattern.total||0,series:pattern.series_count||0}))}</p>
    </div>
    ${percent===null?'':`<div class="o-journey-gauge">
      ${gauge(percent)}
      <strong>${percent}%</strong>
      <span>${esc(c.focusProgress)}${infoTip(c.focusProgressTip)}</span>
    </div>`}
  </section>`;
}

function patternCard({kind,icon,kicker,pattern,strength,tone,trendLabel}){
  const c=copy();
  const title=categoryLabel((pattern||strength).category);
  const chip=pattern?statusLabel(pattern.status):masteryLabel(strength.stage);
  const body=pattern
    ?(pattern.suggestion||fill(c.seenIn,{total:pattern.total||0,series:pattern.series_count||0}))
    :fill(c.stageIn,{stage:masteryLabel(strength.stage),evidence:strength.evidence_count||0});
  return `<section class="o-card o-journey-row o-journey-row--${kind}">
    <span class="o-journey-icon o-journey-icon--${kind}">${oIcon(icon)}</span>
    <div class="o-journey-body">
      <div class="o-journey-kicker">
        <span class="o-label">${esc(kicker)}</span>
        <span class="o-chip o-chip--${tone}">${esc(chip)}</span>
      </div>
      <h2>${esc(title)}</h2>
      <p>${esc(body)}</p>
      ${(pattern?.example||strength?.example)?`<blockquote>&ldquo;${esc(pattern?.example||strength.example)}&rdquo;</blockquote>`:''}
    </div>
    ${pattern?trendBlock(trendLabel,pattern.older,pattern.newer,tone,c.trendTip):''}
  </section>`;
}

function groupEssays(rows=[]){
  const groups=new Map();
  for(const row of rows){
    const key=row.series_id||row.id;
    if(!groups.has(key))groups.set(key,[]);
    groups.get(key).push(row);
  }
  return [...groups.values()]
    .map(group=>group.sort((a,b)=>(a.revision_no||1)-(b.revision_no||1)))
    .sort((a,b)=>String(b.at(-1)?.created_at||'').localeCompare(String(a.at(-1)?.created_at||'')));
}

/* The reference counts revisions and stops there. Counting them without a way
   in would drop the one thing this screen can actually prove - that a second
   draft scored differently from the first - so the evidence keeps its own card
   and every row opens the draft it is talking about. */
function revisionList(groups=[],wins=[]){
  const c=copy();
  if(!groups.length)return `<p class="o-target-copy">${esc(c.revisionSingle)}</p>`;

  return `<ul class="o-revision-list">${groups.slice(0,6).map(group=>{
    const first=group[0];
    const latest=group.at(-1);
    const gain=Number(latest.overall||0)-Number(first.overall||0);
    const win=wins.find(item=>String(item.latest_id)===String(latest.id));
    const label=(latest.prompt||t('common.free_writing')).split('\n').find(Boolean)||t('common.free_writing');
    const gainLabel=`${gain>=0?'+':''}${gain.toFixed(1)}`;
    return `<li class="o-revision-row">
      <time>${esc(shortDate(latest.created_at))}</time>
      <div>
        <strong>${esc(label)}</strong>
        <p>${esc(group.length>1
          ?fill(c.revisionGain,{before:first.overall,after:latest.overall,count:group.length,gain:gainLabel})
          :c.revisionSingle)}</p>
        ${win?`<small class="o-revision-evidence">${esc(fill(c.evidenceChange,{delta:`${Number(win.error_delta)>0?'+':''}${Number(win.error_delta)}`}))}</small>`:''}
      </div>
      <span class="o-revision-gain ${group.length>1?(gain>=0?'is-up':'is-down'):'is-flat'}">${group.length>1?esc(gainLabel):'&mdash;'}</span>
      <button type="button" class="o-icon-button" data-journey-essay="${latest.id}" aria-label="${esc(c.openLatest)}" title="${esc(c.openLatest)}">${oIcon('arrowRight')}</button>
    </li>`;
  }).join('')}</ul>`;
}

const GRAMMAR_OUTCOME_STATUSES=new Set([
  'improved','transferred','held','still_working',
  'needs_attention','not_observed','needs_more_evidence',
]);

function normalizedGrammarOutcome(outcome){
  if(!outcome||typeof outcome!=='object'||Array.isArray(outcome))return null;
  const grammarId=typeof outcome.grammar_id==='string'?outcome.grammar_id.trim():'';
  const status=typeof outcome.status==='string'?outcome.status.trim().toLowerCase():'';
  if(!grammarId||!GRAMMAR_OUTCOME_STATUSES.has(status))return null;
  const focusLabel=typeof outcome.focus_label==='string'?outcome.focus_label.trim():'';
  const grammarTitle=typeof outcome.grammar_title==='string'?outcome.grammar_title.trim():'';
  const numericValue=(value,fallback)=>{
    if(typeof value==='number'&&Number.isFinite(value))return value;
    if(typeof value==='string'&&value.trim()!==''){
      const parsed=Number(value);
      if(Number.isFinite(parsed))return parsed;
    }
    return fallback;
  };
  return {
    ...outcome,
    grammar_id:grammarId,
    status,
    focus_label:focusLabel,
    grammar_title:grammarTitle,
    issue_count:Math.max(0,Math.floor(numericValue(outcome.issue_count,0))),
    revision_no:Math.max(1,Math.floor(numericValue(outcome.revision_no,1))),
  };
}

function grammarOutcomeCard(outcome, language='en'){
  outcome=normalizedGrammarOutcome(outcome);
  if(!outcome)return '';
  const label=language==='zh'?'语法练习进度':language==='vi'?'Tiến độ luyện ngữ pháp':'Grammar practice progress';
  const status=statusLabel(outcome.status);
  const body=language==='zh'
    ?`最近的针对性课程是 ${outcome.focus_label||outcome.grammar_title||outcome.grammar_id}。当前状态为 ${status}，还有 ${outcome.issue_count??0} 个问题。`
    :language==='vi'
      ?`Bài luyện gần nhất là ${outcome.focus_label||outcome.grammar_title||outcome.grammar_id}. Mẫu này đang ở trạng thái ${status} với ${outcome.issue_count??0} lỗi.`
      :`Your latest targeted lesson is ${outcome.focus_label||outcome.grammar_title||outcome.grammar_id}. The pattern is ${status} after ${outcome.issue_count??0} issue(s).`;
  return `<section class="o-card o-journey-grammar-outcome">
    <span class="o-label">${esc(label)}</span>
    <p class="o-panel-copy">${esc(body)}</p>
    <div class="practice-check-meta"><span>${esc(outcome.focus_label||outcome.grammar_title||outcome.grammar_id)}</span><span>${esc(outcome.revision_no||1)} · ${esc(status)}</span></div>
    <div class="action-row">
      <button type="button" class="o-btn o-btn--outline o-btn--compact" data-outcome-grammar="${attr(outcome.grammar_id)}">${esc(copy().openLesson)}</button>
      <button type="button" class="o-btn o-btn--primary o-btn--compact" data-outcome-practice="${attr(outcome.grammar_id)}">${esc(copy().practiceLesson)}</button>
    </div>
  </section>`;
}

const PRACTICE_OUTCOME_STATUSES=new Set([
  'improved','transferred','held','still_working',
  'needs_attention','not_observed','needs_more_evidence',
]);

function normalizedJourneyPracticeOutcome(outcome){
  if(!outcome||typeof outcome!=='object'||Array.isArray(outcome))return null;
  const status=typeof outcome.status==='string'?outcome.status.trim().toLowerCase():'';
  if(!PRACTICE_OUTCOME_STATUSES.has(status))return null;
  const integer=(value,min)=>{
    if(typeof value!=='number'||!Number.isFinite(value)||!Number.isInteger(value)||value<min)return null;
    return value;
  };
  const issueCount=integer(outcome.issue_count,0);
  const revisionNo=integer(outcome.revision_no,1);
  if(issueCount===null||revisionNo===null)return null;
  let previous=null;
  if(outcome.previous_issue_count!=null){
    previous=integer(outcome.previous_issue_count,0);
    if(previous===null)return null;
  }
  const focus=typeof outcome.focus_label==='string'?outcome.focus_label.trim():'';
  if(!focus)return null;
  return {status,issue_count:issueCount,revision_no:revisionNo,previous_issue_count:previous,focus_label:focus};
}

function practiceOutcomeHistory(items){
  const outcomes=(Array.isArray(items)?items:[])
    .map(normalizedJourneyPracticeOutcome).filter(Boolean);
  if(outcomes.length<2)return '';
  const c=copy();
  return `<section class="o-card o-journey-practice-history" data-practice-outcome-history>
    <span class="o-label">${esc(c.practiceHistory)}</span>
    <p class="o-panel-copy">${esc(c.practiceHistoryBody)}</p>
    <ol class="o-practice-history-list">
      ${outcomes.slice(0,5).map(outcome=>`<li>
        <div><strong>${esc(outcome.focus_label)}</strong><span class="o-chip">${esc(t(`outcome.${outcome.status}.title`))}</span></div>
        <p>${esc(t(`outcome.${outcome.status}.body`,{
          previous:outcome.previous_issue_count??'—',
          count:outcome.issue_count,
          focus:outcome.focus_label,
        }))}</p>
        <small>${esc(t('outcome.revision'))} ${esc(outcome.revision_no)}</small>
      </li>`).join('')}
    </ol>
  </section>`;
}

const JOURNEY_PATTERN_STATUSES=new Set([
  'recurring','improving','resolved','active','historical','new','watch',
]);
const JOURNEY_MASTERY_STAGES=new Set(['Emerging','Developing','Stable','Mastered']);

function normalizedJourneyMemory(memory){
  if(!memory||typeof memory!=='object'||Array.isArray(memory)){
    return {patterns:[],strengths:[],revision_wins:[],focus:null,mastery_note:''};
  }
  const numberValue=value=>{
    if(typeof value==='number'&&Number.isFinite(value))return value;
    if(typeof value==='string'&&value.trim()!==''){
      const parsed=Number(value);
      if(Number.isFinite(parsed))return parsed;
    }
    return null;
  };
  const countValue=value=>{
    const parsed=numberValue(value);
    return parsed!==null&&Number.isInteger(parsed)&&parsed>=0?parsed:null;
  };
  const textValue=value=>typeof value==='string'?value.trim():'';
  const patterns=Array.isArray(memory.patterns)
    ?memory.patterns
      .filter(item=>item&&typeof item==='object'&&!Array.isArray(item))
      .map(item=>{
        const counts=[item.total,item.older,item.newer,item.series_count].map(countValue);
        if(counts.some(value=>value===null))return null;
        return {
          ...item,
          category:textValue(item.category),
          status:textValue(item.status).toLowerCase(),
          suggestion:textValue(item.suggestion),
          example:textValue(item.example),
          total:counts[0],
          older:counts[1],
          newer:counts[2],
          series_count:counts[3],
        };
      })
      .filter(Boolean)
      .filter(item=>item.category&&JOURNEY_PATTERN_STATUSES.has(item.status))
    :[];
  const strengths=Array.isArray(memory.strengths)
    ?memory.strengths
      .filter(item=>item&&typeof item==='object'&&!Array.isArray(item))
      .map(item=>{
        const counts=[item.evidence_count,item.series_count].map(countValue);
        if(counts.some(value=>value===null))return null;
        return {
          ...item,
          category:textValue(item.category),
          stage:textValue(item.stage),
          example:textValue(item.example),
          evidence_count:counts[0],
          series_count:counts[1],
        };
      })
      .filter(Boolean)
      .filter(item=>item.category&&JOURNEY_MASTERY_STAGES.has(item.stage))
    :[];
  const wins=Array.isArray(memory.revision_wins)
    ?memory.revision_wins
      .filter(item=>item&&typeof item==='object'&&!Array.isArray(item))
      .map(item=>{
        const overallDelta=numberValue(item.overall_delta);
        const errorDelta=numberValue(item.error_delta);
        const latestDate=textValue(item.latest_date);
        if(overallDelta===null||errorDelta===null||!latestDate)return null;
        return {...item,
          overall_delta:overallDelta,
          error_delta:errorDelta,
          latest_date:latestDate,
        };
      })
      .filter(Boolean)
    :[];
  const focus=memory.focus&&typeof memory.focus==='object'&&!Array.isArray(memory.focus)
    ?patterns.find(item=>item.category===textValue(memory.focus.category))||null
    :null;
  return {
    ...memory,
    patterns,
    strengths,
    revision_wins:wins,
    focus,
    mastery_note:textValue(memory.mastery_note),
  };
}

/* Where the learner stands overall. The reference leaves no room for it in the
   main column, but dropping the benchmark and the count of reliable strengths
   would lose two facts the memory holds, so they sit under the target. */
function writingProgressOverview(dashboard,groups,memory){
  const c=copy();
  const strengths=memory?.strengths||[];
  const reliable=strengths.filter(item=>['Stable','Mastered'].includes(item.stage)).length;
  const latestFive=groups.slice(0,5);
  const first=latestFive.at(-1)?.at(-1);
  const latest=latestFive[0]?.at(-1);
  const movement=first&&latest?Number(latest.overall||0)-Number(first.overall||0):null;
  return `<section class="o-card o-panel o-journey-panel">
    <h3 class="o-label">${esc(c.whereYouAre)}</h3>
    <p class="o-journey-cefr"><strong>${esc(dashboard?.cefr||'\u2014')}</strong><span>${esc(c.estimated)}</span></p>
    <div class="o-journey-stat"><span>${esc(c.reliable)}</span><b>${reliable}</b></div>
    <p class="o-target-copy">${esc(c.reliableNote)}</p>
    <div class="o-journey-stat">
      <span>${esc(c.movement)}</span>
      <b>${movement===null?'\u2014':`${movement>=0?'+':''}${movement.toFixed(1)}`}</b>
    </div>
    <p class="o-target-copy">${esc(c.movementNote)}</p>
  </section>`;
}

function completedCard(memory,dashboard){
  const c=copy();
  const streak=Number(dashboard?.streak)||0;
  const pieces=Number(memory?.essay_count)||0;
  const revisions=Math.max(0,(Number(memory?.revision_count)||0)-pieces);
  return `<section class="o-card o-journey-row o-journey-row--done">
    <span class="o-journey-icon o-journey-icon--done">${oIcon('check')}</span>
    <div class="o-journey-body">
      <span class="o-label">${esc(c.completed)}</span>
      <h2>${esc(streak?c.habitsTitle:c.piecesLabel)}</h2>
      <p>${esc(streak?fill(c.habitsBody,{streak}):c.habitsNoStreak)}</p>
    </div>
    <div class="o-journey-counts">
      <div><span>${oIcon('document')}</span><strong>${pieces}</strong><small>${esc(c.piecesLabel)}</small></div>
      <div><span>${oIcon('undo')}</span><strong>${revisions}</strong><small>${esc(c.revisionsLabel)}</small></div>
    </div>
  </section>`;
}

/* Five stations, each one either dated from a record or drawn as not reached.
   A station is never given a plausible date to complete the picture. */
function timeline(memory,essays,recommendation){
  const c=copy();
  const sorted=[...essays].sort((a,b)=>String(a.created_at||'').localeCompare(String(b.created_at||'')));
  const firstWin=(memory.revision_wins||[]).filter(win=>Number(win.overall_delta)>0)
    .sort((a,b)=>String(a.latest_date||'').localeCompare(String(b.latest_date||'')))[0]||null;
  const third=sorted[2]||null;
  const focus=memory.focus;

  const stations=[
    {key:'started',label:c.started,note:'',date:shortDate(sorted[0]?.created_at),done:Boolean(sorted.length)},
    {key:'win',label:c.firstWin,note:c.firstWinDesc,date:shortDate(firstWin?.latest_date),done:Boolean(firstWin)},
    {key:'momentum',label:c.momentum,note:fill(c.momentumDesc,{n:3}),date:shortDate(third?.created_at),done:Boolean(third)},
    {key:'focus',label:c.currentFocus,note:focus?categoryLabel(focus.category):'',date:focus?c.now:'',done:Boolean(focus),current:true},
    {key:'next',label:c.nextTarget,note:recommendation?.focus_label||'',date:c.upcoming,done:false,next:true},
  ];

  return `<section class="o-card o-journey-timeline">
    <span class="o-label">${esc(c.timeline)}</span>
    <ol class="o-timeline">
      ${stations.map(station=>`<li class="o-timeline-step ${station.done?'is-done':''} ${station.current?'is-current':''} ${station.next?'is-next':''}">
        <span class="o-timeline-dot">${station.current?oIcon('flag'):station.next?oIcon('chevronRight'):station.done?oIcon('check'):''}</span>
        <strong>${esc(station.label)}</strong>
        ${station.note?`<small>${esc(station.note)}</small>`:''}
        <time>${esc(station.date||c.notYet)}</time>
      </li>`).join('')}
    </ol>
  </section>`;
}

function targetRail(recommendation,memory){
  const c=copy();
  if(!recommendation)return '';
  const focus=memory.focus;
  return `<aside class="o-journey-rail">
    <section class="o-card o-target">
      <div class="o-target-head">
        <span class="o-journey-icon o-journey-icon--focus">${oIcon('flag')}</span>
        <h2>${esc(c.nextTarget)}</h2>
      </div>

      <h3 class="o-target-title">${esc(recommendation.focus_label||'')}</h3>
      ${recommendation.focus_instruction?`<p class="o-target-copy">${esc(recommendation.focus_instruction)}</p>`:''}

      ${recommendation.reason?`<div class="o-target-block">
        <h4>${esc(c.whyThis)}</h4>
        <p class="o-target-copy">${esc(recommendation.reason)}</p>
      </div>`:''}

      ${recommendation.evidence?`<div class="o-target-block">
        <h4>${esc(c.targetPreview)}</h4>
        <blockquote class="o-target-preview">&ldquo;${esc(recommendation.evidence)}&rdquo;</blockquote>
      </div>`:''}

      <!-- Three routes the product actually runs, not a list of promises: the
           evidence link in Review, the practice brief this button creates, and
           the feedback on whatever gets written next. -->
      <div class="o-target-block">
        <h4>${esc(c.howWeHelp)}</h4>
        <ul class="o-target-help">
          <li>${oIcon('check')}<span>${esc(c.helpEvidence)}</span></li>
          <li>${oIcon('check')}<span>${esc(c.helpPractice)}</span></li>
          <li>${oIcon('check')}<span>${esc(c.helpFeedback)}</span></li>
        </ul>
      </div>

      <button type="button" class="o-btn o-btn--primary o-target-start" data-journey-start>
        <span>${esc(recommendation.action_label||c.startTarget)}</span>${oIcon('arrowRight')}
      </button>
      ${focus?`<button type="button" class="o-btn o-btn--outline" data-journey-patterns>${esc(c.viewAll)}</button>`:''}
    </section>
  </aside>`;
}

function patternsDialogMarkup(memory){
  const c=copy();
  const patterns=(memory.patterns||[]).filter(item=>item.status!=='historical');
  const strengths=memory.strengths||[];
  return `<div class="o-pattern-dump">
    <ul>
      ${patterns.map(item=>`<li>
        <div><strong>${esc(categoryLabel(item.category))}</strong><span class="o-chip">${esc(statusLabel(item.status))}</span></div>
        <p>${esc(fill(c.seenIn,{total:item.total||0,series:item.series_count||0}))}</p>
      </li>`).join('')}
      ${strengths.map(item=>`<li>
        <div><strong>${esc(categoryLabel(item.category))}</strong><span class="o-chip o-chip--strong">${esc(masteryLabel(item.stage))}</span></div>
        <p>${esc(fill(c.stageIn,{stage:masteryLabel(item.stage),evidence:item.evidence_count||0}))}</p>
      </li>`).join('')}
    </ul>
    <p class="o-target-copy">${esc(memory.mastery_note||'')}</p>
  </div>`;
}

export async function renderJourney(root){
  root.innerHTML=`<section class="o-page">${loadingBlock(5)}</section>`;
  let dashboard;
  let essays;
  let memory;
  let recommendation=null;
  let practiceOutcomes=null;
  try{
    [dashboard,essays,memory]=await Promise.all([
      api.dashboard(),
      api.essays(),
      api.learningMemory(),
    ]);
  }catch(error){
    root.innerHTML=`<section class="o-page">${errorBlock(error.message)}</section>`;
    return;
  }
  memory=normalizedJourneyMemory(memory);
  state.dashboard=dashboard;
  state.essays=essays;
  state.memory=memory;

  /* The rail is the only part that needs this, so a failure here costs the
     recommendation and nothing else. */
  try{
    recommendation=await api.practiceRecommendation();
    state.practiceRecommendation=recommendation;
  }catch{
    recommendation=null;
  }
  try{ practiceOutcomes=await api.practiceOutcomes(5); }catch{ practiceOutcomes=null; }

  const c=copy();
  if(!essays.length){
    root.innerHTML=`<section class="o-page journey-page">
      <section class="o-card o-journey-empty">
        <span class="o-journey-icon o-journey-icon--focus">${oIcon('journey')}</span>
        <h2>${esc(c.emptyTitle)}</h2>
        <p>${esc(c.emptyBody)}</p>
        <button type="button" class="o-btn o-btn--primary" id="journeyStart">${oIcon('write')}<span>${esc(c.start)}</span></button>
      </section>
    </section>`;
    root.querySelector('#journeyStart')?.addEventListener('click',()=>go('write'));
    return;
  }

  const groups=groupEssays(essays);
  const patterns=(memory.patterns||[]).filter(item=>item.status!=='historical');
  const focus=memory.focus||null;
  /* `focus` arrives as its own object over the wire, so it is never identical
     to the pattern of the same name in the list. Comparing by identity silently
     let the focus card and the recurring card show the same pattern twice. */
  const taken=new Set([focus?.category].filter(Boolean));
  const pick=test=>{
    const found=patterns.find(item=>!taken.has(item.category)&&test(item))||null;
    if(found)taken.add(found.category);
    return found;
  };
  const improving=pick(item=>item.status==='improving');
  const strengths=memory.strengths||[];
  const leadStrength=strengths.find(item=>!taken.has(item.category))||null;
  const recurring=pick(item=>['recurring','new','watch'].includes(item.status));

  root.innerHTML=`<section class="o-page journey-page">
    <header class="o-journey-head">
      <h1>${esc(c.title)}</h1>
      <p>${esc(c.lead)}</p>
    </header>

    <div class="o-journey-body-grid">
      <div class="o-journey-main">
        ${focusCard(focus)}
        ${grammarOutcomeCard(practiceOutcomes?.latest,uiLocale())}
        ${practiceOutcomeHistory(practiceOutcomes?.items)}
        ${improving
          ? patternCard({kind:'up',icon:'flame',kicker:c.recentImprovement,pattern:improving,tone:'strong',trendLabel:c.occurrence})
          : leadStrength
            ? patternCard({kind:'up',icon:'flame',kicker:c.recentImprovement,strength:leadStrength,tone:'strong'})
            : ''}
        ${recurring?patternCard({kind:'watch',icon:'info',kicker:c.recurringIssue,pattern:recurring,tone:'close',trendLabel:c.occurrence}):''}
        ${completedCard(memory,dashboard)}

        <section class="o-card o-journey-revisions">
          <span class="o-label">${esc(c.beforeNow)}</span>
          ${revisionList(groups,memory.revision_wins||[])}
        </section>

        ${timeline(memory,essays,recommendation)}
      </div>
      <div class="o-journey-side">
        ${targetRail(recommendation,memory)}
        ${writingProgressOverview(dashboard,groups,memory)}
      </div>
    </div>
  </section>`;

  root.querySelector('[data-journey-start]')?.addEventListener('click',async event=>{
    const button=event.currentTarget;
    try{
      await runBusy(button,async()=>{
        /* The same path Home uses, so a target started here and a target
           started there produce the same brief. */
        const task=await api.nextPractice({target_level:recommendation.target_level||state.draft.level||''});
        const personalization=task.personalization||recommendation;
        saveDraft({
          mode:task.task_type||personalization.task_type||'opinion',
          topic:task.topic||personalization.topic||'random',
          level:personalization.target_level||state.draft.level,
          length:Number(task.word_target||personalization.word_target||state.draft.length),
          prompt:task.prompt||'',
          generatedTask:task,
          practiceContext:personalization,
          text:'',
          parentEssayId:null,
        });
        state.practiceRecommendation=personalization;
        go('write');
      },{label:t('busy.creating')});
    }catch(error){
      root.insertAdjacentHTML('afterbegin',errorBlock(error.message||t('busy.working')));
    }
  });

  root.querySelectorAll('[data-journey-essay]').forEach(button=>{
    button.addEventListener('click',async()=>{
      const essay=await api.essay(button.dataset.journeyEssay);
      state.lastEvaluation=essay;
      state.draft={
        ...state.draft,
        text:essay.text||'',
        prompt:essay.prompt||'',
        parentEssayId:essay.id,
        level:essay.target_cefr||state.draft.level,
      };
      go('review');
    });
  });

  root.querySelectorAll('[data-outcome-grammar]').forEach(button=>{
    button.addEventListener('click',()=>{
      const id=button.dataset.outcomeGrammar;
      if(!id)return;
      try{ localStorage.setItem('becoming.grammar-focus',id); }catch{}
      go('grammar');
    });
  });

  root.querySelectorAll('[data-outcome-practice]').forEach(button=>{
    button.addEventListener('click',async()=>{
      const id=button.dataset.outcomePractice;
      if(!id)return;
      try{
        await runBusy(button,async()=>{
          const task=await api.grammarPractice(id);
          if(!task||typeof task!=='object'||typeof task.prompt!=='string'||!task.prompt.trim()){
            throw new Error(t('review.practice_failed'));
          }
          const context=task.practice_context&&typeof task.practice_context==='object'
            ?task.practice_context:null;
          saveDraft({
            prompt:task.prompt.trim(),text:'',html:'',
            mode:context?.task_type||state.draft.mode,
            topic:context?.topic||state.draft.topic,
            level:task.target_level||context?.target_level||state.draft.level,
            practiceContext:context,generatedTask:null,parentEssayId:null,
          });
          go('write');
        },{label:t('busy.creating')});
      }catch(error){ root.insertAdjacentHTML('afterbegin',errorBlock(error.message||t('review.practice_failed'))); }
    });
  });

  root.querySelector('[data-journey-patterns]')?.addEventListener('click',async()=>{
    const {showDialog}=await import('../components/primitives.js');
    showDialog(c.viewAll,patternsDialogMarkup(memory));
  });
}
