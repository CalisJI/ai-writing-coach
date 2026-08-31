import {useQuery, type UseQueryResult} from '@tanstack/react-query';
import {ApiClient} from '../api/client';
import {ApiError} from '../api/errors';
import type {SkillRelease} from '../api/contracts/skills';

export const skillsKey = ['platform', 'skills'] as const;

/**
 * Release state changes rarely and gates navigation, so it is cached for the
 * session rather than refetched on every screen.
 */
export function useSkills(client: ApiClient | null, sessionCookie?: string | null): UseQueryResult<SkillRelease, ApiError> {
  return useQuery({
    queryKey: skillsKey,
    queryFn: ({signal}) => client
      ? client.listSkills({signal, sessionCookie: sessionCookie ?? undefined})
      : Promise.reject(new ApiError('configuration_missing', 'API client is unavailable')),
    enabled: Boolean(client) && typeof sessionCookie === 'string' && sessionCookie.length > 0,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
}
