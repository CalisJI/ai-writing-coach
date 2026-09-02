const COPY={
  vi:{
    native_label:'Ngôn ngữ hỗ trợ',
    native_description:'Các hướng dẫn cơ bản và chú giải sẽ ưu tiên ngôn ngữ này. Nội dung bạn đang học vẫn giữ nguyên English / 中文.',
    write_intro:'Viết ý thật của bạn trước. Sau khi gửi, Orena mới dùng chính bài viết này làm bằng chứng để phân tích.',
    setup_tip:'Các lựa chọn này chỉ tạo khung luyện tập; chúng không thay đổi cách chấm hoặc tự sửa nội dung của bạn.',
    review_intro:'Ưu tiên xem lỗi quan trọng nhất trước. Mỗi nhận xét nên nối với đúng câu hoặc cụm từ trong bài của bạn.',
    benchmark_tip:'Điểm này chỉ là ước lượng tham chiếu. Nó không đồng nghĩa với mức độ thành thạo cá nhân.',
    current_focus_tip:'Orena ưu tiên mẫu lỗi có giá trị cải thiện cao nhất thay vì hiển thị mọi lỗi ngang nhau.',
    strength_tip:'Đây là bằng chứng về điều bạn đang làm tốt và nên tiếp tục giữ lại khi sửa bài.',
    next_action_tip:'Mục tiêu là sửa một ý có chủ đích, không viết lại toàn bộ chỉ để đạt điểm cao hơn.',
    journey_intro:'Tiến độ được đọc từ thay đổi trong bài viết, các lần sửa và mẫu lỗi/điểm mạnh lặp lại — không phải số lần mở app.',
    progress_tip:'Tổng quan này dùng bằng chứng từ Writing. Nó không phải dashboard KPI kinh doanh.',
    pinyin_tip:'Pinyin là trợ giúp học tập. Bạn có thể bật nhiều hơn, để tự động, hoặc giảm bớt khi đã quen.',
    lookup_tip:'Chọn một từ hoặc cụm từ rồi tra để xem nghĩa, pinyin/IPA và ví dụ nếu từ điển trả về.',
    compare_tip:'So sánh để hiểu lựa chọn ngôn ngữ tốt hơn; đừng sao chép toàn bộ nếu nó làm mất giọng viết của bạn.',
    score_tip:'Các chỉ số cho biết vị trí tương đối của bài hiện tại. Phần giải thích và bằng chứng mới cho biết cần sửa gì.',
  },
  en:{
    native_label:'Support language',
    native_description:'Basic guidance and help use this language. The language you are learning remains English / 中文.',
    write_intro:'Express the real idea first. Orena uses the submitted writing itself as the evidence for feedback.',
    setup_tip:'These controls frame the practice. They do not change scoring logic or silently rewrite your work.',
    review_intro:'Start with the highest-value issue. Each important comment should stay connected to your actual sentence or phrase.',
    benchmark_tip:'This is a secondary estimate, not a claim of personal mastery.',
    current_focus_tip:'Orena prioritizes the most useful recurring pattern instead of treating every detected issue equally.',
    strength_tip:'This is evidence of something already working that you should preserve while revising.',
    next_action_tip:'Revise with one purpose instead of rewriting everything just to chase a higher score.',
    journey_intro:'Progress comes from changes in writing, revisions, recurring patterns, and repeated strengths — not activity volume.',
    progress_tip:'This overview summarizes Writing evidence. It is not a business KPI dashboard.',
    pinyin_tip:'Pinyin is learning assistance. Keep more, use Auto, or reduce it as recognition becomes easier.',
    lookup_tip:'Select a word or short phrase to look up meaning, pinyin/IPA, and examples when available.',
    compare_tip:'Compare choices to understand why they work better; do not copy the whole version if it removes your voice.',
    score_tip:'Metrics locate the current piece. Evidence and explanation tell you what to change next.',
  },
  zh:{
    native_label:'辅助语言',
    native_description:'基础说明和功能提示会优先使用这个语言。你正在学习的 English / 中文 内容保持不变。',
    write_intro:'先表达真实意思。提交以后，Orena 才会把你的文字作为分析证据。',
    setup_tip:'这些选项只帮助设置练习框架，不会改变评分逻辑，也不会自动改写你的内容。',
    review_intro:'先看最有价值的问题。重要反馈应该连接到你原文中的具体句子或词组。',
    benchmark_tip:'这里只是次要参考估计，不代表个人掌握程度。',
    current_focus_tip:'Orena 会优先处理最值得改善的重复模式，而不是把所有错误同等显示。',
    strength_tip:'这是你已经做得好的证据。修改时应该尽量保留这种能力。',
    next_action_tip:'每次修改只解决一个主要目的，不需要为了分数重写整篇。',
    journey_intro:'进步来自写作变化、修改记录、重复问题和稳定优点，而不是使用次数。',
    progress_tip:'这个总览来自 Writing 证据，不是商业 KPI 仪表盘。',
    pinyin_tip:'拼音是学习辅助。可以保持更多、自动显示，或随着熟练度提高而减少。',
    lookup_tip:'选择一个词或短语，可以查看词义、拼音 / IPA 和例句（如果词典提供）。',
    compare_tip:'用来比较表达选择为什么更好，不要因为“更强版本”而失去自己的表达方式。',
    score_tip:'指标只能帮助定位当前文章。真正告诉你下一步该改什么的是解释和文本证据。',
  },
};

