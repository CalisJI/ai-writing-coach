function normalizedSegmentIds(segmentIds=[]){
  if(!Array.isArray(segmentIds))return [];
  const seen=new Set();
  const ids=[];
  for(const value of segmentIds){
    if(typeof value!=='string'||!value||seen.has(value))continue;
    seen.add(value);
    ids.push(value);
  }
  return ids;
}

export function createShadowingPracticeSession({asset_id='',segment_ids=[]}={}){
  const ids=normalizedSegmentIds(segment_ids);
  return {
    asset_id:typeof asset_id==='string'?asset_id:'',
    current_segment_id:ids[0]||null,
    segment_ids:ids,
    segments:Object.fromEntries(ids.map(segmentId=>[
      segmentId,
      {rounds:0},
    ])),
  };
}

export function selectShadowingPracticeSegment(session,segmentId){
  if(!session?.segments||!Object.prototype.hasOwnProperty.call(session.segments,segmentId)){
    return false;
  }
  session.current_segment_id=segmentId;
  return true;
}

export function recordShadowingPracticeRound(session){
  const segmentId=session?.current_segment_id;
  if(!segmentId||!session?.segments?.[segmentId])return false;
  session.segments[segmentId].rounds+=1;
  return true;
}

export function shadowingPracticeSummary(session){
  const states=Object.values(session?.segments||{});
  return {
    total_segments:states.length,
    practiced_segments:states.filter(state=>state.rounds>0).length,
    total_rounds:states.reduce((total,state)=>total+state.rounds,0),
  };
}