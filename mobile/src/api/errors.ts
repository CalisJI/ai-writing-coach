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
  /**
   * The server's own error category from the canonical envelope
   * (`{detail: {category, message, retryable, context}}`, api.js's §2.6 note).
   *
   * The HTTP-status-derived `category` above cannot tell an evaluator outage
   * from a stale parent essay -- both are just "request_rejected"/"server_
   * unavailable" -- but Writing has to branch on exactly that difference the
   * way the web does: a `parent_essay_not_found` 404 retries as a fresh entry
   * instead of losing the learner's text.
   */
  readonly serverCategory?: string;

  constructor(category: ApiErrorCategory, message: string, status?: number, invalidFields?: readonly string[], serverCategory?: string) {
    super(message);
    this.name = 'ApiError';
    this.category = category;
    this.status = status;
    this.invalidFields = invalidFields;
    this.serverCategory = serverCategory;
  }
}

/** The canonical error envelope's `category` and human message, when present. */
export function serverErrorEnvelope(body: unknown): {category?: string; message?: string} {
  const detail = (body as {detail?: unknown} | null | undefined)?.detail;
  if (!detail || typeof detail !== 'object' || Array.isArray(detail)) {
    return typeof detail === 'string' ? {message: detail} : {};
  }
  const record = detail as {category?: unknown; message?: unknown};
  return {
    category: typeof record.category === 'string' && record.category.trim() ? record.category.trim() : undefined,
    message: typeof record.message === 'string' && record.message.trim() ? record.message.trim() : undefined,
  };
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
