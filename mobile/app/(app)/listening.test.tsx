import React from 'react';
import renderer, {act} from 'react-test-renderer';
import {AppState, type AppStateStatus} from 'react-native';
import {I18nProvider} from '../../src/i18n/I18nProvider';
import {ThemeProvider} from '../../src/theme/ThemeProvider';
import {MemoryKeyValueStorage} from '../../src/storage/boundedCache';
import {readListeningPending, writeListeningResume} from '../../src/features/listening/listeningResume';
import ListeningScreen from './listening';

let mockCookie: string | null = null;
let mockAppStateHandler: ((state: AppStateStatus) => void) | null = null;
const mockRouter = {replace: jest.fn(), push: jest.fn()};
const mockImport = {isPending: false, mutate: jest.fn(), reset: jest.fn()};
const mockSave = {isPending: false, mutate: jest.fn()};
const mockProgress = {isPending: false, isError: false, data: {items: []}};
const mockMediaStatus = {data: undefined as {state?: {status: string; resumable: boolean; resumeHandle?: string}} | undefined, force: () => {}};
const mockMediaStore = {read: jest.fn(), persist: jest.fn(), clear: jest.fn()};
const lesson = {
  asset: {asset_id: 'asset-en-1', source_url: 'https://youtu.be/example', source_provider: 'youtube', source_type: 'video', title: 'A short lesson', source_language: 'en', processing_state: 'ready', duration_ms: 12000, transcript_available: true, translation_available: true},
  playback: {provider: 'youtube', kind: 'remote', url: 'https://cdn.example/audio.mp3'},
  transcript: {asset_id: 'asset-en-1', source_language: 'en', segments: [{segment_id: 'segment-1', order: 0, start_ms: 0, end_ms: 4000, original_text: 'Good morning.'}, {segment_id: 'segment-2', order: 1, start_ms: 4000, end_ms: 8000, original_text: 'How are you?'}]},
  translations: [],
};

jest.mock('expo-router', () => ({useRouter: () => mockRouter, useLocalSearchParams: () => ({})}));
jest.mock('../../src/auth/SessionHarness', () => ({useSession: () => ({session: {status: mockCookie ? 'authenticated' : 'signed-out', source: 'server'}, sessionCookie: mockCookie})}));
jest.mock('../../src/api/client', () => ({createConfiguredApiClient: () => ({}), ApiClient: class {}}));
jest.mock('../../src/query/useListening', () => ({useImportMedia: () => mockImport, useListeningProgress: () => mockProgress, useSaveListeningProgress: () => mockSave}));
jest.mock('../../src/query/useMediaImportStatus', () => {
  const ReactRuntime = jest.requireActual('react') as typeof React;
  return {useMediaImportStatus: () => { const [, setVersion] = ReactRuntime.useState(0); mockMediaStatus.force = () => setVersion((value) => value + 1); return mockMediaStatus; }, createMediaResumeStore: () => mockMediaStore};
});
jest.mock('expo-audio', () => ({useAudioPlayer: () => ({play: jest.fn(), pause: jest.fn()}), useAudioPlayerStatus: () => ({playing: false, isLoaded: true})}));

const renderListening = (locale: 'en' | 'zh', storage = new MemoryKeyValueStorage()) => {
  let view!: renderer.ReactTestRenderer;
  act(() => { view = renderer.create(<I18nProvider initialLocale={locale}><ThemeProvider><ListeningScreen client={{} as never} resumeStorage={storage} mediaResumeStorage={storage} /></ThemeProvider></I18nProvider>); });
  return {view, storage};
};

