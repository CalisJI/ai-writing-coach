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
const mockSaveShadowing = {isPending: false, mutate: jest.fn()};
const mockShadowingProgress = {isPending: false, isError: false, data: {items: []}};
/** Take files the studio deleted, so a test can prove they leave the device. */
const mockRemovedTakeUris: string[] = [];

/**
 * Stands in for TransientAudioService. It records what the studio asked for
 * rather than touching a microphone, so the round flow is testable off-device.
 */
class FakeAudio {
  permission: 'granted' | 'denied' = 'granted';
  started = 0;
  stopped = 0;
  played: string[] = [];
  private uri: string | null = null;
  async startRecording() {
    if (this.permission !== 'granted') return {state: 'denied' as const, permission: this.permission};
    this.started += 1;
    return {state: 'recording' as const, permission: this.permission};
  }
  async stopRecording() {
    this.stopped += 1;
    this.uri = `file:///tmp/take-${this.stopped}.m4a`;
    return {state: 'recorded' as const, permission: this.permission};
  }
  getRecordingUri() { return this.uri; }
  async playUri(uri: string) { this.played.push(uri); return {state: 'playing' as const, permission: this.permission}; }
  async release() { /* nothing to free in the fake */ }
}
const mockLearnerProfile = {isPending: false, isError: false, data: {exists: true, language: 'en', goal: 'everyday', style: 'guided', pinyin: 'auto', native_language: 'vi', theme_preset: 'editorial', updated_at: '2026-01-01'}};
const mockProgress = {isPending: false, isError: false, data: {items: []}};
const mockMediaStatus = {data: undefined as {state?: {status: string; resumable: boolean; resumeHandle?: string}} | undefined, force: () => {}};
const mockMediaStore = {read: jest.fn(), persist: jest.fn(), clear: jest.fn()};
const mockListeningLibrary = jest.fn().mockResolvedValue({api_version: 1, language: 'en', items: [], topics: [], sections: [], filters: {languages: ['en', 'zh'], levels: [], topics: []}});
const mockListeningLibraryLesson = jest.fn();
const mockClient = {listeningLibrary: mockListeningLibrary, listeningLibraryLesson: mockListeningLibraryLesson};
const lesson = {
  asset: {asset_id: 'asset-en-1', source_url: 'https://youtu.be/example', source_provider: 'youtube', source_type: 'video', title: 'A short lesson', source_language: 'en', processing_state: 'ready', duration_ms: 12000, transcript_available: true, translation_available: true},
  playback: {provider: 'youtube', kind: 'embed', url: 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ'},
  transcript: {asset_id: 'asset-en-1', source_language: 'en', segments: [{segment_id: 'segment-1', order: 0, start_ms: 0, end_ms: 4000, original_text: 'Good morning.'}, {segment_id: 'segment-2', order: 1, start_ms: 4000, end_ms: 8000, original_text: 'How are you?'}]},
  translations: [],
};

// The studio's recorder is injected; these player hooks keep the curated-audio
// adapter deterministic without touching a device audio session.
jest.mock('expo-audio', () => ({
  AudioModule: {}, RecordingPresets: {LOW_QUALITY: {}}, createAudioPlayer: jest.fn(),
  getRecordingPermissionsAsync: jest.fn(), requestRecordingPermissionsAsync: jest.fn(), setAudioModeAsync: jest.fn(),
  useAudioPlayer: () => ({seekTo: jest.fn(), play: jest.fn(), pause: jest.fn(), muted: false, playbackRate: 1}),
  useAudioPlayerStatus: () => ({playing: false, currentTime: 0, duration: 0}),
}));
jest.mock('expo-video', () => ({
  VideoView: (props: Record<string, unknown>) => {
    mockVideoViewProps = props;
    return null;
  },
  useVideoPlayer: (source: {uri?: string} | null) => {
    mockVideoSource = source ? source.uri ?? null : null;
    return mockVideoPlayer;
  },
}));
jest.mock('expo', () => ({
  useEvent: (_player: unknown, event: string, initial: unknown) => (event === 'timeUpdate' ? {currentTime: mockVideoSeconds} : initial),
}));
jest.mock('expo-router', () => ({useRouter: () => mockRouter, useLocalSearchParams: () => ({})}));
jest.mock('../../src/auth/SessionHarness', () => ({useSession: () => ({session: {status: mockCookie ? 'authenticated' : 'signed-out', source: 'server'}, sessionCookie: mockCookie})}));
jest.mock('../../src/api/client', () => ({createConfiguredApiClient: () => ({}), ApiClient: class {}}));
jest.mock('../../src/query/useListening', () => ({useImportMedia: () => mockImport, useListeningProgress: () => mockProgress, useSaveListeningProgress: () => mockSave, useTranslateMedia: () => mockTranslate, useShadowingProgress: () => mockShadowingProgress, useSaveShadowingProgress: () => mockSaveShadowing}));
jest.mock('../../src/query/useLearnerProfile', () => ({useLearnerProfile: () => mockLearnerProfile}));
// The studio writes takes to the app cache; the test filesystem records the
// copies and deletes instead of touching disk.
jest.mock('expo-file-system', () => ({
  Paths: {cache: {uri: 'file:///cache/'}},
  File: class {
    mockPath: string;
    constructor(path: string) { this.mockPath = path; }
    copy() { /* the destination path is what the store returns */ }
    delete() { mockRemovedTakeUris.push(this.mockPath); }
  },
}));
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

let mockVideoViewProps: Record<string, unknown> | null = null;
let mockVideoSource: string | null = null;
let mockVideoSeconds = 0;
const mockVideoPlayer = {
  play: jest.fn(), pause: jest.fn(), duration: 47.328, muted: false, playbackRate: 1,
  currentTime: 0, timeUpdateEventInterval: 0,
};

const renderListening = (locale: 'en' | 'zh', storage = new MemoryKeyValueStorage(), audioService?: unknown, initialView: 'discover' | 'my-media' = 'my-media') => {
  let view!: renderer.ReactTestRenderer;
  act(() => { view = renderer.create(<I18nProvider initialLocale={locale}><ThemeProvider><ListeningScreen client={mockClient as never} resumeStorage={storage} mediaResumeStorage={storage} audioService={audioService as never} /></ThemeProvider></I18nProvider>); });
  if (mockCookie && initialView === 'my-media') act(() => {
    const myMedia = view.root.findAll((node) => node.props.accessibilityRole === 'tab' && typeof node.props.onPress === 'function' && node.props.accessibilityState?.selected === false)[0];
    myMedia!.props.onPress();
  });
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
    mockSaveShadowing.mutate.mockReset();
    mockShadowingProgress.isError = false;
    mockRemovedTakeUris.length = 0;
    mockProgress.isPending = false;
    mockProgress.isError = false;
    mockProgress.data = {items: []};
    mockMediaStatus.data = undefined;
    mockMediaStatus.force = () => undefined;
    mockMediaStore.read.mockReset().mockResolvedValue(null);
    mockMediaStore.persist.mockReset();
    mockMediaStore.clear.mockReset();
    mockListeningLibrary.mockReset().mockResolvedValue({api_version: 1, language: 'en', items: [], topics: [], sections: [], filters: {languages: ['en', 'zh'], levels: [], topics: []}});
    mockListeningLibraryLesson.mockReset();
    mockAppStateHandler = null;
    mockPlayerSeconds = 0;
  });

  afterEach(() => { jest.restoreAllMocks(); });

  it.each(['en', 'zh'] as const)('renders a truthful signed-out state in %s', (locale) => {
    const {view} = renderListening(locale);
    expect(view.root.findByProps({accessibilityRole: 'header'})).toBeDefined();
    expect(view.root.findAllByProps({accessibilityLabel: locale === 'en' ? 'Prepare listening lesson' : '准备听力课程'})).toHaveLength(0);
  });

  it('opens signed-in Listening on Discover instead of the URL import tool', () => {
    mockCookie = 'cookie';
    const {view} = renderListening('en', new MemoryKeyValueStorage(), undefined, 'discover');
    expect(view.root.findAllByProps({children: 'Recommended for you'})).not.toHaveLength(0);
    expect(view.root.findAllByProps({accessibilityLabel: 'Media URL'})).toHaveLength(0);
  });

  it('filters the curated library by canonical learner level and extensible tags', async () => {
    mockCookie = 'cookie';
    const item = (lesson_id: string, title: string, level: string, content_tags: string[]) => ({lesson_id, media_object_id: `asset-${lesson_id}`, excerpt_start_ms: 0, excerpt_end_ms: 30000, language: 'en', title, description: title, topic: 'daily-life', subtopics: [], level, duration_ms: 30000, thumbnail: '', source: {creator: 'Rights-cleared creator', provider: 'fixture'}, available_modes: ['listen', 'dictation'], published_state: 'published', content_tags});
    mockListeningLibrary.mockResolvedValue({api_version: 1, language: 'en', items: [item('a1', 'Beginner walk', 'A1', ['conversation']), item('b2', 'Intermediate story', 'B2', ['story'])], topics: ['daily-life'], tags: ['conversation', 'story'], sections: [], filters: {languages: ['en', 'zh'], levels: ['A1', 'B2'], topics: ['daily-life'], tags: ['conversation', 'story']}});
    const {view} = renderListening('en', new MemoryKeyValueStorage(), undefined, 'discover');
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });
    expect(view.root.findAllByProps({children: 'Beginner walk'})).not.toHaveLength(0);
    const b2Filter = view.root.findAll((node) => typeof node.props.onPress === 'function' && node.props.accessibilityState?.selected === false && node.findAllByProps({children: 'B2'}).length > 0)[0];
    act(() => { b2Filter!.props.onPress(); });
    expect(view.root.findAllByProps({children: 'Beginner walk'})).toHaveLength(0);
    expect(view.root.findAllByProps({children: 'Intermediate story'})).not.toHaveLength(0);
    const storyFilter = view.root.findAll((node) => typeof node.props.onPress === 'function' && node.findAllByProps({children: '#story'}).length > 0)[0];
    act(() => { storyFilter!.props.onPress(); });
    expect(view.root.findAllByProps({children: 'Intermediate story'})).not.toHaveLength(0);
    expect(view.root.findAll((node) => Array.isArray(node.props.children) && node.props.children.join('') === 'Source: Rights-cleared creator')).not.toHaveLength(0);
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

  /**
   * Curated real-media parity. The web gained playback.kind === "video" first;
   * until native followed, en-science-cosmic-calendar and
   * zh-technology-search-wikipedia were real videos in a browser and
   * "playback unavailable" on a phone, against the full-native-port contract.
   */
  describe('curated real video parity with the web', () => {
    const videoLesson = (language: 'en' | 'zh') => ({
      ...lesson,
      playback: {
        provider: 'wikimedia-commons',
        kind: 'video',
        url: `https://upload.wikimedia.org/wikipedia/commons/transcoded/b/bc/${language}.webm/${language}.webm.480p.vp9.webm`,
      },
      catalog: {
        lesson_id: language === 'en' ? 'en-science-cosmic-calendar' : 'zh-technology-search-wikipedia',
        media_object_id: 'asset-en-1', title: 'Real lesson', description: '', language,
        topic: language === 'en' ? 'science' : 'technology', subtopics: [], level: 'B2',
        estimated_level: 'B2', reviewed_level: null, level_source: 'deterministic-estimate' as const,
        level_evidence: {}, duration_ms: 46000,
        excerpt_start_ms: language === 'en' ? 1000 : 16120,
        excerpt_end_ms: language === 'en' ? 47000 : 59400,
        available_modes: ['listen', 'active', 'dictation', 'shadowing'] as const,
        content_tags: [], artwork: 'science',
        poster_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/bc/x.webm/960px--x.webm.jpg',
        playback_kind: 'video',
        source: {source_media_id: 's', provider: 'wikimedia-commons', type: 'licensed-video', title: 't', creator: 'c',
          source_url: 'https://commons.wikimedia.org/wiki/File:x', provenance_url: 'https://commons.wikimedia.org/wiki/File:x',
          license: 'CC BY 3.0', license_url: 'https://creativecommons.org/licenses/by/3.0/',
          allowed_usage_type: 'creative-commons-attribution', rights_review_status: 'verified' as const},
      },
    });

    it.each(['en', 'zh'] as const)('renders a real video player for %s instead of playback-unavailable', async (language) => {
      mockCookie = 'cookie';
      mockVideoViewProps = null;
      mockVideoSource = null;
      mockImport.mutate.mockImplementation((_input: unknown, options: {onSuccess: (value: unknown) => void}) => options.onSuccess(videoLesson(language)));
      const {view} = renderListening('en');
      act(() => { view.root.findByProps({accessibilityLabel: 'Media URL'}).props.onChangeText('https://example.invalid/x'); });
      await act(async () => {
        view.root.findByProps({accessibilityLabel: 'Prepare listening lesson'}).props.onPress();
        await Promise.resolve();
      });

      // The one thing that must never happen again: a real lesson degraded.
      expect(view.root.findAllByProps({children: 'Playback is unavailable for this source.'})).toHaveLength(0);
      expect(mockVideoSource).toContain('upload.wikimedia.org');
      expect(mockVideoSource).toContain('.webm');
      expect(mockVideoViewProps).not.toBeNull();
      expect(mockVideoViewProps!.player).toBe(mockVideoPlayer);
      expect(mockVideoViewProps!.nativeControls).toBe(false);
    });

    it('leaves Active and Shadowing enabled on curated video', async () => {
      mockCookie = 'cookie';
      mockImport.mutate.mockImplementation((_input: unknown, options: {onSuccess: (value: unknown) => void}) => options.onSuccess(videoLesson('en')));
      const {view} = renderListening('en');
      act(() => { view.root.findByProps({accessibilityLabel: 'Media URL'}).props.onChangeText('https://example.invalid/x'); });
      await act(async () => {
        view.root.findByProps({accessibilityLabel: 'Prepare listening lesson'}).props.onPress();
        await Promise.resolve();
      });
      expect(view.root.findByProps({accessibilityLabel: 'Active'}).props.accessibilityState.disabled).toBe(false);
      expect(view.root.findByProps({accessibilityLabel: 'Shadowing'}).props.accessibilityState.disabled).toBe(false);
    });
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

  /* The Shadowing Studio: one segment at a time, the takes underneath it. The
     web holds takes in memory for the session and never uploads them; only the
     round count reaches the server. */
  describe('Shadowing Studio', () => {
    const openStudio = async () => {
      mockCookie = 'cookie';
      mockImport.mutate.mockImplementation((_input: unknown, options: {onSuccess: (value: unknown) => void}) => options.onSuccess(lesson));
      const audio = new FakeAudio();
      const {view} = renderListening('en', new MemoryKeyValueStorage(), audio);
      act(() => { view.root.findByProps({accessibilityLabel: 'Media URL'}).props.onChangeText('https://youtu.be/example'); });
      await act(async () => { view.root.findByProps({accessibilityLabel: 'Prepare listening lesson'}).props.onPress(); await Promise.resolve(); });
      act(() => { view.root.findByProps({accessibilityLabel: 'Shadowing'}).props.onPress(); });
      return {view, audio};
    };
    const press = async (view: renderer.ReactTestRenderer, label: string) => {
      await act(async () => { view.root.findAllByProps({accessibilityLabel: label})[0]!.props.onPress(); await Promise.resolve(); await Promise.resolve(); });
    };

    it('offers three rounds before anything is recorded, and no score for them', async () => {
      const {view} = await openStudio();
      expect(view.root.findAllByProps({accessibilityLabel: 'Start round 1'})).not.toHaveLength(0);
      expect(view.root.findAllByProps({accessibilityLabel: 'Start round 3'})).not.toHaveLength(0);
      expect(view.root.findAllByProps({accessibilityLabel: 'Start round 4'})).toHaveLength(0);
      // An unrecorded round carries nothing that could be scored.
      expect(view.root.findAllByProps({children: 'Not scored'})).toHaveLength(0);
    });

    it('records a round, keeps the take on the device, and reports only the round count', async () => {
      const {view, audio} = await openStudio();
      await press(view, 'Repeat it');
      expect(audio.started).toBe(1);
      expect(view.root.findAllByProps({children: 'Recording. Tap to stop.'})).not.toHaveLength(0);

      await press(view, 'Repeat it');
      expect(audio.stopped).toBe(1);
      // The round count is the only thing that leaves the device.
      expect(mockSaveShadowing.mutate).toHaveBeenCalledWith(
        {asset_id: 'asset-en-1', segment_id: 'segment-1', completed_rounds: 1},
        expect.any(Object),
      );
      const sent = JSON.stringify(mockSaveShadowing.mutate.mock.calls[0]![0]);
      expect(sent).not.toContain('file://');
      // A recorded round now shows the reserved, empty score position.
      expect(view.root.findAllByProps({children: 'Not scored'})).not.toHaveLength(0);
      expect(view.root.findAllByProps({children: 'This take is not evaluated.'})).not.toHaveLength(0);
      // Round 1 is now filled, and 2 and 3 are still waiting: the reference
      // keeps a floor of three rounds, so a fourth row only appears once three
      // takes exist.
      expect(view.root.findAllByProps({accessibilityLabel: 'Start round 1'})).toHaveLength(0);
      expect(view.root.findAllByProps({accessibilityLabel: 'Start round 2'})).not.toHaveLength(0);
      expect(view.root.findAllByProps({accessibilityLabel: 'Start round 3'})).not.toHaveLength(0);
      expect(view.root.findAllByProps({accessibilityLabel: 'Start round 4'})).toHaveLength(0);
    });

    it('plays a take back from the device', async () => {
      const {view, audio} = await openStudio();
      await press(view, 'Repeat it');
      await press(view, 'Repeat it');
      await press(view, 'Listen to me');
      expect(audio.played).toHaveLength(1);
      expect(audio.played[0]).toMatch(/^file:\/\/\/cache\//);
    });

    it('says so plainly when the microphone is refused, and records nothing', async () => {
      const {view, audio} = await openStudio();
      audio.permission = 'denied';
      await press(view, 'Repeat it');
      expect(view.root.findAllByProps({children: 'Microphone access is off. Turn it on in Settings to record.'})).not.toHaveLength(0);
      expect(mockSaveShadowing.mutate).not.toHaveBeenCalled();
      expect(audio.stopped).toBe(0);
    });

    it('keeps practising when the round count cannot be saved', async () => {
      mockSaveShadowing.mutate.mockImplementation((_input: unknown, options: {onError: () => void}) => options.onError());
      const {view} = await openStudio();
      await press(view, 'Repeat it');
      await press(view, 'Repeat it');
      expect(view.root.findAllByProps({children: 'Rounds could not be saved. Practice still works.'})).not.toHaveLength(0);
      // The take is still there to listen back to.
      expect(view.root.findAllByProps({children: 'Not scored'})).not.toHaveLength(0);
    });

    it('leaving the studio removes the takes from the device', async () => {
      const {view} = await openStudio();
      await press(view, 'Repeat it');
      await press(view, 'Repeat it');
      expect(view.root.findAllByProps({children: 'Not scored'})).not.toHaveLength(0);
      await press(view, 'Leave studio');
      expect(mockRemovedTakeUris.length).toBeGreaterThan(0);
      expect(view.root.findAllByProps({accessibilityLabel: 'Follow'})[0]!.props.accessibilityState.selected).toBe(true);
    });
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
