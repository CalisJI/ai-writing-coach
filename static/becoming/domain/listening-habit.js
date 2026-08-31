/* Device-local Listening habit state.
 *
 * This module is deliberately a thin adapter over the keys already used by
 * Listening. It exposes the same measured seconds and configured daily goal to
 * Home without creating a second counter or implying server-synced activity.
 */

export const LISTEN_TIME_KEY='becoming.listening.minutes.v1';
export const LISTEN_GOAL_KEY='becoming.listening.goals.v1';

const dayKey=(date=new Date())=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;

function readRecord(key){
  let storage;
  let raw;
  try{
    storage=globalThis.localStorage;
    if(!storage||typeof storage.getItem!=='function')return {value:{},status:'unavailable'};
    raw=storage.getItem(key);
  }catch{
    return {value:{},status:'unavailable'};
  }
  if(raw==null||raw==='')return {value:{},status:'ok'};
  let parsed;
  try{parsed=JSON.parse(raw);}catch{return {value:{},status:'malformed'};}
  if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))return {value:{},status:'malformed'};
  return {value:parsed,status:'ok'};
}

function writeRecord(key,value){
  try{
    const storage=globalThis.localStorage;
    if(!storage||typeof storage.setItem!=='function')return false;
    storage.setItem(key,JSON.stringify(value));
    return true;
  }catch{return false;}
}

const finiteSeconds=value=>typeof value==='number'&&Number.isFinite(value)&&value>=0?value:0;

export function listenedSeconds(now=new Date()){
  const record=readRecord(LISTEN_TIME_KEY);
  const store=record.value;
  const malformedValue=Object.values(store).some(value=>!(typeof value==='number'&&Number.isFinite(value)&&value>=0));
  const today=finiteSeconds(store[dayKey(now)]);
  let week=0;
  for(let back=0;back<7;back+=1){
    const date=new Date(now);
    date.setDate(date.getDate()-back);
    week+=finiteSeconds(store[dayKey(date)]);
  }
  return {today,week,status:record.status==='ok'&&malformedValue?'malformed':record.status};
}

export function listeningGoals(){
  const record=readRecord(LISTEN_GOAL_KEY);
  const stored=record.value;
  const malformedValue=Object.prototype.hasOwnProperty.call(stored,'daily')
    &&!(typeof stored.daily==='number'&&Number.isFinite(stored.daily)&&stored.daily>0);
  const value=typeof stored.daily==='number'&&Number.isFinite(stored.daily)&&stored.daily>0
    ?Math.min(600,Math.round(stored.daily)):40;
  return {daily:value,weekly:value*7,status:record.status==='ok'&&malformedValue?'malformed':record.status};
}

export function listeningHabitSnapshot(now=new Date()){
  const time=listenedSeconds(now);
  const goals=listeningGoals();
  const status=time.status==='unavailable'||goals.status==='unavailable'
    ?'unavailable':time.status==='malformed'||goals.status==='malformed'?'malformed':'ok';
  return {
    status,
    today_seconds:time.today,
    week_seconds:time.week,
    daily_goal_minutes:goals.daily,
    weekly_goal_minutes:goals.weekly,
  };
}

export function addListenedSeconds(seconds){
  if(!(seconds>0)||seconds>30)return false;
  const record=readRecord(LISTEN_TIME_KEY);
  if(record.status==='unavailable')return false;
  const store=record.value;
  const key=dayKey();
  store[key]=finiteSeconds(store[key])+seconds;
  const cutoff=new Date();
  cutoff.setDate(cutoff.getDate()-30);
  for(const day of Object.keys(store))if(day<dayKey(cutoff))delete store[day];
  return writeRecord(LISTEN_TIME_KEY,store);
}

export function saveListeningGoal(minutes){
  if(!(Number.isFinite(minutes)&&minutes>0))return false;
  return writeRecord(LISTEN_GOAL_KEY,{daily:Math.min(600,Math.round(minutes))});
}
