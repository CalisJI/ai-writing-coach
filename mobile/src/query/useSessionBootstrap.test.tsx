import React from 'react';
import renderer, {act} from 'react-test-renderer';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import type {ApiClient} from '../api/client';
import {useSessionBootstrap} from './useSessionBootstrap';

const bootstrap = {
  version: 'orena.session-bootstrap.v1' as const,
  authenticated: true as const,
  mode: 'local' as const,
  user: {role: 'admin' as const, is_admin: true},
  language: {active: 'en' as const, options: [{code: 'en' as const, name: 'English', native_name: 'English'}]},
};

describe('session bootstrap query state', () => {
  it('loads server state without caching mutable bootstrap data', async () => {
    const getSessionBootstrap = jest.fn().mockResolvedValue(bootstrap);
    const client = {getSessionBootstrap} as unknown as ApiClient;
    const queryClient = new QueryClient({defaultOptions: {queries: {retry: false, gcTime: 0}}});
    function Probe() {
      const result = useSessionBootstrap(client);
      return React.createElement('probe', null, result.isPending ? 'loading' : result.data?.user.role ?? result.error?.category ?? 'empty');
    }
    let tree: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<QueryClientProvider client={queryClient}><Probe /></QueryClientProvider>);
      await new Promise((resolve) => setTimeout(resolve, 100));
    });
    expect(tree!.toJSON()).toMatchObject({type: 'probe', children: ['admin']});
    expect(getSessionBootstrap).toHaveBeenCalledTimes(1);
    expect(getSessionBootstrap.mock.calls[0]?.[0]?.signal).toBeInstanceOf(AbortSignal);
    const query = queryClient.getQueryCache().find({queryKey: ['session', 'bootstrap']});
    expect((query?.options as {staleTime?: number} | undefined)?.staleTime).toBe(0);
    await act(async () => tree!.unmount());
  });
});
