import {api} from '../api.js';
import {state} from '../store.js';
import {esc,errorBlock,loadingBlock,toast,runBusy} from '../components/primitives.js';
import {t,uiLocale} from '../domain/i18n.js';
import {dictionaryResultMarkup,mountDictionaryResult} from '../components/dictionary.js';
import {supportNote} from '../domain/support.js';
import {oIcon} from '../orena/icons.js';
import {installSelectEnhancements} from '../components/select-field.js';

/* ORENA-LIBRARY-*: one Active Recall header, a filterable table of saved terms,
 * and a rail of review state.
 *
 * The reference's table has columns this product can fill from what the service
 * already returns - review_stage maps onto the five mastery dots exactly, and
 * next_review_at / last_reviewed_at are stored per item. Where the reference
 * shows something the service does not have, the difference is named in a
 * comment next to the code rather than papered over with a plausible number.
 */

const PAGE_SIZE=10;
const SOON_DAYS=3;
const GOAL_KEY='becoming.library.daily-goal.v1';
const SETTINGS_KEY='becoming.library.study-settings.v1';

const COPY={
  en:{
    title:'Active Recall',lead:'Review and strengthen what you have learned.',
    itemsDue:'items due',reviewNow:'Review now',addWord:'Add a word',
    all:'All items',
    types:{word:'Vocabulary',collocation:'Collocation',idiom:'Idiom',colloquial:'Set phrase',phrasalVerb:'Phrasal verb',separable:'Separable verb',measure:'Measure word',proverb:'Proverb',xiehouyu:'Two-part saying',phrase:'Phrase'},
    filters:'Filters',sort:'Sort',
    colItem:'Item',colType:'Type',colMastery:'Mastery',colNext:'Next review',colLast:'Last reviewed',
    dueNow:'Due now',dueSoon:'Due soon',notDue:'Not due',
    inDays:'In {n} days',tomorrow:'Tomorrow',today:'Today',never:'Never',
    countOf:'{from}–{to} of {total} items',
    yourReview:'Your review',dailyGoal:'Daily goal',editGoal:'Edit goal',
    goalProgress:'{done} / {goal} items',goalHit:'You have hit today’s goal.',
    goalLeft:'{n} more to reach today’s goal.',
    streak:'Streak',streakDays:'{n} days',keepGoing:'Keep it going!',
    accuracy:'Review accuracy',accuracyScope:'All reviews so far',
    accuracyEmpty:'No reviews recorded yet.',
    focusAreas:'Focus areas',focusDue:'{n} due',focusEmpty:'Nothing is due right now.',
    studySettings:'Study settings',autoPronounce:'Auto-pronounce',showHints:'Show hints',
    revealAnswer:'Reveal answer',afterAttempt:'After attempt',immediately:'Immediately',
    remove:'Remove',rowMenu:'Item actions',
    sortNext:'Next review',sortAdded:'Recently added',sortAlpha:'A → Z',sortMastery:'Mastery',
    filterAll:'Everything',filterDue:'Due now',filterSoon:'Due soon',filterNew:'Not started',
    goalPrompt:'How many items do you want to review each day?',
    categoryEmpty:'Nothing saved in this category yet.',
    tabTip:'Categories come from the label the dictionary saved with the entry. An entry with no label is filed by shape alone — one word, or a phrase — and is never guessed into a narrower category.',
    accuracyTip:'Successful recalls as a share of every recall you have marked. It is your own report, not a test score.',
    goalTip:'A target you set. Progress counts items you reviewed today.',
    focusTip:'Parts of speech with items due, taken from the saved entries.',
    settingsTip:'These change how the recall card behaves on this device.',
    donutTip:'Due now is past its scheduled time. Due soon is within three days.',
  },
  vi:{
    title:'Ôn chủ động',lead:'Ôn lại và củng cố những gì bạn đã học.',
    itemsDue:'mục đến hạn',reviewNow:'Ôn ngay',addWord:'Thêm từ',
    all:'Tất cả',
    types:{word:'Từ vựng',collocation:'Kết hợp từ',idiom:'Thành ngữ',colloquial:'Quán ngữ',phrasalVerb:'Cụm động từ',separable:'Động từ ly hợp',measure:'Lượng từ',proverb:'Tục ngữ',xiehouyu:'Câu hai vế',phrase:'Cụm từ'},
    filters:'Lọc',sort:'Sắp xếp',
    colItem:'Mục',colType:'Loại',colMastery:'Mức thuộc',colNext:'Ôn kế tiếp',colLast:'Ôn lần cuối',
    dueNow:'Đến hạn',dueSoon:'Sắp đến hạn',notDue:'Chưa tới hạn',
    inDays:'Sau {n} ngày',tomorrow:'Ngày mai',today:'Hôm nay',never:'Chưa ôn',
    countOf:'{from}–{to} trên {total} mục',
    yourReview:'Tình hình ôn tập',dailyGoal:'Mục tiêu mỗi ngày',editGoal:'Đổi mục tiêu',
    goalProgress:'{done} / {goal} mục',goalHit:'Bạn đã đạt mục tiêu hôm nay.',
    goalLeft:'Còn {n} mục nữa là đạt mục tiêu hôm nay.',
    streak:'Chuỗi ngày',streakDays:'{n} ngày',keepGoing:'Giữ nhịp nhé!',
    accuracy:'Độ chính xác khi ôn',accuracyScope:'Tính trên toàn bộ lượt ôn',
    accuracyEmpty:'Chưa có lượt ôn nào.',
    focusAreas:'Nhóm cần chú ý',focusDue:'{n} đến hạn',focusEmpty:'Hiện chưa có mục nào đến hạn.',
    studySettings:'Thiết lập ôn tập',autoPronounce:'Tự phát âm',showHints:'Hiện gợi ý',
    revealAnswer:'Hiện đáp án',afterAttempt:'Sau khi thử',immediately:'Ngay lập tức',
    remove:'Xóa',rowMenu:'Thao tác',
    sortNext:'Ôn kế tiếp',sortAdded:'Mới thêm',sortAlpha:'A → Z',sortMastery:'Mức thuộc',
    filterAll:'Tất cả',filterDue:'Đến hạn',filterSoon:'Sắp đến hạn',filterNew:'Chưa bắt đầu',
    goalPrompt:'Mỗi ngày bạn muốn ôn bao nhiêu mục?',
    categoryEmpty:'Chưa lưu mục nào thuộc nhóm này.',
    tabTip:'Phân loại lấy từ nhãn mà từ điển lưu cùng mục. Mục không có nhãn thì chỉ xếp theo hình thức — một từ, hay một cụm — chứ không đoán vào nhóm hẹp hơn.',
    accuracyTip:'Số lần nhớ được chia cho tổng số lượt bạn đã tự đánh giá. Đây là bạn tự báo, không phải điểm kiểm tra.',
    goalTip:'Mục tiêu do bạn đặt. Tiến độ đếm số mục bạn đã ôn hôm nay.',
    focusTip:'Các từ loại đang có mục đến hạn, lấy từ chính các mục đã lưu.',
    settingsTip:'Các mục này đổi cách thẻ ôn hoạt động trên thiết bị này.',
    donutTip:'Đến hạn là đã quá lịch. Sắp đến hạn là trong vòng ba ngày.',
  },
  zh:{
    title:'主动回忆',lead:'复习并巩固你学过的内容。',
    itemsDue:'项待复习',reviewNow:'现在复习',addWord:'添加词条',
    all:'全部',
    types:{word:'单词',collocation:'搭配',idiom:'成语',colloquial:'惯用语',phrasalVerb:'动词短语',separable:'离合词',measure:'量词',proverb:'谚语',xiehouyu:'歇后语',phrase:'短语'},
    filters:'筛选',sort:'排序',
    colItem:'条目',colType:'类型',colMastery:'掌握度',colNext:'下次复习',colLast:'上次复习',
    dueNow:'已到期',dueSoon:'即将到期',notDue:'未到期',
    inDays:'{n} 天后',tomorrow:'明天',today:'今天',never:'尚未复习',
    countOf:'第 {from}–{to} 项，共 {total} 项',
    yourReview:'复习概况',dailyGoal:'每日目标',editGoal:'修改目标',
    goalProgress:'{done} / {goal} 项',goalHit:'今天的目标已达成。',
    goalLeft:'再完成 {n} 项即可达成今天的目标。',
    streak:'连续天数',streakDays:'{n} 天',keepGoing:'继续保持！',
    accuracy:'复习准确率',accuracyScope:'统计全部复习记录',
    accuracyEmpty:'还没有复习记录。',
    focusAreas:'重点方向',focusDue:'{n} 项待复习',focusEmpty:'目前没有到期的条目。',
    studySettings:'学习设置',autoPronounce:'自动朗读',showHints:'显示提示',
    revealAnswer:'显示答案',afterAttempt:'作答之后',immediately:'立即',
    remove:'删除',rowMenu:'条目操作',
    sortNext:'下次复习',sortAdded:'最近添加',sortAlpha:'A → Z',sortMastery:'掌握度',
    filterAll:'全部',filterDue:'已到期',filterSoon:'即将到期',filterNew:'尚未开始',
    goalPrompt:'你每天想复习多少项？',
    categoryEmpty:'这个类别还没有保存的条目。',
    tabTip:'分类来自词典随条目一起保存的标注。没有标注的条目只按形式归类——单词或短语——不会猜到更窄的类别里。',
    accuracyTip:'回忆成功次数占你标记过的全部复习次数的比例。这是你的自评，不是考试成绩。',
    goalTip:'由你设定的目标。进度统计今天复习过的条目。',
    focusTip:'当前有到期条目的词性，取自已保存的条目本身。',
    settingsTip:'这些选项只改变本设备上回忆卡片的行为。',
    donutTip:'已到期指已过计划时间，即将到期指三天以内。',
  },
};
const copy=()=>COPY[uiLocale()]||COPY.en;

