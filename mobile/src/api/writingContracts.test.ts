import {ApiClient} from './client';

const response = (body: unknown): Response => ({status: 200, ok: true, json: async () => body} as Response);
const evaluation = {id: 7, series_id: 7, revision_no: 1, parent_id: null, overall: 72, app_cefr: 'B1', evaluator: 'fallback-demo', summary_vi: 'Server summary', strengths_vi: ['Clear'], strength_evidence: [], priorities_vi: ['Articles'], errors: [{id: 'issue-1', category: 'agreement', fragment: 'I has', explanation_vi: 'Le verbe doit suivre le sujet.', mini_rule_vi: 'I va avec have.', suggestion: 'I have'}], grammar_links: [], delta: null};

describe('native Writing evaluation contracts', () => {
  it('posts scoped writing input and validates server evidence', async () => {
    let request: RequestInit | undefined;
    const client = new ApiClient({baseUrl: 'https://learn.example.test', fetchImpl: async (_url, init) => { request = init; return response(evaluation); }});
    await expect(client.evaluateWriting({prompt: 'Write.', text: 'This is a sufficiently long learner response.', target_cefr: 'B1', learning_language: 'en'})).resolves.toEqual(evaluation);
    expect(request?.method).toBe('POST');
    expect(JSON.parse(String(request?.body))).toMatchObject({target_cefr: 'B1', learning_language: 'en'});
  });

  it('fetches a stable-ID grammar practice brief without inventing IDs', async () => {
    const task = {grammar_id: 'en-b1-articles', title: 'Articles', level: 'B1', target_level: 'B1', prompt: 'Write three sentences.', practice_blueprint: {}, practice_context: {intent: 'repair', focus_category: 'grammar', focus_label: 'Articles', focus_family: 'grammar', task_type: 'story', topic: 'grammar transfer', target_level: 'B1', action_label: 'Practice', reason: 'Review', evidence: 'a', focus_instruction: 'Use articles', grammar_id: 'en-b1-articles', grammar_title: 'Articles'}, source: 'static-grammar-kb'};
    const client = new ApiClient({baseUrl: 'https://learn.example.test', fetchImpl: async (url) => { expect(String(url)).toContain('/api/grammar/en-b1-articles/practice?evidence=a'); return response(task); }});
    await expect(client.getGrammarPractice('en-b1-articles', 'a')).resolves.toEqual(task);
  });
});
