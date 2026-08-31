import {useQuery, type UseQueryResult} from '@tanstack/react-query';
import {ApiClient} from '../api/client';
import type {EssaySummary, LearningMemory} from '../api/contracts/learning';
import type {ReadingSessions} from '../api/contracts/reading';
import {ApiError} from '../api/errors';

const enabled = (client: ApiClient | null, cookie?: string | null) => Boolean(client && typeof cookie === 'string' && cookie.length > 0);

export const essaysKey = ['essays'] as const;
export function useEssays(client: ApiClient | null, cookie?: string | null): UseQueryResult<EssaySummary[], ApiError> {
  return useQuery({queryKey: essaysKey, queryFn: ({signal}) => client ? client.listEssays({signal, sessionCookie: cookie ?? undefined}) : Promise.reject(new ApiError('configuration_missing', 'API client is unavailable')), enabled: enabled(client, cookie), retry: false, staleTime: 0});
}

export const learningMemoryKey = ['learning-memory'] as const;
export function useLearningMemory(client: ApiClient | null, cookie?: string | null): UseQueryResult<LearningMemory, ApiError> {
  return useQuery({queryKey: learningMemoryKey, queryFn: ({signal}) => client ? client.getLearningMemory({signal, sessionCookie: cookie ?? undefined}) : Promise.reject(new ApiError('configuration_missing', 'API client is unavailable')), enabled: enabled(client, cookie), retry: false, staleTime: 0});
}

export const readingSessionHistoryKey = ['reading', 'sessions'] as const;
export function useReadingSessionHistory(client: ApiClient | null, cookie?: string | null): UseQueryResult<ReadingSessions, ApiError> {
  return useQuery({queryKey: readingSessionHistoryKey, queryFn: ({signal}) => client ? client.listReadingSessions(8, {signal, sessionCookie: cookie ?? undefined}) : Promise.reject(new ApiError('configuration_missing', 'API client is unavailable')), enabled: enabled(client, cookie), retry: false, staleTime: 0});
}