/* Lexical categories.
 *
 * The service stores no taxonomy field, but it does store part_of_speech, which
 * the learner dictionary fills in - and the dictionary is now asked to name the
 * lexical unit there ("idiom", "collocation", and the standard Chinese terms)
 * rather than only the word class. So a category is read off a real stored
 * label first, and only falls back to what the saved string itself shows.
 *
 * The fallback deliberately stops at word / phrase. Whether a multi-word entry
 * is an idiom or a collocation is not visible in its characters, and four
 * Chinese characters are not automatically a set idiom - guessing would file
 * entries under a heading that claims something nobody checked. Unlabelled
 * entries stay in the honest bucket, and the tooltip says so.
 *
 * Chinese gets the categories learners meet in their own materials, because
 * they are genuinely different things and one "phrases" bucket is what makes a
 * library hard to search:
 *   - the four-character set idioms (chengyu)
 *   - colloquial set expressions (guanyongyu), usually three characters
 *   - collocations (dapei)
 *   - separable verbs (lihe ci), which split around their object
 *   - measure words (liangci)
 */
const TYPE_RULES=[
  ['measure',[/measure\s*word/i,/classifier/i,/\u91cf\u8bcd/,/l\u01b0\u1ee3ng t\u1eeb/i]],
  ['separable',[/separable/i,/\u79bb\u5408\u8bcd/,/ly h\u1ee3p/i]],
  ['phrasalVerb',[/phrasal/i,/\u52a8\u8bcd\u77ed\u8bed/,/c\u1ee5m \u0111\u1ed9ng t\u1eeb/i]],
  ['collocation',[/collocat/i,/\u642d\u914d/,/k\u1ebft h\u1ee3p t\u1eeb/i]],
  ['idiom',[/idiom/i,/\u6210\u8bed/,/th\u00e0nh ng\u1eef/i]],
  ['xiehouyu',[/\u6b47\u540e\u8bed/,/allegorical/i]],
  ['proverb',[/proverb/i,/saying/i,/\u8c1a\u8bed/,/\u4fd7\u8bed/,/t\u1ee5c ng\u1eef/i]],
  ['colloquial',[/\u60ef\u7528\u8bed/,/set\s*phrase/i,/qu\u00e1n ng\u1eef/i]],
  ['phrase',[/phrase/i,/expression/i,/\u77ed\u8bed/,/c\u1ee5m t\u1eeb/i]],
];

