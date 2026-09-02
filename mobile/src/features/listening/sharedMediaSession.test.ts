import type {MediaLesson} from '../../api/contracts/listening';
import {getSharedMediaSession, resetSharedMediaSessions, selectSharedMediaSegment, setSharedMediaMode, setSharedMediaSession} from './sharedMediaSession';

const lesson = (assetId: string, segmentIds: string[]): MediaLesson => ({
  asset: {
    asset_id: assetId, source_url: 'https://youtu.be/x', source_provider: 'youtube', source_type: 'video',
    title: 'A lesson', source_language: 'en', processing_state: 'ready', duration_ms: 1000,
    transcript_available: true,
  },
  playback: {provider: 'youtube', kind: 'embed', url: 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ'},
  transcript: {
    asset_id: assetId, source_language: 'en',
    segments: segmentIds.map((id, index) => ({segment_id: id, order: index, start_ms: index * 1000, end_ms: (index + 1) * 1000, original_text: `line ${index}`})),
  },
  translations: [],
}) as MediaLesson;

describe('shared media session', () => {
  beforeEach(() => { resetSharedMediaSessions(); });

  it('hands the whole lesson across, not just the line', () => {
    expect(setSharedMediaSession({learning_language: 'en', payload: lesson('a1', ['s1', 's2'])})).toBe(true);
    const session = getSharedMediaSession('en');
    expect(session?.payload.playback.url).toContain('/embed/');
    expect(session?.payload.transcript?.segments).toHaveLength(2);
    expect(session?.selected_segment_id).toBe('s1');
  });

  it('keeps one session per learning language', () => {
    setSharedMediaSession({learning_language: 'en', payload: lesson('a1', ['s1'])});
    setSharedMediaSession({learning_language: 'zh', payload: lesson('a2', ['z1'])});
    expect(getSharedMediaSession('en')?.payload.asset.asset_id).toBe('a1');
    expect(getSharedMediaSession('zh')?.payload.asset.asset_id).toBe('a2');
  });

  it('matches the language regardless of case or padding', () => {
    setSharedMediaSession({learning_language: ' EN ', payload: lesson('a1', ['s1'])});
    expect(getSharedMediaSession('en')).not.toBeNull();
  });

  it('refuses anything Speaking could not open', () => {
    expect(setSharedMediaSession({learning_language: '', payload: lesson('a1', ['s1'])})).toBe(false);
    expect(setSharedMediaSession({learning_language: 'en', payload: null})).toBe(false);
    expect(setSharedMediaSession({learning_language: 'en', payload: lesson('a1', [])})).toBe(false);
    expect(getSharedMediaSession('en')).toBeNull();
  });

  it('falls back to the first segment when the selection is not in the transcript', () => {
    setSharedMediaSession({learning_language: 'en', payload: lesson('a1', ['s1', 's2']), selected_segment_id: 'gone'});
    expect(getSharedMediaSession('en')?.selected_segment_id).toBe('s1');
  });

  /* Reopening the same lesson should not throw away the mode the learner was
     in; a different lesson starts in Follow. */
  it('remembers the mode for the same lesson and resets it for a new one', () => {
    setSharedMediaSession({learning_language: 'en', payload: lesson('a1', ['s1']), mode: 'shadowing'});
    setSharedMediaSession({learning_language: 'en', payload: lesson('a1', ['s1'])});
    expect(getSharedMediaSession('en')?.mode).toBe('shadowing');
    setSharedMediaSession({learning_language: 'en', payload: lesson('a2', ['s9'])});
    expect(getSharedMediaSession('en')?.mode).toBe('follow');
  });

  it('moves the selection only to a segment the lesson actually has', () => {
    setSharedMediaSession({learning_language: 'en', payload: lesson('a1', ['s1', 's2'])});
    expect(selectSharedMediaSegment('en', 's2')).toBe(true);
    expect(getSharedMediaSession('en')?.selected_segment_id).toBe('s2');
    expect(selectSharedMediaSegment('en', 'nope')).toBe(false);
    expect(getSharedMediaSession('en')?.selected_segment_id).toBe('s2');
  });

  it('changes mode only for a session that exists', () => {
    expect(setSharedMediaMode('en', 'active')).toBe(false);
    setSharedMediaSession({learning_language: 'en', payload: lesson('a1', ['s1'])});
    expect(setSharedMediaMode('en', 'active')).toBe(true);
    expect(getSharedMediaSession('en')?.mode).toBe('active');
  });

  it('returns nothing for a language that was never opened', () => {
    expect(getSharedMediaSession('zh')).toBeNull();
    expect(getSharedMediaSession(undefined)).toBeNull();
  });
});
