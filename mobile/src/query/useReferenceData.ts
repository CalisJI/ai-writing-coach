import {useQuery, type UseQueryResult} from '@tanstack/react-query';
import {ApiClient} from '../api/client';
import {StrokeOrderCache, type ReferenceResult} from '../api/referenceCache';
import type {KeyValueStorage} from '../storage/boundedCache';

export const referenceKey = (word: string) => ['reference', 'stroke-order', word] as const;

export function useStrokeOrder(word: string, cache: StrokeOrderCache, sessionCookie?: string | null): UseQueryResult<ReferenceResult> {
  return useQuery({
    queryKey: referenceKey(word),
    queryFn: ({signal}) => cache.get(word, {signal, sessionCookie: sessionCookie ?? undefined}),
    enabled: word.trim() !== '', retry: false, staleTime: Infinity,
  });
}

export function createStrokeOrderCache(client: ApiClient, storage: KeyValueStorage): StrokeOrderCache {
  return new StrokeOrderCache(client, storage);
}
