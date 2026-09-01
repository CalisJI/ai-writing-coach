import {useMutation, useQuery, useQueryClient, type UseMutationResult, type UseQueryResult} from '@tanstack/react-query';
import {ApiClient} from '../api/client';
import type {ListeningProgressInput, MediaImportInput, MediaLesson, MediaTranslationInput, MediaTranslationResult} from '../api/contracts/listening';
import {ApiError} from '../api/errors';

const available = (client: ApiClient | null, cookie?: string | null) => Boolean(client && typeof cookie === 'string' && cookie.length > 0);
export const listeningProgressKey = (assetId: string) => ['listening', 'progress', assetId] as const;

export function useImportMedia(client: ApiClient | null, cookie?: string | null): UseMutationResult<MediaLesson, ApiError, MediaImportInput> {
  return useMutation({
    mutationFn: (input) => client ? client.importMedia(input, {sessionCookie: cookie ?? undefined}) : Promise.reject(new ApiError('configuration_missing', 'API client is unavailable')),
    retry: false,
  });
}

/**
 * The translation runs after the import has already produced a usable
 * transcript, so a slow or failing translation never costs the learner the
 * lesson -- the transcript card just reports the outcome.
 */
export function useTranslateMedia(client: ApiClient | null, cookie?: string | null): UseMutationResult<MediaTranslationResult, ApiError, MediaTranslationInput> {
  return useMutation({
    mutationFn: (input) => client ? client.translateMedia(input, {sessionCookie: cookie ?? undefined}) : Promise.reject(new ApiError('configuration_missing', 'API client is unavailable')),
    retry: false,
  });
}

export function useListeningProgress(client: ApiClient | null, cookie: string | null | undefined, assetId: string): UseQueryResult<Awaited<ReturnType<ApiClient['listListeningProgress']>>, ApiError> {
  return useQuery({
    queryKey: listeningProgressKey(assetId),
    queryFn: ({signal}) => client ? client.listListeningProgress(assetId, {signal, sessionCookie: cookie ?? undefined}) : Promise.reject(new ApiError('configuration_missing', 'API client is unavailable')),
    enabled: available(client, cookie) && assetId.trim() !== '',
    retry: false,
    staleTime: 0,
  });
}

export function useSaveListeningProgress(client: ApiClient | null, cookie?: string | null): UseMutationResult<Awaited<ReturnType<ApiClient['saveListeningProgress']>>, ApiError, ListeningProgressInput> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input) => client ? client.saveListeningProgress(input, {sessionCookie: cookie ?? undefined}) : Promise.reject(new ApiError('configuration_missing', 'API client is unavailable')),
    onSuccess: (result) => { void queryClient.invalidateQueries({queryKey: listeningProgressKey(result.item.asset_id)}); },
    retry: false,
  });
}
