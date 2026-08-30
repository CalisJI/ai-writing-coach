import {useMutation, useQuery, useQueryClient, type UseMutationResult, type UseQueryResult} from '@tanstack/react-query';
import {ApiClient} from '../api/client';
import type {GrammarLibrary, GrammarLessonDetail} from '../api/contracts/learning';
import {ApiError} from '../api/errors';

const enabled = (client: ApiClient | null, cookie?: string | null) => Boolean(client && typeof cookie === 'string' && cookie.length > 0);
export const grammarLibraryKey = ['grammar', 'library'] as const;
export const grammarLessonKey = (id: string) => ['grammar', 'lesson', id] as const;
export function useGrammarLibrary(client: ApiClient | null, cookie?: string | null): UseQueryResult<GrammarLibrary, ApiError> {
  return useQuery({queryKey: grammarLibraryKey, queryFn: ({signal}) => client ? client.listGrammarLibrary({signal, sessionCookie: cookie ?? undefined}) : Promise.reject(new ApiError('configuration_missing', 'API client is unavailable')), enabled: enabled(client, cookie), retry: false, staleTime: 0});
}
export function useGrammarLesson(client: ApiClient | null, cookie: string | null | undefined, id: string): UseQueryResult<GrammarLessonDetail, ApiError> {
  return useQuery({queryKey: grammarLessonKey(id), queryFn: ({signal}) => client ? client.getGrammarLesson(id, {signal, sessionCookie: cookie ?? undefined}) : Promise.reject(new ApiError('configuration_missing', 'API client is unavailable')), enabled: enabled(client, cookie) && id.trim() !== '', retry: false, staleTime: 0});
}
export function useCompleteGrammarLesson(client: ApiClient | null, cookie?: string | null): UseMutationResult<Record<string, unknown>, ApiError, string> {
  const queryClient = useQueryClient();
  return useMutation({mutationFn: (id) => client ? client.completeGrammarLesson(id, {sessionCookie: cookie ?? undefined}) : Promise.reject(new ApiError('configuration_missing', 'API client is unavailable')), onSuccess: (_result, id) => { void queryClient.invalidateQueries({queryKey: grammarLibraryKey}); void queryClient.invalidateQueries({queryKey: grammarLessonKey(id)}); }, retry: false});
}
