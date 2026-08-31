import {useQuery, type UseQueryResult} from '@tanstack/react-query';
import {ApiClient} from '../api/client';
import {MediaResumeStore, type ResumeResult} from '../api/mediaClient';
import type {KeyValueStorage} from '../storage/boundedCache';
import {ApiError} from '../api/errors';

export const mediaStatusKey = (resumeHandle: string) => ['media', 'status', resumeHandle] as const;

export function useMediaImportStatus(resumeHandle: string, store: MediaResumeStore | null, sessionCookie?: string | null): UseQueryResult<ResumeResult> {
  return useQuery({
    queryKey: mediaStatusKey(resumeHandle),
    queryFn: ({signal}) => store ? store.revalidate(resumeHandle, {signal, sessionCookie: sessionCookie ?? undefined}) : Promise.reject(new ApiError('configuration_missing', 'Media resume is unavailable')),
    enabled: store !== null && resumeHandle.trim() !== '', retry: false, staleTime: 0, refetchInterval: 1500,
  });
}

export function createMediaResumeStore(client: ApiClient, storage: KeyValueStorage): MediaResumeStore {
  return new MediaResumeStore(client, storage);
}
