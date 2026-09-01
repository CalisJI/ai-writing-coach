import React from 'react';
import renderer, {act} from 'react-test-renderer';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {I18nProvider} from '../../src/i18n/I18nProvider';
import {ThemeProvider} from '../../src/theme/ThemeProvider';
import {resetSharedMediaSessions, setSharedMediaSession} from '../../src/features/listening/sharedMediaSession';
import type {MediaLesson} from '../../src/api/contracts/listening';
import SpeakingScreen from '../../app/(app)/speaking';

jest.mock('expo-audio', () => ({AudioModule: {}, RecordingPresets: {LOW_QUALITY: {}}, createAudioPlayer: jest.fn(), getRecordingPermissionsAsync: jest.fn(), requestRecordingPermissionsAsync: jest.fn(), setAudioModeAsync: jest.fn()}));
// The reference player is a WebView; the screen only drives it through the ref.
jest.mock('react-native-youtube-iframe', () => {
  const ReactRuntime = jest.requireActual('react') as typeof React;
  const {forwardRef} = ReactRuntime;
  return {__esModule: true, default: forwardRef((_props: unknown, ref: React.Ref<unknown>) => {
    ReactRuntime.useImperativeHandle(ref, () => ({seekTo: () => undefined, getCurrentTime: () => Promise.resolve(0), getDuration: () => Promise.resolve(0)}));
    return null;
  })};
});
jest.mock('expo-file-system', () => ({Paths: {cache: {uri: 'file:///cache/'}}, File: class { copy() {} delete() {} }}));

let mockCookie: string | null = 'session';
const mockRouter = {replace: jest.fn(), push: jest.fn()};
let mockParams: Record<string, string> = {mode: 'shadowing', assetId: 'asset-en-1', segmentId: 'segment-1'};
jest.mock('expo-router', () => ({useRouter: () => mockRouter, useLocalSearchParams: () => mockParams}));
jest.mock('../../src/auth/SessionHarness', () => ({useSession: () => ({sessionCookie: mockCookie})}));

class FakeAudioService {
  state: 'idle' | 'recording' | 'recorded' = 'idle';
  played = 0;
  private listeners = new Set<(value: {state: string; permission: 'granted'}) => void>();
  getSnapshot() { return {state: this.state, permission: 'granted' as const}; }
  subscribe(listener: (value: {state: string; permission: 'granted'}) => void) { this.listeners.add(listener); return () => this.listeners.delete(listener); }
  private emit() { this.listeners.forEach((listener) => listener(this.getSnapshot())); }
  async startRecording() { this.state = 'recording'; this.emit(); return this.getSnapshot(); }
  async stopRecording() { this.state = 'recorded'; this.emit(); return this.getSnapshot(); }
  getRecordingUri() { return 'file:///temporary-take.m4a'; }
  async play() { this.played += 1; return this.getSnapshot(); }
  async cancel() { this.state = 'idle'; this.emit(); }
  async suspend() { await this.cancel(); }
  async release() { await this.cancel(); }
}

