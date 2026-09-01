import {useQuery, type UseQueryResult} from '@tanstack/react-query';
import {ApiClient} from '../api/client';
import type {PracticeOutcomeResponse, ReviewCue} from '../api/contracts/learning';
import {ApiError} from '../api/errors';

const enabled = (client: ApiClient | null, cookie: string | null | undefined, essayId: number) => Boolean(client && typeof cookie === 'string' && cookie.length > 0 && Number.isInteger(essayId) && essayId > 0);

export function usePracticeOutcome(client: ApiClient | null, cookie: string | null | undefined, essayId: number): UseQueryResult<PracticeOutcomeResponse, ApiError> {
  return useQuery({queryKey: ['practice-outcome', essayId] as const, queryFn: ({signal}) => client ? client.getPracticeOutcome(essayId, {signal, sessionCookie: cookie ?? undefined}) : Promise.reject(new ApiError('configuration_missing', 'API client is unavailable')), enabled: enabled(client, cookie, essayId), retry: false, staleTime: 0});
}

export function useReviewCue(client: ApiClient | null, cookie: string | null | undefined, essayId: number): UseQueryResult<ReviewCue, ApiError> {
  return useQuery({queryKey: ['review-cue', essayId] as const, queryFn: ({signal}) => client ? client.getReviewCue(essayId, {signal, sessionCookie: cookie ?? undefined}) : Promise.reject(new ApiError('configuration_missing', 'API client is unavailable')), enabled: enabled(client, cookie, essayId), retry: false, staleTime: 0});
}