const CATEGORY_REASON={
  vi:{
    grammar:'Phiên bản mới làm quan hệ ngữ pháp rõ hơn và giảm khả năng người đọc hiểu sai thời gian, số lượng hoặc cấu trúc câu.',
    verb_tense:'Phiên bản mới làm mốc thời gian nhất quán hơn với ngữ cảnh của câu.',
    collocation:'Phiên bản mới dùng tổ hợp từ quen thuộc hơn với người dùng ngôn ngữ tự nhiên, nên câu dễ hiểu và ít “dịch từng chữ” hơn.',
    vocabulary:'Phiên bản mới chọn từ chính xác hơn cho ý đang muốn diễn đạt.',
    naturalness:'Phiên bản mới giảm cảm giác dịch từng chữ và gần với cách diễn đạt tự nhiên hơn trong cùng ngữ cảnh.',
    coherence:'Phiên bản mới làm quan hệ giữa các ý rõ hơn để người đọc theo mạch dễ hơn.',
    task_achievement:'Phiên bản mới trả lời trực tiếp hơn vào yêu cầu và làm rõ thông tin chính.',
    expression:'Phiên bản mới giữ ý chính nhưng làm cách diễn đạt rõ và dễ tái sử dụng hơn.',
  },
  en:{
    grammar:'The new version makes the grammatical relationship clearer and reduces ambiguity in time, number, or sentence structure.',
    verb_tense:'The new version aligns the verb time more clearly with the time frame already signaled by the sentence.',
    collocation:'The new version uses a more conventional word combination, so the phrase reads less like a literal translation.',
    vocabulary:'The new version chooses a word that matches the intended meaning more precisely.',
    naturalness:'The new version removes wording that sounds translated or unusually formal for this context.',
    coherence:'The new version makes the relationship between ideas easier to follow.',
    task_achievement:'The new version answers the task more directly and makes the key information easier to identify.',
    expression:'The new version keeps the meaning while making the phrasing clearer and easier to reuse.',
  },
  zh:{
    grammar:'新的表达让语法关系更清楚，减少时态、数量或句子结构上的歧义。',
    verb_tense:'新的表达让动词时间和句子中的时间信息更一致。',
    collocation:'新的表达使用更常见的词语搭配，减少逐字翻译的感觉。',
    vocabulary:'新的表达选择了更准确的词来表达原意。',
    naturalness:'新的表达减少生硬或直译感，更符合这个语境里的自然用法。',
    coherence:'新的表达让句子之间的关系更清楚，更容易跟上思路。',
    task_achievement:'新的表达更直接回应任务要求，并突出关键信息。',
    expression:'新的表达保留原意，同时让说法更清楚、更容易复用。',
  },
};

