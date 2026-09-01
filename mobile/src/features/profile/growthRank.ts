/**
 * The growth rank, ported verbatim from static/becoming/domain/rank.js.
 *
 * It carries `claim: 'internal_growth_rank'` for a reason: this is the
 * product's own reading of study evidence, not a CEFR level and not a
 * proficiency assessment. Every threshold below is a count of things the
 * learner actually did -- pieces written, revisions that improved, strengths
 * that held -- so the rank can always be explained by the evidence row printed
 * beside it.
 */

export const STAGE_ORDER = ['Emerging', 'Developing', 'Stable', 'Mastered'] as const;
export type GrowthStage = typeof STAGE_ORDER[number];

export type RankMemory = {
  essay_count?: number;
  revision_wins?: readonly unknown[];
  strengths?: readonly {stage?: string}[];
};

export type GrowthRank = {
  stage: GrowthStage;
  stageIndex: number;
  progress: number;
  evidence: {
    series: number;
    wins: number;
    reliableStrengths: number;
    masteredStrengths: number;
    developingStrengths: number;
  };
  claim: 'internal_growth_rank';
};

const countStrengths = (memory: RankMemory, stages: readonly string[]): number =>
  (memory.strengths ?? []).filter((item) => typeof item.stage === 'string' && stages.includes(item.stage)).length;

export function deriveGrowthRank(memory: RankMemory = {}): GrowthRank {
  const series = Number(memory.essay_count || 0);
  const wins = (memory.revision_wins ?? []).length;
  const developing = countStrengths(memory, ['Developing', 'Stable', 'Mastered']);
  const reliable = countStrengths(memory, ['Stable', 'Mastered']);
  const mastered = countStrengths(memory, ['Mastered']);

  let stage: GrowthStage = 'Emerging';
  if (mastered >= 1 && reliable >= 2 && wins >= 2 && series >= 5) stage = 'Mastered';
  else if (reliable >= 1 && wins >= 1 && series >= 3) stage = 'Stable';
  else if (developing >= 1 || wins >= 1 || series >= 2) stage = 'Developing';

  const progress = {
    Emerging: Math.min(0.95, Math.max(series / 2, developing ? 0.7 : 0, wins ? 0.8 : 0)),
    Developing: Math.min(0.95, Math.max(reliable ? 0.7 : 0, wins ? 0.55 : 0, series / 4)),
    Stable: Math.min(0.95, Math.max(mastered ? 0.7 : 0, reliable / 2, wins / 3, series / 6)),
    Mastered: 1,
  }[stage];

  return {
    stage,
    stageIndex: STAGE_ORDER.indexOf(stage),
    progress,
    evidence: {series, wins, reliableStrengths: reliable, masteredStrengths: mastered, developingStrengths: developing},
    claim: 'internal_growth_rank',
  };
}

/** The stage after this one, or null at the top -- never a fabricated next rung. */
export function nextStage(stage: GrowthStage): GrowthStage | null {
  const index = STAGE_ORDER.indexOf(stage);
  return index >= 0 && index < STAGE_ORDER.length - 1 ? STAGE_ORDER[index + 1]! : null;
}

/**
 * `accountPlanMarkup()`'s per-feature usage line. Four different facts, and the
 * one that matters is that an unknown usage says so rather than showing a zero
 * that would read as "you have none left".
 */
export type FeatureUsage =
  | {kind: 'unavailable'}
  | {kind: 'unlimited'}
  | {kind: 'exhausted'; limit: number}
  | {kind: 'remaining'; remaining: number; limit: number};

export function featureUsage(item: {usage_state?: string; monthly_limit?: number | null; remaining?: number | null}): FeatureUsage {
  if (item.usage_state !== 'known') return {kind: 'unavailable'};
  if (item.monthly_limit === null || item.monthly_limit === undefined) return {kind: 'unlimited'};
  if (item.remaining === 0) return {kind: 'exhausted', limit: item.monthly_limit};
  return {kind: 'remaining', remaining: item.remaining ?? 0, limit: item.monthly_limit};
}
