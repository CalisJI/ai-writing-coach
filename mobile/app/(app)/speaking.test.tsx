import React from 'react';
import renderer, {act} from 'react-test-renderer';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {I18nProvider} from '../../src/i18n/I18nProvider';
import {ThemeProvider} from '../../src/theme/ThemeProvider';
import SpeakingScreen from './speaking';

jest.mock('expo-audio', () => ({AudioModule: {}, RecordingPresets: {LOW_QUALITY: {}}, createAudioPlayer: jest.fn(), getRecordingPermissionsAsync: jest.fn(), requestRecordingPermissionsAsync: jest.fn(), setAudioModeAsync: jest.fn()}));

let mockCookie: string | null = 'session';
const mockRouter = {replace: jest.fn()};
let mockParams: Record<string, string> = {mode: 'shadowing', assetId: 'asset-en-1', segmentId: 'segment-1', referenceText: 'Good morning.'};
jest.mock('expo-router', () => ({useRouter: () => mockRouter, useLocalSearchParams: () => mockParams}));
jest.mock('../../src/auth/SessionHarness', () => ({useSession: () => ({sessionCookie: mockCookie})}));

class FakeAudioService {
  state: 'idle' | 'recording' | 'recorded' = 'idle';
  private listeners = new Set<(value: {state: string; permission: 'granted'}) => void>();
  getSnapshot() { return {state: this.state, permission: 'granted' as const}; }
  subscribe(listener: (value: {state: string; permission: 'granted'}) => void) { this.listeners.add(listener); return () => this.listeners.delete(listener); }
  async startRecording() { this.state = 'recording'; this.listeners.forEach((listener) => listener(this.getSnapshot())); return this.getSnapshot(); }
  async stopRecording() { this.state = 'recorded'; this.listeners.forEach((listener) => listener(this.getSnapshot())); return this.getSnapshot(); }
  getRecordingUri() { return 'file:///temporary-take.m4a'; }
  async cancel() { this.state = 'idle'; this.listeners.forEach((listener) => listener(this.getSnapshot())); }
  async suspend() { await this.cancel(); }
  async release() { await this.cancel(); }
}

const evaluation = {schema_version: 1, language: 'en' as const, locale: 'en-US', dimensions: {transcription_confidence: null, content_match: null, pronunciation: 88, fluency: 81, proficiency: null}, provenance: {pronunciation: 'speech'}, evidence: {reference_text: 'Good morning.'}, highlights: ['clear_pronunciation'], next_steps: [{kind: 'focus_words', words: ['morning']}]};
const renderSpeaking = (children: React.ReactNode) => renderer.create(<QueryClientProvider client={new QueryClient({defaultOptions: {queries: {retry: false, gcTime: 0}, mutations: {retry: false, gcTime: 0}}})}>{children}</QueryClientProvider>);

