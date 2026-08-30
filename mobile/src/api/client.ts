import {configuredApiBaseUrl, normalizeApiBaseUrl} from './config';
import {ApiError, normalizeUnknownError} from './errors';
import {logoutResponseSchema, nativeSessionExchangeSchema, type NativeSessionExchange} from './contracts/nativeAuth';
import {sessionBootstrapSchema, type SessionBootstrap} from './contracts/session';
import {compactMediaStatusSchema, strokeOrderSchema, type CompactMediaStatus, type StrokeOrder} from './contracts/reference';
import {evaluationInputSchema, evaluationResultSchema, grammarPracticeSchema, learnerProfileSchema, learnerProfileInputSchema, learningLanguageSchema, practiceRecommendationSchema, practiceTaskSchema, type EvaluationInput, type EvaluationResult, type GrammarPractice, type LearnerProfile, type LearnerProfileInput, type LearningLanguage, type PracticeRecommendation, type PracticeTask} from './contracts/learning';
import {readingAnswerResultSchema, readingGenerateInputSchema, readingSessionResponseSchema, readingSessionSchema, type ReadingAnswerResult, type ReadingGenerateInput, type ReadingSession} from './contracts/reading';
import {dictionaryInputSchema, dictionaryResultSchema, librarySchema, saveLibraryInputSchema, saveLibraryResultSchema, type DictionaryInput, type DictionaryResult} from './contracts/library';
import {listeningProgressListSchema, listeningProgressResponseSchema, mediaImportInputSchema, mediaLessonSchema, type ListeningProgressInput, type MediaImportInput, type MediaLesson} from './contracts/listening';
import {speechAttemptResponseSchema, speechEvaluationSchema, speechTranscriptionSchema, type SpeechEvaluation, type SpeechAttemptResponse, type SpeechTranscription} from './contracts/speech';

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
  ifNoneMatch?: string;
};

