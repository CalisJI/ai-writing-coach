import {completedCounts, groupEssays, reliableStrengthCount, scoreMovement, timelineStations} from './journeyDomain';

describe('groupEssays', () => {
  it('keeps drafts of one piece together, newest piece first', () => {
    const groups = groupEssays([
      {series_id: 1, created_at: '2026-01-01', overall: 60},
      {series_id: 1, created_at: '2026-01-03', overall: 70},
      {series_id: 2, created_at: '2026-02-01', overall: 65},
    ]);
    expect(groups).toHaveLength(2);
    expect(groups[0]!.at(-1)!.created_at).toBe('2026-02-01');
    expect(groups[1]!.map((row) => row.created_at)).toEqual(['2026-01-01', '2026-01-03']);
  });

  it('has nothing to group for a learner who has not written', () => {
    expect(groupEssays([])).toEqual([]);
  });
});

describe('reliableStrengthCount', () => {
  it('counts only what the product calls reliable', () => {
    expect(reliableStrengthCount([{stage: 'Stable'}, {stage: 'Mastered'}, {stage: 'Emerging'}, {}])).toBe(2);
  });
});

describe('scoreMovement', () => {
  it('measures the change across the last five pieces', () => {
    const groups = groupEssays([
      {series_id: 1, created_at: '2026-01-01', overall: 60},
      {series_id: 2, created_at: '2026-02-01', overall: 72},
    ]);
    expect(scoreMovement(groups)).toBe(12);
  });

  /* "No movement" and "nothing measured" are different facts, and a zero here
     would report progress that was never observed. */
  it('reports nothing rather than zero with only one piece', () => {
    expect(scoreMovement(groupEssays([{series_id: 1, created_at: '2026-01-01', overall: 60}]))).toBeNull();
    expect(scoreMovement([])).toBeNull();
  });

  it('reports nothing when a score is missing', () => {
    const groups = groupEssays([
      {series_id: 1, created_at: '2026-01-01'},
      {series_id: 2, created_at: '2026-02-01', overall: 72},
    ]);
    expect(scoreMovement(groups)).toBeNull();
  });
});

describe('timelineStations', () => {
  const essays = [
    {created_at: '2026-01-01'}, {created_at: '2026-02-01'}, {created_at: '2026-03-01'},
  ];

  it('dates a station only from a record', () => {
    const stations = timelineStations({essays, revisionWins: [{overall_delta: 4, latest_date: '2026-02-10'}], focusLabel: 'Articles', nextLabel: 'Tenses'});
    expect(stations.map((s) => s.key)).toEqual(['started', 'win', 'momentum', 'focus', 'next']);
    expect(stations[0]).toMatchObject({done: true, date: '2026-01-01'});
    expect(stations[1]).toMatchObject({done: true, date: '2026-02-10'});
    expect(stations[2]).toMatchObject({done: true, date: '2026-03-01'});
  });

  /* A station that has not been reached carries no date at all. */
  it('never invents a date for a station that was not reached', () => {
    const stations = timelineStations({essays: [], revisionWins: [], focusLabel: '', nextLabel: ''});
    expect(stations.every((station) => station.date === null || station.done)).toBe(true);
    expect(stations[0]).toMatchObject({done: false, date: null});
    expect(stations[1]).toMatchObject({done: false, date: null});
  });

  it('ignores a revision that did not improve anything', () => {
    const stations = timelineStations({essays, revisionWins: [{overall_delta: -2, latest_date: '2026-02-10'}], focusLabel: '', nextLabel: ''});
    expect(stations[1]).toMatchObject({done: false, date: null});
  });

  it('marks momentum only from a third piece', () => {
    const stations = timelineStations({essays: essays.slice(0, 2), revisionWins: [], focusLabel: '', nextLabel: ''});
    expect(stations[2]).toMatchObject({done: false, date: null});
  });

  it('marks the focus station current and the next one ahead', () => {
    const stations = timelineStations({essays, revisionWins: [], focusLabel: 'Articles', nextLabel: 'Tenses'});
    expect(stations[3]).toMatchObject({current: true, done: true, note: 'Articles'});
    expect(stations[4]).toMatchObject({next: true, done: false, note: 'Tenses'});
  });
});

describe('completedCounts', () => {
  it('counts revisions beyond the first draft of each piece', () => {
    expect(completedCounts({essay_count: 3, revision_count: 7})).toEqual({pieces: 3, revisions: 4});
  });

  it('never reports a negative revision count', () => {
    expect(completedCounts({essay_count: 5, revision_count: 2})).toEqual({pieces: 5, revisions: 0});
    expect(completedCounts(null)).toEqual({pieces: 0, revisions: 0});
  });
});
