import {deriveGrowthRank, featureUsage, nextStage} from './growthRank';

const strengths = (...stages: string[]) => stages.map((stage) => ({stage}));

describe('deriveGrowthRank', () => {
  it('starts a learner with no record at Emerging', () => {
    const rank = deriveGrowthRank({});
    expect(rank.stage).toBe('Emerging');
    expect(rank.stageIndex).toBe(0);
    expect(rank.progress).toBe(0);
  });

  it('moves to Developing on a second piece, a first win, or a first strength', () => {
    expect(deriveGrowthRank({essay_count: 2}).stage).toBe('Developing');
    expect(deriveGrowthRank({revision_wins: [{}]}).stage).toBe('Developing');
    expect(deriveGrowthRank({strengths: strengths('Developing')}).stage).toBe('Developing');
  });

  it('reaches Stable only with a reliable strength, a win and three pieces', () => {
    expect(deriveGrowthRank({essay_count: 3, revision_wins: [{}], strengths: strengths('Stable')}).stage).toBe('Stable');
    // Any one missing keeps it below.
    expect(deriveGrowthRank({essay_count: 3, revision_wins: [{}], strengths: strengths('Developing')}).stage).toBe('Developing');
    expect(deriveGrowthRank({essay_count: 2, revision_wins: [{}], strengths: strengths('Stable')}).stage).toBe('Developing');
  });

  it('reaches Mastered only on the full evidence set', () => {
    const full = {essay_count: 5, revision_wins: [{}, {}], strengths: strengths('Mastered', 'Stable')};
    expect(deriveGrowthRank(full).stage).toBe('Mastered');
    expect(deriveGrowthRank(full).progress).toBe(1);
    expect(deriveGrowthRank({...full, essay_count: 4}).stage).toBe('Stable');
  });

  /* The rank has to be explainable by the row printed next to it, so the
     evidence it reports must be the counts it actually used. */
  it('reports the evidence it was derived from', () => {
    expect(deriveGrowthRank({essay_count: 4, revision_wins: [{}, {}], strengths: strengths('Mastered', 'Stable', 'Developing')}).evidence).toEqual({
      series: 4, wins: 2, reliableStrengths: 2, masteredStrengths: 1, developingStrengths: 3,
    });
  });

  it('never claims to be anything but the product\'s own reading', () => {
    expect(deriveGrowthRank({}).claim).toBe('internal_growth_rank');
  });

  it('keeps progress below a full bar until the top stage', () => {
    expect(deriveGrowthRank({essay_count: 99}).progress).toBeLessThanOrEqual(0.95);
    expect(deriveGrowthRank({essay_count: 3, revision_wins: [{}], strengths: strengths('Stable')}).progress).toBeLessThanOrEqual(0.95);
  });
});

describe('nextStage', () => {
  it('names the rung above', () => {
    expect(nextStage('Emerging')).toBe('Developing');
    expect(nextStage('Stable')).toBe('Mastered');
  });

  it('invents nothing above the top', () => {
    expect(nextStage('Mastered')).toBeNull();
  });
});

describe('featureUsage', () => {
  it('reports remaining against the monthly limit', () => {
    expect(featureUsage({usage_state: 'known', monthly_limit: 50, remaining: 12})).toEqual({kind: 'remaining', remaining: 12, limit: 50});
  });

  it('reports an unlimited feature as unlimited, not as a huge number', () => {
    expect(featureUsage({usage_state: 'known', monthly_limit: null})).toEqual({kind: 'unlimited'});
  });

  it('reports a spent allowance as exhausted, with the limit', () => {
    expect(featureUsage({usage_state: 'known', monthly_limit: 50, remaining: 0})).toEqual({kind: 'exhausted', limit: 50});
  });

  /* An unknown usage must not render as zero remaining -- that would tell the
     learner they have run out when the server simply did not say. */
  it('reports an unknown usage as unavailable rather than zero', () => {
    expect(featureUsage({usage_state: 'unavailable', monthly_limit: 50, remaining: 0})).toEqual({kind: 'unavailable'});
    expect(featureUsage({})).toEqual({kind: 'unavailable'});
  });
});
