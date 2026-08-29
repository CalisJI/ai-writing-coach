import {useMemo} from 'react';
import {useQuery, type UseQueryResult} from '@tanstack/react-query';
import {ApiClient, createConfiguredApiClient} from '../api/client';
import {ApiError} from '../api/errors';
import type {SessionBootstrap} from '../api/contracts/session';

export const sessionBootstrapKey = ['session', 'bootstrap'] as const;

export function useSessionBootstrap(client?: ApiClient): UseQueryResult<SessionBootstrap, ApiError> {
  const configured = useMemo(() => {
    if (client) return {client};
    try {
      return {client: createConfiguredApiClient()};
    } catch (error) {
      return {error: error instanceof ApiError ? error : new ApiError('configuration_invalid', 'API configuration is invalid')};
    }
  }, [client]);
  return useQuery<SessionBootstrap, ApiError>({
    queryKey: sessionBootstrapKey,
    queryFn: ({signal}) => configured.client
      ? configured.client.getSessionBootstrap({signal})
      : Promise.reject(configured.error),
    retry: false,
    staleTime: 0,
    gcTime: 0,
  });
}
