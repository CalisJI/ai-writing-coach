const sessions=new Map();

function languageKey(value){
  return typeof value==='string'?value.trim().toLowerCase():'';
}

function segmentIds(payload){
  const segments=payload?.transcript?.segments;
  if(!Array.isArray(segments))return [];
  return segments
    .map(segment=>segment?.segment_id)
    .filter(value=>typeof value==='string'&&value);
}

function sessionMode(value){
  return ['follow','active','shadowing'].includes(value)?value:'follow';
}

export function setSharedMediaSession({learning_language='',payload=null,selected_segment_id=null,mode=null}={}){
  const key=languageKey(learning_language);
  const ids=segmentIds(payload);
  if(!key||!payload?.asset?.asset_id||ids.length===0)return false;
  const selected=ids.includes(selected_segment_id)?selected_segment_id:ids[0];
  const previous=sessions.get(key);
  const sameAsset=previous?.payload?.asset?.asset_id===payload.asset.asset_id;
  const rememberedMode=mode==null&&sameAsset?sessionMode(previous.mode):sessionMode(mode);
  sessions.set(key,{
    learning_language:key,
    payload,
    selected_segment_id:selected,
    mode:rememberedMode,
  });
  return true;
}

export function getSharedMediaSession(learningLanguage=''){
  const value=sessions.get(languageKey(learningLanguage));
  if(!value)return null;
  return {
    learning_language:value.learning_language,
    payload:value.payload,
    selected_segment_id:value.selected_segment_id,
    mode:sessionMode(value.mode),
  };
}

export function selectSharedMediaSegment(learningLanguage='',segmentId=''){
  const key=languageKey(learningLanguage);
  const current=sessions.get(key);
  if(!current)return false;
  const ids=segmentIds(current.payload);
  if(!ids.includes(segmentId))return false;
  current.selected_segment_id=segmentId;
  return true;
}

export function setSharedMediaMode(learningLanguage='',mode='follow'){
  const current=sessions.get(languageKey(learningLanguage));
  if(!current||!['follow','active','shadowing'].includes(mode))return false;
  current.mode=mode;
  return true;
}

export function clearSharedMediaSession(learningLanguage=''){
  return sessions.delete(languageKey(learningLanguage));
}
