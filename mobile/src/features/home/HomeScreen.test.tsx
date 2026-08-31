import React from 'react';
import renderer, {act} from 'react-test-renderer';
import {I18nProvider} from '../../i18n/I18nProvider';
import {ThemeProvider} from '../../theme/ThemeProvider';
import {HomeScreen} from './HomeScreen';

const mockPush = jest.fn();
const mockSaveMutate = jest.fn();
const mockSaveMutateAsync = jest.fn(() => Promise.resolve({}));
const mockLanguageMutateAsync = jest.fn(() => Promise.resolve({ok: true, active: 'en'}));
const mockNextMutate = jest.fn();
let mockProfileExists = true;
const mockDashboard = {essay_count: 2, revision_count: 3, skill_score: 82, cefr: 'B2', streak: 4, recent_average: 80, trend: [], metrics: {}, error_counts: {}, error_memory: [], next_level: null, version: '2.17.3'};
const mockLibrary = {items: [], summary: {total: 0, due: 0, available: 0}};
const mockEssays: unknown[] = [];
const mockMemory = {language: 'en', essay_count: 0, revision_count: 0, focus: null, patterns: [], strengths: [], revision_wins: [], review_cue: null};
const mockReadingHistory = {items: []};

jest.mock('expo-router', () => ({useRouter: () => ({push: mockPush, replace: jest.fn()})}));
jest.mock('../../auth/SessionHarness', () => ({useSession: () => ({session: {status: 'authenticated', source: 'server', userLabel: 'Learner'}, sessionCookie: 'cookie'})}));
jest.mock('../../api/client', () => ({createConfiguredApiClient: () => ({}), ApiClient: class {}}));
// Home now shows the same writing-evidence and recall signals the web home does.
jest.mock('../../query/useJourney', () => ({useJourneyDashboard: () => ({data: mockDashboard, isPending: false, isError: false}), useJourneyOutcomes: () => ({data: undefined, isPending: false, isError: false})}));
jest.mock('../../query/useReadingLibrary', () => ({useLibraryVocabulary: () => ({data: mockLibrary, isPending: false, isError: false})}));
jest.mock('../../query/useHome', () => ({useEssays: () => ({data: mockEssays, isPending: false, isError: false}), useLearningMemory: () => ({data: mockMemory, isPending: false, isError: false}), useReadingSessionHistory: () => ({data: mockReadingHistory, isPending: false, isError: false})}));
jest.mock('../../features/listening/listeningResume', () => ({readListeningResume: () => Promise.resolve(null)}));
jest.mock('../../features/listening/listeningHabit', () => ({listeningHabitSnapshot: () => Promise.resolve({status: 'unavailable', todaySeconds: 0, weekSeconds: 0, dailyGoalMinutes: 40})}));
jest.mock('../../query/useLearnerProfile', () => ({useLearnerProfile: () => ({data: {exists: mockProfileExists}, isPending: false, isError: false, refetch: jest.fn()}), useSaveLearnerProfile: () => ({mutate: mockSaveMutate, mutateAsync: mockSaveMutateAsync, isPending: false, isError: false}), useSetLearningLanguage: () => ({mutateAsync: mockLanguageMutateAsync, isPending: false, isError: false})}));
jest.mock('../../query/usePracticeRecommendation', () => ({usePracticeRecommendation: () => ({data: {language: 'en', intent: 'repair', focus_category: 'grammar', focus_label: 'Articles', focus_family: 'grammar', focus_status: 'watch', evidence: 'Repeated pattern', goal: 'work', guidance_style: 'guided', task_type: 'email', topic: 'Email', target_level: 'B1', word_target: 80, difficulty: {state: 'hold', word_target: 80, length_delta: 0, provenance: {source: 'none', evidence_count: 0}}, reason: 'Practice this pattern', focus_instruction: 'Use articles', action_label: 'Practice'}, isPending: false, isError: false, refetch: jest.fn()}), useNextPractice: () => ({mutate: mockNextMutate, isPending: false, isError: false})}));

const renderHome = (locale: 'en' | 'zh') => renderer.create(<I18nProvider initialLocale={locale}><ThemeProvider><HomeScreen client={{} as never} /></ThemeProvider></I18nProvider>);

