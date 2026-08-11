export const LANGUAGE_CONFIG={
  en:{
    code:'en',
    name:'English',
    htmlLang:'en',
    levels:['A1','A2','B1','B2','C1','C2'],
    defaultLevel:'B2',
    unit:'words',
    modes:[
      ['free','Free writing'],
      ['opinion','Opinion'],
      ['email','Email'],
      ['review','Review'],
      ['story','Story'],
      ['toeic','TOEIC-style'],
      ['custom','Custom task'],
    ],
    lengths:[100,120,150,180,220,280],
    defaultLength:150,
    topics:['random','daily life','work','technology','education','travel','environment','culture and media','shopping and services','communication','community'],
    editorPlaceholder:'Write the way you normally would. Your work is the evidence.',
    freeContext:'No prompt. Focus on expressing what you mean clearly.',
  },
  zh:{
    code:'zh',
    name:'中文',
    htmlLang:'zh-Hans',
    levels:['HSK1','HSK2','HSK3','HSK4','HSK5','HSK6','HSK7-9'],
    defaultLevel:'HSK4',
    unit:'字',
    modes:[
      ['free','自由写作'],
      ['opinion','观点短文'],
      ['email','邮件 / 消息'],
      ['review','描述'],
      ['story','短故事'],
      ['hsk','HSK-style'],
      ['custom','自定义题目'],
    ],
    lengths:[40,60,80,120,180,250],
    defaultLength:80,
    topics:['random','daily life','work','technology','education','travel','environment','culture and media','shopping and services','communication','community'],
    editorPlaceholder:'用你现在会的中文表达真实想法。你的文字就是学习证据。',
    freeContext:'自由写作，不需要题目。先把意思表达清楚。',
  },
};

export function configFor(code){
  return LANGUAGE_CONFIG[code] || LANGUAGE_CONFIG.en;
}

export function countUnits(text,language){
  const value=String(text||'');
  if(language==='zh'){
    const han=(value.match(/[\u3400-\u4DBF\u4E00-\u9FFF]/g)||[]).length;
    const latin=(value.match(/[A-Za-z0-9]+(?:['-][A-Za-z0-9]+)*/g)||[]).length;
    return han+latin;
  }
  return (value.match(/\b[\w'-]+\b/g)||[]).length;
}
