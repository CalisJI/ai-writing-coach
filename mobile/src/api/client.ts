import {configuredApiBaseUrl, normalizeApiBaseUrl} from './config';
import {ApiError, normalizeUnknownError} from './errors';
import {logoutResponseSchema, nativeSessionExchangeSchema, type NativeSessionExchange} from './contracts/nativeAuth';
import {sessionBootstrapSchema, type SessionBootstrap} from './contracts/session';

type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export const SESSION_COOKIE_NAME = 'writing_coach_session';

export type ApiClientOptions = {
  baseUrl?: string;
  fetchImpl?: FetchLike;
  timeoutMs?: number;
};

export type RequestOptions = {
  signal?: AbortSignal;
  /** The signed server session cookie value, supplied by the native session layer. */
  sessionCookie?: string;
};

export class ApiClient {
  private readonly baseUrl: string;
  private readonly fetchImpl: FetchLike;
  private readonly timeoutMs: number;

  constructor(options: ApiClientOptions = {}) {
    this.baseUrl = normalizeApiBaseUrl(options.baseUrl ?? configuredApiBaseUrl());
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.timeoutMs = options.timeoutMs ?? 10000;
  }

  async getSessionBootstrap(options: RequestOptions = {}): Promise<SessionBootstrap> {
    return this.request('/api/session/bootstrap', options, sessionBootstrapSchema.parse);
  }

  async exchangeNativeSession(code: string, codeVerifier: string, options: RequestOptions = {}): Promise<NativeSessionExchange> {
    if (typeof code !== 'string' || code.trim() === '' || typeof codeVerifier !== 'string' || codeVerifier.trim() === '') throw new ApiError('request_rejected', 'Authentication exchange was invalid');
    return this.request('/api/auth/native/exchange', options, nativeSessionExchangeSchema.parse, 'POST', {code, code_verifier: codeVerifier});
  }

  async logout(options: RequestOptions = {}): Promise<void> {
    await this.request('/auth/logout', options, logoutResponseSchema.parse, 'POST');
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }

  private async request<T>(
    path: string,
    options: RequestOptions,
    parse: (value: unknown) => T,
    method: 'GET' | 'POST' = 'GET',
    payload?: unknown,
  ): Promise<T> {
    const controller = new AbortController();
    let timedOut = false;
    let removeExternalAbort: () => void = () => undefined;
    const timeout = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, this.timeoutMs);
    if (options.signal) {
      if (options.signal.aborted) controller.abort();
      else {
        const abort = () => controller.abort();
        options.signal.addEventListener('abort', abort, {once: true});
        removeExternalAbort = () => options.signal?.removeEventListener('abort', abort);
      }
    }
    try {
      const headers: Record<string, string> = {Accept: 'application/json'};
      if (options.sessionCookie) headers.Cookie = `${SESSION_COOKIE_NAME}=${options.sessionCookie}`;
      if (payload !== undefined) headers['Content-Type'] = 'application/json';
      const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
        method,
        headers,
        ...(payload === undefined ? {} : {body: JSON.stringify(payload)}),
        cache: 'no-store',
        signal: controller.signal,
      });
      if (response.status === 401) throw new ApiError('authentication_required', 'Authentication required', 401);
      if (response.status === 403) throw new ApiError('permission_denied', 'Permission denied', 403);
      if (response.status >= 500) throw new ApiError('server_unavailable', 'Server unavailable', response.status);
      if (!response.ok) throw new ApiError('request_rejected', 'Request rejected', response.status);
      let body: unknown;
      try {
        body = await response.json();
      } catch {
        throw new ApiError('invalid_response', 'Invalid server response', response.status);
      }
      try {
        return parse(body);
      } catch {
        throw new ApiError('invalid_response', 'Invalid server response', response.status);
      }
    } catch (error) {
      if (error instanceof ApiError) throw error;
      if (timedOut) throw new ApiError('timeout', 'Request timed out');
      if (options.signal?.aborted) throw new ApiError('cancelled', 'Request cancelled');
      if (controller.signal.aborted) throw new ApiError('cancelled', 'Request cancelled');
      throw normalizeUnknownError(error);
    } finally {
      clearTimeout(timeout);
      removeExternalAbort();
    }
  }
}

export function createConfiguredApiClient(options: Omit<ApiClientOptions, 'baseUrl'> = {}): ApiClient {
  return new ApiClient({baseUrl: configuredApiBaseUrl(), ...options});
}
