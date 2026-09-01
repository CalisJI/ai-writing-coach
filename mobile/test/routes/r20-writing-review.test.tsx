import React from 'react';
import renderer, {act} from 'react-test-renderer';
import {I18nProvider} from '../../src/i18n/I18nProvider';
import {ThemeProvider} from '../../src/theme/ThemeProvider';
import {clearWritingHandoff, setGrammarWritingHandoff, setPracticeWritingHandoff, setRevisionWritingHandoff} from '../../src/features/writing/writingHandoff';
import {clearReviewHandoff, consumeReviewHandoff, setReviewHandoff} from '../../src/features/review/reviewHandoff';
import {categoryReason, categoryRule, changedSegments} from '../../src/features/review/reviewDomain';
import {translate, type MessageId} from '../../src/i18n/messages';
import WritingScreen from '../../app/(app)/writing';
import ReviewScreen from '../../app/(app)/review';

const mockPush = jest.fn();
const mockReplace = jest.fn();
let mockCookie: string | null = 'cookie';
const mockEvaluate = {isPending: false, isError: false, mutate: jest.fn()};
const mockGrammarPractice = {isPending: false, isError: false, mutate: jest.fn()};

jest.mock('expo-router', () => ({useRouter: () => ({push: mockPush, replace: mockReplace})}));
jest.mock('../../src/auth/SessionHarness', () => ({useSession: () => ({sessionCookie: mockCookie, session: {status: mockCookie ? 'authenticated' : 'signed_out'}})}));
jest.mock('../../src/api/client', () => ({createConfiguredApiClient: () => ({}), ApiClient: class {}}));
jest.mock('../../src/query/useWritingEvaluation', () => ({useEvaluateWriting: () => mockEvaluate, useGrammarPractice: () => mockGrammarPractice, useGenerateTask: () => ({isPending: false, isError: false, mutate: jest.fn()})}));
jest.mock('../../src/query/useLearnerProfile', () => ({useLearnerProfile: () => ({data: undefined, isPending: false, isError: false})}));
jest.mock('../../src/query/useReview', () => ({usePracticeOutcome: () => ({data: undefined, isPending: false, isError: false}), useReviewCue: () => ({data: undefined, isPending: false, isError: false}), useImproveWriting: () => ({data: undefined, isPending: false, isError: false, mutate: jest.fn()}), useLinguisticAnnotations: () => ({data: undefined, isPending: false, isError: false, mutate: jest.fn()})}));
jest.mock('../../src/query/useReadingLibrary', () => ({useContextualDictionary: () => ({data: undefined, isPending: false, isError: false, mutate: jest.fn()}), useSaveLibraryVocabulary: () => ({data: undefined, isPending: false, isError: false, mutate: jest.fn()})}));
jest.mock('../../src/query/useJourney', () => ({useJourneyDashboard: () => ({data: undefined, isPending: false, isError: false}), useJourneyOutcomes: () => ({data: undefined, isPending: false, isError: false})}));
// The draft store is device storage; these tests assert screen behaviour, not persistence.
jest.mock('../../src/features/writing/writingDraft', () => {
  const actual = jest.requireActual('../../src/features/writing/writingDraft') as Record<string, unknown>;
  return {...actual, readWritingDraft: () => Promise.resolve(null), writeWritingDraft: () => Promise.resolve(), clearWritingDraft: () => Promise.resolve()};
});

const render = (screen: React.ReactNode, locale: 'en' | 'zh' = 'en') => renderer.create(<I18nProvider initialLocale={locale}><ThemeProvider>{screen}</ThemeProvider></I18nProvider>);
const texts = (view: renderer.ReactTestRenderer, value: string) => view.root.findAll((node) => node.props.children === value);
const buttonLabelled = (view: renderer.ReactTestRenderer, label: string) => {
  const [first] = view.root.findAll((node) => node.props.accessibilityRole === 'button' && node.props.accessibilityLabel === label);
  // Throw rather than return undefined: a missing control is a failure to report,
  // not a silently skipped assertion.
  if (!first) throw new Error(`no button labelled "${label}"`);
  return first;
};
// Rows carry their name as an accessibilityLabel; their visible content is a
// composed head (mark, name, chip, chevron) rather than a single text child.
const rowLabelled = (view: renderer.ReactTestRenderer, label: string) => {
  const [first] = view.root.findAll((node) => node.props.accessibilityRole === 'button' && node.props.accessibilityLabel === label && typeof node.props.onPress === 'function');
  if (!first) throw new Error(`no row labelled "${label}"`);
  return first;
};
const buttonContaining = (view: renderer.ReactTestRenderer, fragment: string) => {
  const [first] = view.root.findAll((node) => node.props.accessibilityRole === 'button' && String(node.props.accessibilityLabel).includes(fragment));
  if (!first) throw new Error(`no button containing "${fragment}"`);
  return first;
};

