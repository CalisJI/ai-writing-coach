import {useQuery, type UseQueryResult} from '@tanstack/react-query';
import {ApiClient} from '../api/client';
import type {JourneyDashboard, JourneyOutcomes} from '../api/contracts/learning';
import {ApiError} from '../api/errors';

const enabled = (client: ApiClient | null, cookie?: string | null) => Boolean(client && typeof cookie === 'string' && cookie.length > 0);
export const journeyDashboardKey = ['dashboard'] as const;
export const journeyOutcomesKey = ['journey', 'practice-outcomes'] as const;
export function useJourneyDashboard(client: ApiClient | null, cookie?: string | null): UseQueryResult<JourneyDashboard, ApiError> {
  return useQuery({queryKey: journeyDashboardKey, queryFn: ({signal}) => client ? client.listDashboard({signal, sessionCookie: cookie ?? undefined}) : Promise.reject(new ApiError('configuration_missing', 'API client is unavailable')), enabled: enabled(client, cookie), retry: false, staleTime: 0});
}
export function useJourneyOutcomes(client: ApiClient | null, cookie?: string | null): UseQueryResult<JourneyOutcomes, ApiError> {
  return useQuery({queryKey: journeyOutcomesKey, queryFn: ({signal}) => client ? client.listPracticeOutcomes(20, {signal, sessionCookie: cookie ?? undefined}) : Promise.reject(new ApiError('configuration_missing', 'API client is unavailable')), enabled: enabled(client, cookie), retry: false, staleTime: 0});
}