describe('native Speaking R20-5 recording and Shadowing contract', () => {
  beforeEach(() => { mockCookie = 'session'; mockParams = {mode: 'shadowing', assetId: 'asset-en-1', segmentId: 'segment-1', referenceText: 'Good morning.'}; mockRouter.replace.mockReset(); });
  it.each([['en', 'en'], ['zh', 'en']] as const)('records transient audio and renders server evidence with %s UI and %s learning language', async (locale, learningLanguage) => {
    const service = new FakeAudioService();
    const client = {transcribeSpeaking: jest.fn().mockResolvedValue({provider: 'test', language: locale, text: 'Good morning.', segments: [], words: []}), assessSpeakingPronunciation: jest.fn().mockResolvedValue({provider: 'test', accuracy_score: 88}), evaluateSpeaking: jest.fn().mockResolvedValue(evaluation), saveSpeakingAttempt: jest.fn().mockResolvedValue({item: {}})};
    let view!: renderer.ReactTestRenderer;
    act(() => { view = renderSpeaking(<I18nProvider initialLocale={locale}><ThemeProvider><SpeakingScreen client={client as never} service={service as never} learningLanguage={learningLanguage} /></ThemeProvider></I18nProvider>); });
    const startLabel = locale === 'en' ? 'Allow microphone and record' : '允许麦克风并录音';
    const stopLabel = locale === 'en' ? 'Stop and evaluate' : '停止并分析';
    act(() => { view.root.findByProps({accessibilityLabel: startLabel}).props.onPress(); });
    await act(async () => { view.root.findByProps({accessibilityLabel: stopLabel}).props.onPress(); await Promise.resolve(); await Promise.resolve(); });
    expect(client.transcribeSpeaking).toHaveBeenCalledWith('file:///temporary-take.m4a', learningLanguage, expect.any(Object));
    expect(client.evaluateSpeaking).toHaveBeenCalledWith(expect.objectContaining({language: learningLanguage, reference_text: 'Good morning.', transcript_text: 'Good morning.'}), expect.any(Object));
    expect(client.saveSpeakingAttempt).toHaveBeenCalledWith(expect.objectContaining({asset_id: 'asset-en-1', segment_id: 'segment-1', evaluation}), expect.any(Object));
    expect(view.root.findAll((node) => String(node.props.children).includes('88'))).not.toHaveLength(0);
  });

  it('keeps valid ASR/evaluation persistence when pronunciation is unavailable', async () => {
    const service = new FakeAudioService();
    const client = {transcribeSpeaking: jest.fn().mockResolvedValue({provider: 'test', language: 'en', text: 'Good morning.', segments: [], words: []}), assessSpeakingPronunciation: jest.fn().mockRejectedValue(new Error('provider unavailable')), evaluateSpeaking: jest.fn().mockResolvedValue(evaluation), saveSpeakingAttempt: jest.fn().mockResolvedValue({item: {}})};
    let view!: renderer.ReactTestRenderer;
    act(() => { view = renderSpeaking(<I18nProvider initialLocale="zh"><ThemeProvider><SpeakingScreen client={client as never} service={service as never} learningLanguage="en" /></ThemeProvider></I18nProvider>); });
    act(() => { view.root.findByProps({accessibilityLabel: '允许麦克风并录音'}).props.onPress(); });
    await act(async () => { view.root.findByProps({accessibilityLabel: '停止并分析'}).props.onPress(); await Promise.resolve(); await Promise.resolve(); });
    expect(client.evaluateSpeaking).toHaveBeenCalledWith(expect.objectContaining({language: 'en', pronunciation: null}), expect.any(Object));
    expect(client.saveSpeakingAttempt).toHaveBeenCalledTimes(1);
    expect(view.root.findAll((node) => String(node.props.children).includes('Pronunciation evidence is unavailable'))).toHaveLength(0);
    expect(view.root.findAll((node) => String(node.props.children).includes('发音证据暂时不可用'))).not.toHaveLength(0);
  });

  it('does not record before the server learning language is confirmed', async () => {
    const service = new FakeAudioService();
    let resolveProfile!: (value: {language: 'en' | 'zh'}) => void;
    const client = {getLearnerProfile: jest.fn().mockReturnValue(new Promise<{language: 'en' | 'zh'}>((resolve) => { resolveProfile = resolve; })), transcribeSpeaking: jest.fn(), assessSpeakingPronunciation: jest.fn(), evaluateSpeaking: jest.fn(), saveSpeakingAttempt: jest.fn()};
    let view!: renderer.ReactTestRenderer;
    act(() => { view = renderSpeaking(<I18nProvider initialLocale="zh"><ThemeProvider><SpeakingScreen client={client as never} service={service as never} /></ThemeProvider></I18nProvider>); });
    expect(view.root.findByProps({accessibilityLabel: '允许麦克风并录音'}).props.disabled).toBe(true);
    await act(async () => { resolveProfile({language: 'en'}); await Promise.resolve(); });
    expect(view.root.findByProps({accessibilityLabel: '允许麦克风并录音'}).props.disabled).toBe(false);
    expect(client.getLearnerProfile).toHaveBeenCalledTimes(1);
  });

  it('cancels in-flight evaluation and persistence when a take is discarded', async () => {
    const service = new FakeAudioService();
    let resolveAsr!: (value: {provider: string; language: 'en'; text: string; segments: never[]; words: never[]}) => void;
    const client = {transcribeSpeaking: jest.fn().mockReturnValue(new Promise((resolve) => { resolveAsr = resolve; })), assessSpeakingPronunciation: jest.fn(), evaluateSpeaking: jest.fn().mockResolvedValue(evaluation), saveSpeakingAttempt: jest.fn().mockResolvedValue({item: {}})};
    let view!: renderer.ReactTestRenderer;
    act(() => { view = renderSpeaking(<I18nProvider initialLocale="en"><ThemeProvider><SpeakingScreen client={client as never} service={service as never} learningLanguage="en" /></ThemeProvider></I18nProvider>); });
    act(() => { view.root.findByProps({accessibilityLabel: 'Allow microphone and record'}).props.onPress(); });
    await act(async () => { view.root.findByProps({accessibilityLabel: 'Stop and evaluate'}).props.onPress(); await Promise.resolve(); });
    act(() => { view.root.findByProps({accessibilityLabel: 'Discard take'}).props.onPress(); });
    await act(async () => { resolveAsr({provider: 'test', language: 'en', text: 'Good morning.', segments: [], words: []}); await Promise.resolve(); await Promise.resolve(); });
    expect(client.evaluateSpeaking).not.toHaveBeenCalled();
    expect(client.saveSpeakingAttempt).not.toHaveBeenCalled();
  });

  it('surfaces profile failure and keeps recording unavailable', async () => {
    const service = new FakeAudioService();
    const client = {getLearnerProfile: jest.fn().mockRejectedValue(new Error('profile unavailable')), transcribeSpeaking: jest.fn(), assessSpeakingPronunciation: jest.fn(), evaluateSpeaking: jest.fn(), saveSpeakingAttempt: jest.fn()};
    let view!: renderer.ReactTestRenderer;
    act(() => { view = renderSpeaking(<I18nProvider initialLocale="en"><ThemeProvider><SpeakingScreen client={client as never} service={service as never} /></ThemeProvider></I18nProvider>); });
    await act(async () => { await Promise.resolve(); });
    expect(view.root.findByProps({accessibilityRole: 'alert'})).toBeDefined();
    expect(view.root.findByProps({accessibilityLabel: 'Allow microphone and record'}).props.disabled).toBe(true);
  });
});
