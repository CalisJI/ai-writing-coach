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
});
