import React from 'react';
import renderer, {act} from 'react-test-renderer';
import {Text} from 'react-native';
import {useSessionBootstrap} from '../query/useSessionBootstrap';
import type {SessionBootstrap} from '../api/contracts/session';
import {SessionBootstrapBridge} from './SessionBootstrapBridge';
import {SessionProvider, useSession} from './SessionHarness';
import type {SecureSessionStorage} from './secureSessionStorage';

jest.mock('../query/useSessionBootstrap', () => ({useSessionBootstrap: jest.fn()}));

const mockedBootstrap = useSessionBootstrap as jest.MockedFunction<typeof useSessionBootstrap>;
const validBootstrap: SessionBootstrap = {
  version: 'orena.session-bootstrap.v1',
  authenticated: true,
  mode: 'local',
  user: {role: 'user', is_admin: false},
  language: {active: 'zh', options: [{code: 'zh', name: 'Chinese', native_name: '中文'}]},
};

function Probe() {
  const {session} = useSession();
  return <Text>{session.status}</Text>;
}

describe('session bootstrap shell bridge', () => {
  afterEach(() => jest.clearAllMocks());

  it.each([
    [{isPending: true, data: undefined, error: null}, 'loading'],
    [{isPending: false, data: validBootstrap, error: null}, 'authenticated'],
    [{isPending: false, data: undefined, error: {category: 'authentication_required'}}, 'signed-out'],
    [{isPending: false, data: undefined, error: {category: 'network_unavailable'}}, 'unavailable'],
  ] as const)('maps query state to truthful shell state (%s)', async (result, expected) => {
    mockedBootstrap.mockReturnValue(result as ReturnType<typeof useSessionBootstrap>);
    const storage: SecureSessionStorage = {
      read: jest.fn().mockResolvedValue('signed-cookie'),
      write: jest.fn(),
      clear: jest.fn(),
    };
    let tree: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<SessionProvider storage={storage}><SessionBootstrapBridge><Probe /></SessionBootstrapBridge></SessionProvider>);
      await new Promise((resolve) => setTimeout(resolve, 10));
    });
    expect(tree!.root.findByType(Text).props.children).toBe(expected);
    await act(async () => tree!.unmount());
  });

  it('restores a missing secure session as signed-out without querying bootstrap', async () => {
    mockedBootstrap.mockReturnValue({isPending: false, data: undefined, error: null} as unknown as ReturnType<typeof useSessionBootstrap>);
    const storage: SecureSessionStorage = {read: jest.fn().mockResolvedValue(null), write: jest.fn(), clear: jest.fn()};
    let tree: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<SessionProvider storage={storage}><SessionBootstrapBridge><Probe /></SessionBootstrapBridge></SessionProvider>);
      await new Promise((resolve) => setTimeout(resolve, 10));
    });
    expect(tree!.root.findByType(Text).props.children).toBe('signed-out');
    expect(mockedBootstrap).toHaveBeenCalledWith(undefined, null);
    await act(async () => tree!.unmount());
  });

  it('clears an expired secure session after a bootstrap 401', async () => {
    mockedBootstrap.mockReturnValue({isPending: false, data: undefined, error: {category: 'authentication_required'}} as unknown as ReturnType<typeof useSessionBootstrap>);
    const storage: SecureSessionStorage = {read: jest.fn().mockResolvedValue('expired-cookie'), write: jest.fn(), clear: jest.fn().mockResolvedValue(undefined)};
    let tree: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<SessionProvider storage={storage}><SessionBootstrapBridge><Probe /></SessionBootstrapBridge></SessionProvider>);
      await new Promise((resolve) => setTimeout(resolve, 10));
    });
    expect(tree!.root.findByType(Text).props.children).toBe('signed-out');
    expect(storage.clear).toHaveBeenCalled();
    await act(async () => tree!.unmount());
  });

  it('keeps the development harness authenticated and clears secure material', async () => {
    const storage: SecureSessionStorage = {read: jest.fn().mockResolvedValue(null), write: jest.fn(), clear: jest.fn().mockResolvedValue(undefined)};
    function DevProbe() {
      const {session, signInForDevelopment} = useSession();
      return <Text onPress={signInForDevelopment}>{session.status}</Text>;
    }
    let tree: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<SessionProvider storage={storage}><DevProbe /></SessionProvider>);
      await new Promise((resolve) => setTimeout(resolve, 10));
    });
    await act(async () => tree!.root.findByType(Text).props.onPress());
    expect(tree!.root.findByType(Text).props.children).toBe('authenticated');
    expect(storage.clear).toHaveBeenCalled();
    await act(async () => tree!.unmount());
  });
});
