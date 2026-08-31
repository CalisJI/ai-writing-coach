import {useMutation, useQuery, useQueryClient, type UseMutationResult, type UseQueryResult} from '@tanstack/react-query';
import {ApiClient} from '../api/client';
import type {LearnerProfile, LearnerProfileInput} from '../api/contracts/learning';
import {ApiError} from '../api/errors';

export const learnerProfileKey = ['learner-profile'] as const;

export function useLearnerProfile(client: ApiClient | null, sessionCookie?: string | null, enabled = true): UseQueryResult<LearnerProfile, ApiError> {
  return useQuery({
    queryKey: learnerProfileKey,
    queryFn: ({signal}) => client ? client.getLearnerProfile({signal, sessionCookie: sessionCookie ?? undefined}) : Promise.reject(new ApiError('configuration_missing', 'API client is unavailable')),
    enabled: enabled && Boolean(client) && typeof sessionCookie === 'string' && sessionCookie.length > 0,
    retry: false,
    staleTime: 0,
  });
}

export function useSaveLearnerProfile(client: ApiClient | null, sessionCookie?: string | null): UseMutationResult<LearnerProfile, ApiError, LearnerProfileInput> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (profile) => client ? client.saveLearnerProfile(profile, {sessionCookie: sessionCookie ?? undefined}) : Promise.reject(new ApiError('configuration_missing', 'API client is unavailable')),
    onSuccess: (profile) => { queryClient.setQueryData(learnerProfileKey, profile); },
    retry: false,
  });
}

export function useSetLearningLanguage(client: ApiClient | null, sessionCookie?: string | null): UseMutationResult<Awaited<ReturnType<ApiClient['setLearningLanguage']>>, ApiError, 'en' | 'zh'> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (language) => client ? client.setLearningLanguage(language, {sessionCookie: sessionCookie ?? undefined}) : Promise.reject(new ApiError('configuration_missing', 'API client is unavailable')),
    onSuccess: () => { void queryClient.invalidateQueries({queryKey: learnerProfileKey}); void queryClient.invalidateQueries({queryKey: ['practice', 'recommendation']}); void queryClient.invalidateQueries({queryKey: ['session', 'bootstrap']}); },
    retry: false,
  });
}
