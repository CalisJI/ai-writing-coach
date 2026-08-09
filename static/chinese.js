(function(){
  const $ = (s) => document.querySelector(s);

  const ZH = {
    levels: ['HSK1','HSK2','HSK3','HSK4','HSK5','HSK6','HSK7-9'],
    defaultLevel: 'HSK4',
    modes: [
      ['free','自由写作'],
      ['opinion','观点短文'],
      ['email','邮件 / 消息'],
      ['review','描述 / 看图写作'],
      ['story','短故事'],
      ['hsk','HSK 风格练习'],
      ['custom','自定义题目']
    ],
    topics: [
      ['random','随机'],
      ['daily life','日常生活'],
      ['work','工作'],
      ['technology','科技'],
      ['education','教育'],
      ['travel','旅行'],
      ['environment','环境'],
      ['culture and media','文化与媒体'],
      ['shopping and services','购物与服务'],
      ['communication','沟通'],
      ['community','社区']
    ],
    lengths: [
      [40,'~40 字'],
      [60,'~60 字'],
      [80,'~80 字'],
      [120,'~120 字'],
      [180,'~180 字'],
      [250,'~250 字']
    ]
  };

  function setOptions(select, rows, selected){
    if(!select)return;
    select.innerHTML='';
    for(const [value,label] of rows){
      const o=document.createElement('option');
      o.value=value;
      o.textContent=label;
      o.selected=value===selected;
      select.appendChild(o);
    }
  }

  function text(selector,value){
    const el=$(selector);
    if(el)el.textContent=value;
  }

  function applyChineseLibrary(){
    const nav=document.querySelector('.nav[data-page="library"]');
    if(nav){
      nav.classList.remove('hidden');
      nav.textContent='▤ Chinese Library';
      nav.title='';
    }

    const header=$('#page-library header h1');
    if(header)header.textContent='Chinese Learning Library';
    const headerP=$('#page-library header p');
    if(headerP)headerP.textContent='Ngữ pháp, pinyin và sổ từ vựng tiếng Trung được lưu riêng cho tài khoản của bạn.';

    text('#grammarTabBtn','Ngữ pháp');
    text('#vocabTabBtn','Từ vựng của tôi');

    const kicker=document.querySelector('.course-kicker');
    if(kicker)kicker.textContent='HSK-ORIENTED GRAMMAR PATH';
    const heroTitle=document.querySelector('.course-hero-copy h2');
    if(heroTitle)heroTitle.textContent='Học từ cấu trúc câu cơ bản đến văn viết nâng cao';
    const heroP=document.querySelector('.course-hero-copy > p');
    if(heroP)heroP.textContent='56 bài học được sắp xếp theo các HSK learning bands nội bộ của Writing Coach. Đây không phải giáo trình HSK chính thức.';

    const startLabel=document.querySelector('.course-controls label');
    if(startLabel){
      const select=startLabel.querySelector('select');
      startLabel.childNodes[0].textContent='Bắt đầu từ mức ';
      if(select)setOptions(select,ZH.levels.map(x=>[x,x]),'HSK1');
    }

    text('#continueCourseBtn','Tiếp tục học');
    const noteTitle=document.querySelector('.curriculum-note b');
    const noteText=document.querySelector('.curriculum-note span');
    if(noteTitle)noteTitle.textContent='Cách học';
    if(noteText)noteText.textContent='Đọc giải thích → xem câu Trung + pinyin → xem lỗi thường gặp → tự viết ví dụ → đánh dấu hoàn thành.';

    const search=$('#grammarSearch');
    if(search)search.placeholder='Tìm cấu trúc tiếng Trung...';
    const filter=$('#grammarLevel');
    if(filter){
      setOptions(filter,[['all','Tất cả mức'],...ZH.levels.map(x=>[x,x])],'all');
    }

    const path=document.querySelector('.level-path');
    if(path){
      path.innerHTML=ZH.levels.map((level,i)=>
        `<span>${level}</span>${i<ZH.levels.length-1?'<i></i>':''}`
      ).join('');
    }

    const vocabTitle=document.querySelector('.vocab-intro h2');
    const vocabP=document.querySelector('.vocab-intro p');
    if(vocabTitle)vocabTitle.textContent='Sổ từ vựng tiếng Trung';
    if(vocabP)vocabP.textContent='Bôi đen chữ hoặc cụm từ tiếng Trung để xem pinyin, nghĩa tiếng Việt, ví dụ và lưu lại.';
    text('#savedWordCount','0 từ');
  }

  function applyChinese(){
    window.WRITING_COACH_LANGUAGE='zh';
    window.WRITING_COACH_LANGUAGE_CONFIG={
      code:'zh',
      defaultLevel:ZH.defaultLevel,
      taskModes:ZH.modes.filter(x=>!['free','custom'].includes(x[0])).map(x=>x[0]),
      topics:ZH.topics.filter(x=>x[0]!=='random').map(x=>x[0]),
      grammarLevels:ZH.levels,
      unit:'characters'
    };

    document.documentElement.lang='zh-Hans';

    setOptions($('#taskMode'),ZH.modes,'free');
    setOptions($('#taskTopic'),ZH.topics,'random');
    setOptions($('#target'),ZH.levels.map(x=>[x,x]),ZH.defaultLevel);
    setOptions($('#taskLength'),ZH.lengths.map(([v,l])=>[String(v),l]),'80');

    const essay=$('#essayText');
    if(essay)essay.placeholder='在这里开始用中文写作…';
    const prompt=$('#prompt');
    if(prompt)prompt.placeholder='输入你自己的中文写作题目或要求。';

    text('#wordCount','0 字');

    const dashboardHeader=$('#page-dashboard header p');
    if(dashboardHeader)dashboardHeader.textContent='Theo dõi kỹ năng viết tiếng Trung của bạn theo thời gian.';
    const writeSubtitle=$('#writeSubtitle');
    if(writeSubtitle)writeSubtitle.textContent='Viết bằng tiếng Trung, sau đó để AI Coach phân tích lỗi và mẫu cần cải thiện.';
    const practiceSmall=document.querySelector('.practice-head small');
    if(practiceSmall)practiceSmall.textContent='Chọn dạng bài hoặc để AI Coach tạo một bài luyện viết tiếng Trung.';
    const evaluationNote=document.querySelector('.evaluation-note');
    if(evaluationNote)evaluationNote.textContent='Mức HSK hiển thị là learning-band estimate nội bộ, không phải điểm thi HSK chính thức.';

    const quick=document.querySelectorAll('#page-dashboard .action-stack .action-btn');
    if(quick[0]){quick[0].textContent='Bắt đầu viết tự do';quick[0].onclick=()=>newWriting();}
    if(quick[1]){quick[1].textContent='Tạo bài mô tả';quick[1].onclick=()=>openGeneratedTask('review');}
    if(quick[2]){quick[2].textContent='Thử bài HSK-style';quick[2].onclick=()=>openGeneratedTask('hsk');}

    const chips=document.querySelector('.mode-chips');
    if(chips)chips.innerHTML=['自由写作','观点','邮件','描述','故事','HSK-style']
      .map(x=>`<span class="mode-chip">${x}</span>`).join('');

    const analyticsNote=document.querySelector('#page-analytics .rubric small');
    if(analyticsNote)analyticsNote.textContent='Điểm 0–100 là chỉ số theo dõi nội bộ. HSK là ước lượng learning band, không phải điểm thi chính thức.';

    applyChineseLibrary();

    if(typeof updateWordCount==='function')updateWordCount();
    if(typeof syncTaskMode==='function')syncTaskMode();
  }

  function applyEnglish(){
    window.WRITING_COACH_LANGUAGE='en';
    window.WRITING_COACH_LANGUAGE_CONFIG={
      code:'en',
      defaultLevel:'B2',
      taskModes:['opinion','email','review','story','toeic'],
      topics:['daily life','work','technology','education','travel','environment','culture and media','shopping and services','communication','community'],
      grammarLevels:['A1','A2','B1','B2','C1','C2'],
      unit:'words'
    };
  }

  async function init(){
    try{
      const r=await fetch('/api/platform/languages',{cache:'no-store'});
      if(!r.ok)return;
      const data=await r.json();
      if(data.active==='zh')applyChinese();
      else applyEnglish();
    }catch(err){
      console.error('Language UI init failed:',err);
      applyEnglish();
    }
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',init);
  }else{
    init();
  }
})();