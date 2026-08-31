import {clearReviewHandoff, consumeReviewHandoff, setReviewHandoff} from './reviewHandoff';

const result = {id: 7, series_id: 7, revision_no: 1, parent_id: null, overall: 72, app_cefr: 'B1', evaluator: 'fallback-demo', summary_vi: 'Summary', strengths_vi: ['Clear'], strength_evidence: [], priorities_vi: ['Articles'], errors: [], grammar_links: [], delta: null};
const input = {prompt: 'Write.', text: 'This is a sufficiently long learner response.', target_cefr: 'B1', learning_language: 'zh' as const};

describe('review handoff', () => { afterEach(clearReviewHandoff); it('consumes server-confirmed result once', () => { setReviewHandoff(result, input); expect(consumeReviewHandoff()).toEqual({result, input}); expect(consumeReviewHandoff()).toBeNull(); }); });