const lesson: MediaLesson = {
  asset: {asset_id: 'asset-en-1', source_url: 'https://youtu.be/x', source_provider: 'youtube', source_type: 'video', title: 'A lesson', source_language: 'en', processing_state: 'ready', duration_ms: 12000, transcript_available: true},
  playback: {provider: 'youtube', kind: 'embed', url: 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ'},
  transcript: {asset_id: 'asset-en-1', source_language: 'en', segments: [
    {segment_id: 'segment-1', order: 0, start_ms: 0, end_ms: 4000, original_text: 'Good morning.'},
    {segment_id: 'segment-2', order: 1, start_ms: 4000, end_ms: 8000, original_text: 'How are you?'},
  ]},
  translations: [{segment_id: 'segment-1', target_language: 'vi', translated_meaning: 'Chào buổi sáng.'}],
} as MediaLesson;

const evaluation = {schema_version: 1, language: 'en' as const, locale: 'en-US', dimensions: {transcription_confidence: null, content_match: 92, pronunciation: 88, fluency: 81, proficiency: null}, provenance: {pronunciation: 'speech'}, evidence: {reference_text: 'Good morning.'}, highlights: ['clear_pronunciation'], next_steps: [{kind: 'focus_words', words: ['morning']}]};
const renderSpeaking = (children: React.ReactNode) => renderer.create(<QueryClientProvider client={new QueryClient({defaultOptions: {queries: {retry: false, gcTime: 0}, mutations: {retry: false, gcTime: 0}}})}>{children}</QueryClientProvider>);
const mount = (locale: 'en' | 'zh', client: unknown, service: unknown, learningLanguage?: 'en' | 'zh') => {
  let view!: renderer.ReactTestRenderer;
  act(() => { view = renderSpeaking(<I18nProvider initialLocale={locale}><ThemeProvider><SpeakingScreen client={client as never} service={service as never} learningLanguage={learningLanguage} /></ThemeProvider></I18nProvider>); });
  return view;
};

describe('native Speaking R20-5 recording and Shadowing contract', () => {
  beforeEach(() => {
    mockCookie = 'session';
    mockParams = {mode: 'shadowing', assetId: 'asset-en-1', segmentId: 'segment-1'};
    mockRouter.replace.mockReset();
    resetSharedMediaSessions();
    setSharedMediaSession({learning_language: 'en', payload: lesson, selected_segment_id: 'segment-1'});
    // The session is keyed by learning language; the zh-UI cases fall back to
    // the UI locale until the profile confirms one.
    setSharedMediaSession({learning_language: 'zh', payload: lesson, selected_segment_id: 'segment-1'});
  });

  /* The prompt is a segment of a Listening lesson, so without one there is no
     line to say. The reference offers the way in rather than an empty exercise. */
  it('offers a way in when no lesson has been handed over', () => {
    resetSharedMediaSessions();
    const view = mount('en', {}, new FakeAudioService(), 'en');
    expect(view.root.findAllByProps({accessibilityLabel: 'Record'})).toHaveLength(0);
    expect(view.root.findAllByProps({children: 'Pick a line to say out loud.'})).not.toHaveLength(0);
    act(() => { view.root.findByProps({accessibilityLabel: 'Open Listening'}).props.onPress(); });
    expect(mockRouter.replace).toHaveBeenCalledWith('/(app)/listening');
  });

  it.each([['en', 'en'], ['zh', 'en']] as const)('records, then reports server evidence on request with %s UI and %s learning language', async (locale, learningLanguage) => {
    const service = new FakeAudioService();
    const client = {
      transcribeSpeaking: jest.fn().mockResolvedValue({provider: 'test', language: locale, text: 'Good morning.', segments: [], words: []}),
      assessSpeakingPronunciation: jest.fn().mockResolvedValue({provider: 'azure-speech', score_kind: 'provider', pron_score: 88, fluency_score: 81}),
      evaluateSpeaking: jest.fn().mockResolvedValue(evaluation),
      saveSpeakingAttempt: jest.fn().mockResolvedValue({item: {}}),
    };
    const view = mount(locale, client, service, learningLanguage);
    const record = locale === 'en' ? 'Record' : '录音';
    const stop = locale === 'en' ? 'Stop' : '停止';
    const feedback = locale === 'en' ? 'See feedback' : '查看反馈';

    act(() => { view.root.findByProps({accessibilityLabel: record}).props.onPress(); });
    await act(async () => { view.root.findByProps({accessibilityLabel: stop}).props.onPress(); await Promise.resolve(); });
    // Stopping does not spend the learner's take on an assessment they did not ask for.
    expect(client.transcribeSpeaking).not.toHaveBeenCalled();

    await act(async () => { view.root.findByProps({accessibilityLabel: feedback}).props.onPress(); await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); });
    expect(client.transcribeSpeaking).toHaveBeenCalledWith('file:///temporary-take.m4a', learningLanguage, expect.any(Object));
    expect(client.evaluateSpeaking).toHaveBeenCalledWith(expect.objectContaining({language: learningLanguage, reference_text: 'Good morning.', transcript_text: 'Good morning.'}), expect.any(Object));
    expect(client.saveSpeakingAttempt).toHaveBeenCalledWith(expect.objectContaining({asset_id: 'asset-en-1', segment_id: 'segment-1', evaluation}), expect.any(Object));
    const rendered = JSON.stringify(view.toJSON());
    expect(rendered).toContain('88');
    expect(rendered).toContain('81');
  });

  /* A demo score is generated, not measured from this learner's voice, and the
     reference refuses to let it read as an assessment. */
  it('marks a synthetic demo score as generated', async () => {
    const service = new FakeAudioService();
    const client = {
      transcribeSpeaking: jest.fn().mockResolvedValue({provider: 'test', language: 'en', text: 'Good morning.', segments: [], words: []}),
      assessSpeakingPronunciation: jest.fn().mockResolvedValue({provider: 'demo-synthetic', score_kind: 'synthetic_demo', pron_score: 88, fluency_score: 81}),
      evaluateSpeaking: jest.fn().mockResolvedValue(evaluation),
      saveSpeakingAttempt: jest.fn().mockResolvedValue({item: {}}),
    };
    const view = mount('en', client, service, 'en');
    act(() => { view.root.findByProps({accessibilityLabel: 'Record'}).props.onPress(); });
    await act(async () => { view.root.findByProps({accessibilityLabel: 'Stop'}).props.onPress(); await Promise.resolve(); });
    await act(async () => { view.root.findByProps({accessibilityLabel: 'See feedback'}).props.onPress(); await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); });
    expect(view.root.findAllByProps({children: 'Demo scores. These are generated, not measured from your voice.'})).not.toHaveLength(0);
  });

  it('keeps valid ASR/evaluation persistence when pronunciation is unavailable', async () => {
    const service = new FakeAudioService();
    const client = {
      transcribeSpeaking: jest.fn().mockResolvedValue({provider: 'test', language: 'en', text: 'Good morning.', segments: [], words: []}),
      assessSpeakingPronunciation: jest.fn().mockRejectedValue(new Error('provider unavailable')),
      evaluateSpeaking: jest.fn().mockResolvedValue(evaluation),
      saveSpeakingAttempt: jest.fn().mockResolvedValue({item: {}}),
    };
    const view = mount('zh', client, service, 'en');
    act(() => { view.root.findByProps({accessibilityLabel: '录音'}).props.onPress(); });
    await act(async () => { view.root.findByProps({accessibilityLabel: '停止'}).props.onPress(); await Promise.resolve(); });
    await act(async () => { view.root.findByProps({accessibilityLabel: '查看反馈'}).props.onPress(); await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); });
    expect(client.evaluateSpeaking).toHaveBeenCalledWith(expect.objectContaining({language: 'en', pronunciation: null}), expect.any(Object));
    expect(client.saveSpeakingAttempt).toHaveBeenCalledTimes(1);
    expect(view.root.findAllByProps({children: '目前无法进行发音测量。'})).not.toHaveLength(0);
  });

  it('does not record before the server learning language is confirmed', async () => {
    const service = new FakeAudioService();
    let resolveProfile!: (value: {language: 'en' | 'zh'}) => void;
    const client = {getLearnerProfile: jest.fn().mockReturnValue(new Promise<{language: 'en' | 'zh'}>((resolve) => { resolveProfile = resolve; })), transcribeSpeaking: jest.fn(), assessSpeakingPronunciation: jest.fn(), evaluateSpeaking: jest.fn(), saveSpeakingAttempt: jest.fn()};
    const view = mount('zh', client, service);
    expect(view.root.findByProps({accessibilityLabel: '录音'}).props.disabled).toBe(true);
    await act(async () => { resolveProfile({language: 'en'}); await Promise.resolve(); });
    expect(view.root.findByProps({accessibilityLabel: '录音'}).props.disabled).toBe(false);
    expect(client.getLearnerProfile).toHaveBeenCalledTimes(1);
  });

  it('cancels in-flight evaluation and persistence when a take is discarded', async () => {
    const service = new FakeAudioService();
    let resolveAsr!: (value: {provider: string; language: 'en'; text: string; segments: never[]; words: never[]}) => void;
    const client = {transcribeSpeaking: jest.fn().mockReturnValue(new Promise((resolve) => { resolveAsr = resolve; })), assessSpeakingPronunciation: jest.fn(), evaluateSpeaking: jest.fn().mockResolvedValue(evaluation), saveSpeakingAttempt: jest.fn().mockResolvedValue({item: {}})};
    const view = mount('en', client, service, 'en');
    act(() => { view.root.findByProps({accessibilityLabel: 'Record'}).props.onPress(); });
    await act(async () => { view.root.findByProps({accessibilityLabel: 'Stop'}).props.onPress(); await Promise.resolve(); });
    await act(async () => { view.root.findByProps({accessibilityLabel: 'See feedback'}).props.onPress(); await Promise.resolve(); });
    act(() => { view.root.findByProps({accessibilityLabel: 'Discard'}).props.onPress(); });
    await act(async () => { resolveAsr({provider: 'test', language: 'en', text: 'Good morning.', segments: [], words: []}); await Promise.resolve(); await Promise.resolve(); });
    expect(client.evaluateSpeaking).not.toHaveBeenCalled();
    expect(client.saveSpeakingAttempt).not.toHaveBeenCalled();
  });

  it('surfaces profile failure and keeps recording unavailable', async () => {
    const service = new FakeAudioService();
    const client = {getLearnerProfile: jest.fn().mockRejectedValue(new Error('profile unavailable')), transcribeSpeaking: jest.fn(), assessSpeakingPronunciation: jest.fn(), evaluateSpeaking: jest.fn(), saveSpeakingAttempt: jest.fn()};
    const view = mount('en', client, service);
    await act(async () => { await Promise.resolve(); });
    expect(view.root.findByProps({accessibilityRole: 'alert'})).toBeDefined();
    expect(view.root.findByProps({accessibilityLabel: 'Record'}).props.disabled).toBe(true);
  });

  /* The lesson came across whole, so Speaking can move between its lines
     instead of being stuck on the one Listening handed over. */
  it('steps between the lesson lines and follows the selection', () => {
    const view = mount('en', {}, new FakeAudioService(), 'en');
    expect(view.root.findAllByProps({children: 'Good morning.'})).not.toHaveLength(0);
    expect(view.root.findAllByProps({children: 'Line 1 of 2'})).not.toHaveLength(0);
    act(() => { view.root.findByProps({accessibilityLabel: 'Next segment'}).props.onPress(); });
    expect(view.root.findAllByProps({children: 'How are you?'})).not.toHaveLength(0);
    expect(view.root.findAllByProps({children: 'Line 2 of 2'})).not.toHaveLength(0);
  });

  it('shows the line and its meaning only when Read text is on', () => {
    const view = mount('en', {}, new FakeAudioService(), 'en');
    expect(JSON.stringify(view.toJSON())).not.toContain('Chào buổi sáng.');
    act(() => { view.root.findByProps({accessibilityLabel: 'Read text'}).props.onPress(); });
    expect(JSON.stringify(view.toJSON())).toContain('Chào buổi sáng.');
  });
});
