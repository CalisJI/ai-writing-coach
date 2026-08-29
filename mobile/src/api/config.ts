import Constants from 'expo-constants';
import {ApiError} from './errors';

export function normalizeApiBaseUrl(value: unknown): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new ApiError('configuration_missing', 'API base URL is not configured');
  }
  const raw = value.trim();
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new ApiError('configuration_invalid', 'API base URL is invalid');
  }
  if (!['http:', 'https:'].includes(parsed.protocol) || !parsed.hostname || parsed.username || parsed.password || parsed.search || parsed.hash) {
    throw new ApiError('configuration_invalid', 'API base URL is invalid');
  }
  return `${parsed.origin}${parsed.pathname.replace(/\/+$/, '')}`;
}

export function configuredApiBaseUrl(): string {
  const publicValue = process.env.EXPO_PUBLIC_API_BASE_URL;
  const extraValue = Constants.expoConfig?.extra?.apiBaseUrl;
  return normalizeApiBaseUrl(publicValue || extraValue);
}
