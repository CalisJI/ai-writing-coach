import React from 'react';
import renderer, {act} from 'react-test-renderer';
import {AppState, type AppStateStatus} from 'react-native';
import {I18nProvider} from '../../src/i18n/I18nProvider';
import {ThemeProvider} from '../../src/theme/ThemeProvider';
import {MemoryKeyValueStorage} from '../../src/storage/boundedCache';
import {readListeningPending, writeListeningResume} from '../../src/features/listening/listeningResume';
import ListeningScreen from '../../app/(app)/listening';

let mockCookie: string | null = null;
let mockAppStateHandler: ((state: AppStateStatus) => void) | null = null;
const mockRouter = {replace: jest.fn(), push: jest.fn()};
const mockImport = {isPending: false, mutate: jest.fn(), reset: jest.fn()};
const mockSave = {isPending: false, mutate: jest.fn()};
const mockTranslate = {isPending: false, mutate: jest.fn(), reset: jest.fn()};
/** The player's clock, so a test can move the playhead the way playback does. */
let mockPlayerSeconds = 0;
const mockLearnerProfile = {isPending: false, isError: false, data: {exists: true, language: 'en', goal: 'everyday', style: 'guided', pinyin: 'auto', native_language: 'vi', theme_preset: 'editorial', updated_at: '2026-01-01'}};
const mockProgress = {isPending: false, isError: false, data: {items: []}};
const mockMediaStatus = {data: undefined as {state?: {status: string; resumable: boolean; resumeHandle?: string}} | undefined, force: () => {}};
const mockMediaStore = {read: jest.fn(), persist: jest.fn(), clear: jest.fn()};
const lesson = {
  asset: {asset_id: 'asset-en-1', source_url: 'https://youtu.be/example', source_provider: 'youtube', source_type: 'video', title: 'A short lesson', source_language: 'en', processing_state: 'ready', duration_ms: 12000, transcript_available: true, translation_available: true},
  playback: {provider: 'youtube', kind: 'embed', url: 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ'},
  transcript: {asset_id: 'asset-en-1', source_language: 'en', segments: [{segment_id: 'segment-1', order: 0, start_ms: 0, end_ms: 4000, original_text: 'Good morning.'}, {segment_id: 'segment-2', order: 1, start_ms: 4000, end_ms: 8000, original_text: 'How are you?'}]},
  translations: [],
};

jest.mock('expo-router', () => ({useRouter: () => mockRouter, useLocalSearchParams: () => ({})}));
jest.mock('../../src/auth/SessionHarness', () => ({useSession: () => ({session: {status: mockCookie ? 'authenticated' : 'signed-out', source: 'server'}, sessionCookie: mockCookie})}));
jest.mock('../../src/api/client', () => ({createConfiguredApiClient: () => ({}), ApiClient: class {}}));
jest.mock('../../src/query/useListening', () => ({useImportMedia: () => mockImport, useListeningProgress: () => mockProgress, useSaveListeningProgress: () => mockSave, useTranslateMedia: () => mockTranslate}));
jest.mock('../../src/query/useLearnerProfile', () => ({useLearnerProfile: () => mockLearnerProfile}));
jest.mock('../../src/query/useMediaImportStatus', () => {
  const ReactRuntime = jest.requireActual('react') as typeof React;
  return {useMediaImportStatus: () => { const [, setVersion] = ReactRuntime.useState(0); mockMediaStatus.force = () => setVersion((value) => value + 1); return mockMediaStatus; }, createMediaResumeStore: () => mockMediaStore};
});
jest.mock('react-native-youtube-iframe', () => {
  const ReactRuntime = jest.requireActual('react') as typeof React;
  const {forwardRef} = ReactRuntime;
  return {__esModule: true, default: forwardRef((_props: unknown, ref: React.Ref<unknown>) => {
    ReactRuntime.useImperativeHandle(ref, () => ({getCurrentTime: () => Promise.resolve(mockPlayerSeconds), getDuration: () => Promise.resolve(0), seekTo: () => undefined, isMuted: () => Promise.resolve(false), getVolume: () => Promise.resolve(100), getPlaybackRate: () => Promise.resolve(1), getAvailablePlaybackRates: () => Promise.resolve([1]), getVideoUrl: () => Promise.resolve('')}));
    return null;
  })};
});

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
    mockTranslate.mutate.mockReset();
    mockProgress.isPending = false;
    mockProgress.isError = false;
    mockProgress.data = {items: []};
    mockMediaStatus.data = undefined;
    mockMediaStatus.force = () => undefined;
    mockMediaStore.read.mockReset().mockResolvedValue(null);
    mockMediaStore.persist.mockReset();
    mockMediaStore.clear.mockReset();
    mockAppStateHandler = null;
    mockPlayerSeconds = 0;
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
    act(() => { view.root.findByProps({accessibilityLabel: 'Active'}).props.onPress(); });
    const answer = view.root.findByProps({accessibilityLabel: 'Type what you heard'});
    act(() => { answer.props.onChangeText('Good morning.'); });
    act(() => { view.root.findByProps({accessibilityLabel: 'Check answer'}).props.onPress(); });
    expect(mockSave.mutate).toHaveBeenCalledWith(expect.objectContaining({asset_id: 'asset-en-1', segment_id: 'segment-1', presentation: 'checked', checked_attempt_count: 1, last_answer: 'Good morning.'}), expect.any(Object));
    await expect(storage.getItem('orena.listening.resume.v1')).resolves.toContain('asset-en-1');
  });

  /* listening.js withholds the transcript line in Active mode: it is a
     reconstruction exercise, and printing the line in the segment list would
     hand the learner the answer. It reappears in the result once checked. */
  it('withholds the line in Active mode until the reconstruction is checked', async () => {
    mockCookie = 'cookie';
    mockImport.mutate.mockImplementation((_input: unknown, options: {onSuccess: (value: unknown) => void}) => options.onSuccess(lesson));
    mockSave.mutate.mockImplementation((input: Record<string, unknown>, options: {onSuccess: (value: unknown) => void}) => options.onSuccess({item: {...input}}));
    const {view} = renderListening('en');
    act(() => { view.root.findByProps({accessibilityLabel: 'Media URL'}).props.onChangeText('https://youtu.be/example'); });
    await act(async () => { view.root.findByProps({accessibilityLabel: 'Prepare listening lesson'}).props.onPress(); await Promise.resolve(); });
    act(() => { view.root.findByProps({accessibilityLabel: 'Active'}).props.onPress(); });
    expect(view.root.findAllByProps({children: 'Good morning.'})).toHaveLength(0);
    expect(view.root.findByProps({accessibilityLabel: 'Segment 1'})).toBeDefined();

    act(() => { view.root.findByProps({accessibilityLabel: 'Type what you heard'}).props.onChangeText('Good morning.'); });
    act(() => { view.root.findByProps({accessibilityLabel: 'Check answer'}).props.onPress(); });
    // An exact reconstruction reports 100% and names itself an exact match.
    const rendered = JSON.stringify(view.toJSON());
    expect(rendered).toContain('Text match');
    expect(rendered).toContain('Exact match');
    expect(rendered).toContain('100');
    expect(rendered).toContain('Good morning.');
  });

  it('refuses to check an empty reconstruction', async () => {
    mockCookie = 'cookie';
    mockImport.mutate.mockImplementation((_input: unknown, options: {onSuccess: (value: unknown) => void}) => options.onSuccess(lesson));
    const {view} = renderListening('en');
    act(() => { view.root.findByProps({accessibilityLabel: 'Media URL'}).props.onChangeText('https://youtu.be/example'); });
    await act(async () => { view.root.findByProps({accessibilityLabel: 'Prepare listening lesson'}).props.onPress(); await Promise.resolve(); });
    act(() => { view.root.findByProps({accessibilityLabel: 'Active'}).props.onPress(); });
    act(() => { view.root.findByProps({accessibilityLabel: 'Check answer'}).props.onPress(); });
    expect(mockSave.mutate).not.toHaveBeenCalled();
    expect(view.root.findAllByProps({children: 'Type what you heard before checking.'})).not.toHaveLength(0);
  });

  /* Active and Shadowing are exercises against real audio, so the reference
     disables them when the provider gives us nothing playable. Follow works
     from the transcript alone and stays available. */
  it('gates Active and Shadowing when there is no usable playback', async () => {
    mockCookie = 'cookie';
    mockImport.mutate.mockImplementation((_input: unknown, options: {onSuccess: (value: unknown) => void}) => options.onSuccess({...lesson, playback: {provider: 'youtube', kind: 'link', url: 'https://youtu.be/example'}}));
    const {view} = renderListening('en');
    act(() => { view.root.findByProps({accessibilityLabel: 'Media URL'}).props.onChangeText('https://youtu.be/example'); });
    await act(async () => { view.root.findByProps({accessibilityLabel: 'Prepare listening lesson'}).props.onPress(); await Promise.resolve(); });
    expect(view.root.findByProps({accessibilityLabel: 'Active'}).props.accessibilityState.disabled).toBe(true);
    expect(view.root.findByProps({accessibilityLabel: 'Shadowing'}).props.accessibilityState.disabled).toBe(true);
    expect(view.root.findByProps({accessibilityLabel: 'Follow'}).props.accessibilityState.disabled).toBe(false);
    expect(view.root.findAllByProps({children: 'Active Listening and Shadowing need usable provider playback.'})).not.toHaveLength(0);
  });

  /* setPlayingSegment(): the playhead names the line being spoken, and the
     selection follows it until the learner takes over by tapping a line.
     "Jump to what is playing" hands control back. Native had no follow at all --
     the list only ever moved when tapped. */
  it('follows the playhead until the learner takes over, then hands control back', async () => {
    mockCookie = 'cookie';
    mockImport.mutate.mockImplementation((_input: unknown, options: {onSuccess: (value: unknown) => void}) => options.onSuccess(lesson));
    const {view} = renderListening('en');
    act(() => { view.root.findByProps({accessibilityLabel: 'Media URL'}).props.onChangeText('https://youtu.be/example'); });
    await act(async () => { view.root.findByProps({accessibilityLabel: 'Prepare listening lesson'}).props.onPress(); await Promise.resolve(); });
    const selected = () => view.root.findAllByProps({accessibilityRole: 'button'}).filter((node) => node.props.accessibilityState?.selected)
      .map((node) => node.props.accessibilityLabel);

    expect(selected()).toContain('Good morning.');

    // The clock enters the second segment; the selection follows on its own.
    const play = view.root.findAllByProps({accessibilityLabel: 'Play'})[0]!;
    await act(async () => { play.props.onPress(); await Promise.resolve(); });
    mockPlayerSeconds = 5;
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 700)); });
    expect(selected()).toContain('How are you?');

    // Tapping the first line takes over: the playhead moving on no longer moves
    // the selection.
    await act(async () => { view.root.findByProps({accessibilityLabel: 'Good morning.'}).props.onPress(); await Promise.resolve(); });
    mockPlayerSeconds = 7;
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 700)); });
    expect(selected()).toContain('Good morning.');

    // Jump to what is playing gives it back.
    await act(async () => { view.root.findByProps({accessibilityLabel: 'Jump to what is playing'}).props.onPress(); await Promise.resolve(); });
    expect(selected()).toContain('How are you?');
  });

  /* The import acquires the media; the meaning is a second call against the
     transcript it produced, rendered into the learner's own language rather
     than the one they are studying. Native was asking import to carry the
     translation and never calling translate, so no line ever had a meaning. */
  it('requests the meaning separately, in the support language, and shows it inline', async () => {
    mockCookie = 'cookie';
    mockImport.mutate.mockImplementation((_input: unknown, options: {onSuccess: (value: unknown) => void}) => options.onSuccess(lesson));
    mockTranslate.mutate.mockImplementation((_input: unknown, options: {onSuccess: (value: unknown) => void}) => options.onSuccess({
      asset: lesson.asset,
      transcript: lesson.transcript,
      translations: [{segment_id: 'segment-1', target_language: 'vi', translated_meaning: 'Chào buổi sáng.'}],
      translation: {status: 'ready', target_language: 'vi'},
    }));
    const {view} = renderListening('en');
    act(() => { view.root.findByProps({accessibilityLabel: 'Media URL'}).props.onChangeText('https://youtu.be/example'); });
    await act(async () => { view.root.findByProps({accessibilityLabel: 'Prepare listening lesson'}).props.onPress(); await Promise.resolve(); });

    expect(mockImport.mutate).toHaveBeenCalledWith(expect.objectContaining({target_language: 'vi', include_word_timing: true, include_translation: false}), expect.any(Object));
    expect(mockTranslate.mutate).toHaveBeenCalledWith(expect.objectContaining({
      target_language: 'vi',
      transcript: expect.objectContaining({segments: expect.arrayContaining([expect.objectContaining({segment_id: 'segment-1', original_text: 'Good morning.'})])}),
    }), expect.any(Object));
    expect(view.root.findAllByProps({children: 'Chào buổi sáng.'})).not.toHaveLength(0);
  });

  it('keeps the transcript when the meaning cannot be produced', async () => {
    mockCookie = 'cookie';
    mockImport.mutate.mockImplementation((_input: unknown, options: {onSuccess: (value: unknown) => void}) => options.onSuccess(lesson));
    mockTranslate.mutate.mockImplementation((_input: unknown, options: {onError: () => void}) => options.onError());
    const {view} = renderListening('en');
    act(() => { view.root.findByProps({accessibilityLabel: 'Media URL'}).props.onChangeText('https://youtu.be/example'); });
    await act(async () => { view.root.findByProps({accessibilityLabel: 'Prepare listening lesson'}).props.onPress(); await Promise.resolve(); });
    expect(view.root.findAllByProps({children: 'Good morning.'})).not.toHaveLength(0);
    expect(view.root.findAllByProps({children: 'Meaning could not be generated right now. Continue with the original transcript.'})).not.toHaveLength(0);
  });

  it('hands the selected canonical segment to Shadowing', async () => {
    mockCookie = 'cookie';
    mockImport.mutate.mockImplementation((_input: unknown, options: {onSuccess: (value: unknown) => void}) => options.onSuccess(lesson));
    const {view} = renderListening('en');
    act(() => { view.root.findByProps({accessibilityLabel: 'Media URL'}).props.onChangeText('https://youtu.be/example'); });
    await act(async () => { view.root.findByProps({accessibilityLabel: 'Prepare listening lesson'}).props.onPress(); await Promise.resolve(); });
    act(() => { view.root.findByProps({accessibilityLabel: 'Open Speaking'}).props.onPress(); });
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
    expect(view.root.findByProps({accessibilityLabel: '句段 2'}).props.accessibilityState.selected).toBe(true);
    mockImport.mutate.mockImplementation((_input: unknown, options: {onError: () => void}) => options.onError());
    act(() => { view.root.findByProps({accessibilityLabel: '添加视频'}).props.onPress(); });
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
