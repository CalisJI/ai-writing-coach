export type ApiErrorCategory =
  | 'configuration_missing'
  | 'configuration_invalid'
  | 'network_unavailable'
  | 'timeout'
  | 'cancelled'
  | 'authentication_required'
  | 'permission_denied'
  | 'server_unavailable'
  | 'request_rejected'
  | 'invalid_response'
  | 'unknown';

export class ApiError extends Error {
  readonly category: ApiErrorCategory;
  readonly status?: number;
  /**
   * Schema field paths that failed validation, for `invalid_response` only.
   *
   * Paths are field names from our own contracts, never learner content or
   * server values, so this stays inside the diagnostics privacy boundary. It
   * exists because a swallowed validation failure is indistinguishable from a
   * network fault: a contract drift then surfaces to the learner as a generic
   * "temporarily unavailable" with nothing to debug.
   */
  readonly invalidFields?: readonly string[];

  constructor(category: ApiErrorCategory, message: string, status?: number, invalidFields?: readonly string[]) {
    super(message);
    this.name = 'ApiError';
    this.category = category;
    this.status = status;
    this.invalidFields = invalidFields;
  }
}

/** Field paths from a zod error, with no values attached. */
export function invalidFieldsOf(error: unknown): readonly string[] {
  const issues = (error as {issues?: {path?: unknown[]}[]} | undefined)?.issues;
  if (!Array.isArray(issues)) return [];
  const paths = issues.map((issue) => (Array.isArray(issue?.path) ? issue.path.map(String).join('.') : '')).filter((path) => path !== '');
  return Array.from(new Set(paths)).slice(0, 12);
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

export function normalizeUnknownError(error: unknown): ApiError {
  if (isApiError(error)) return error;
  if (error instanceof TypeError) return new ApiError('network_unavailable', 'Network unavailable');
  return new ApiError('unknown', 'Request failed');
}
