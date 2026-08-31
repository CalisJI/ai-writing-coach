import {esc,attr} from '../components/primitives.js';
import {t} from './i18n.js';
import {getSharedMediaSession} from './shared-media-session.js';

const SOURCES=new Set(['writing','reading','listening','speaking']);

export function normalizeCrossSkillCue(value,{learningLanguage=''}={}){
  if(!value||typeof value!=='object'||Array.isArray(value)||value.available!==true||value.state!=='transfer'||!SOURCES.has(value.source))return null;
  const evidence=typeof value.evidence==='string'?value.evidence.trim().slice(0,260):'';
  const action=value.action&&typeof value.action==='object'&&!Array.isArray(value.action)?value.action:null;
  if(!evidence||!action||typeof action.kind!=='string')return null;
  if(!['review','reading','listening','speaking'].includes(action.kind))return null;
  const expected={writing:'review',reading:'reading',listening:'listening',speaking:'speaking'}[value.source];
  if(action.kind!==expected)return null;
  if(action.kind==='review'&&!(Number.isInteger(action.essay_id)&&action.essay_id>0))return null;
  if(action.kind==='reading'&&!(Number.isInteger(action.session_id)&&action.session_id>0))return null;
  if(action.kind==='listening'&&(![action.asset_id,action.segment_id].every(v=>typeof v==='string'&&v.trim())))return null;
  if(action.kind==='speaking'&&(![action.asset_id,action.segment_id].every(v=>typeof v==='string'&&v.trim())))return null;
  if((action.kind==='listening'||action.kind==='speaking')&&learningLanguage){
    const session=getSharedMediaSession(learningLanguage);
    const asset=session?.payload?.asset?.asset_id;
    const segments=session?.payload?.transcript?.segments;
    if(asset!==action.asset_id||!Array.isArray(segments)||!segments.some(item=>item?.segment_id===action.segment_id))return null;
  }
  return {...value,evidence,action};
}

export function crossSkillCueMarkup(value,options={}){
  const cue=normalizeCrossSkillCue(value,options);
  if(!cue)return `<section class="o-card o-panel cross-skill-cue" data-cross-skill-state="none"><span class="o-label">${esc(t('cross_skill.kicker'))}</span><p class="o-panel-copy">${esc(t('cross_skill.empty'))}</p></section>`;
  const action=cue.action;
  const attrs=action.kind==='review'?`data-cross-skill-kind="review" data-cross-skill-essay="${attr(action.essay_id)}"`:action.kind==='reading'?`data-cross-skill-kind="reading" data-cross-skill-session="${attr(action.session_id)}"`:action.kind==='listening'?`data-cross-skill-kind="listening" data-cross-skill-asset="${attr(action.asset_id)}" data-cross-skill-segment="${attr(action.segment_id)}" data-cross-skill-url="${attr(action.source_url||'')}" data-cross-skill-title="${attr(action.title||'')}"`:`data-cross-skill-kind="speaking" data-cross-skill-asset="${attr(action.asset_id)}" data-cross-skill-segment="${attr(action.segment_id)}"`;
  return `<section class="o-card o-panel cross-skill-cue" data-cross-skill-state="transfer" data-cross-skill-source="${attr(cue.source)}"><span class="o-label">${esc(t('cross_skill.kicker'))}</span><h2>${esc(t('cross_skill.title'))}</h2><p class="o-panel-copy">${esc(t('cross_skill.body',{source:t(`cross_skill.source_${cue.source}`)}))}</p><blockquote>“${esc(cue.evidence)}”</blockquote><button type="button" class="o-btn o-btn--outline o-btn--compact" ${attrs}>${esc(t(`cross_skill.action_${cue.source}`))}</button></section>`;
}