describe('native Home R20-1 contract', () => {
  beforeEach(() => { mockPush.mockReset(); mockSaveMutate.mockReset(); mockSaveMutateAsync.mockClear(); mockLanguageMutateAsync.mockClear(); mockNextMutate.mockReset(); mockProfileExists = true; });
  it.each(['en', 'zh'] as const)('saves only explicit onboarding choices in %s', async (locale) => {
    mockProfileExists = false;
    const view = renderHome(locale);
    if (locale === 'zh') {
      const learningChoice = view.root.findAll((node) => node.props.accessibilityRole === 'radio' && typeof node.props.onPress === 'function').at(-1);
      act(() => learningChoice?.props.onPress());
    }
    const button = view.root.findAll((node) => node.props.accessibilityRole === 'button' && typeof node.props.onPress === 'function').at(-1);
    await act(async () => { button?.props.onPress(); await Promise.resolve(); });
    expect(mockLanguageMutateAsync).toHaveBeenCalledWith(locale === 'zh' ? 'zh' : 'en');
    expect(mockSaveMutateAsync).toHaveBeenCalledWith({goal: 'everyday', style: 'guided', pinyin: 'auto', native_language: 'en', theme_preset: 'editorial'});
    expect(mockLanguageMutateAsync.mock.invocationCallOrder[0]!).toBeLessThan(mockSaveMutateAsync.mock.invocationCallOrder[0]!);
  });
  // The web home is a hero plus a stack of evidence panels; the native home had
  // only the hero, so writing evidence and due recalls were invisible on device.
  it.each(['en', 'zh'] as const)('shows the writing evidence and recall signals in %s', (locale) => {
    const view = renderHome(locale);
    const shown = (value: string) => view.root.findAll((node) => String(node.props.children) === value).length > 0;
    expect(shown(String(mockDashboard.essay_count))).toBe(true);
    expect(shown(String(mockDashboard.revision_count))).toBe(true);
    expect(shown(mockDashboard.cefr)).toBe(true);
    expect(shown(String(mockDashboard.streak))).toBe(true);
    // Nothing is due, so the panel must say so rather than show a bare zero.
    expect(shown('0 ready to recall')).toBe(false);
    const labels = view.root
      .findAll((node) => node.props.accessibilityRole === 'button' && typeof node.props.onPress === 'function')
      .map((node) => String(node.props.accessibilityLabel));
    expect(labels.some((label) => label === (locale === 'zh' ? '查看学习轨迹' : 'View your journey'))).toBe(true);
    expect(labels.some((label) => label === (locale === 'zh' ? '打开词库' : 'Open Library'))).toBe(true);
  });

  it('does not save the profile when the canonical language switch fails', async () => {
    mockProfileExists = false;
    mockLanguageMutateAsync.mockRejectedValueOnce(new Error('language unavailable'));
    const view = renderHome('en');
    const button = view.root.findAll((node) => node.props.accessibilityRole === 'button' && typeof node.props.onPress === 'function').at(-1);
    await act(async () => { button?.props.onPress(); await Promise.resolve(); });
    expect(mockSaveMutateAsync).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });
  it.each(['en', 'zh'] as const)('renders server recommendation and hands the generated task to Writing in %s', (locale) => {
    const view = renderHome(locale);
    // Home carries several actions now, so target the one under test by name
    // rather than by position.
    const button = view.root.findAll((node) => node.props.accessibilityRole === 'button' && typeof node.props.onPress === 'function' && String(node.props.accessibilityLabel).includes(locale === 'zh' ? '开始练习' : 'Start practice')).at(0);
    act(() => button?.props.onPress());
    expect(mockNextMutate).toHaveBeenCalledWith('B1', expect.objectContaining({onSuccess: expect.any(Function)}));
    act(() => mockNextMutate.mock.calls[0][1].onSuccess({title: 'Practice', instruction: 'Write.', checklist: ['One', 'Two'], word_target: 80, task_type: 'email', topic: 'Email', source: 'personalized', prompt: 'Write.', target_level: 'B1', personalization: {language: 'en', intent: 'repair', focus_category: 'grammar', focus_label: 'Articles', focus_family: 'grammar', focus_status: 'watch', evidence: 'Repeated pattern', goal: 'work', guidance_style: 'guided', task_type: 'email', topic: 'Email', target_level: 'B1', word_target: 80, difficulty: {state: 'hold', word_target: 80, length_delta: 0, provenance: {source: 'none', evidence_count: 0}}, reason: 'Practice this pattern', focus_instruction: 'Use articles', action_label: 'Practice'}}));
    expect(mockPush).toHaveBeenCalledWith('/(app)/writing');
  });
});
