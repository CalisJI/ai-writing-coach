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

  constructor(category: ApiErrorCategory, message: string, status?: number) {
    super(message);
    this.name = 'ApiError';
    this.category = category;
    this.status = status;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

export function normalizeUnknownError(error: unknown): ApiError {
  if (isApiError(error)) return error;
  if (error instanceof TypeError) return new ApiError('network_unavailable', 'Network unavailable');
  return new ApiError('unknown', 'Request failed');
}