describe('native Listening R20-4 Follow/Active and resume contract', () => {
  beforeEach(() => {
    mockCookie = null;
    mockRouter.replace.mockReset();
    mockRouter.push.mockReset();
    mockImport.isPending = false;
    mockImport.mutate.mockReset();
    mockImport.reset.mockReset();
    mockSave.isPending = false;
    mockSave.mutate.mockReset();
    mockProgress.isPending = false;
    mockProgress.isError = false;
    mockProgress.data = {items: []};
    mockMediaStatus.data = undefined;
    mockMediaStatus.force = () => undefined;
    mockMediaStore.read.mockReset().mockResolvedValue(null);
    mockMediaStore.persist.mockReset();
    mockMediaStore.clear.mockReset();
    mockAppStateHandler = null;
  });

  afterEach(() => { jest.restoreAllMocks(); });

  it.each(['en', 'zh'] as const)('renders a truthful signed-out state in %s', (locale) => {
    const {view} = renderListening(locale);
    expect(view.root.findByProps({accessibilityRole: 'header'})).toBeDefined();
    expect(view.root.findAllByProps({accessibilityLabel: locale === 'en' ? 'Prepare listening lesson' : '准备听力课程'})).toHaveLength(0);
  });

  it('renders server-confirmed EN segments, switches to Active, and forwards a persisted check', async () => {
    mockCookie = 'cookie';
    mockImport.mutate.mockImplementation((_input: unknown, options: {onSuccess: (value: unknown) => void}) => options.onSuccess(lesson));
    mockSave.mutate.mockImplementation((input: Record<string, unknown>, options: {onSuccess: (value: unknown) => void}) => options.onSuccess({item: {...input, best_exact: false}}));
    const {view, storage} = renderListening('en');
    const source = view.root.findByProps({accessibilityLabel: 'Media URL'});
    act(() => { source.props.onChangeText(' https://youtu.be/example '); });
    await act(async () => { view.root.findByProps({accessibilityLabel: 'Prepare listening lesson'}).props.onPress(); await Promise.resolve(); });
    expect(view.root.findAllByProps({children: 'Good morning.'})).not.toHaveLength(0);
    act(() => { view.root.findByProps({accessibilityLabel: 'Active practice'}).props.onPress(); });
    const answer = view.root.findByProps({accessibilityLabel: 'What did you hear?'});
    act(() => { answer.props.onChangeText('Good morning.'); });
    act(() => { view.root.findByProps({accessibilityLabel: 'Save checked attempt'}).props.onPress(); });
    expect(mockSave.mutate).toHaveBeenCalledWith(expect.objectContaining({asset_id: 'asset-en-1', segment_id: 'segment-1', presentation: 'checked', checked_attempt_count: 1, last_answer: 'Good morning.'}), expect.any(Object));
    await expect(storage.getItem('orena.listening.resume.v1')).resolves.toContain('asset-en-1');
  });

  it('hands the selected canonical segment to Shadowing', async () => {
    mockCookie = 'cookie';
    mockImport.mutate.mockImplementation((_input: unknown, options: {onSuccess: (value: unknown) => void}) => options.onSuccess(lesson));
    const {view} = renderListening('en');
    act(() => { view.root.findByProps({accessibilityLabel: 'Media URL'}).props.onChangeText('https://youtu.be/example'); });
    await act(async () => { view.root.findByProps({accessibilityLabel: 'Prepare listening lesson'}).props.onPress(); await Promise.resolve(); });
    act(() => { view.root.findByProps({accessibilityLabel: 'Return to this Listening segment'}).props.onPress(); });
    expect(mockRouter.push).toHaveBeenCalledWith(expect.objectContaining({params: expect.objectContaining({mode: 'shadowing', assetId: 'asset-en-1', segmentId: 'segment-1', referenceText: 'Good morning.'})}));
  });

  it('restores a canonical ZH resume segment and mode, while rejecting unavailable preparation', async () => {
    mockCookie = 'cookie';
    const storage = new MemoryKeyValueStorage();
    await writeListeningResume({assetId: 'asset-en-1', segmentId: 'segment-2', mode: 'active', sourceUrl: 'https://youtu.be/example'}, storage);
    mockImport.mutate.mockImplementation((_input: unknown, options: {onSuccess: (value: unknown) => void}) => options.onSuccess(lesson));
    const {view} = renderListening('zh', storage);
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
    await act(async () => { view.root.findByProps({accessibilityLabel: '恢复上一课'}).props.onPress(); await new Promise((resolve) => setTimeout(resolve, 0)); });
    expect(view.root.findByProps({accessibilityLabel: '主动练习'}).props.accessibilityState.selected).toBe(true);
    expect(view.root.findByProps({accessibilityLabel: 'How are you?'}).props.accessibilityState.selected).toBe(true);
    mockImport.mutate.mockImplementation((_input: unknown, options: {onError: () => void}) => options.onError());
    act(() => { view.root.findByProps({accessibilityLabel: '开始另一课'}).props.onPress(); });
    act(() => { view.root.findByProps({accessibilityLabel: '媒体链接'}).props.onChangeText('https://youtu.be/other'); });
    act(() => { view.root.findByProps({accessibilityLabel: '准备听力课程'}).props.onPress(); });
    expect(view.root.findByProps({accessibilityRole: 'alert'})).toBeDefined();
  });

  it('persists a processing import handle and resumes it to a ready lesson after restart', async () => {
    mockCookie = 'cookie';
    const storage = new MemoryKeyValueStorage();
    const processing = {asset: {asset_id: 'asset-en-pending', processing_state: 'processing'}, import_job: {job_id: 'resume-handle-12345678901234567890'}};
    mockImport.mutate.mockImplementationOnce((_input: unknown, options: {onSuccess: (value: unknown) => void}) => options.onSuccess(processing));
    const first = renderListening('en', storage);
    const source = first.view.root.findByProps({accessibilityLabel: 'Media URL'});
    act(() => { source.props.onChangeText('  https://youtu.be/pending  '); });
    await act(async () => { first.view.root.findByProps({accessibilityLabel: 'Prepare listening lesson'}).props.onPress(); await new Promise((resolve) => setTimeout(resolve, 0)); });
    await expect(readListeningPending(storage)).resolves.toEqual({assetId: 'asset-en-pending', mode: 'follow', sourceUrl: 'https://youtu.be/pending'});
    expect(mockMediaStore.persist).toHaveBeenCalledWith({assetId: 'asset-en-pending', resumeHandle: 'resume-handle-12345678901234567890', status: 'processing', resumable: true});

    act(() => { first.view.unmount(); });
    mockMediaStore.read.mockResolvedValue({assetId: 'asset-en-pending', resumeHandle: 'resume-handle-12345678901234567890', status: 'processing', resumable: true});
    mockImport.mutate.mockImplementationOnce((_input: unknown, options: {onSuccess: (value: unknown) => void}) => options.onSuccess(lesson));
    const restarted = renderListening('en', storage);
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
    act(() => { restarted.view.root.findByProps({accessibilityLabel: 'Resume previous lesson'}).props.onPress(); });
    mockMediaStatus.data = {state: {status: 'ready', resumable: false, resumeHandle: 'resume-handle-12345678901234567890'}};
    act(() => { mockMediaStatus.force(); });
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
    expect(restarted.view.root.findAllByProps({children: 'Good morning.'})).not.toHaveLength(0);
    expect(mockImport.mutate).toHaveBeenCalledTimes(2);
  });

  it('retains the processing resume identity when ready rehydration fails', async () => {
    mockCookie = 'cookie';
    const storage = new MemoryKeyValueStorage();
    const processing = {asset: {asset_id: 'asset-en-retry', processing_state: 'processing'}, import_job: {job_id: 'resume-handle-09876543210987654321'}};
    mockImport.mutate.mockImplementationOnce((_input: unknown, options: {onSuccess: (value: unknown) => void}) => options.onSuccess(processing));
    const first = renderListening('en', storage);
    act(() => { first.view.root.findByProps({accessibilityLabel: 'Media URL'}).props.onChangeText('https://youtu.be/retry'); });
    await act(async () => { first.view.root.findByProps({accessibilityLabel: 'Prepare listening lesson'}).props.onPress(); await new Promise((resolve) => setTimeout(resolve, 0)); });
    act(() => { first.view.unmount(); });
    mockMediaStore.read.mockResolvedValue({assetId: 'asset-en-retry', resumeHandle: 'resume-handle-09876543210987654321', status: 'processing', resumable: true});
    mockImport.mutate.mockImplementationOnce((_input: unknown, options: {onError: () => void}) => options.onError());
    const restarted = renderListening('en', storage);
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
    act(() => { restarted.view.root.findByProps({accessibilityLabel: 'Resume previous lesson'}).props.onPress(); });
    mockMediaStatus.data = {state: {status: 'ready', resumable: false, resumeHandle: 'resume-handle-09876543210987654321'}};
    act(() => { mockMediaStatus.force(); });
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
    await expect(readListeningPending(storage)).resolves.toEqual({assetId: 'asset-en-retry', mode: 'follow', sourceUrl: 'https://youtu.be/retry'});
    expect(restarted.view.root.findByProps({accessibilityRole: 'alert'})).toBeDefined();
    mockImport.mutate.mockImplementationOnce((_input: unknown, options: {onSuccess: (value: unknown) => void}) => options.onSuccess(lesson));
    await act(async () => { restarted.view.root.findByProps({accessibilityLabel: 'Resume previous lesson'}).props.onPress(); await new Promise((resolve) => setTimeout(resolve, 20)); });
    expect(restarted.view.root.findAllByProps({children: 'Good morning.'})).not.toHaveLength(0);
  });

  it('can retry a ready pending identity after restarting the app', async () => {
    mockCookie = 'cookie';
    const storage = new MemoryKeyValueStorage();
    await writeListeningResume({assetId: 'asset-en-restart', segmentId: 'pending', mode: 'follow', sourceUrl: 'https://youtu.be/restart'}, storage);
    await storage.setItem('orena.listening.pending.v1', JSON.stringify({assetId: 'asset-en-restart', mode: 'follow', sourceUrl: 'https://youtu.be/restart'}));
    mockMediaStore.read.mockResolvedValue({assetId: 'asset-en-restart', resumeHandle: 'resume-handle-11223344556677889900', status: 'ready', resumable: false});
    const view = renderListening('en', storage).view;
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
    mockImport.mutate.mockImplementationOnce((_input: unknown, options: {onSuccess: (value: unknown) => void}) => options.onSuccess(lesson));
    await act(async () => { view.root.findByProps({accessibilityLabel: 'Resume previous lesson'}).props.onPress(); await new Promise((resolve) => setTimeout(resolve, 20)); });
    expect(view.root.findAllByProps({children: 'Good morning.'})).not.toHaveLength(0);
  });

  it('cancels preparation and reports an interrupted playback without changing progress', () => {
    mockCookie = 'cookie';
    mockImport.isPending = true;
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, handler) => {
      mockAppStateHandler = handler;
      return {remove: jest.fn()};
    });
    const {view} = renderListening('en');
    act(() => { view.root.findByProps({accessibilityLabel: 'Cancel preparation'}).props.onPress(); });
    expect(mockImport.reset).toHaveBeenCalledTimes(1);
    act(() => { mockAppStateHandler?.('background'); });
    expect(view.root.findByProps({accessibilityRole: 'alert'})).toBeDefined();
  });
});