const recommendation = {
  language: 'en' as const, intent: 'repair' as const, focus_category: 'agreement', focus_label: 'Subject-verb agreement',
  focus_family: 'grammar' as const, focus_status: 'recurring', evidence: 'I has a dog.', goal: 'everyday' as const,
  guidance_style: 'guided' as const, task_type: 'opinion' as const, topic: 'daily routine', target_level: 'B1', word_target: 120,
  difficulty: {state: 'hold' as const, word_target: 120, length_delta: 0, provenance: {source: 'practice_outcome' as const, evidence_count: 2}},
  reason: 'Agreement kept recurring in your last two pieces.', focus_instruction: 'Check every subject and verb pair.',
  action_label: 'Practice this focus',
};
const practiceTask = {
  title: 'Describe your daily routine', instruction: 'Write about an ordinary weekday.',
  checklist: ['Check every subject and verb pair.', 'Give two concrete details.'], word_target: 120,
  task_type: 'opinion' as const, topic: 'daily routine', source: 'built-in', prompt: 'Write about an ordinary weekday.',
  target_level: 'B1', personalization: recommendation,
};
const grammarTask = {
  grammar_id: 'en-articles', title: 'Articles', level: 'B1', target_level: 'B1', prompt: 'Write three sentences using articles.',
  practice_blueprint: {}, source: 'static-grammar-kb',
  practice_context: {intent: 'repair' as const, focus_category: 'grammar', focus_label: 'Articles', focus_family: 'grammar' as const, task_type: 'story', topic: 'grammar transfer', target_level: 'B1', action_label: 'Practice this grammar', reason: 'A writing finding', evidence: 'a dog', focus_instruction: 'Use articles.', grammar_id: 'en-articles', grammar_title: 'Articles'},
};
const evaluation = {
  id: 41, series_id: 7, revision_no: 1, parent_id: null, overall: 78, app_cefr: 'B1', evaluator: 'demo',
  summary_vi: 'Bài viết đủ ý nhưng còn lỗi chia động từ.', strengths_vi: ['Bố cục rõ ràng.'], strength_evidence: [],
  priorities_vi: ['Kiểm tra lại chủ ngữ và động từ.'],
  errors: [{id: 'issue-1', category: 'agreement', fragment: 'I has', explanation_vi: 'Chủ ngữ và động từ chưa hợp.', explanation_en: 'The subject and verb do not agree.', explanation_zh: '主语和动词不一致。', mini_rule_vi: 'I đi với have.', mini_rule_en: 'Use have with I.', mini_rule_zh: 'I 要用 have。', suggestion: 'I have', confidence: 0.9}],
  grammar_links: [{grammar_id: 'en-articles', title: 'Articles', evidence: 'a dog'}],
};
const evaluationInput = {prompt: 'Write about an ordinary weekday.', text: 'I has a dog and I write every day.', target_cefr: 'B1', learning_language: 'en' as const};