/* Order matters: the generic phrase term is a substring of the phrasal-verb
   term, and "idiom" appears inside "idiomatic", so narrower rules go first. */
function labelledType(item){
  const label=String(item.part_of_speech||'').trim();
  if(!label)return null;
  for(const [key,patterns] of TYPE_RULES){
    if(patterns.some(pattern=>pattern.test(label)))return key;
  }
  return null;
}

function itemType(item){
  const labelled=labelledType(item);
  if(labelled)return labelled;
  const word=String(item.word||'').trim();
  const multi=state.language==='zh'?[...word].length>3:/\s/.test(word);
  return multi?'phrase':'word';
}

/* Only the categories this language actually uses are offered, and only when
   something is in them. An empty heading reads as a broken filter rather than
   as a category the learner has not met yet. */
/* The full list for each language, in the order a learner meets them. Every
   one is shown, empty or not: the row doubles as the answer to "what kinds of
   thing does this language have?" for someone who has not met them yet. */
const TYPE_ORDER_EN=['word','collocation','phrasalVerb','idiom','proverb','phrase'];
const TYPE_ORDER_ZH=['word','collocation','measure','separable','idiom','colloquial','proverb','xiehouyu','phrase'];

const NATIVE_TYPE_NAMES={
  word:'\u5355\u8bcd',collocation:'\u642d\u914d',idiom:'\u6210\u8bed',
  colloquial:'\u60ef\u7528\u8bed',proverb:'\u8c1a\u8bed',xiehouyu:'\u6b47\u540e\u8bed',
  separable:'\u79bb\u5408\u8bcd',measure:'\u91cf\u8bcd',phrase:'\u77ed\u8bed',
};

/* What each category is, and one real example in the language being learned.
   This is the part that teaches: a learner who has never heard of a separable
   verb can read the filter and find out, without leaving the library. */
const TYPE_INFO={
  word:{
    en:'A single word.',
    vi:'M\u1ed9t t\u1eeb \u0111\u01a1n.',
    zh:'\u5355\u4e2a\u8bcd\u3002',
    ex:{},
  },
  collocation:{
    en:'Words that habitually go together, where another near-synonym would sound wrong.',
    vi:'Nh\u1eefng t\u1eeb quen \u0111i c\u00f9ng nhau; thay b\u1eb1ng t\u1eeb \u0111\u1ed3ng ngh\u0129a kh\u00e1c l\u00e0 nghe sai.',
    zh:'\u4e60\u60ef\u4e0a\u642d\u914d\u5728\u4e00\u8d77\u7684\u8bcd\uff0c\u6362\u6210\u8fd1\u4e49\u8bcd\u5c31\u4e0d\u81ea\u7136\u3002',
    ex:{en:'make a decision',zh:'\u6253\u7535\u8bdd'},
  },
  phrasalVerb:{
    en:'A verb plus a particle that together mean something the verb alone does not.',
    vi:'\u0110\u1ed9ng t\u1eeb \u0111i k\u00e8m gi\u1edbi t\u1eeb, ngh\u0129a kh\u00e1c v\u1edbi \u0111\u1ed9ng t\u1eeb \u0111\u1ee9ng m\u1ed9t m\u00ecnh.',
    zh:'\u52a8\u8bcd\u52a0\u5c0f\u8bcd\uff0c\u5408\u8d77\u6765\u7684\u610f\u601d\u4e0d\u7b49\u4e8e\u52a8\u8bcd\u672c\u8eab\u3002',
    ex:{en:'look forward to'},
  },
  idiom:{
    en:'A fixed expression whose meaning is not the sum of its words.',
    vi:'C\u1ee5m c\u1ed1 \u0111\u1ecbnh, ngh\u0129a kh\u00f4ng b\u1eb1ng t\u1ed5ng ngh\u0129a c\u1ee7a t\u1eebng t\u1eeb.',
    zh:'\u56fa\u5b9a\u8bf4\u6cd5\uff0c\u610f\u601d\u4e0d\u7b49\u4e8e\u5b57\u9762\u76f8\u52a0\u3002',
    ex:{en:'kick the bucket',zh:'\u4e00\u4e3e\u4e24\u5f97'},
    note:{
      en:'In Chinese these are the four-character set idioms.',
      vi:'Trong ti\u1ebfng Trung \u0111\u00e2y l\u00e0 c\u00e1c th\u00e0nh ng\u1eef b\u1ed1n ch\u1eef.',
      zh:'\u6c49\u8bed\u91cc\u591a\u4e3a\u56db\u5b57\u683c\u5f0f\u3002',
    },
  },
  colloquial:{
    en:'A colloquial set expression, usually three characters, used figuratively.',
    vi:'C\u1ee5m kh\u1ea9u ng\u1eef c\u1ed1 \u0111\u1ecbnh, th\u01b0\u1eddng ba ch\u1eef, d\u00f9ng theo ngh\u0129a b\u00f3ng.',
    zh:'\u53e3\u8bed\u91cc\u7684\u56fa\u5b9a\u8bf4\u6cd5\uff0c\u591a\u4e3a\u4e09\u5b57\uff0c\u7528\u6bd4\u55bb\u4e49\u3002',
    ex:{zh:'\u8d70\u540e\u95e8'},
  },
  proverb:{
    en:'A traditional saying that states experience or advice.',
    vi:'C\u00e2u n\u00f3i truy\u1ec1n th\u1ed1ng \u0111\u00fac k\u1ebft kinh nghi\u1ec7m ho\u1eb7c l\u1eddi khuy\u00ean.',
    zh:'\u6d41\u4f20\u4e0b\u6765\u7684\u8bdd\uff0c\u8bf4\u7684\u662f\u7ecf\u9a8c\u6216\u9053\u7406\u3002',
    ex:{en:'Practice makes perfect.',zh:'\u719f\u80fd\u751f\u5de7'},
  },
  xiehouyu:{
    en:'A two-part saying: the first half sets up an image, the second delivers the point.',
    vi:'C\u00e2u hai v\u1ebf: v\u1ebf \u0111\u1ea7u n\u00eau h\u00ecnh \u1ea3nh, v\u1ebf sau n\u00f3i \u00fd.',
    zh:'\u4e24\u90e8\u5206\uff1a\u524d\u4e00\u90e8\u5206\u6253\u6bd4\u65b9\uff0c\u540e\u4e00\u90e8\u5206\u8bf4\u610f\u601d\u3002',
    ex:{zh:'\u732b\u54ed\u8001\u9f20\u2014\u2014\u5047\u6148\u60b2'},
  },
  separable:{
    en:'A verb that splits apart when something is said about it.',
    vi:'\u0110\u1ed9ng t\u1eeb t\u00e1ch \u0111\u01b0\u1ee3c ra khi c\u00f3 th\u00e0nh ph\u1ea7n ch\u00e8n v\u00e0o gi\u1eefa.',
    zh:'\u53ef\u4ee5\u62c6\u5f00\u7528\u7684\u52a8\u8bcd\uff0c\u4e2d\u95f4\u80fd\u63d2\u5165\u5176\u4ed6\u6210\u5206\u3002',
    ex:{zh:'\u5e2e\u5fd9 \u2192 \u5e2e\u4e86\u4e00\u4e2a\u5fd9'},
  },
  measure:{
    en:'The word that goes between a number and a noun.',
    vi:'T\u1eeb \u0111\u1ee9ng gi\u1eefa s\u1ed1 \u0111\u1ebfm v\u00e0 danh t\u1eeb.',
    zh:'\u7528\u5728\u6570\u8bcd\u548c\u540d\u8bcd\u4e4b\u95f4\u7684\u8bcd\u3002',
    ex:{zh:'\u4e00\u672c\u4e66'},
  },
  phrase:{
    en:'Any other entry of more than one word.',
    vi:'C\u00e1c m\u1ee5c nhi\u1ec1u h\u01a1n m\u1ed9t t\u1eeb c\u00f2n l\u1ea1i.',
    zh:'\u5176\u4ed6\u591a\u4e8e\u4e00\u4e2a\u8bcd\u7684\u6761\u76ee\u3002',
    ex:{},
  },
};

