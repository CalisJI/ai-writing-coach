export const MAX_LISTENING_RECONSTRUCTION_CHARS=2000;
export const MAX_LISTENING_EVALUATION_UNITS=500;

export class ListeningPracticeError extends Error{
  constructor(code,message){super(message);this.name='ListeningPracticeError';this.code=code;}
}

function normalizedText(value){
  return String(value??'')
    .normalize('NFKC')
    .replace(/[\u2018\u2019\u02bc]/g,"'")
    .replace(/[\u2010-\u2015\u2212]/g,'-')
    .replace(/\s+/gu,' ')
    .trim();
}

export function listeningUnits(value,sourceLanguage){
  const normalized=normalizedText(value);
  if(sourceLanguage==='zh'){
    return (normalized.match(/\p{Script=Han}|[\p{L}\p{N}]+(?:['-][\p{L}\p{N}]+)*/gu)||[])
      .map(unit=>/^\p{Script=Han}$/u.test(unit)?unit:unit.toLocaleLowerCase('en'));
  }
  return (normalized.toLocaleLowerCase('en').match(/[\p{L}\p{N}]+(?:['-][\p{L}\p{N}]+)*/gu)||[]);
}

export function listeningEditDistance(expectedUnits,answerUnits){
  let previous=Array.from({length:answerUnits.length+1},(_,index)=>index);
  for(let row=1;row<=expectedUnits.length;row+=1){
    const current=[row];
    for(let column=1;column<=answerUnits.length;column+=1){
      const substitution=previous[column-1]+(expectedUnits[row-1]===answerUnits[column-1]?0:1);
      current[column]=Math.min(previous[column]+1,current[column-1]+1,substitution);
    }
    previous=current;
  }
  return previous[answerUnits.length];
}

export function evaluateListeningReconstruction({source_language,expected,answer}){
  const expectedText=normalizedText(expected);
  const answerText=normalizedText(answer);
  if(!expectedText)throw new ListeningPracticeError('canonical_empty','The canonical transcript segment is empty.');
  if(!answerText)throw new ListeningPracticeError('answer_empty','Type what you heard before checking.');
  if(answerText.length>MAX_LISTENING_RECONSTRUCTION_CHARS){
    throw new ListeningPracticeError('answer_too_large','Your reconstruction is too long to check safely.');
  }
  const expectedUnits=listeningUnits(expectedText,source_language);
  const answerUnits=listeningUnits(answerText,source_language);
  if(!expectedUnits.length)throw new ListeningPracticeError('canonical_empty','The canonical transcript segment has no comparable text.');
  if(!answerUnits.length)throw new ListeningPracticeError('answer_empty','Type what you heard before checking.');
  if(expectedUnits.length>MAX_LISTENING_EVALUATION_UNITS||answerUnits.length>MAX_LISTENING_EVALUATION_UNITS){
    throw new ListeningPracticeError('evaluation_too_large','This segment is too large to check safely.');
  }
  const edit_distance=listeningEditDistance(expectedUnits,answerUnits);
  const denominator=Math.max(expectedUnits.length,answerUnits.length);
  const accuracy_percent=Math.round(Math.max(0,Math.min(1,1-edit_distance/denominator))*100);
  return {
    accuracy_percent,
    exact:edit_distance===0,
    expected_unit_count:expectedUnits.length,
    answer_unit_count:answerUnits.length,
    edit_distance,
  };
}

function emptySegmentState(){
  return {draft:'',attempts:[],checked_attempt_count:0,best_result:null,last_attempt:null,revealed:false,presentation:'prompt'};
}

function requireSegment(session,segmentId){
  const state=session.segments[segmentId];
  if(!state)throw new ListeningPracticeError('unknown_segment','The selected transcript segment is unavailable.');
  return state;
}

export function createListeningPracticeSession({asset_id,segment_ids}){
  const ids=[...segment_ids];
  if(!asset_id||!ids.length||new Set(ids).size!==ids.length){
    throw new ListeningPracticeError('invalid_session','Active Listening requires one asset with unique transcript segment IDs.');
  }
  return {
    asset_id,
    current_segment_id:ids[0],
    segment_ids:ids,
    segments:Object.fromEntries(ids.map(segmentId=>[segmentId,emptySegmentState()])),
  };
}

export function selectListeningPracticeSegment(session,segmentId){
  requireSegment(session,segmentId);
  session.current_segment_id=segmentId;
  return session.segments[segmentId];
}

export function setListeningPracticeDraft(session,answer){
  const value=String(answer??'');
  if(value.length>MAX_LISTENING_RECONSTRUCTION_CHARS)return false;
  requireSegment(session,session.current_segment_id).draft=value;
  return true;
}

export function recordListeningPracticeAttempt(session,result){
  const state=requireSegment(session,session.current_segment_id);
  const attempt={answer:state.draft,result:{...result}};
  state.attempts.push(attempt);
  state.checked_attempt_count+=1;
  if(!state.best_result||result.accuracy_percent>state.best_result.accuracy_percent)state.best_result={...result};
  state.last_attempt=attempt;
  state.presentation='checked';
  return attempt;
}

export function revealListeningPracticeAnswer(session){
  const state=requireSegment(session,session.current_segment_id);
  state.revealed=true;
  state.presentation='revealed';
  return state;
}

export function retryListeningPracticeSegment(session){
  const state=requireSegment(session,session.current_segment_id);
  state.draft='';
  state.revealed=false;
  state.presentation='prompt';
  return state;
}

export function listeningPracticeSummary(session){
  const states=Object.values(session.segments);
  const practiced=states.filter(state=>state.revealed||state.attempts.length||Number(state.checked_attempt_count)>0).length;
  const checkedAttempts=states.reduce((total,state)=>total+Number(state.checked_attempt_count??state.attempts.length),0);
  const bestResults=states.map(state=>state.best_result||state.attempts.reduce((best,attempt)=>{
    return !best||attempt.result.accuracy_percent>best.accuracy_percent?attempt.result:best;
  },null)).filter(Boolean);
  const exactSegments=bestResults.filter(result=>result.exact).length;
  const averageBest=bestResults.length
    ?Math.round(bestResults.reduce((total,result)=>total+result.accuracy_percent,0)/bestResults.length)
    :null;
  return {
    practiced_segments:practiced,
    total_segments:session.segment_ids.length,
    checked_attempts:checkedAttempts,
    exact_match_segments:exactSegments,
    revealed_only_segments:states.filter(state=>state.revealed&&!state.attempts.length).length,
    average_best_text_match:averageBest,
  };
}

function normalizedProgressRecord(record,session){
  if(!record||typeof record!=='object'||record.asset_id!==session.asset_id)return null;
  const segmentId=typeof record.segment_id==='string'?record.segment_id:'';
  if(!session.segments[segmentId])return null;
  const presentation=['prompt','checked','revealed'].includes(record.presentation)?record.presentation:'prompt';
  const count=Number(record.checked_attempt_count);
  const accuracy=Number(record.best_accuracy_percent);
  const hasResult=Number.isInteger(count)&&count>0&&Number.isFinite(accuracy)&&accuracy>=0&&accuracy<=100;
  const revealed=record.revealed===true||presentation==='revealed';
  if(presentation==='checked'&&!hasResult)return null;
  if(presentation==='revealed'&&!revealed)return null;
  return {
    segmentId,
    presentation:revealed?'revealed':presentation,
    revealed,
    checked_attempt_count:hasResult?count:0,
    best_result:hasResult?{accuracy_percent:accuracy,exact:record.best_exact===true}:null,
    last_answer:typeof record.last_answer==='string'?record.last_answer:'',
  };
}

export function restoreListeningPracticeProgress(session,records,onRestore=()=>{}){
  if(!session||!Array.isArray(records))return false;
  let restored=false;
  records.map(record=>normalizedProgressRecord(record,session)).filter(Boolean).forEach(record=>{
    const state=session.segments[record.segmentId];
    state.presentation=record.presentation;
    state.revealed=record.revealed;
    state.checked_attempt_count=record.checked_attempt_count;
    state.best_result=record.best_result;
    state.draft='';
    state.last_attempt=null;
    state.attempts=[];
    if(record.presentation!=='prompt'&&record.checked_attempt_count&&record.best_result){
      state.last_attempt={answer:record.last_answer,result:{...record.best_result}};
      state.attempts=[state.last_attempt];
      state.draft=record.last_answer;
    }
    onRestore(record.segmentId);
    restored=true;
  });
  return restored;
}