describe('R20 native Writing -> Evaluate -> Review -> Grammar -> Revise loop', () => {
  beforeEach(() => {
    mockCookie = 'cookie';
    mockPush.mockReset(); mockReplace.mockReset(); mockEvaluate.mutate.mockReset(); mockGrammarPractice.mutate.mockReset();
    mockEvaluate.isPending = false; mockEvaluate.isError = false; mockGrammarPractice.isPending = false; mockGrammarPractice.isError = false;
    clearWritingHandoff(); clearReviewHandoff();
  });

  it.each(['en', 'zh'] as const)('submits the prepared practice brief with its real evaluation payload in %s', (locale) => {
    setPracticeWritingHandoff(practiceTask);
    const view = render(<WritingScreen />, locale);
    // write.js's promptCard shows the brief the learner answers (promptText():
    // instruction first, prompt as fallback), never the task's own title.
    expect(texts(view, 'Write about an ordinary weekday.')).not.toHaveLength(0);
    const input = view.root.findByProps({accessibilityLabel: locale === 'zh' ? '你的草稿' : 'Your draft'});
    act(() => input.props.onChangeText('I has a dog and I write every day.'));
    act(() => buttonLabelled(view, locale === 'zh' ? '点评草稿' : 'Review draft').props.onPress());
    expect(mockEvaluate.mutate).toHaveBeenCalledTimes(1);
    const [payload] = mockEvaluate.mutate.mock.calls[0];
    expect(payload).toEqual({
      prompt: 'Write about an ordinary weekday.',
      text: 'I has a dog and I write every day.',
      target_cefr: 'B1',
      practice_context: expect.objectContaining({intent: 'repair', focus_category: 'agreement', focus_family: 'grammar', focus_instruction: 'Check every subject and verb pair.'}),
      learning_language: 'en',
    });
    // The brief is a practice task, not a revision: no source essay may be claimed.
    expect(payload).not.toHaveProperty('parent_essay_id');
  });

  it('refuses to submit until the learner has written enough, and never claims progress on failure', () => {
    setPracticeWritingHandoff(practiceTask);
    const view = render(<WritingScreen />);
    // write.js's submitForReview() keeps the action live and answers a too-short
    // draft with write.short_first rather than a dead control, so the guard to
    // assert is that nothing is sent -- not that a prop is set.
    act(() => buttonLabelled(view, 'Review draft').props.onPress());
    expect(mockEvaluate.mutate).not.toHaveBeenCalled();
    expect(texts(view, 'Write at least a short paragraph first.')).not.toHaveLength(0);
    expect(view.root.findByProps({accessibilityRole: 'alert'})).toBeDefined();

    act(() => view.root.findByProps({accessibilityLabel: 'Your draft'}).props.onChangeText('short'));
    act(() => buttonLabelled(view, 'Review draft').props.onPress());
    expect(mockEvaluate.mutate).not.toHaveBeenCalled();

    act(() => view.root.findByProps({accessibilityLabel: 'Your draft'}).props.onChangeText('I has a dog and I write every day.'));
    act(() => buttonLabelled(view, 'Review draft').props.onPress());
    expect(mockEvaluate.mutate).toHaveBeenCalledTimes(1);
  });

  it.each(['en', 'zh'] as const)('offers the setup panel to start a new session instead of inventing a brief in %s', (locale) => {
    const view = render(<WritingScreen />, locale);
    expect(texts(view, locale === 'zh' ? '写作设置' : 'Writing setup')).not.toHaveLength(0);
    expect(mockEvaluate.mutate).not.toHaveBeenCalled();
    act(() => buttonLabelled(view, locale === 'zh' ? '返回首页' : 'Back to Home').props.onPress());
    expect(mockReplace).toHaveBeenCalledWith('/(app)');
  });

  it('hands the server evaluation to Review without altering it', () => {
    setPracticeWritingHandoff(practiceTask);
    const view = render(<WritingScreen />);
    act(() => view.root.findByProps({accessibilityLabel: 'Your draft'}).props.onChangeText('I has a dog and I write every day.'));
    act(() => buttonLabelled(view, 'Review draft').props.onPress());
    act(() => mockEvaluate.mutate.mock.calls[0][1].onSuccess(evaluation));
    expect(mockPush).toHaveBeenCalledWith('/(app)/review');
    const handed = consumeReviewHandoff();
    expect(handed?.result.id).toBe(41);
    expect(handed?.result.overall).toBe(78);
    expect(handed?.result.errors[0]?.fragment).toBe('I has');
    expect(handed?.input.text).toBe('I has a dog and I write every day.');
  });

  it.each(['en', 'zh'] as const)('renders literal server evidence in the interface language in %s', (locale) => {
    setReviewHandoff(evaluation, evaluationInput);
    const view = render(<ReviewScreen />, locale);
    // review.js never shows the evaluator's Vietnamese summary outside a vi
    // interface: reviewSummaryText() composes its own line instead.
    expect(texts(view, 'Bài viết đủ ý nhưng còn lỗi chia động từ.')).toHaveLength(0);
    expect(texts(view, translate(locale, 'review.summary_plain' as MessageId))).not.toHaveLength(0);
    // review.js's issue rows are disclosures, closed at rest; the evidence
    // appears when the learner opens the finding.
    act(() => rowLabelled(view, 'agreement').props.onPress());
    // The learner's own words carry the evidence, quoted literally, and the
    // correction is shown against them.
    expect(texts(view, '“I has”')).not.toHaveLength(0);
    // The correction is marked as a diff, so only what actually changed is
    // shown against the learner's wording -- feedback.js's changedSegments().
    expect(texts(view, changedSegments('I has', 'I have', 'en').afterChange)).not.toHaveLength(0);
    // feedbackExplanation()/feedbackRule() answer in the interface language from
    // the shared category tables, not with the evaluator's per-item prose.
    expect(texts(view, categoryReason('agreement', locale))).not.toHaveLength(0);
    expect(texts(view, categoryRule('agreement', locale))).not.toHaveLength(0);
  });

  it.each(['en', 'zh'] as const)('opens R5 Grammar practice from a linked finding in %s', (locale) => {
    setReviewHandoff(evaluation, evaluationInput);
    const view = render(<ReviewScreen />, locale);
    // The web puts the action name on the panel and the lesson title on the
    // button, so target the lesson the finding links to.
    act(() => buttonContaining(view, 'Articles').props.onPress());
    expect(mockGrammarPractice.mutate).toHaveBeenCalledWith({grammarId: 'en-articles', evidence: 'a dog'}, expect.any(Object));
    act(() => mockGrammarPractice.mutate.mock.calls[0][1].onSuccess(grammarTask));
    expect(mockPush).toHaveBeenCalledWith('/(app)/writing');
    const writing = render(<WritingScreen />, locale);
    expect(texts(writing, 'Write three sentences using articles.')).not.toHaveLength(0);
  });

  it('keeps a revision linked to its source evaluation so the series is not broken', () => {
    setReviewHandoff(evaluation, evaluationInput);
    const view = render(<ReviewScreen />);
    act(() => buttonLabelled(view, 'Revise this piece').props.onPress());
    expect(mockPush).toHaveBeenCalledWith('/(app)/writing');
    const writing = render(<WritingScreen />);
    // The revision reopens the learner's own text rather than a blank draft.
    expect(writing.root.findByProps({accessibilityLabel: 'Your draft'}).props.value).toBe('I has a dog and I write every day.');
    act(() => buttonLabelled(writing, 'Review draft').props.onPress());
    expect(mockEvaluate.mutate.mock.calls[0][0]).toEqual(expect.objectContaining({parent_essay_id: 41, target_cefr: 'B1', learning_language: 'en'}));
  });

  it.each(['en', 'zh'] as const)('reports a failed grammar handoff without leaving Review in %s', (locale) => {
    setReviewHandoff(evaluation, evaluationInput);
    mockGrammarPractice.isError = true;
    const view = render(<ReviewScreen />, locale);
    expect(texts(view, locale === 'zh' ? '语法练习暂时不可用。' : 'Grammar practice is temporarily unavailable.')).not.toHaveLength(0);
    expect(mockPush).not.toHaveBeenCalled();
  });

  it.each(['en', 'zh'] as const)('states plainly that no review is open in %s', (locale) => {
    const view = render(<ReviewScreen />, locale);
    // review.js's empty state names the missing input and routes to Writing.
    expect(texts(view, translate(locale, 'review.empty_body' as MessageId))).not.toHaveLength(0);
    act(() => buttonLabelled(view, translate(locale, 'review.go_write' as MessageId)).props.onPress());
    expect(mockReplace).toHaveBeenCalledWith('/(app)/writing');
  });

  it('consumes each handoff once so a stale brief cannot be resubmitted', () => {
    setGrammarWritingHandoff(grammarTask, 'en');
    render(<WritingScreen />);
    const second = render(<WritingScreen />);
    expect(texts(second, 'Writing setup')).not.toHaveLength(0);
    setRevisionWritingHandoff(41, 'I has a dog and I write every day.', 'Write about an ordinary weekday.', 'B1', 'zh');
    const revision = render(<WritingScreen />, 'zh');
    // A revision reopens its own brief, in the ZH interface, from the handoff.
    expect(texts(revision, 'Write about an ordinary weekday.')).not.toHaveLength(0);
    expect(revision.root.findByProps({accessibilityLabel: '你的草稿'}).props.value).toBe('I has a dog and I write every day.');
  });
});
