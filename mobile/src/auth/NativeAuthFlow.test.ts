import * as Linking from 'expo-linking';
import type {ApiClient} from '../api/client';
import {ApiError} from '../api/errors';
import {NativeAuthFlow} from './NativeAuthFlow';
import type {SecureSessionStorage} from './secureSessionStorage';

jest.mock('expo-linking', () => ({
  createURL: jest.fn(() => 'orena://auth/callback'),
  parse: jest.fn(() => ({queryParams: {code: 'one-use-code'}})),
}));
jest.mock('expo-crypto', () => ({
  getRandomBytesAsync: jest.fn().mockResolvedValue(new Uint8Array([1, 2, 3, 4])),
  CryptoDigestAlgorithm: {SHA256: 'SHA-256'},
  digestStringAsync: jest.fn().mockResolvedValue('00'.repeat(32)),
}));

const mockedLinking = Linking as jest.Mocked<typeof Linking>;

function storage(): SecureSessionStorage {
  return {read: jest.fn(), write: jest.fn(), clear: jest.fn()};
}

describe('system-browser native auth boundary', () => {
  beforeEach(() => jest.clearAllMocks());

  it('opens the server OAuth route and stores only the exchanged server cookie', async () => {
    const client = {
      getBaseUrl: () => 'https://learn.example.test',
      exchangeNativeSession: jest.fn().mockResolvedValue({version: 'orena.native-session.v1', session_cookie: 'issued-cookie'}),
    } as unknown as ApiClient;
    const local = storage();
    const browser = {openAuthSessionAsync: jest.fn().mockResolvedValue({type: 'success', url: 'orena://auth/callback?code=one-use-code'})};
    await expect(new NativeAuthFlow(client, local, browser).signIn()).resolves.toEqual({status: 'authenticated', sessionCookie: 'issued-cookie'});
    expect(browser.openAuthSessionAsync).toHaveBeenCalledWith(
      'https://learn.example.test/auth/google?native_redirect_uri=orena%3A%2F%2Fauth%2Fcallback&native_code_challenge=' + 'A'.repeat(43),
      'orena://auth/callback',
    );
    expect(client.exchangeNativeSession).toHaveBeenCalledWith('one-use-code', '01020304');
    expect(local.write).toHaveBeenCalledWith('issued-cookie');
    expect(mockedLinking.createURL).toHaveBeenCalledWith('auth/callback');
  });

  it('treats browser cancellation as signed-out and rejects malformed callbacks', async () => {
    const client = {getBaseUrl: () => 'https://learn.example.test', exchangeNativeSession: jest.fn()} as unknown as ApiClient;
    const local = storage();
    const cancelled = {openAuthSessionAsync: jest.fn().mockResolvedValue({type: 'cancel'})};
    await expect(new NativeAuthFlow(client, local, cancelled).signIn()).resolves.toEqual({status: 'cancelled'});
    expect(local.write).not.toHaveBeenCalled();
    mockedLinking.parse.mockReturnValueOnce({queryParams: {code: ''}} as unknown as ReturnType<typeof Linking.parse>);
    const completed = {openAuthSessionAsync: jest.fn().mockResolvedValue({type: 'success', url: 'orena://auth/callback'})};
    await expect(new NativeAuthFlow(client, local, completed).signIn()).rejects.toMatchObject({category: 'request_rejected'} satisfies Partial<ApiError>);
  });
});