/* One line a learner can act on: what the category is, then a real example in
   the language they are studying. */
function typeInfo(key){
  const info=TYPE_INFO[key];
  if(!info)return '';
  const locale=uiLocale();
  const text=info[locale]||info.en;
  const note=state.language==='zh'&&info.note?` ${info.note[locale]||info.note.en}`:'';
  const example=info.ex?.[state.language]||'';
  return `${text}${note}${example?` ${EXAMPLE_LABEL[locale]||EXAMPLE_LABEL.en} ${example}`:''}`;
}
const EXAMPLE_LABEL={en:'For example:',vi:'V\u00ed d\u1ee5:',zh:'\u4f8b\uff1a'};

function typeLabel(key){
  const names=copy().types||{};
  const name=names[key]||key;
  const native=NATIVE_TYPE_NAMES[key];
  /* A learner of Chinese meets these categories under their Chinese names in
     every textbook, so the Chinese term travels with the translated one. */
  if(state.language==='zh'&&native&&uiLocale()!=='zh')return `${name} (${native})`;
  return name;
}

const DAY=86400000;
function parseTime(value){
  const parsed=Date.parse(String(value||'').replace(' ','T'));
  return Number.isFinite(parsed)?parsed:null;
}
function daysFromNow(value){
  const at=parseTime(value);
  if(at===null)return null;
  const start=new Date();start.setHours(0,0,0,0);
  const target=new Date(at);target.setHours(0,0,0,0);
  return Math.round((target-start)/DAY);
}
function isSoon(item){
  if(item.due)return false;
  const days=daysFromNow(item.next_review_at);
  return days!==null&&days<=SOON_DAYS;
}
function reviewedToday(item){
  return daysFromNow(item.last_reviewed_at)===0;
}

function shortDate(value){
  const at=parseTime(value);
  if(at===null)return '';
  return new Date(at).toLocaleDateString(uiLocale()==='vi'?'vi-VN':uiLocale()==='zh'?'zh-CN':'en-GB',
    {year:'numeric',month:'short',day:'numeric'});
}

function relativeLabel(item){
  const c=copy();
  if(item.due)return {text:c.dueNow,tone:'due'};
  const days=daysFromNow(item.next_review_at);
  if(days===null)return {text:t('library.not_scheduled'),tone:'none'};
  if(days<=0)return {text:c.today,tone:'due'};
  if(days===1)return {text:c.tomorrow,tone:'soon'};
  return {text:c.inDays.replace('{n}',String(days)),tone:days<=SOON_DAYS?'soon':'later'};
}

/* review_stage runs 0–4, which is exactly the five dots the reference draws. */
function masteryCell(item){
  const stage=Math.max(0,Math.min(4,Number(item.review_stage)||0));
  const tone=stage>=3?'strong':stage>=2?'good':stage>=1?'reviewing':'new';
  return `<div class="o-mastery">
    <span class="o-mastery-dots o-mastery-dots--${tone}" aria-hidden="true">${
      Array.from({length:5},(_,i)=>`<i class="${i<=stage?'is-on':''}"></i>`).join('')}</span>
    <span class="o-mastery-label">${esc(item.stage_label||t('library.new_stage'))}</span>
  </div>`;
}

function readingOf(item){
  if(!item.phonetic)return '';
  if(state.language!=='zh')return item.phonetic;
  return (state.profile?.pinyin||'auto')!=='off'?item.phonetic:'';
}

function meaningOf(item){
  return (uiLocale()==='vi'?item.translation_vi:'')||item.definition||t('library.no_definition');
}