export type StrokeOrderResult =
  | {kind: 'fresh'; data: StrokeOrder; etag: string | null; cacheControl: string | null}
  | {kind: 'not_modified'; etag: string; cacheControl: string | null};

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

  async getChineseStrokeOrder(word: string, options: RequestOptions = {}): Promise<StrokeOrderResult> {
    if (typeof word !== 'string' || word.trim() === '') throw new ApiError('request_rejected', 'Stroke-order word is required');
    const response = await this.rawRequest(`/api/chinese/stroke-order?word=${encodeURIComponent(word)}`, options);
    const etag = response.headers.get('etag');
    const cacheControl = response.headers.get('cache-control');
    if (response.status === 304) {
      if (!etag) throw new ApiError('invalid_response', 'Invalid server response', response.status);
      return {kind: 'not_modified', etag, cacheControl};
    }
    this.throwForResponse(response);
    let body: unknown;
    try { body = await response.json(); } catch { throw new ApiError('invalid_response', 'Invalid server response', response.status); }
    try {
      return {kind: 'fresh', data: strokeOrderSchema.parse(body), etag, cacheControl};
    } catch { throw new ApiError('invalid_response', 'Invalid server response', response.status); }
  }

  async getMediaImportStatus(resumeHandle: string, options: RequestOptions = {}): Promise<CompactMediaStatus> {
    if (typeof resumeHandle !== 'string' || resumeHandle.trim() === '') throw new ApiError('request_rejected', 'Media resume handle is required');
    return this.request('/api/media-learning/import/status', options, compactMediaStatusSchema.parse, 'POST', {job_id: resumeHandle, compact: true});
  }

  async getLearnerProfile(options: RequestOptions = {}): Promise<LearnerProfile> {
    return this.request('/api/learner-profile', options, learnerProfileSchema.parse);
  }

  async setLearningLanguage(language: 'en' | 'zh', options: RequestOptions = {}): Promise<LearningLanguage> {
    if (language !== 'en' && language !== 'zh') throw new ApiError('request_rejected', 'Learning language was invalid');
    return this.request('/api/platform/language', options, learningLanguageSchema.parse, 'POST', {language});
  }

  async saveLearnerProfile(profile: LearnerProfileInput, options: RequestOptions = {}): Promise<LearnerProfile> {
    let payload: LearnerProfileInput;
    try { payload = learnerProfileInputSchema.parse(profile); } catch { throw new ApiError('request_rejected', 'Learner profile choices were invalid'); }
    return this.request('/api/learner-profile', options, learnerProfileSchema.parse, 'PUT', payload);
  }

  async getPracticeRecommendation(options: RequestOptions = {}): Promise<PracticeRecommendation> {
    return this.request('/api/practice-recommendation', options, practiceRecommendationSchema.parse);
  }

  async getNextPractice(targetLevel: string, options: RequestOptions = {}): Promise<PracticeTask> {
    if (typeof targetLevel !== 'string' || targetLevel.trim() === '') throw new ApiError('request_rejected', 'Practice target level is required');
    return this.request('/api/practice/next', options, practiceTaskSchema.parse, 'POST', {target_level: targetLevel});
  }

  async evaluateWriting(input: EvaluationInput, options: RequestOptions = {}): Promise<EvaluationResult> {
    let payload: EvaluationInput;
    try { payload = evaluationInputSchema.parse(input); } catch { throw new ApiError('request_rejected', 'Writing submission was invalid'); }
    return this.request('/api/evaluate', options, evaluationResultSchema.parse, 'POST', payload);
  }

  async getGrammarPractice(grammarId: string, evidence = '', options: RequestOptions = {}): Promise<GrammarPractice> {
    if (typeof grammarId !== 'string' || grammarId.trim() === '') throw new ApiError('request_rejected', 'Grammar lesson is required');
    const suffix = typeof evidence === 'string' && evidence.trim() ? `?evidence=${encodeURIComponent(evidence.trim())}` : '';
    return this.request(`/api/grammar/${encodeURIComponent(grammarId)}${'/practice'}${suffix}`, options, grammarPracticeSchema.parse);
  }

  async createReadingSession(input: ReadingGenerateInput, options: RequestOptions = {}): Promise<ReadingSession> { let payload: ReadingGenerateInput; try { payload = readingGenerateInputSchema.parse(input); } catch { throw new ApiError('request_rejected', 'Reading request was invalid'); } return this.request('/api/reading/session', options, readingSessionSchema.parse, 'POST', payload); }
  async getReadingSession(id: number, options: RequestOptions = {}): Promise<ReadingSession> { if (!Number.isInteger(id) || id < 1) throw new ApiError('request_rejected', 'Reading session is invalid'); const result = await this.request(`/api/reading/session/${id}`, options, readingSessionResponseSchema.parse); if (!result.found || !result.session) throw new ApiError('request_rejected', 'Reading session was not found', 404); return result.session; }
  async submitReadingAnswers(id: number, answers: number[], options: RequestOptions = {}): Promise<ReadingAnswerResult> { if (!Number.isInteger(id) || id < 1 || !Array.isArray(answers)) throw new ApiError('request_rejected', 'Reading answers were invalid'); return this.request(`/api/reading/session/${id}/answer`, options, readingAnswerResultSchema.parse, 'POST', {answers}); }
  async contextualDictionary(input: DictionaryInput, options: RequestOptions = {}): Promise<DictionaryResult> { let payload: DictionaryInput; try { payload = dictionaryInputSchema.parse(input); } catch { throw new ApiError('request_rejected', 'Dictionary request was invalid'); } return this.request('/api/dictionary/contextual', options, dictionaryResultSchema.parse, 'POST', payload); }
  async listLibraryVocabulary(options: RequestOptions = {}): Promise<Awaited<ReturnType<typeof librarySchema.parse>>> { return this.request('/api/library/vocabulary', options, librarySchema.parse); }
  async saveLibraryVocabulary(input: Parameters<typeof saveLibraryInputSchema.parse>[0], options: RequestOptions = {}): Promise<Awaited<ReturnType<typeof saveLibraryResultSchema.parse>>> { let payload; try { payload = saveLibraryInputSchema.parse(input); } catch { throw new ApiError('request_rejected', 'Library word was invalid'); } return this.request('/api/library/vocabulary', options, saveLibraryResultSchema.parse, 'POST', payload); }
  async importMedia(input: MediaImportInput, options: RequestOptions = {}): Promise<MediaLesson> {
    let payload: MediaImportInput;
    try { payload = mediaImportInputSchema.parse(input); } catch { throw new ApiError('request_rejected', 'Media lesson request was invalid'); }
    return this.request('/api/media-learning/import', options, mediaLessonSchema.parse, 'POST', payload);
  }
  async listListeningProgress(assetId: string, options: RequestOptions = {}): Promise<Awaited<ReturnType<typeof listeningProgressListSchema.parse>>> {
    if (typeof assetId !== 'string' || assetId.trim() === '') throw new ApiError('request_rejected', 'Listening asset is required');
    return this.request(`/api/listening/progress?asset_id=${encodeURIComponent(assetId.trim())}`, options, listeningProgressListSchema.parse);
  }
  async saveListeningProgress(input: ListeningProgressInput, options: RequestOptions = {}): Promise<Awaited<ReturnType<typeof listeningProgressResponseSchema.parse>>> {
    return this.request('/api/listening/progress', options, listeningProgressResponseSchema.parse, 'POST', input);
  }
  async transcribeSpeaking(uri: string, language: 'en' | 'zh', options: RequestOptions = {}): Promise<SpeechTranscription> {
    return this.speechUpload('/api/speech/transcribe', uri, language, undefined, options, speechTranscriptionSchema.parse);
  }
  async assessSpeakingPronunciation(uri: string, language: 'en' | 'zh', referenceText: string, options: RequestOptions = {}): Promise<Record<string, unknown>> {
    return this.speechUpload('/api/speech/pronunciation', uri, language, referenceText, options, (value) => {
      if (!value || typeof value !== 'object') throw new Error('invalid pronunciation response');
      return value as Record<string, unknown>;
    });
  }
  async evaluateSpeaking(input: Record<string, unknown>, options: RequestOptions = {}): Promise<SpeechEvaluation> {
    return this.request('/api/speech/evaluation', options, speechEvaluationSchema.parse, 'POST', input);
  }
  async saveSpeakingAttempt(input: Record<string, unknown>, options: RequestOptions = {}): Promise<SpeechAttemptResponse> {
    return this.request('/api/speech/attempts', options, speechAttemptResponseSchema.parse, 'POST', input);
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }

  private async request<T>(
    path: string,
    options: RequestOptions,
    parse: (value: unknown) => T,
    method: 'GET' | 'POST' | 'PUT' = 'GET',
    payload?: unknown,
  ): Promise<T> {
    const response = await this.rawRequest(path, options, method, payload);
    this.throwForResponse(response);
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
  }

  private async speechUpload<T>(path: string, uri: string, language: 'en' | 'zh', referenceText: string | undefined, options: RequestOptions, parse: (value: unknown) => T): Promise<T> {
    if (typeof uri !== 'string' || uri.trim() === '') throw new ApiError('request_rejected', 'Recording is unavailable');
    const form = new FormData();
    form.append('file', {uri, name: 'recording.m4a', type: 'audio/m4a'} as unknown as Blob);
    form.append('language', language);
    if (referenceText !== undefined) form.append('reference_text', referenceText);
    const response = await this.rawRequest(path, options, 'POST', form);
    this.throwForResponse(response);
    let body: unknown;
    try { body = await response.json(); } catch { throw new ApiError('invalid_response', 'Invalid server response', response.status); }
    try { return parse(body); } catch { throw new ApiError('invalid_response', 'Invalid server response', response.status); }
  }

  private async rawRequest(
    path: string,
    options: RequestOptions,
    method: 'GET' | 'POST' | 'PUT' = 'GET',
    payload?: unknown,
  ): Promise<Response> {
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
      if (options.ifNoneMatch) headers['If-None-Match'] = options.ifNoneMatch;
      const multipart = typeof FormData !== 'undefined' && payload instanceof FormData;
      if (payload !== undefined && !multipart) headers['Content-Type'] = 'application/json';
      const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
        method,
        headers,
        ...(payload === undefined ? {} : {body: multipart ? payload as BodyInit : JSON.stringify(payload)}),
        cache: 'no-store',
        signal: controller.signal,
      });
      return response;
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

  private throwForResponse(response: Response): void {
    if (response.status === 401) throw new ApiError('authentication_required', 'Authentication required', 401);
    if (response.status === 403) throw new ApiError('permission_denied', 'Permission denied', 403);
    if (response.status >= 500) throw new ApiError('server_unavailable', 'Server unavailable', response.status);
    if (!response.ok) throw new ApiError('request_rejected', 'Request rejected', response.status);
  }
}

export function createConfiguredApiClient(options: Omit<ApiClientOptions, 'baseUrl'> = {}): ApiClient {
  return new ApiClient({baseUrl: configuredApiBaseUrl(), ...options});
}
