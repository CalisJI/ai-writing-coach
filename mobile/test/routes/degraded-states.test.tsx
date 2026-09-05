import React from 'react';
import renderer, {act} from 'react-test-renderer';
import {I18nProvider} from '../../src/i18n/I18nProvider';
import {ThemeProvider} from '../../src/theme/ThemeProvider';
import {MESSAGE_CATALOGUES, translate, type MessageId} from '../../src/i18n/messages';
import GrammarScreen from '../../app/(app)/grammar';
import JourneyScreen from '../../app/(app)/journey';
import LibraryScreen from '../../app/(app)/library';
import ReviewScreen from '../../app/(app)/review';
import ProfileScreen from '../../app/(app)/profile';
import {HomeScreen} from '../../src/features/home/HomeScreen';

const mockReplace = jest.fn();
const mockSignOut = jest.fn();
let mockCookie: string | null = null;

const mockIdleQuery = {isPending: false, isLoading: false, isError: false, data: undefined};

jest.mock('expo-router', () => ({useRouter: () => ({push: jest.fn(), replace: mockReplace})}));
jest.mock('../../src/auth/SessionHarness', () => ({
  useSession: () => ({sessionCookie: mockCookie, session: {status: 'authenticated', source: 'development'}, signOut: mockSignOut}),
}));
jest.mock('../../src/api/client', () => ({createConfiguredApiClient: () => ({}), ApiClient: class {}}));
jest.mock('../../src/query/useGrammar', () => ({useGrammarLibrary: () => mockIdleQuery, useGrammarLesson: () => mockIdleQuery, useCompleteGrammarLesson: () => ({isPending: false, isError: false, mutate: jest.fn()})}));
jest.mock('../../src/query/useWritingEvaluation', () => ({useGrammarPractice: () => ({isPending: false, isError: false, mutate: jest.fn()}), useEvaluateWriting: () => ({isPending: false, isError: false, mutate: jest.fn()})}));
jest.mock('../../src/query/useReadingLibrary', () => ({useLibraryVocabulary: () => mockIdleQuery, useReviewLibraryVocabulary: () => ({isPending: false, isError: false, mutate: jest.fn()}), useContextualDictionary: () => ({data: undefined, isPending: false, isError: false, mutate: jest.fn()}), useSaveLibraryVocabulary: () => ({data: undefined, isPending: false, isError: false, mutate: jest.fn()})}));
jest.mock('../../src/query/useJourney', () => ({useJourneyDashboard: () => mockIdleQuery, useJourneyOutcomes: () => mockIdleQuery}));
jest.mock('../../src/query/useLearnerProfile', () => ({useLearnerProfile: () => mockIdleQuery, useSaveLearnerProfile: () => ({isPending: false, isError: false, mutateAsync: jest.fn()}), useSetLearningLanguage: () => ({isPending: false, isError: false, mutateAsync: jest.fn()})}));
jest.mock('../../src/query/useProductMe', () => ({useProductMe: () => mockIdleQuery}));
jest.mock('../../src/query/usePracticeRecommendation', () => ({usePracticeRecommendation: () => mockIdleQuery, useNextPractice: () => ({isPending: false, isError: false, mutate: jest.fn()})}));
jest.mock('../../src/query/useHome', () => ({useEssays: () => mockIdleQuery, useLearningMemory: () => mockIdleQuery, useReadingSessionHistory: () => mockIdleQuery, useOpenEssay: () => ({isPending: false, isError: false, mutate: jest.fn()}), useCrossSkillCue: () => mockIdleQuery}));
jest.mock('../../src/features/listening/listeningResume', () => ({readListeningResume: () => Promise.resolve(null)}));
jest.mock('../../src/features/listening/listeningHabit', () => ({listeningHabitSnapshot: () => Promise.resolve({status: 'unavailable', todaySeconds: 0, weekSeconds: 0, dailyGoalMinutes: 40})}));
jest.mock('../../src/query/useReview', () => ({usePracticeOutcome: () => mockIdleQuery, useReviewCue: () => mockIdleQuery, useImproveWriting: () => ({data: undefined, isPending: false, isError: false, mutate: jest.fn()}), useLinguisticAnnotations: () => ({data: undefined, isPending: false, isError: false, mutate: jest.fn()})}));

