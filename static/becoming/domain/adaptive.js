const EN_RANK={A1:1,A2:2,B1:3,B2:4,C1:5,C2:6};
const ZH_RANK={HSK1:1,HSK2:2,HSK3:3,HSK4:4,HSK5:5,HSK6:6,'HSK7-9':7};

function rankFor(language,level){
  return Number((language==='zh'?ZH_RANK:EN_RANK)[level]||0);
}

export function guidanceMode(profile={},language='en',level=''){
  const style=profile?.style||'guided';
  const rank=rankFor(language,level);

  if(style==='deep')return 'advanced';
  if(style==='concise')return 'concise';
  if(style==='examples')return 'examples';

  if(language==='zh'){
    if(rank && rank<=2)return 'guided';
    if(rank>=6)return 'advanced';
  }else{
    if(rank && rank<=2)return 'guided';
    if(rank>=5)return 'advanced';
  }
  return 'guided';
}

export function guidanceLabel(mode){
  return {
    guided:'Step-by-step',
    examples:'Examples first',
    concise:'Concise',
    advanced:'Deep analysis',
  }[mode]||'Adaptive';
}

export function feedbackBudget(mode){
  if(mode==='concise')return {visibleEvidence:1,extraEvidence:2,showRule:false,showMetrics:false};
  if(mode==='guided')return {visibleEvidence:2,extraEvidence:3,showRule:true,showMetrics:false};
  if(mode==='examples')return {visibleEvidence:3,extraEvidence:3,showRule:false,showMetrics:false};
  return {visibleEvidence:4,extraEvidence:5,showRule:true,showMetrics:true};
}

export function writingScaffold(mode,language='en'){
  if(mode==='advanced'){
    return {
      title:language==='zh'?'保留自主空间':'Keep your autonomy',
      items:language==='zh'
        ?['先写真实观点','需要时再增加限制条件','提交后再深入分析']
        :['Write the real idea first','Add constraints only when they help','Use analysis after the draft exists'],
    };
  }

  if(mode==='concise'){
    return {
      title:language==='zh'?'只保留必要提示':'Only the essentials',
      items:language==='zh'
        ?['表达一个清楚意思','提交后只看最重要问题']
        :['Express one clear idea','Review only the highest-value issue after submission'],
    };
  }

  if(mode==='examples'){
    return {
      title:language==='zh'?'先用例子建立方向':'Use examples as anchors',
      items:language==='zh'
        ?['先写你会表达的版本','提交后比较更自然的用法','再回到自己的句子修改']
        :['Write the version you can produce now','Compare it with stronger usage after review','Return to your own sentence and revise'],
    };
  }

  return {
    title:language==='zh'?'一步一步，不需要一次写完美':'One step at a time',
    items:language==='zh'
      ?['先把意思写清楚','再补充必要支持','最后检查结尾是否完整']
      :['Get the meaning down first','Add enough support for the idea','Finish with a clear ending'],
  };
}
