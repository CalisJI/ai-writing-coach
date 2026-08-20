const STORAGE_KEY='orena.media-import-resume.v1';
const MAX_AGE_MS=6*60*60*1000;

const languageKey=value=>typeof value==='string'?value.trim().toLowerCase():'';

function readAll(){
  try{
    const parsed=JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}');
    return parsed&&typeof parsed==='object'&&!Array.isArray(parsed)?parsed:{};
  }catch{
    return {};
  }
}

function writeAll(value){
  try{
    localStorage.setItem(STORAGE_KEY,JSON.stringify(value));
    return true;
  }catch{
    return false;
  }
}

export function setPendingMediaImport({learning_language='',job_id='',source_url=''}={}){
  const key=languageKey(learning_language);
  if(!key||typeof job_id!=='string'||job_id.length<20)return false;
  const all=readAll();
  all[key]={job_id,source_url:typeof source_url==='string'?source_url:'',saved_at:Date.now()};
  return writeAll(all);
}

export function getPendingMediaImport(learningLanguage=''){
  const key=languageKey(learningLanguage);
  if(!key)return null;
  const all=readAll();
  const value=all[key];
  if(!value||typeof value.job_id!=='string')return null;
  const savedAt=Number(value.saved_at);
  if(!Number.isFinite(savedAt)||Date.now()-savedAt>MAX_AGE_MS){
    delete all[key];
    writeAll(all);
    return null;
  }
  return {
    job_id:value.job_id,
    source_url:typeof value.source_url==='string'?value.source_url:'',
    saved_at:savedAt,
  };
}

export function clearPendingMediaImport(learningLanguage=''){
  const key=languageKey(learningLanguage);
  if(!key)return false;
  const all=readAll();
  if(!(key in all))return false;
  delete all[key];
  writeAll(all);
  return true;
}
