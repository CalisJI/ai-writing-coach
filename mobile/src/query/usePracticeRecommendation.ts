import {useMutation, useQuery, useQueryClient, type UseMutationResult, type UseQueryResult} from '@tanstack/react-query';
import {ApiClient} from '../api/client';
import type {PracticeRecommendation, PracticeTask} from '../api/contracts/learning';
import {ApiError} from '../api/errors';

export const practiceRecommendationKey = ['practice', 'recommendation'] as const;

export function usePracticeRecommendation(client: ApiClient | null, sessionCookie?: string | null, enabled = true): UseQueryResult<PracticeRecommendation, ApiError> {
  return useQuery({
    queryKey: practiceRecommendationKey,
    queryFn: ({signal}) => client ? client.getPracticeRecommendation({signal, sessionCookie: sessionCookie ?? undefined}) : Promise.reject(new ApiError('configuration_missing', 'API client is unavailable')),
    enabled: enabled && Boolean(client) && typeof sessionCookie === 'string' && sessionCookie.length > 0,
    retry: false,
    staleTime: 0,
  });
}

export function useNextPractice(client: ApiClient | null, sessionCookie?: string | null): UseMutationResult<PracticeTask, ApiError, string> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (targetLevel) => client ? client.getNextPractice(targetLevel, {sessionCookie: sessionCookie ?? undefined}) : Promise.reject(new ApiError('configuration_missing', 'API client is unavailable')),
    onSuccess: () => { void queryClient.invalidateQueries({queryKey: practiceRecommendationKey}); },
    retry: false,
  });
}
