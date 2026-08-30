import {QueryClient} from '@tanstack/react-query';
import React from 'react';
import renderer from 'react-test-renderer';
import {LifecycleRevalidator, expoReconnectSource, useLifecycleRevalidation, type ReconnectSource} from './lifecycleRevalidation';

let mockAppStateHandler: ((state: 'active' | 'background') => void) | null = null;

jest.mock('expo-network', () => ({addNetworkStateListener: jest.fn((listener) => {
  (globalThis as {__orenaNetworkListener?: (state: {isConnected?: boolean; isInternetReachable?: boolean}) => void}).__orenaNetworkListener = listener;
  return {remove: jest.fn()};
})}));
jest.mock('react-native', () => ({
  AppState: {currentState: 'active', addEventListener: jest.fn((_event, handler) => { mockAppStateHandler = handler; return {remove: jest.fn()}; })},
}));

describe('mobile lifecycle revalidation', () => {
  function Probe({client, reconnect}: {client: QueryClient; reconnect: ReconnectSource}) {
    useLifecycleRevalidation(client, reconnect);
    return null;
  }

  it('cancels and invalidates bootstrap, reference, and compact media reads only', async () => {
    const client = new QueryClient();
    client.setQueryData(['session', 'bootstrap'], {value: 1});
    client.setQueryData(['reference', 'stroke-order', '学'], {value: 1});
    client.setQueryData(['media', 'status', 'opaque-resume-handle-123456'], {value: 1});
    client.setQueryData(['unrelated'], {value: 1});
    const cancel = jest.spyOn(client, 'cancelQueries');
    const invalidate = jest.spyOn(client, 'invalidateQueries');
    await new LifecycleRevalidator(client, [['session', 'bootstrap'], ['reference'], ['media', 'status']]).revalidate();
    expect(cancel).toHaveBeenCalledTimes(3);
    expect(invalidate).toHaveBeenCalledTimes(3);
    expect(cancel.mock.calls.flatMap(([filter]) => filter?.queryKey ?? [])).not.toContain('unrelated');
    client.clear();
  });

  it('notifies the lifecycle bridge only when native connectivity returns', () => {
    const listener = jest.fn();
    const unsubscribe = expoReconnectSource.subscribe(listener);
    const networkListener = (globalThis as {__orenaNetworkListener?: (state: {isConnected?: boolean; isInternetReachable?: boolean}) => void}).__orenaNetworkListener!;
    networkListener({isConnected: false, isInternetReachable: false});
    networkListener({isConnected: true, isInternetReachable: true});
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  it('hooks reconnect events into managed query cancellation and invalidation', async () => {
    const client = new QueryClient();
    client.setQueryData(['reference', 'stroke-order', '学'], {value: 1});
    const cancel = jest.spyOn(client, 'cancelQueries');
    const invalidate = jest.spyOn(client, 'invalidateQueries');
    let reconnect!: () => void;
    const source: ReconnectSource = {subscribe: jest.fn((listener) => { reconnect = listener; return jest.fn(); })};
    let tree!: renderer.ReactTestRenderer;
    await renderer.act(async () => { tree = renderer.create(React.createElement(Probe, {client, reconnect: source})); await Promise.resolve(); });
    await renderer.act(async () => { reconnect(); await Promise.resolve(); });
    expect(source.subscribe).toHaveBeenCalledTimes(1);
    expect(cancel).toHaveBeenCalledWith({queryKey: ['reference', 'stroke-order', '学'], exact: true});
    expect(invalidate).toHaveBeenCalledWith({queryKey: ['reference', 'stroke-order', '学'], exact: true, refetchType: 'active'});
    tree.unmount();
    client.clear();
  });

  it('revalidates every mutable learner-flow read on foreground or reconnect', async () => {
    const client = new QueryClient();
    const keys = [
      ['learner-profile'], ['practice', 'recommendation'], ['listening', 'progress', 'asset-1'],
      ['library', 'vocabulary'], ['grammar', 'library'], ['grammar', 'lesson', 'en-articles'],
      ['dashboard'], ['journey', 'practice-outcomes'],
    ] as const;
    keys.forEach((key) => client.setQueryData<unknown>(key, {value: 1}));
    const cancel = jest.spyOn(client, 'cancelQueries');
    let reconnect!: () => void;
    const source: ReconnectSource = {subscribe: jest.fn((listener) => { reconnect = listener; return jest.fn(); })};
    let tree!: renderer.ReactTestRenderer;
    await renderer.act(async () => { tree = renderer.create(React.createElement(Probe, {client, reconnect: source})); await Promise.resolve(); });
    await renderer.act(async () => { reconnect(); await Promise.resolve(); });
    expect(cancel).toHaveBeenCalledTimes(keys.length);
    for (const key of keys) expect(cancel).toHaveBeenCalledWith({queryKey: key, exact: true});
    expect(mockAppStateHandler).toBeDefined();
    tree.unmount();
    client.clear();
  });
});
