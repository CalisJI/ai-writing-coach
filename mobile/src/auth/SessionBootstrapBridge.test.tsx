import React from 'react';
import renderer, {act} from 'react-test-renderer';
import {Text} from 'react-native';
import {useSessionBootstrap} from '../query/useSessionBootstrap';
import type {SessionBootstrap} from '../api/contracts/session';
import {SessionBootstrapBridge} from './SessionBootstrapBridge';
import {SessionProvider, useSession} from './SessionHarness';

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
    let tree: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<SessionProvider><SessionBootstrapBridge><Probe /></SessionBootstrapBridge></SessionProvider>);
      await new Promise((resolve) => setTimeout(resolve, 10));
    });
    expect(tree!.root.findByType(Text).props.children).toBe(expected);
    await act(async () => tree!.unmount());
  });
});
