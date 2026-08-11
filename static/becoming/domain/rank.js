const STAGE_ORDER=['Emerging','Developing','Stable','Mastered'];

function countStrengths(memory,stages){
  return (memory?.strengths||[]).filter(item=>stages.includes(item.stage)).length;
}

export function deriveGrowthRank(memory={}){
  const series=Number(memory.essay_count||0);
  const wins=(memory.revision_wins||[]).length;
  const developing=countStrengths(memory,['Developing','Stable','Mastered']);
  const reliable=countStrengths(memory,['Stable','Mastered']);
  const mastered=countStrengths(memory,['Mastered']);

  let stage='Emerging';

  if(
    mastered>=1
    && reliable>=2
    && wins>=2
    && series>=5
  ){
    stage='Mastered';
  }else if(
    reliable>=1
    && wins>=1
    && series>=3
  ){
    stage='Stable';
  }else if(
    developing>=1
    || wins>=1
    || series>=2
  ){
    stage='Developing';
  }

  const stageIndex=STAGE_ORDER.indexOf(stage);
  const progress={
    Emerging:Math.min(0.95,Math.max(series/2,developing?0.7:0,wins?0.8:0)),
    Developing:Math.min(0.95,Math.max(reliable?0.7:0,wins?0.55:0,series/4)),
    Stable:Math.min(0.95,Math.max(mastered?0.7:0,reliable/2,wins/3,series/6)),
    Mastered:1,
  }[stage]||0;

  return {
    stage,
    stageIndex,
    progress,
    evidence:{
      series,
      wins,
      reliableStrengths:reliable,
      masteredStrengths:mastered,
      developingStrengths:developing,
    },
    claim:'internal_growth_rank',
  };
}
