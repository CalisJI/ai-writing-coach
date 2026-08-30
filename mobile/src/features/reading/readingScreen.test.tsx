import React from 'react';
import renderer, {act} from 'react-test-renderer';
import {I18nProvider} from '../../i18n/I18nProvider';
import {ThemeProvider} from '../../theme/ThemeProvider';
import ReadingScreen, {ReadingQuestionList, ReadingSaveFailureNotice} from '../../../app/(app)/reading';

const mockCreate = {isPending: false, isError: false, mutate: jest.fn()};
const mockSubmit = {isPending: false, isError: false, data: undefined, mutate: jest.fn()};
const mockDictionary = {isPending: false, isError: false, data: undefined, mutate: jest.fn()};
const mockSave = {isPending: false, mutate: jest.fn()};
let mockCookie: string | null = null;

jest.mock('expo-router', () => ({useRouter: () => ({push: jest.fn(), replace: jest.fn()})}));
jest.mock('../../auth/SessionHarness', () => ({useSession: () => ({session: {status: 'authenticated', source: 'server', userLabel: 'Learner'}, sessionCookie: mockCookie})}));
jest.mock('../../api/client', () => ({createConfiguredApiClient: () => ({}), ApiClient: class {}}));
jest.mock('../../query/useReadingLibrary', () => ({useCreateReadingSession: () => mockCreate, useSubmitReadingAnswers: () => mockSubmit, useContextualDictionary: () => mockDictionary, useSaveLibraryVocabulary: () => mockSave}));

const renderReading = (locale: 'en' | 'zh' = 'en') => {
  let view!: renderer.ReactTestRenderer;
  act(() => { view = renderer.create(<I18nProvider initialLocale={locale}><ThemeProvider><ReadingScreen /></ThemeProvider></I18nProvider>); });
  return view;
};

describe('native Reading R20-3 accessibility and handoff states', () => {
  beforeEach(() => { mockCookie = null; mockCreate.isError = false; mockCreate.mutate.mockReset(); });

  it.each(['en', 'zh'] as const)('keeps the signed-out start action unavailable in %s', (locale) => {
    const view = renderReading(locale);
    expect(view.root.findByProps({accessibilityRole: 'header'})).toBeDefined();
    const start = view.root.findByProps({accessibilityRole: 'button'});
    expect(start.props.disabled).toBe(true);
  });

  it('shows a localized unavailable alert without fabricating reading content', () => {
    mockCookie = 'cookie'; mockCreate.isError = true;
    const view = renderReading('zh');
    expect(view.root.findByProps({accessibilityRole: 'alert'})).toBeDefined();
    expect(view.root.findAllByProps({accessibilityRole: 'radio'})).toHaveLength(0);
  });

  it.each(['en', 'zh'] as const)('exposes a localized rejected-save alert in %s', (locale) => {
    let view!: renderer.ReactTestRenderer;
    act(() => { view = renderer.create(<I18nProvider initialLocale={locale}><ThemeProvider><ReadingSaveFailureNotice visible /></ThemeProvider></I18nProvider>); });
    expect(view.root.findByProps({accessibilityRole: 'alert'})).toBeDefined();
  });

  it('renders each server question as four accessible radio choices', () => {
    let view!: renderer.ReactTestRenderer;
    const session = {id: 41, created_at: '2026-08-30T00:00:00Z', language_code: 'en' as const, target_level: 'B1', topic: 'daily_life', learner_goal: 'work', title: 'A small change', passage: 'A short passage.', questions: [{id: 1, question: 'What changed?', options: ['A', 'B', 'C', 'D']}], recycled_words: [], generation_mode: 'generated'};
    act(() => { view = renderer.create(<ThemeProvider><ReadingQuestionList session={session} answers={[-1]} onAnswer={jest.fn()} /></ThemeProvider>); });
    expect(view.root.findAllByProps({accessibilityRole: 'radio'}).length).toBeGreaterThanOrEqual(4);
  });

});
