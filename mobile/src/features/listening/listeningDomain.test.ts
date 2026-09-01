import {listeningUnits, playbackAvailable, practiceSummary, reconstructionDiff, segmentAt, stamp, textMatch, type SegmentPractice} from './listeningDomain';

describe('stamp', () => {
  it('reads media positions as M:SS', () => {
    expect(stamp(0)).toBe('0:00');
    expect(stamp(65_400)).toBe('1:05');
    expect(stamp(600_000)).toBe('10:00');
  });

  it('never renders a negative or non-finite position', () => {
    expect(stamp(-1)).toBe('0:00');
    expect(stamp(Number.NaN)).toBe('0:00');
  });
});

describe('playbackAvailable', () => {
  const embed = {kind: 'embed', provider: 'youtube', url: 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ'};

  it('accepts the only playback shape the backend produces', () => {
    expect(playbackAvailable(embed)).toBe(true);
  });

  it('gates Active and Shadowing when there is nothing playable', () => {
    expect(playbackAvailable(undefined)).toBe(false);
    expect(playbackAvailable({...embed, url: 'https://www.youtube-nocookie.com/watch'})).toBe(false);
    expect(playbackAvailable({...embed, provider: 'vimeo'})).toBe(false);
  });
});

describe('listeningUnits', () => {
  it('counts words outside Chinese and characters inside it', () => {
    expect(listeningUnits('The quick brown fox', 'en')).toHaveLength(4);
    expect(listeningUnits('我今天很好', 'zh')).toHaveLength(5);
  });

  it('ignores spacing in a Chinese line', () => {
    expect(listeningUnits('我 今天 很好', 'zh')).toHaveLength(5);
  });
});

describe('textMatch', () => {
  it('reports an exact reconstruction as exact', () => {
    expect(textMatch('the quick brown fox', 'The quick brown fox', 'en')).toEqual({accuracy_percent: 100, exact: true});
  });

  it('uses ordered edit distance so wrong order does not receive full credit', () => {
    const result = textMatch('fox brown quick the', 'The quick brown fox', 'en');
    expect(result.exact).toBe(false);
    expect(result.accuracy_percent).toBeLessThan(100);
  });

  it('scores a partial reconstruction by ordered overlap', () => {
    expect(textMatch('the quick', 'The quick brown fox', 'en')).toEqual({accuracy_percent: 50, exact: false});
  });

  it('does not credit a repeated unit twice', () => {
    expect(textMatch('the the the the', 'the quick brown fox', 'en').accuracy_percent).toBe(25);
  });

  it('works the same way for Chinese', () => {
    expect(textMatch('我今天很好', '我今天很好', 'zh').exact).toBe(true);
  });
});

describe('language-aware dictation feedback', () => {
  it('ignores harmless punctuation and capitalization', () => {
    expect(textMatch('LISTEN to this idea', 'Listen, to this idea!', 'en').exact).toBe(true);
  });

  it('marks missing and extra units without scoring punctuation', () => {
    expect(reconstructionDiff('Take train safely home', 'Take the train home.', 'en').map((item) => item.status)).toEqual(['correct', 'missing', 'correct', 'extra', 'correct']);
    expect(reconstructionDiff('\u6211 \u4eca\u5929 \u597d', '\u6211\u4eca\u5929\u5f88\u597d\u3002', 'zh').map((item) => item.status)).toEqual(['correct', 'correct', 'correct', 'missing', 'correct']);
  });
});

describe('practiceSummary', () => {
  const checked = (accuracy: number, exact = false): SegmentPractice => ({presentation: 'checked', draft: '', attempts: [{answer: 'a', result: {accuracy_percent: accuracy, exact}}]});

  it('reports what the session actually did', () => {
    const summary = practiceSummary({
      one: checked(80),
      two: checked(100, true),
      three: {presentation: 'revealed', draft: '', attempts: []},
    }, 5);
    expect(summary).toEqual({
      practiced_segments: 3,
      total_segments: 5,
      checked_attempts: 2,
      exact_match_segments: 1,
      revealed_only_segments: 1,
      average_best_text_match: 90,
    });
  });

  it('averages nothing when nothing was checked', () => {
    expect(practiceSummary({}, 4).average_best_text_match).toBeNull();
  });

  it('takes a segment\'s best attempt, not its last', () => {
    const summary = practiceSummary({
      one: {presentation: 'checked', draft: '', attempts: [
        {answer: 'a', result: {accuracy_percent: 90, exact: false}},
        {answer: 'b', result: {accuracy_percent: 40, exact: false}},
      ]},
    }, 1);
    expect(summary.average_best_text_match).toBe(90);
  });
});

describe('segmentAt', () => {
  const segments = [
    {segment_id: 'a', start_ms: 0, end_ms: 2000},
    {segment_id: 'b', start_ms: 2000, end_ms: 4000},
  ];

  it('finds the segment that owns a position', () => {
    expect(segmentAt(segments, 1999)).toBe('a');
    expect(segmentAt(segments, 2000)).toBe('b');
  });

  it('returns nothing past the end of the transcript', () => {
    expect(segmentAt(segments, 9000)).toBeNull();
  });
});
