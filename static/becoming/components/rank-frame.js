import {esc} from './primitives.js';
import {t} from '../domain/i18n.js';

const NEXT_KEY={
  Emerging:'profile.rank.next_emerging',
  Developing:'profile.rank.next_developing',
  Stable:'profile.rank.next_stable',
  Mastered:'profile.rank.next_mastered',
};

export function growthRankFrame(rank={}){
  const stage=rank.stage||'Emerging';
  const evidence=rank.evidence||{};
  const pct=Math.round(Math.max(0,Math.min(1,Number(rank.progress||0)))*100);

  return `<section class="growth-rank rank-${esc(stage.toLowerCase())}" aria-label="${esc(t('profile.rank.kicker'))}">
    <div class="growth-rank-frame" aria-hidden="true">
      <div class="growth-rank-crown"></div>
      <div class="growth-rank-medallion">
        <span>${esc(String(rank.stageIndex+1).padStart(2,'0'))}</span>
      </div>
      <div class="growth-rank-wings left"></div>
      <div class="growth-rank-wings right"></div>
    </div>
    <div class="growth-rank-copy">
      <span class="context-label">${esc(t('profile.rank.kicker'))}</span>
      <h2>${esc(t(`profile.rank.${stage.toLowerCase()}`))}</h2>
      <p>${esc(t('profile.rank.note'))}</p>
      <div class="rank-evidence-row">
        <span>${esc(t('profile.rank.evidence',{
          strengths:evidence.reliableStrengths||0,
          wins:evidence.wins||0,
          series:evidence.series||0,
        }))}</span>
      </div>
      <div class="rank-progress" aria-label="${pct}%">
        <i style="width:${pct}%"></i>
      </div>
      <small>${esc(t('profile.rank.next',{next:t(NEXT_KEY[stage])}))}</small>
    </div>
  </section>`;
}