function tableRow(item){
  const c=copy();
  const type=itemType(item);
  const next=relativeLabel(item);
  const reading=readingOf(item);
  return `<tr data-library-term="${esc(item.word)}">
    <td class="o-col-item">
      <div class="o-item-word">
        <strong class="${state.language==='zh'?'cjk':''}">${esc(item.word)}</strong>
        ${reading?`<span class="o-item-reading">(${esc(reading)})</span>`:''}
      </div>
      <div class="o-item-meaning">${esc(meaningOf(item))}</div>
    </td>
    <td class="o-col-type"><span class="o-type-chip o-type-chip--${type}">${esc(typeLabel(type))}</span></td>
    <td class="o-col-mastery">${masteryCell(item)}</td>
    <td class="o-col-next">
      <div>${esc(shortDate(item.next_review_at)||'—')}</div>
      <div class="o-next-relative is-${next.tone}">${esc(next.text)}</div>
    </td>
    <td class="o-col-last">${esc(shortDate(item.last_reviewed_at)||c.never)}</td>
    <td class="o-col-menu">
      <button type="button" class="o-icon-button o-row-menu" data-delete-term="${esc(item.word)}" title="${esc(c.remove)}" aria-label="${esc(c.remove)} ${esc(item.word)}">${oIcon('trash')}</button>
    </td>
  </tr>`;
}

function infoTip(text){
  return `<span class="o-info-dot" role="img" title="${esc(text)}" aria-label="${esc(text)}">${oIcon('info')}</span>`;
}

/* Due now / due soon / not due are three slices of one ring. The arcs are drawn
   from the same counts the list is filtered by, so the ring and the table can
   never disagree. */
function donut(counts){
  const total=counts.due+counts.soon+counts.later;
  const R=52,C=2*Math.PI*R;
  let offset=0;
  const arc=(value,cls)=>{
    if(!total||!value)return '';
    const length=(value/total)*C;
    const dash=`<circle class="${cls}" cx="60" cy="60" r="${R}" stroke-dasharray="${length.toFixed(1)} ${(C-length).toFixed(1)}" stroke-dashoffset="${(-offset).toFixed(1)}"/>`;
    offset+=length;
    return dash;
  };
  return `<svg class="o-donut" viewBox="0 0 120 120" aria-hidden="true">
    <circle class="o-donut-track" cx="60" cy="60" r="${R}"/>
    ${arc(counts.due,'o-donut-due')}
    ${arc(counts.soon,'o-donut-soon')}
    ${arc(counts.later,'o-donut-later')}
  </svg>`;
}

function lookupCard(payload){
  if(!payload)return '';
  return `<article class="o-lookup-result">
    ${dictionaryResultMarkup(payload,{
      language:state.language,
      pinyinMode:state.profile?.pinyin||'auto',
      includeWriting:true,
    })}
    <button id="saveLookup" class="o-btn o-btn--primary" type="button">${t('library.save')}</button>
  </article>`;
}

/* The recall card the reference reaches through "Review now". It keeps the
   self-report wording, because "got it" is the learner's own judgement and
   nothing here measures whether the recall was correct. */
function recallCard(item,settings){
  const c=copy();
  if(!item){
    return `<div class="o-recall-empty">
      <strong>${t('library.nothing_due')}</strong>
      <p>${t('library.nothing_due_desc')}</p>
    </div>`;
  }
  const reading=readingOf(item);
  const revealed=settings.reveal==='immediately';
  return `<article class="o-recall" data-review-word="${esc(item.word)}">
    <span class="o-label">${t('library.active')}</span>
    <h2 class="o-recall-word ${state.language==='zh'?'cjk':''}">${esc(item.word)}</h2>
    ${reading?`<p class="o-recall-reading">${esc(reading)}</p>`:''}
    ${settings.hints&&item.source_fragment?`<blockquote class="o-recall-hint">&ldquo;${esc(item.source_fragment)}&rdquo;</blockquote>`:''}
    <p class="o-recall-prompt">${t('library.recall_desc')}</p>
    <button id="revealRecall" class="o-btn o-btn--outline" type="button" ${revealed?'hidden':''}>${t('library.show_meaning')}</button>
    <div id="recallAnswer" class="o-recall-answer ${revealed?'':'hidden'}">
      ${item.part_of_speech?`<span class="o-type-chip">${esc(item.part_of_speech)}</span>`:''}
      ${item.definition?`<p>${esc(item.definition)}</p>`:''}
      ${uiLocale()==='vi'&&item.translation_vi?`<p class="o-recall-translation">${esc(item.translation_vi)}</p>`:''}
      ${uiLocale()==='vi'&&item.focus_note?`<p class="o-recall-note">${esc(item.focus_note)}</p>`:''}
      <div class="o-recall-actions">
        <button class="o-btn o-btn--outline" type="button" data-review-result="again">${t('library.again')}</button>
        <button class="o-btn o-btn--primary" type="button" data-review-result="got_it">${t('library.got_it')}</button>
      </div>
      <p class="o-recall-disclaimer">${t('library.self_report')}</p>
    </div>
  </article>`;
}

function readGoal(){
  const stored=Number(globalThis.localStorage?.getItem(GOAL_KEY));
  return Number.isFinite(stored)&&stored>0?Math.min(200,Math.round(stored)):20;
}
function readSettings(){
  try{
    const parsed=JSON.parse(globalThis.localStorage?.getItem(SETTINGS_KEY)||'{}');
    return {
      pronounce:parsed.pronounce!==false,
      hints:parsed.hints!==false,
      reveal:parsed.reveal==='immediately'?'immediately':'after',
    };
  }catch{
    return {pronounce:true,hints:true,reveal:'after'};
  }
}
function writeSettings(settings){
  try{globalThis.localStorage?.setItem(SETTINGS_KEY,JSON.stringify(settings));}catch{}
}

/* Auto-pronounce is the browser's own speech synthesis. It is real, it runs on
   the device, and it says nothing about the learner - so it can be wired now
   rather than left as a switch that does nothing. */
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