const render = (screen: React.ReactNode, locale: 'en' | 'zh' = 'en') =>
  renderer.create(<I18nProvider initialLocale={locale}><ThemeProvider>{screen}</ThemeProvider></I18nProvider>);
// findAll matches the host view that inherits the role but carries no handler,
// so keep only nodes that can actually be pressed.
const buttons = (view: renderer.ReactTestRenderer) => view.root.findAll((node) => node.props.accessibilityRole === 'button' && typeof node.props.onPress === 'function');
const says = (view: renderer.ReactTestRenderer, value: string) => view.root.findAll((node) => node.props.children === value);

describe('degraded learner states stay truthful and escapable', () => {
  beforeEach(() => { mockCookie = null; mockReplace.mockReset(); mockSignOut.mockReset(); });

  // Device QA found every one of these rendering a message with no way out, and
  // three of them blaming a "temporarily unavailable" service for a signed-out learner.
  it.each([
    ['Journey', () => <JourneyScreen />, 'journey.signed_out'],
    ['Grammar', () => <GrammarScreen />, 'grammar.signed_out'],
    ['Library', () => <LibraryScreen />, 'library.signed_out'],
  ] as const)('%s names the signed-out cause instead of an outage', (_name, make, id) => {
    for (const locale of ['en', 'zh'] as const) {
      const view = render(make(), locale);
      expect(says(view, translate(locale, id as MessageId))).not.toHaveLength(0);
      // An outage message would misattribute the cause.
      expect(says(view, translate(locale, id.replace('signed_out', 'unavailable') as MessageId))).toHaveLength(0);
      // Signed out is not an error condition.
      expect(view.root.findAll((node) => node.props.accessibilityRole === 'alert')).toHaveLength(0);
    }
  });

  it.each([
    ['Journey', () => <JourneyScreen />],
    ['Grammar', () => <GrammarScreen />],
    ['Profile', () => <ProfileScreen />],
  ] as const)('%s offers a route out rather than stranding the learner', (_name, make) => {
    const view = render(make());
    const found = buttons(view);
    expect(found.length).toBeGreaterThan(0);
    act(() => found[found.length - 1]?.props.onPress());
    expect(mockReplace).toHaveBeenCalledWith('/(app)');
  });

  // Review's own empty state routes to the screen that produces its input,
  // which is what review.js does: "Go to writing", not a generic way home.
  it('Review sends the learner to Writing rather than stranding them', () => {
    const view = render(<ReviewScreen />);
    const found = buttons(view);
    expect(found.length).toBeGreaterThan(0);
    act(() => found[found.length - 1]?.props.onPress());
    expect(mockReplace).toHaveBeenCalledWith('/(app)/writing');
  });

  /* Signed-out Home used to offer "Sign out", which is exactly the dead end
     this test was meant to rule out: the only action on a screen headed "Sign
     in to continue" was the thing the learner had already done. The escape is
     the sign-in route. */
  it('Home offers a way back in when no session cookie is held', () => {
    const view = render(<HomeScreen />);
    expect(says(view, translate('en', 'home.signed_out_body' as MessageId))).not.toHaveLength(0);
    const found = buttons(view);
    expect(found.length).toBeGreaterThan(0);
    act(() => found[0]?.props.onPress());
    expect(mockReplace).toHaveBeenCalledWith('/(auth)/sign-in');
    expect(mockSignOut).not.toHaveBeenCalled();
  });

  it('keeps every new degraded message defined in both locales', () => {
    const ids = ['journey.signed_out', 'grammar.signed_out', 'library.signed_out', 'home.signed_out_title', 'home.signed_out_body', 'nav.back_home'] as const;
    const all = new Set(Object.values(MESSAGE_CATALOGUES).flatMap((catalogue) => Object.keys(catalogue.en)));
    for (const id of ids) {
      expect(all.has(id)).toBe(true);
      for (const locale of ['en', 'zh'] as const) expect(translate(locale, id as MessageId)).not.toBe(id);
    }
  });
});
