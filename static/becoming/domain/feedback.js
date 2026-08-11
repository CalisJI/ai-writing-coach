import {t,categoryLabel,masteryLabel} from './i18n.js';
const METRIC_LABELS={
  grammar:'Grammar',
  vocabulary:'Vocabulary',
  coherence:'Coherence',
  task_achievement:'Task achievement',
  naturalness:'Naturalness',
};

export function prettyCategory(value=''){
  return String(value||'')
    .replaceAll('_',' ')
    .replace(/\b\w/g,ch=>ch.toUpperCase());
}

export function metricsFrom(result={}){
  return {
    grammar:Number(result.grammar||0),
    vocabulary:Number(result.vocabulary||0),
    coherence:Number(result.coherence||0),
    task_achievement:Number(result.task_achievement||0),
    naturalness:Number(result.naturalness||0),
  };
}

export function weakestMetric(metrics={}){
  const entries=Object.entries(metrics)
    .filter(([,value])=>Number.isFinite(Number(value)));
  if(!entries.length)return null;
  entries.sort((a,b)=>Number(a[1])-Number(b[1]));
  const [key,value]=entries[0];
  return {key,label:categoryLabel(key),value:Number(value)};
}

export function strongestMetric(metrics={}){
  const entries=Object.entries(metrics)
    .filter(([,value])=>Number.isFinite(Number(value)));
  if(!entries.length)return null;
  entries.sort((a,b)=>Number(b[1])-Number(a[1]));
  const [key,value]=entries[0];
  return {key,label:categoryLabel(key),value:Number(value)};
}

export function homeInsight(dashboard,memory,language='en'){
  if(!dashboard || !dashboard.essay_count){
    return {
      kicker:t('insight.begin.kicker'),
      statement:t('insight.begin.statement'),
      context:t('insight.begin.context'),
      evidence:'',
      action:t('insight.begin.action'),
    };
  }

  const focus=memory?.focus||null;
  const strength=(memory?.strengths||[])[0]||null;
  const win=(memory?.revision_wins||[])[0]||null;

  if(focus){
    const category=categoryLabel(focus.category);
    if(focus.status==='improving'){
      return {
        kicker:t('insight.moving.kicker'),
        statement:t('insight.moving.statement'),
        context:t('insight.moving.context'),
        evidence:`${category}: ${focus.total||focus.series_count||1}`,
        action:t('insight.moving.action'),
      };
    }

    return {
      kicker:t('insight.focus.kicker'),
      statement:t('insight.focus.statement'),
      context:t('insight.focus.context'),
      evidence:`${category} · ${focus.series_count||1}`,
      action:t('insight.focus.action'),
    };
  }

  if(strength){
    return {
      kicker:t('insight.strength.kicker'),
      statement:t('insight.strength.statement'),
      context:t('insight.strength.context'),
      evidence:`${categoryLabel(strength.category)} · ${masteryLabel(strength.stage)} · ${strength.evidence_count}`,
      action:t('insight.strength.action'),
    };
  }

  if(win){
    return {
      kicker:t('insight.win.kicker'),
      statement:t('insight.win.statement'),
      context:t('insight.win.context'),
      evidence:`${win.overall_delta>=0?'+':''}${win.overall_delta} · ${win.error_delta}`,
      action:t('insight.win.action'),
    };
  }

  const weak=weakestMetric(dashboard.metrics||{});
  return {
    kicker:t('insight.collect.kicker'),
    statement:t('insight.collect.statement'),
    context:t('insight.collect.context'),
    evidence:weak?`${weak.label} · ${weak.value}`:'',
    action:t('insight.collect.action'),
  };
}

export function reviewInsight(result,language='en'){
  const weak=weakestMetric(metricsFrom(result));
  const priority=(result.priorities_vi||[])[0] || '';
  return {
    kicker:t('insight.review.kicker'),
    statement:t('insight.review.statement'),
    context:priority || (
      weak
        ? `${weak.label}`
        : ''
    ),
    weak,
  };
}

export function benchmarkLabel(result){
  const level=result.cefr_estimate || result.level_estimate || '';
  if(!level)return null;
  return `${level} estimate`;
}

export function metricOverview(dashboard){
  const metrics=dashboard?.metrics||{};
  return Object.entries(metrics)
    .filter(([,value])=>Number.isFinite(Number(value)))
    .map(([key,value])=>({
      key,
      label:categoryLabel(key),
      value:Number(value),
    }))
    .sort((a,b)=>a.value-b.value);
}

function diffUnits(value='',language='en'){
  const source=String(value||'');
  if(language==='zh'){
    return [...source];
  }
  return source.match(/\s+|[A-Za-z0-9À-ỹ]+(?:['’-][A-Za-z0-9À-ỹ]+)*|[^\sA-Za-z0-9À-ỹ]+/gu)||[source];
}

export function changedSegments(before='',after='',language='en'){
  const left=diffUnits(before,language);
  const right=diffUnits(after,language);

  let prefix=0;
  while(
    prefix<left.length
    && prefix<right.length
    && left[prefix]===right[prefix]
  )prefix+=1;

  let suffix=0;
  while(
    suffix<left.length-prefix
    && suffix<right.length-prefix
    && left[left.length-1-suffix]===right[right.length-1-suffix]
  )suffix+=1;

  return {
    beforePrefix:left.slice(0,prefix).join(''),
    beforeChange:left.slice(prefix,left.length-suffix).join(''),
    beforeSuffix:suffix?left.slice(left.length-suffix).join(''):'',
    afterPrefix:right.slice(0,prefix).join(''),
    afterChange:right.slice(prefix,right.length-suffix).join(''),
    afterSuffix:suffix?right.slice(right.length-suffix).join(''):'',
  };
}

