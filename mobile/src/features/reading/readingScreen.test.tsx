import React from 'react';
import renderer, {act} from 'react-test-renderer';
import {Pressable} from 'react-native';
import {I18nProvider} from '../../i18n/I18nProvider';
import {ThemeProvider} from '../../theme/ThemeProvider';
import ReadingScreen from '../../../app/(app)/reading';

const mockCreate = {isPending: false, isError: false, mutate: jest.fn()};
const mockSubmit = {isPending: false, isError: false, data: undefined, mutate: jest.fn()};
const mockDictionary = {isPending: false, isError: false, data: undefined, mutate: jest.fn()};
const mockSave = {isPending: false, mutate: jest.fn()};
let mockCookie: string | null = null;

jest.mock('expo-router', () => ({useRouter: () => ({push: jest.fn(), replace: jest.fn()})}));
jest.mock('../../auth/SessionHarness', () => ({useSession: () => ({session: {status: 'authenticated', source: 'server', userLabel: 'Learner'}, sessionCookie: mockCookie})}));
jest.mock('../../api/client', () => ({createConfiguredApiClient: () => ({}), ApiClient: class {}}));
jest.mock('../../query/useReadingLibrary', () => ({useCreateReadingSession: () => mockCreate, useSubmitReadingAnswers: () => mockSubmit, useContextualDictionary: () => mockDictionary, useSaveLibraryVocabulary: () => mockSave}));

const renderReading = (locale: 'en' | 'zh' = 'en') => renderer.create(<I18nProvider initialLocale={locale}><ThemeProvider><ReadingScreen /></ThemeProvider></I18nProvider>);

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

  it('renders server questions as accessible radio choices after confirmed session creation', () => {
    mockCookie = 'cookie';
    const view = renderReading();
    act(() => view.root.findByProps({accessibilityRole: 'button'}).props.onPress());
    act(() => mockCreate.mutate.mock.calls[0][1].onSuccess({id: 41, created_at: '2026-08-30T00:00:00Z', language_code: 'en', target_level: 'B1', topic: 'daily_life', learner_goal: 'work', title: 'A small change', passage: 'A short passage.', questions: [{id: 1, question: 'What changed?', options: ['A', 'B', 'C', 'D']}], recycled_words: [], generation_mode: 'generated'}));
    expect(view.root.findAllByType(Pressable).filter((node) => node.props.accessibilityRole === 'radio')).toHaveLength(4);
  });
});
