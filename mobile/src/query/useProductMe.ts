import {useQuery, type UseQueryResult} from '@tanstack/react-query';
import {ApiClient} from '../api/client';
import {ApiError} from '../api/errors';
import type {ProductAccountState} from '../api/contracts/product';

export const productMeKey = ['product', 'me'] as const;

export function useProductMe(client: ApiClient | null, sessionCookie?: string | null, enabled = true): UseQueryResult<ProductAccountState, ApiError> {
  return useQuery({
    queryKey: productMeKey,
    queryFn: ({signal}) => client ? client.getProductMe({signal, sessionCookie: sessionCookie ?? undefined}) : Promise.reject(new ApiError('configuration_missing', 'API client is unavailable')),
    enabled: enabled && Boolean(client) && typeof sessionCookie === 'string' && sessionCookie.length > 0,
    retry: false,
    staleTime: 0,
  });
}
