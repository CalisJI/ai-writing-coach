import {useEffect} from 'react';
import {AppState, type AppStateStatus} from 'react-native';
import {onlineManager, type QueryClient, type QueryKey} from '@tanstack/react-query';
import * as Network from 'expo-network';

export type ReconnectSource = {subscribe: (listener: () => void) => () => void};

export const expoReconnectSource: ReconnectSource = {
  subscribe(listener) {
    let wasOnline = true;
    const subscription = Network.addNetworkStateListener((state) => {
      const isOnline = state.isConnected === true && state.isInternetReachable !== false;
      if (isOnline && !wasOnline) listener();
      wasOnline = isOnline;
    });
    return () => subscription.remove();
  },
};

export class LifecycleRevalidator {
  constructor(private readonly queryClient: QueryClient, private readonly prefixes: QueryKey[]) {}

  private managed(queryKey: QueryKey): boolean {
    return this.prefixes.some((prefix) => prefix.every((part, index) => queryKey[index] === part));
  }

  async revalidate(): Promise<void> {
    const keys = this.queryClient.getQueryCache().findAll()
      .map((query) => query.queryKey)
      .filter((queryKey) => this.managed(queryKey));
    await Promise.all(keys.map(async (queryKey) => {
      await this.queryClient.cancelQueries({queryKey, exact: true});
      await this.queryClient.invalidateQueries({queryKey, exact: true, refetchType: 'active'});
    }));
  }
}

export function useLifecycleRevalidation(queryClient: QueryClient, reconnect: ReconnectSource = expoReconnectSource): void {
  useEffect(() => {
    const revalidator = new LifecycleRevalidator(queryClient, [
      ['session', 'bootstrap'],
      ['learner-profile'],
      ['practice', 'recommendation'],
      ['reference'],
      ['media', 'status'],
      ['reading', 'sessions'],
      ['listening', 'progress'],
      ['library', 'vocabulary'],
      ['grammar', 'library'],
      ['grammar', 'lesson'],
      ['dashboard'],
      ['journey', 'practice-outcomes'],
    ]);
    let previous: AppStateStatus = AppState.currentState;
    const appStateSubscription = AppState.addEventListener('change', (next) => {
      if (next === 'active' && previous !== 'active') void revalidator.revalidate();
      previous = next;
    });
    const unsubscribeOnline = onlineManager.subscribe(() => {
      if (onlineManager.isOnline()) void revalidator.revalidate();
    });
    const unsubscribe = reconnect?.subscribe(() => { void revalidator.revalidate(); });
    return () => {
      appStateSubscription.remove();
      unsubscribeOnline();
      unsubscribe?.();
    };
  }, [queryClient, reconnect]);
}