export async function renderLibrary(root){
  root.innerHTML=`<section class="o-page">${loadingBlock(5)}</section>`;

  let payload;
  try{
    payload=await api.libraryVocabulary();
  }catch(error){
    root.innerHTML=`<section class="o-page">${errorBlock(error.message)}</section>`;
    return;
  }
  state.libraryVocabulary=payload;

  const c=copy();
  const items=payload.items||[];
  const summary=payload.summary||{total:items.length,due:0,available:0};
  const handoffMatches=state.libraryReviewLanguage===state.language;
  const requestedWord=handoffMatches&&typeof state.libraryReviewWord==='string'?state.libraryReviewWord.trim():'';
  const view={tab:'all',filter:'all',sort:'next',page:1,lookup:null,showLookup:false,showRecall:false};
  const settings=readSettings();
  let goal=readGoal();

  const typeOrder=state.language==='zh'?TYPE_ORDER_ZH:TYPE_ORDER_EN;
  const byType=items.reduce((groups,item)=>{
    const key=itemType(item);
    groups[key]=(groups[key]||0)+1;
    return groups;
  },{});
  /* Every category the language has, whether or not this learner has met it,
     then anything the dictionary labelled that the list does not name. An empty
     category is still worth showing: it tells a learner the kind exists. */
  const typeTabs=[...typeOrder,
    ...Object.keys(byType).filter(key=>!typeOrder.includes(key))];

  const counts={
    all:items.length,
    due:items.filter(item=>item.due).length,
    soon:items.filter(isSoon).length,
  };
  counts.later=items.length-counts.due-counts.soon;

  const recalls=items.reduce((total,item)=>total+(Number(item.successful_recalls)||0),0);
  const lapses=items.reduce((total,item)=>total+(Number(item.lapse_count)||0),0);
  const accuracy=recalls+lapses?Math.round((recalls/(recalls+lapses))*100):null;
  const doneToday=items.filter(reviewedToday).length;

  const focusAreas=Object.entries(items.filter(item=>item.due).reduce((groups,item)=>{
    const key=String(item.part_of_speech||'').trim()||t('library.no_definition');
    groups[key]=(groups[key]||0)+1;
    return groups;
  },{})).sort((a,b)=>b[1]-a[1]).slice(0,3);

  const visible=()=>{
    let rows=items;
    if(view.tab!=='all')rows=rows.filter(item=>itemType(item)===view.tab);
    if(view.filter==='due')rows=rows.filter(item=>item.due);
    else if(view.filter==='soon')rows=rows.filter(isSoon);
    else if(view.filter==='new')rows=rows.filter(item=>!Number(item.review_stage));
    const sorted=[...rows];
    if(view.sort==='alpha')sorted.sort((a,b)=>a.word.localeCompare(b.word));
    else if(view.sort==='added')sorted.sort((a,b)=>String(b.added_at).localeCompare(String(a.added_at)));
    else if(view.sort==='mastery')sorted.sort((a,b)=>(Number(b.review_stage)||0)-(Number(a.review_stage)||0));
    else sorted.sort((a,b)=>(a.due===b.due?String(a.next_review_at).localeCompare(String(b.next_review_at)):a.due?-1:1));
    return sorted;
  };

  const requestedDue=requestedWord&&items.find(item=>item.due&&String(item.word||'').trim()===requestedWord);
  const due=requestedDue||items.find(item=>item.due)||null;
  if(requestedDue) view.showRecall=true;
  state.libraryReviewWord=null;
  state.libraryReviewLanguage=null;

  const html=()=>{
    const rows=visible();
    const pages=Math.max(1,Math.ceil(rows.length/PAGE_SIZE));
    const page=Math.min(view.page,pages);
    const slice=rows.slice((page-1)*PAGE_SIZE,page*PAGE_SIZE);
    const from=rows.length?((page-1)*PAGE_SIZE)+1:0;
    const to=Math.min(page*PAGE_SIZE,rows.length);

    const tab=(key,label,count,hint='')=>`<button type="button" class="o-lib-tab ${view.tab===key?'is-active':''} ${count?'':'is-empty'}" data-lib-tab="${key}" aria-pressed="${view.tab===key}"${hint?` title="${esc(hint)}"`:''}>
      <span>${esc(label)}</span><b>${count||0}</b>
    </button>`;

    return `<section class="o-page library-page">
      <section class="o-card o-recall-head">
        <span class="o-recall-icon">${oIcon('library')}</span>
        <div class="o-recall-identity">
          <h2>${esc(c.title)}</h2>
          <p>${esc(c.lead)}</p>
        </div>
        <div class="o-recall-count">
          <strong>${summary.due}</strong>
          <span>${esc(c.itemsDue)}</span>
        </div>
        <button type="button" class="o-btn o-btn--primary" data-lib-review ${summary.due?'':'disabled'}>
          <span>${esc(c.reviewNow)}</span>${oIcon('arrowRight')}
        </button>
      </section>

      <div id="recallSlot" class="o-recall-slot ${view.showRecall?'':'hidden'}">${recallCard(due,settings)}</div>

      <div class="o-lib-toolbar">
        <div class="o-lib-tabs" role="group">
          ${tab('all',c.all,counts.all)}
          ${typeTabs.map(key=>tab(key,typeLabel(key),byType[key],typeInfo(key))).join('')}
          ${infoTip(c.tabTip)}
        </div>
        <div class="o-lib-tools">
          <label class="o-lib-select">
            <span class="o-visually-hidden">${esc(c.filters)}</span>
            ${oIcon('rubric')}
            <select data-lib-filter aria-label="${esc(c.filters)}">
              <option value="all" ${view.filter==='all'?'selected':''}>${esc(c.filterAll)}</option>
              <option value="due" ${view.filter==='due'?'selected':''}>${esc(c.filterDue)}</option>
              <option value="soon" ${view.filter==='soon'?'selected':''}>${esc(c.filterSoon)}</option>
              <option value="new" ${view.filter==='new'?'selected':''}>${esc(c.filterNew)}</option>
            </select>
          </label>
          <label class="o-lib-select">
            <span class="o-visually-hidden">${esc(c.sort)}</span>
            ${oIcon('chevronUp')}
            <select data-lib-sort aria-label="${esc(c.sort)}">
              <option value="next" ${view.sort==='next'?'selected':''}>${esc(c.sortNext)}</option>
              <option value="added" ${view.sort==='added'?'selected':''}>${esc(c.sortAdded)}</option>
              <option value="alpha" ${view.sort==='alpha'?'selected':''}>${esc(c.sortAlpha)}</option>
              <option value="mastery" ${view.sort==='mastery'?'selected':''}>${esc(c.sortMastery)}</option>
            </select>
          </label>
          <button type="button" class="o-btn o-btn--outline o-btn--compact" data-lib-add>${oIcon('write')}<span>${esc(c.addWord)}</span></button>
        </div>
      </div>

      <section class="o-card o-lookup ${view.showLookup?'':'hidden'}">
        ${supportNote('lookup_tip',state.profile||{})}
        <form id="lookupForm" class="o-lookup-form">
          <label class="o-visually-hidden" for="lookupInput">${t('library.placeholder')}</label>
          <input id="lookupInput" class="o-control" type="text" maxlength="180" autocomplete="off" placeholder="${state.language==='zh'?'例如：越来越':'e.g. take responsibility'}">
          <button class="o-btn o-btn--outline" type="submit">${t('library.lookup')}</button>
        </form>
        <div id="lookupResult"></div>
      </section>

      <div class="o-lib-body">
        <section class="o-card o-lib-table-card">
          ${!slice.length&&view.tab!=='all'&&TYPE_INFO[view.tab]?`<div class="o-recall-empty o-category-empty">
            <span class="o-type-chip o-type-chip--${esc(view.tab)}">${esc(typeLabel(view.tab))}</span>
            <p>${esc(typeInfo(view.tab))}</p>
            <strong>${esc(c.categoryEmpty)}</strong>
          </div>`:slice.length?`<div class="o-lib-scroll"><table class="o-lib-table">
            <thead><tr>
              <th>${esc(c.colItem)}</th>
              <th>${esc(c.colType)}</th>
              <th>${esc(c.colMastery)}</th>
              <th>${esc(c.colNext)}</th>
              <th>${esc(c.colLast)}</th>
              <th><span class="o-visually-hidden">${esc(c.rowMenu)}</span></th>
            </tr></thead>
            <tbody>${slice.map(tableRow).join('')}</tbody>
          </table></div>`:`<div class="o-recall-empty">
            <strong>${t('library.empty')}</strong>
            <p>${t('library.empty_desc')}</p>
          </div>`}
          ${rows.length?`<div class="o-lib-foot">
            <span>${esc(c.countOf.replace('{from}',String(from)).replace('{to}',String(to)).replace('{total}',String(rows.length)))}</span>
            <div class="o-pager">
              <button type="button" class="o-icon-button" data-lib-page="${page-1}" ${page<=1?'disabled':''} aria-label="${esc(c.filters)}">${oIcon('arrowLeft')}</button>
              ${Array.from({length:pages},(_,i)=>i+1).filter(n=>n===1||n===pages||Math.abs(n-page)<=1)
                .map((n,i,list)=>`${i&&n-list[i-1]>1?'<span class="o-pager-gap">…</span>':''}<button type="button" class="o-pager-page ${n===page?'is-active':''}" data-lib-page="${n}">${n}</button>`).join('')}
              <button type="button" class="o-icon-button" data-lib-page="${page+1}" ${page>=pages?'disabled':''} aria-label="${esc(c.sort)}">${oIcon('arrowRight')}</button>
            </div>
          </div>`:''}
        </section>

        <aside class="o-lib-rail">
          <section class="o-card o-panel o-lib-panel">
            <h3 class="o-label">${esc(c.yourReview)}${infoTip(c.donutTip)}</h3>
            <div class="o-donut-row">
              <div class="o-donut-wrap">
                ${donut(counts)}
                <div class="o-donut-centre"><strong>${counts.due}</strong><span>${esc(c.itemsDue)}</span></div>
              </div>
              <ul class="o-donut-legend">
                <li><i class="is-due"></i><b>${counts.due}</b><span>${esc(c.dueNow)}</span></li>
                <li><i class="is-soon"></i><b>${counts.soon}</b><span>${esc(c.dueSoon)}</span></li>
                <li><i class="is-later"></i><b>${counts.later}</b><span>${esc(c.notDue)}</span></li>
              </ul>
            </div>
          </section>

          <section class="o-card o-panel o-lib-panel">
            <div class="o-panel-head">
              <h3 class="o-label">${esc(c.dailyGoal)}${infoTip(c.goalTip)}</h3>
              <button type="button" class="o-text-link" data-lib-goal>${esc(c.editGoal)}</button>
            </div>
            <p class="o-goal-line">${esc(c.goalProgress.replace('{done}',String(doneToday)).replace('{goal}',String(goal)))}</p>
            <div class="o-meter"><span style="width:${Math.min(100,goal?Math.round((doneToday/goal)*100):0)}%"></span></div>
            <p class="o-panel-copy">${esc(doneToday>=goal?c.goalHit:c.goalLeft.replace('{n}',String(Math.max(0,goal-doneToday))))}</p>
          </section>

          <section class="o-card o-panel o-lib-panel">
            <h3 class="o-label">${esc(c.streak)}</h3>
            <div class="o-streak-row">
              <span class="o-streak-flame">${oIcon('flame')}</span>
              <strong>${esc(c.streakDays.replace('{n}',String(Number(state.dashboard?.streak)||0)))}</strong>
              <span class="o-panel-copy">${esc(c.keepGoing)}</span>
            </div>
          </section>

          <section class="o-card o-panel o-lib-panel">
            <h3 class="o-label">${esc(c.accuracy)}${infoTip(c.accuracyTip)}</h3>
            ${accuracy===null
              ? `<p class="o-panel-copy">${esc(c.accuracyEmpty)}</p>`
              : `<p class="o-accuracy"><strong>${accuracy}%</strong></p>
                 <p class="o-panel-copy">${esc(c.accuracyScope)} · ${recalls}/${recalls+lapses}</p>`}
          </section>

          <section class="o-card o-panel o-lib-panel">
            <h3 class="o-label">${esc(c.focusAreas)}${infoTip(c.focusTip)}</h3>
            ${focusAreas.length?`<ul class="o-focus-list">
              ${focusAreas.map(([label,count])=>`<li><span>${esc(label)}</span><b>${esc(c.focusDue.replace('{n}',String(count)))}</b></li>`).join('')}
            </ul>`:`<p class="o-panel-copy">${esc(c.focusEmpty)}</p>`}
          </section>

          <section class="o-card o-panel o-lib-panel">
            <h3 class="o-label">${esc(c.studySettings)}${infoTip(c.settingsTip)}</h3>
            <div class="o-setting-row">
              <span>${esc(c.autoPronounce)}</span>
              <label class="o-switch"><input type="checkbox" data-lib-setting="pronounce" ${settings.pronounce?'checked':''}><span></span></label>
            </div>
            <div class="o-setting-row">
              <span>${esc(c.showHints)}</span>
              <label class="o-switch"><input type="checkbox" data-lib-setting="hints" ${settings.hints?'checked':''}><span></span></label>
            </div>
            <div class="o-setting-row">
              <span>${esc(c.revealAnswer)}</span>
              <select class="o-setting-select" data-lib-setting="reveal">
                <option value="after" ${settings.reveal==='after'?'selected':''}>${esc(c.afterAttempt)}</option>
                <option value="immediately" ${settings.reveal==='immediately'?'selected':''}>${esc(c.immediately)}</option>
              </select>
            </div>
          </section>
        </aside>
      </div>
    </section>`;
  };

  const paint=()=>{
    root.innerHTML=html();
    bind();
    /* Every repaint replaces the selects, and this path does not go back
       through the router's post-render pass - without this the listbox
       enhancement is lost and the native control comes back. */
    installSelectEnhancements(root);
  };

  function bind(){
    root.querySelector('[data-lib-review]')?.addEventListener('click',()=>{
      view.showRecall=true;
      paint();
      root.querySelector('#recallSlot')?.scrollIntoView({behavior:'smooth',block:'center'});
      if(settings.pronounce&&due)pronounce(due.word,state.language);
    });
    root.querySelector('[data-lib-add]')?.addEventListener('click',()=>{
      view.showLookup=!view.showLookup;
      paint();
      root.querySelector('#lookupInput')?.focus();
    });
    root.querySelectorAll('[data-lib-tab]').forEach(button=>button.addEventListener('click',()=>{
      view.tab=button.dataset.libTab;view.page=1;paint();
    }));
    root.querySelector('[data-lib-filter]')?.addEventListener('change',event=>{
      view.filter=event.target.value;view.page=1;paint();
    });
    root.querySelector('[data-lib-sort]')?.addEventListener('change',event=>{
      view.sort=event.target.value;view.page=1;paint();
    });
    root.querySelectorAll('[data-lib-page]').forEach(button=>button.addEventListener('click',()=>{
      view.page=Math.max(1,Number(button.dataset.libPage)||1);paint();
    }));
    root.querySelector('[data-lib-goal]')?.addEventListener('click',()=>{
      const answer=globalThis.prompt?.(copy().goalPrompt,String(goal));
      const parsed=Number(answer);
      if(Number.isFinite(parsed)&&parsed>0){
        goal=Math.min(200,Math.round(parsed));
        try{globalThis.localStorage?.setItem(GOAL_KEY,String(goal));}catch{}
        paint();
      }
    });
    root.querySelectorAll('[data-lib-setting]').forEach(control=>{
      control.addEventListener('change',()=>{
        const key=control.dataset.libSetting;
        settings[key]=control.type==='checkbox'?control.checked:control.value;
        writeSettings(settings);
        paint();
      });
    });

    const reveal=root.querySelector('#revealRecall');
    const answer=root.querySelector('#recallAnswer');
    reveal?.addEventListener('click',()=>{
      answer?.classList.remove('hidden');
      reveal.disabled=true;
      reveal.textContent=t('library.meaning_revealed');
    });

    root.querySelectorAll('[data-review-result]').forEach(button=>{
      button.addEventListener('click',async()=>{
        if(!due)return;
        try{
          await runBusy(button,async()=>{
            await api.reviewLibraryVocabulary(due.word,button.dataset.reviewResult);
            toast(button.dataset.reviewResult==='got_it'?t('library.recall_saved'):t('library.recall_again'));
            await renderLibrary(root);
          },{label:t('busy.saving')});
        }catch(error){
          toast(error.message||t('library.recall_failed'));
        }
      });
    });

    root.querySelectorAll('[data-delete-term]').forEach(button=>{
      button.addEventListener('click',async()=>{
        button.disabled=true;
        try{
          await api.deleteLibraryVocabulary(button.dataset.deleteTerm);
          toast(t('library.removed'));
          await renderLibrary(root);
        }catch(error){
          button.disabled=false;
          toast(error.message||t('library.remove_failed'));
        }
      });
    });

    const form=root.querySelector('#lookupForm');
    const input=root.querySelector('#lookupInput');
    const resultSlot=root.querySelector('#lookupResult');
    form?.addEventListener('submit',async event=>{
      event.preventDefault();
      const term=input.value.trim();
      if(!term)return;
      const submit=form.querySelector('button[type="submit"]');
      resultSlot.innerHTML=loadingBlock(2);

      try{
        await runBusy(submit,async()=>{
          view.lookup=await api.dictionary(term);
          resultSlot.innerHTML=lookupCard(view.lookup);
          /* The shared dictionary card is only half-rendered as markup: the
             stroke section is a placeholder and the character chips need their
             delegated click. Both are finished here. */
          mountDictionaryResult(resultSlot);
        },{label:t('busy.looking_up')});

        root.querySelector('#saveLookup')?.addEventListener('click',async saveEvent=>{
          const button=saveEvent.currentTarget;
          button.disabled=true;
          button.textContent=t('busy.saving');
          const definitions=Array.isArray(view.lookup?.definitions)?view.lookup.definitions:[];
          const first=definitions.find(entry=>entry&&typeof entry==='object')||{};
          try{
            await api.saveLibraryVocabulary({
              word:view.lookup.word||term,
              phonetic:view.lookup.phonetic||'',
              part_of_speech:view.lookup.part_of_speech||first.part_of_speech||'',
              definition:first.definition||view.lookup.definition||'',
              translation_vi:view.lookup.translation_vi||'',
              source_fragment:first.example||'',
              source_kind:'dictionary',
              focus_note:view.lookup.usage_note_vi||'',
            });
            toast(t('library.saved_to_library'));
            await renderLibrary(root);
          }catch(error){
            button.disabled=false;
            button.textContent=t('library.save');
            toast(error.message||t('library.save_failed'));
          }
        });
      }catch(error){
        view.lookup=null;
        resultSlot.innerHTML=errorBlock(error.message||t('dictionary.failed'));
      }
    });
  }

  paint();
}
