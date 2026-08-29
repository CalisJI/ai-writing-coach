import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import * as Crypto from 'expo-crypto';
import type {ApiClient} from '../api/client';
import {ApiError} from '../api/errors';
import type {SecureSessionStorage} from './secureSessionStorage';

type BrowserResult = {type: string; url?: string};
type Browser = {openAuthSessionAsync: (authUrl: string, returnUrl: string) => Promise<BrowserResult>};

const BASE64URL_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

function hexToBase64Url(hex: string): string {
  const bytes = Array.from({length: hex.length / 2}, (_, index) => Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16));
  let encoded = '';
  for (let index = 0; index < bytes.length; index += 3) {
    const first = bytes[index] ?? 0;
    const second = bytes[index + 1];
    const third = bytes[index + 2];
    encoded += BASE64URL_ALPHABET[first >> 2];
    encoded += BASE64URL_ALPHABET[((first & 3) << 4) | ((second ?? 0) >> 4)];
    if (second !== undefined) encoded += BASE64URL_ALPHABET[((second & 15) << 2) | ((third ?? 0) >> 6)];
    if (third !== undefined) encoded += BASE64URL_ALPHABET[third & 63];
  }
  return encoded;
}

export type NativeAuthResult = {status: 'authenticated'; sessionCookie: string} | {status: 'cancelled'};

export class NativeAuthFlow {
  private readonly browser: Browser;

  constructor(
    private readonly client: ApiClient,
    private readonly storage: SecureSessionStorage,
    browser: Browser = WebBrowser,
  ) {
    this.browser = browser;
  }

  async signIn(): Promise<NativeAuthResult> {
    const verifierBytes = await Crypto.getRandomBytesAsync(32);
    const verifier = Array.from(verifierBytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
    const digestHex = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, verifier);
    const challenge = hexToBase64Url(digestHex);
    const returnUrl = Linking.createURL('auth/callback');
    const authUrl = `${this.client.getBaseUrl()}/auth/google?native_redirect_uri=${encodeURIComponent(returnUrl)}&native_code_challenge=${encodeURIComponent(challenge)}`;
    const result = await this.browser.openAuthSessionAsync(authUrl, returnUrl);
    if (result.type === 'cancel' || result.type === 'dismiss') return {status: 'cancelled'};
    if (result.type !== 'success' || !result.url) throw new ApiError('request_rejected', 'Authentication callback was not completed');
    const parsed = Linking.parse(result.url);
    const code = parsed.queryParams?.code;
    if (typeof code !== 'string' || code.trim() === '') throw new ApiError('request_rejected', 'Authentication callback was invalid');
    const exchanged = await this.client.exchangeNativeSession(code, verifier);
    await this.storage.write(exchanged.session_cookie);
    return {status: 'authenticated', sessionCookie: exchanged.session_cookie};
  }
}
