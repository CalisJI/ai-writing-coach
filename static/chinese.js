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
      o.value=value;o.textContent=label;o.selected=value===selected;
      select.appendChild(o);
    }
  }

  function setText(selector,text){
    const el=$(selector);if(el)el.textContent=text;
  }

  function applyChinese(){
    window.WRITING_COACH_LANGUAGE='zh';
    window.WRITING_COACH_LANGUAGE_CONFIG={
      code:'zh',
      defaultLevel:ZH.defaultLevel,
      taskModes:ZH.modes.filter(x=>!['free','custom'].includes(x[0])).map(x=>x[0]),
      topics:ZH.topics.filter(x=>x[0]!=='random').map(x=>x[0]),
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

    setText('#wordCount','0 字');

    const dashboardHeader=$('#page-dashboard header p');
    if(dashboardHeader)dashboardHeader.textContent='Theo dõi kỹ năng viết tiếng Trung của bạn theo thời gian.';

    const writeSubtitle=$('#writeSubtitle');
    if(writeSubtitle)writeSubtitle.textContent='Viết bằng tiếng Trung, sau đó để AI Coach phân tích lỗi và mẫu cần cải thiện.';

    const practiceSmall=document.querySelector('.practice-head small');
    if(practiceSmall)practiceSmall.textContent='Chọn dạng bài hoặc để AI Coach tạo một bài luyện viết tiếng Trung.';

    const evaluationNote=document.querySelector('.evaluation-note');
    if(evaluationNote)evaluationNote.textContent='Bài viết được đánh giá theo mức HSK học tập đã chọn; đây không phải điểm HSK chính thức.';

    const quick=document.querySelectorAll('#page-dashboard .action-stack .action-btn');
    if(quick[0]){quick[0].textContent='Bắt đầu viết tự do';quick[0].onclick=()=>newWriting();}
    if(quick[1]){quick[1].textContent='Tạo bài mô tả';quick[1].onclick=()=>openGeneratedTask('review');}
    if(quick[2]){quick[2].textContent='Thử bài HSK-style';quick[2].onclick=()=>openGeneratedTask('hsk');}

    const chips=document.querySelector('.mode-chips');
    if(chips)chips.innerHTML=[
      '自由写作','观点','邮件','描述','故事','HSK-style'
    ].map(x=>`<span class="mode-chip">${x}</span>`).join('');

    const libNav=document.querySelector('.nav[data-page="library"]');
    if(libNav){
      libNav.classList.add('hidden');
      libNav.title='Chinese grammar/vocabulary library will be added in the next module release.';
    }

    const analyticsNote=document.querySelector('#page-analytics .rubric small');
    if(analyticsNote)analyticsNote.textContent='Điểm 0–100 là chỉ số theo dõi nội bộ. Mức HSK hiển thị là ước lượng học tập, không phải điểm thi HSK chính thức.';

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