const CATEGORY_RULE={
  vi:{
    verb_tense:'Đối chiếu động từ với mốc thời gian đã có trong câu trước khi sửa từ vựng hoặc phong cách.',
    collocation:'Ưu tiên học cả cụm từ tự nhiên thay vì ghi nhớ từng từ riêng lẻ.',
    naturalness:'So sánh cách người bản ngữ kết hợp từ trong đúng ngữ cảnh, không chỉ kiểm tra câu có “đúng ngữ pháp” hay không.',
    grammar:'Xác định quan hệ ngữ pháp chính của câu rồi mới chỉnh các chi tiết nhỏ.',
    vocabulary:'Chọn từ theo nghĩa và ngữ cảnh, không chỉ theo mức độ “nâng cao”.',
    coherence:'Mỗi câu nên cho người đọc biết nó đang bổ sung, giải thích, đối lập hay kết luận ý trước.',
    expression:'Giữ nguyên ý trước, sau đó mới làm câu ngắn gọn và tự nhiên hơn.',
  },
  en:{
    verb_tense:'Match the main verb to the time signal in the sentence before polishing vocabulary or style.',
    collocation:'Learn natural word combinations as units instead of memorizing isolated words.',
    naturalness:'Compare how words are normally combined in this context, not only whether the sentence is grammatically possible.',
    grammar:'Identify the main grammatical relationship first, then refine smaller details.',
    vocabulary:'Choose words for meaning and context, not simply because they sound more advanced.',
    coherence:'Make it clear whether each sentence adds, explains, contrasts, or concludes the previous idea.',
    expression:'Preserve the meaning first, then make the phrasing clearer and more natural.',
  },
  zh:{
    verb_tense:'先确认句子的时间信息，再调整动词形式和其他表达。',
    collocation:'把自然搭配当成一个整体来学习，而不是只记单个词。',
    naturalness:'不仅看语法是否成立，也要看这个语境里是否真的这样搭配。',
    grammar:'先确定句子的主要语法关系，再处理小细节。',
    vocabulary:'按意义和语境选词，不要只追求“更高级”的词。',
    coherence:'让每句话和上一句之间的补充、解释、对比或结论关系清楚。',
    expression:'先保留原意，再让表达更清楚、更自然。',
  },
};

export function nativeLanguage(profile={}){
  const value=String(profile.support_language||profile.native_language||'');
  return ['vi','en','zh'].includes(value)?value:'vi';
}

export function supportCopy(key,profile={}){
  const locale=nativeLanguage(profile);
  return COPY[locale]?.[key]||COPY.en[key]||'';
}

export function supportNote(key,profile={}){
  const locale=nativeLanguage(profile);
  if(locale==='en')return '';
  const text=supportCopy(key,profile);
  return text?`<p class="native-guide" lang="${locale==='zh'?'zh-Hans':'vi'}">${text}</p>`:'';
}

function categoryKey(category=''){
  const key=String(category||'expression').toLowerCase().replaceAll('-','_').replaceAll(' ','_');
  const aliases={
    article:'grammar',
    article_usage:'grammar',
    subject_verb_agreement:'grammar',
    word_order:'grammar',
    sentence_structure:'grammar',
    verb_form:'verb_tense',
    tense:'verb_tense',
    word_choice:'vocabulary',
    lexical_choice:'vocabulary',
    precision:'vocabulary',
    organization:'coherence',
    organisation:'coherence',
    linking:'coherence',
    flow:'coherence',
    tone:'naturalness',
    register:'naturalness',
  };
  return aliases[key]||key;
}

export function categoryReason(category,profile={}){
  const locale=nativeLanguage(profile);
  const key=categoryKey(category);
  return CATEGORY_REASON[locale]?.[key]
    || CATEGORY_REASON[locale]?.expression
    || CATEGORY_REASON.en.expression;
}

export function categoryRule(category,profile={}){
  const locale=nativeLanguage(profile);
  const key=categoryKey(category);
  return CATEGORY_RULE[locale]?.[key]
    || CATEGORY_RULE[locale]?.expression
    || CATEGORY_RULE.en.expression;
}
