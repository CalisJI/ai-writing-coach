import * as SecureStore from 'expo-secure-store';
import {secureSessionStorage, SESSION_STORAGE_KEY} from './secureSessionStorage';

jest.mock('expo-secure-store', () => ({
  AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY: 'after-first-unlock-this-device-only',
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

const mockedSecureStore = SecureStore as jest.Mocked<typeof SecureStore>;

describe('secure native session storage', () => {
  beforeEach(() => jest.clearAllMocks());

  it('uses SecureStore only and rejects malformed reusable material', async () => {
    mockedSecureStore.getItemAsync.mockResolvedValueOnce('signed-cookie');
    expect(await secureSessionStorage.read()).toBe('signed-cookie');
    mockedSecureStore.getItemAsync.mockResolvedValueOnce('');
    expect(await secureSessionStorage.read()).toBeNull();
    await expect(secureSessionStorage.write('')).rejects.toThrow();
    await expect(secureSessionStorage.write('bad\nvalue')).rejects.toThrow();
    expect(mockedSecureStore.setItemAsync).not.toHaveBeenCalled();
  });

  it('writes with device-bound keychain accessibility and clears on logout', async () => {
    await secureSessionStorage.write('signed-cookie');
    expect(mockedSecureStore.setItemAsync).toHaveBeenCalledWith(SESSION_STORAGE_KEY, 'signed-cookie', {
      keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
    });
    await secureSessionStorage.clear();
    expect(mockedSecureStore.deleteItemAsync).toHaveBeenCalledWith(SESSION_STORAGE_KEY);
  });
});
