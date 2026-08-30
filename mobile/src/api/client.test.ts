import {ApiClient, SESSION_COOKIE_NAME} from './client';
import {normalizeApiBaseUrl} from './config';
import {ApiError} from './errors';

const bootstrap = (active: 'en' | 'zh') => ({
  version: 'orena.session-bootstrap.v1',
  authenticated: true,
  mode: 'google',
  user: {role: 'user', is_admin: false},
  language: {
    active,
    options: [
      {code: 'en', name: 'English', native_name: 'English'},
      {code: 'zh', name: 'Chinese', native_name: '中文'},
    ],
  },
});

function response(status: number, body: unknown): Response {
  return {status, ok: status >= 200 && status < 300, json: async () => body} as Response;
}

const strokeOrder = {
  word: '学', glyph_size: 1024,
  characters: [{character: '学', stroke_count: 8, stroke_paths: ['M1'], medians: [[1, 2]], radical_strokes: []}],
  unavailable: [], source: 'make-me-a-hanzi', source_version: 'hanzi-writer-data-2.0.1',
};

describe('typed mobile API client', () => {
  it('normalizes public base URLs and rejects unsafe configuration', () => {
    expect(normalizeApiBaseUrl('https://learn.example.test///')).toBe('https://learn.example.test');
    expect(() => normalizeApiBaseUrl('')).toThrow(ApiError);
    expect(() => normalizeApiBaseUrl('not-a-url')).toThrow(ApiError);
    expect(() => normalizeApiBaseUrl('https://user:pass@example.test')).toThrow(ApiError);
    expect(() => normalizeApiBaseUrl('https://example.test?token=secret')).toThrow(ApiError);
  });

  it('validates the compact EN/ZH bootstrap contract and uses no-store reads', async () => {
    for (const active of ['en', 'zh'] as const) {
      let request: RequestInit | undefined;
      const client = new ApiClient({
        baseUrl: 'https://learn.example.test/',
        fetchImpl: async (_input, init) => { request = init; return response(200, bootstrap(active)); },
      });
      const result = await client.getSessionBootstrap({sessionCookie: 'signed-session-cookie'});
      expect(result.language.active).toBe(active);
      expect(result.language.options.map((item) => item.code)).toEqual(['en', 'zh']);
      expect(request?.cache).toBe('no-store');
      expect(request?.headers).toEqual({Accept: 'application/json', Cookie: `${SESSION_COOKIE_NAME}=signed-session-cookie`});
    }
  });

  it.each([
    [401, 'authentication_required'],
    [403, 'permission_denied'],
    [503, 'server_unavailable'],
    [429, 'request_rejected'],
  ] as const)('maps HTTP %s to %s without exposing response content', async (status, category) => {
    const client = new ApiClient({baseUrl: 'https://learn.example.test', fetchImpl: async () => response(status, {secret: 'learner text'})});
    await expect(client.getSessionBootstrap()).rejects.toMatchObject({category, status});
  });

  it('exchanges a server handoff and logs out with the same cookie attachment', async () => {
    const requests: {url: string; init?: RequestInit}[] = [];
    const client = new ApiClient({
      baseUrl: 'https://learn.example.test',
      fetchImpl: async (input, init) => {
        requests.push({url: String(input), init});
        return String(input).includes('/exchange')
          ? response(200, {version: 'orena.native-session.v1', session_cookie: 'issued-cookie'})
          : response(200, {ok: true});
      },
    });
    const exchanged = await client.exchangeNativeSession('one-use-code', 'verifier');
    await client.logout({sessionCookie: exchanged.session_cookie});
    expect(exchanged.session_cookie).toBe('issued-cookie');
    expect(requests[0]?.init?.method).toBe('POST');
    expect(requests[0]?.init?.body).toBe(JSON.stringify({code: 'one-use-code', code_verifier: 'verifier'}));
    expect(requests[1]?.init?.headers).toEqual({Accept: 'application/json', Cookie: `${SESSION_COOKIE_NAME}=issued-cookie`});
  });

  it('maps invalid JSON/schema and network failures to safe categories', async () => {
    const invalidJson = new ApiClient({baseUrl: 'https://learn.example.test', fetchImpl: async () => ({status: 200, ok: true, json: async () => {throw new Error('raw learner payload');}} as unknown as Response)});
    await expect(invalidJson.getSessionBootstrap()).rejects.toMatchObject({category: 'invalid_response'});
    const invalidSchema = new ApiClient({baseUrl: 'https://learn.example.test', fetchImpl: async () => response(200, {authenticated: true, transcript: 'secret'})});
    await expect(invalidSchema.getSessionBootstrap()).rejects.toMatchObject({category: 'invalid_response'});
    const offline = new ApiClient({baseUrl: 'https://learn.example.test', fetchImpl: async () => {throw new TypeError('network down');}});
    await expect(offline.getSessionBootstrap()).rejects.toMatchObject({category: 'network_unavailable'});
  });

  it('distinguishes timeout from caller cancellation', async () => {
    const hanging = (_input: RequestInfo | URL, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new Error('aborted')));
    });
    const client = new ApiClient({baseUrl: 'https://learn.example.test', timeoutMs: 5, fetchImpl: hanging});
    await expect(client.getSessionBootstrap()).rejects.toMatchObject({category: 'timeout'});
    const controller = new AbortController();
    const cancelled = new ApiClient({baseUrl: 'https://learn.example.test', timeoutMs: 1000, fetchImpl: hanging});
    const request = cancelled.getSessionBootstrap({signal: controller.signal});
    controller.abort();
    await expect(request).rejects.toMatchObject({category: 'cancelled'});
  });

  it('sends ETags and preserves the immutable stroke-order response shape', async () => {
    const requests: RequestInit[] = [];
    const client = new ApiClient({baseUrl: 'https://learn.example.test', fetchImpl: async (_input, init) => {
      requests.push(init ?? {});
      return requests.length === 1
        ? {...response(200, strokeOrder), headers: new Headers({'ETag': '"stroke-v1"', 'Cache-Control': 'public, max-age=31536000, immutable'})} as Response
        : {status: 304, ok: false, headers: new Headers({'ETag': '"stroke-v1"'}), json: async () => null} as Response;
    }});
    const first = await client.getChineseStrokeOrder('学');
    const second = await client.getChineseStrokeOrder('学', {ifNoneMatch: first.etag ?? undefined});
    expect(first).toMatchObject({kind: 'fresh', etag: '"stroke-v1"', data: {source_version: 'hanzi-writer-data-2.0.1'}});
    expect(second).toEqual({kind: 'not_modified', etag: '"stroke-v1"', cacheControl: null});
    expect((requests[1]?.headers as Record<string, string>)['If-None-Match']).toBe('"stroke-v1"');
  });

  it('posts only the compact media resume request and validates its bounded response', async () => {
    let request: RequestInit | undefined;
    const client = new ApiClient({baseUrl: 'https://learn.example.test', fetchImpl: async (_input, init) => {
      request = init;
      return response(200, {status: 'processing', asset: {asset_id: 'youtube:fixture', processing_state: 'processing'}, import_job: {resume_handle: 'opaque-resume-handle-123456', state: 'queued', source: 'supadata', failure_kind: null, resumable: true}});
    }});
    const result = await client.getMediaImportStatus('opaque-resume-handle-123456');
    expect(result.asset.asset_id).toBe('youtube:fixture');
    expect(request?.body).toBe(JSON.stringify({job_id: 'opaque-resume-handle-123456', compact: true}));
  });

  it('validates learner profile and practice contracts and forwards secure requests', async () => {
    const calls: {url: string; init?: RequestInit}[] = [];
    const profile = {exists: true, language: 'en', goal: 'work', style: 'guided', pinyin: 'auto', native_language: 'en', theme_preset: 'editorial', updated_at: '2026-01-01T00:00:00Z'};
    const recommendation = {language: 'en', intent: 'repair', focus_category: 'grammar', focus_label: 'Articles', focus_family: 'grammar', focus_status: 'watch', evidence: 'Repeated pattern', goal: 'work', guidance_style: 'guided', task_type: 'email', topic: 'Email', target_level: 'B1', word_target: 80, difficulty: {state: 'hold', word_target: 80, length_delta: 0, provenance: {source: 'none', evidence_count: 0}} , reason: 'Practice this pattern', focus_instruction: 'Use articles', action_label: 'Practice'};
    const task = {title: 'Practice', instruction: 'Write an email.', checklist: ['Be clear', 'Use examples'], word_target: 80, task_type: 'email', topic: 'Email', source: 'personalized', personalization: recommendation, prompt: 'Write.', target_level: 'B1'};
    const client = new ApiClient({baseUrl: 'https://learn.example.test', fetchImpl: async (input, init) => { calls.push({url: String(input), init}); const url = String(input); const body = url.endsWith('/learner-profile') ? profile : url.includes('/platform/language') ? {ok: true, active: 'zh'} : url.includes('/practice-recommendation') ? recommendation : task; return response(200, body); }});
    expect(await client.getLearnerProfile({sessionCookie: 'cookie'})).toEqual(profile);
    expect(await client.setLearningLanguage('zh', {sessionCookie: 'cookie'})).toEqual({ok: true, active: 'zh'});
    expect(await client.saveLearnerProfile({goal: 'work', style: 'guided', pinyin: 'auto', native_language: 'en', theme_preset: 'editorial'}, {sessionCookie: 'cookie'})).toEqual(profile);
    expect(await client.getPracticeRecommendation({sessionCookie: 'cookie'})).toEqual(recommendation);
    expect(await client.getNextPractice('B1', {sessionCookie: 'cookie'})).toEqual(task);
    expect(calls.map((call) => call.init?.method)).toEqual(['GET', 'POST', 'PUT', 'GET', 'POST']);
    expect(calls[2]?.init?.body).toBe(JSON.stringify({goal: 'work', style: 'guided', pinyin: 'auto', native_language: 'en', theme_preset: 'editorial'}));
    expect(calls.every((call) => (call.init?.headers as Record<string, string>).Cookie === `${SESSION_COOKIE_NAME}=cookie`)).toBe(true);
  });

  it('consumes the server-authoritative R15 product account state', async () => {
    const account = {
      available: true,
      plan: {id: 'free', name: 'Free', description: 'Core writing practice.', price_label: 'Free'},
      subscription: {state: 'active', status: 'active'}, plan_state: 'active', billing_ready: false,
      features: {'writing.evaluate': {key: 'writing.evaluate', enabled: true, monthly_limit: 30, used: 30, remaining: 0, usage_state: 'known', entitlement_state: 'exhausted'}},
    };
    let request: RequestInit | undefined;
    const client = new ApiClient({baseUrl: 'https://learn.example.test', fetchImpl: async (_input, init) => { request = init; return response(200, account); }});
    await expect(client.getProductMe({sessionCookie: 'cookie'})).resolves.toEqual(account);
    expect(request?.headers).toEqual({Accept: 'application/json', Cookie: `${SESSION_COOKIE_NAME}=cookie`});
    const invalid = new ApiClient({baseUrl: 'https://learn.example.test', fetchImpl: async () => response(200, {...account, billing_ready: true})});
    await expect(invalid.getProductMe()).rejects.toMatchObject({category: 'invalid_response'});
  });

  it('accepts the degraded product account state the server emits when the subscription store is unavailable', async () => {
    const degraded = {available: false, plan: null, subscription: {state: 'unknown', status: 'unknown'}, features: {}, billing_ready: false};
    const client = new ApiClient({baseUrl: 'https://learn.example.test', fetchImpl: async () => response(200, degraded)});
    await expect(client.getProductMe({sessionCookie: 'cookie'})).resolves.toEqual(degraded);
  });

  it('consumes Grammar, Library recall, and Journey server contracts', async () => {
    const grammarLibrary = {lessons: [{id: 'en-articles', title: 'Articles', level: 'B1', kind: 'grammar', completed: false}], total: 1, completed: 0, levels: ['B1'], level_names: {B1: 'B1'}, language: 'en'};
    const grammarLesson = {id: 'en-articles', title: 'Articles', level: 'B1', completed: false, examples: [{target: 'A learner writes.'}], quick_reference: {rule: 'Use a before consonant sounds.'}};
    const library = {items: [], summary: {total: 0, due: 0, available: 0}};
    const calls: string[] = [];
    const dashboard = {essay_count: 0, revision_count: 0, skill_score: 0, cefr: '—', streak: 0, recent_average: 0, trend: [], metrics: {}, error_counts: {}, error_memory: [], next_level: null, version: '2.17.3'};
    const outcomes = {items: [], latest: null};
    const client = new ApiClient({baseUrl: 'https://learn.example.test', fetchImpl: async (input) => { const url = String(input); calls.push(url); if (url.endsWith('/api/library/grammar')) return response(200, grammarLibrary); if (url.includes('/api/library/grammar/en-articles/complete')) return response(200, {completed: true, lesson_id: 'en-articles'}); if (url.includes('/api/library/grammar/en-articles')) return response(200, grammarLesson); if (url.endsWith('/api/library/vocabulary')) return response(200, library); if (url.includes('/review')) return response(200, {found: false}); if (url.endsWith('/api/dashboard')) return response(200, dashboard); return response(200, outcomes); }});
    expect((await client.listGrammarLibrary()).lessons[0]?.id).toBe('en-articles');
    expect((await client.getGrammarLesson('en-articles')).title).toBe('Articles');
    expect(await client.completeGrammarLesson('en-articles')).toMatchObject({completed: true});
    expect((await client.listLibraryVocabulary()).summary.total).toBe(0);
    expect(await client.reviewLibraryVocabulary('word', 'got_it')).toEqual({found: false});
    expect((await client.listDashboard()).essay_count).toBe(0);
    expect((await client.listPracticeOutcomes()).items).toEqual([]);
    expect(calls.some((url) => url.includes('/api/library/grammar/en-articles/complete'))).toBe(true);
    expect(calls.some((url) => url.includes('/api/library/vocabulary/word/review'))).toBe(true);
  });

  it('rejects malformed Journey responses instead of fabricating progress', async () => {
    const client = new ApiClient({baseUrl: 'https://learn.example.test', fetchImpl: async () => response(200, {essay_count: 0})});
    await expect(client.listDashboard()).rejects.toMatchObject({category: 'invalid_response'});
    await expect(client.listPracticeOutcomes()).rejects.toMatchObject({category: 'invalid_response'});
  });
});
