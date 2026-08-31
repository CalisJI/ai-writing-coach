import * as SecureStore from 'expo-secure-store';

export const SESSION_STORAGE_KEY = 'orena.native.session-cookie.v1';

export type SecureSessionStorage = {
  read: () => Promise<string | null>;
  write: (sessionCookie: string) => Promise<void>;
  clear: () => Promise<void>;
};

function validSessionCookie(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0 && !/[\r\n]/.test(value);
}

export const secureSessionStorage: SecureSessionStorage = {
  async read() {
    const value = await SecureStore.getItemAsync(SESSION_STORAGE_KEY);
    if (value === null || validSessionCookie(value)) return value;
    await SecureStore.deleteItemAsync(SESSION_STORAGE_KEY);
    return null;
  },
  async write(sessionCookie) {
    if (!validSessionCookie(sessionCookie)) throw new Error('A non-empty server session cookie is required');
    await SecureStore.setItemAsync(SESSION_STORAGE_KEY, sessionCookie, {
      keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
    });
  },
  async clear() {
    await SecureStore.deleteItemAsync(SESSION_STORAGE_KEY);
  },
};
