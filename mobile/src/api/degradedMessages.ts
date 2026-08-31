import type {MessageId} from '../i18n/messages';
import {isApiError, type ApiError} from './errors';

export function cacheDegradedMessage(error: unknown): MessageId {
  if (!isApiError(error)) return 'cache.unavailable';
  const byCategory: Partial<Record<ApiError['category'], MessageId>> = {
    network_unavailable: 'cache.offline', timeout: 'cache.timeout',
    authentication_required: 'cache.auth_expired', permission_denied: 'cache.unavailable',
    server_unavailable: 'cache.unavailable', request_rejected: 'cache.unavailable',
    invalid_response: 'cache.unavailable', cancelled: 'cache.refreshing',
  };
  return byCategory[error.category] ?? 'cache.unavailable';
}
