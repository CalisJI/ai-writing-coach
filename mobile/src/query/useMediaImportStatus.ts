import {useQuery, type UseQueryResult} from '@tanstack/react-query';
import {ApiClient} from '../api/client';
import {MediaResumeStore, type ResumeResult} from '../api/mediaClient';
import type {KeyValueStorage} from '../storage/boundedCache';

export const mediaStatusKey = (resumeHandle: string) => ['media', 'status', resumeHandle] as const;

export function useMediaImportStatus(resumeHandle: string, store: MediaResumeStore, sessionCookie?: string | null): UseQueryResult<ResumeResult> {
  return useQuery({
    queryKey: mediaStatusKey(resumeHandle),
    queryFn: ({signal}) => store.revalidate(resumeHandle, {signal, sessionCookie: sessionCookie ?? undefined}),
    enabled: resumeHandle.trim() !== '', retry: false, staleTime: 0,
  });
}

export function createMediaResumeStore(client: ApiClient, storage: KeyValueStorage): MediaResumeStore {
  return new MediaResumeStore(client, storage);
}
